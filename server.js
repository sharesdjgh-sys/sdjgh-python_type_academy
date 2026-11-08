"use strict";

if (require.main === module) require("dotenv").config({ quiet: true });

const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const express = require("express");
const { Pool } = require("pg");
const { Server } = require("socket.io");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8000;
const ROOM_IDLE_MS = 10 * 60 * 1000;
const FINISHED_ROOM_MS = 5 * 60 * 1000;
const RECONNECT_GRACE_MS = 15 * 1000;
const COUNTDOWN_MS = 3000;
const RETIRE_WINDOW_MS = 15 * 1000;
const MAX_INPUT_EVENTS_PER_SECOND = 20;
const SESSION_COOKIE = "pta_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 8;
const DUMMY_PASSWORD_HASH = "$2b$10$T2gGiOMwbf4ZOr51ssJYGe8qXit9KlnwDp7n0fBhBd0YGD.F0LtA6";
const TARGET_CPM = { short: 150, medium: 125, long: 105 };
const BADGE_ACCURACY_THRESHOLD = 80;
const TEACHER_RANGES = new Set(["7d", "30d", "all"]);
const PLATFORM_ORIGIN = "https://platform.sdjgh-ai.kr";
const PLATFORM_VERIFY_URL = `${PLATFORM_ORIGIN}/api/auth/verify`;
const SSO_SCHOOL_CODE = "서대전여고";
const SSO_ROLE_MAP = { 학생: "student", 교사: "teacher", 관리자: "admin" };

// The platform's uid is "입학연도-학번" (e.g. "24-10101"); this app's own
// student numbers are the bare 5-digit part, so strip the year prefix to
// match existing/CSV-imported pyrun accounts instead of creating duplicates.
// 교직원·특수 형식 uid는 접두를 떼면 다른 사람과 겹치므로 sso-legacy-account.js 규칙을 따른다.
const { chooseLegacySsoAccount, legacySsoUsernameCandidates } = require("./sso-legacy-account");

// Mirrors pyrun's lib/student-number.ts (GCCNN: 1 digit grade, 2 digit class, 2 digit seat).
function parseSchoolStudentNumber(value) {
    if (!/^\d{5}$/.test(value)) return null;
    const grade = Number(value.slice(0, 1));
    const classNumber = Number(value.slice(1, 3));
    const seatNumber = Number(value.slice(3, 5));
    if (grade < 1 || classNumber < 1 || seatNumber < 1) return null;
    return { grade, classNumber, seatNumber };
}

async function verifySsoToken(token) {
    if (!token) return null;
    try {
        const res = await fetch(PLATFORM_VERIFY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token })
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.valid ? data.user ?? null : null;
    } catch {
        return null;
    }
}

// Modern browsers send this for the top-level document request of a nested
// browsing context — the one purpose-built signal for "am I being embedded".
function isEmbeddedRequest(request) {
    return request.get("sec-fetch-dest") === "iframe";
}

function parseCookies(header = "") {
    return header.split(";").reduce((cookies, part) => {
        const separator = part.indexOf("=");
        if (separator < 0) return cookies;
        const name = part.slice(0, separator).trim();
        const value = part.slice(separator + 1).trim();
        if (name) cookies[name] = value;
        return cookies;
    }, {});
}

function boundedNumber(value, min, max, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function boundedInteger(value, min, max, fallback = 0) {
    return Math.round(boundedNumber(value, min, max, fallback));
}

function cleanString(value, maxLength = 100) {
    return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function normalizeProfilePayload(candidate) {
    const source = candidate && typeof candidate === "object" && !Array.isArray(candidate)
        ? candidate
        : {};
    const missions = {};
    const missionEntries = source.missions && typeof source.missions === "object"
        ? Object.entries(source.missions).slice(0, 500)
        : [];

    for (const [rawCodeId, rawRecord] of missionEntries) {
        const codeId = cleanString(rawCodeId, 80);
        if (!codeId || !/^[a-zA-Z0-9_:-]+$/.test(codeId)) continue;
        const record = rawRecord && typeof rawRecord === "object" ? rawRecord : {};
        missions[codeId] = {
            difficulty: ["beginner", "intermediate", "advanced"].includes(record.difficulty)
                ? record.difficulty
                : "beginner",
            length: ["short", "medium", "long"].includes(record.length)
                ? record.length
                : "short",
            stars: boundedInteger(record.stars, 0, 3),
            bestScore: boundedInteger(record.bestScore, 0, 1000000),
            bestCpm: boundedInteger(record.bestCpm, 0, 5000),
            bestAccuracy: boundedNumber(record.bestAccuracy, 0, 100),
            clears: boundedInteger(record.clears, 0, 100000),
            updatedAt: cleanString(record.updatedAt, 40) || null
        };
    }

    const recentRuns = Array.isArray(source.recentRuns)
        ? source.recentRuns.slice(0, 12).map((rawRun) => {
            const run = rawRun && typeof rawRun === "object" ? rawRun : {};
            return {
                codeId: cleanString(run.codeId, 80),
                title: cleanString(run.title, 120),
                difficulty: ["beginner", "intermediate", "advanced"].includes(run.difficulty)
                    ? run.difficulty
                    : "beginner",
                length: ["short", "medium", "long"].includes(run.length)
                    ? run.length
                    : "short",
                score: boundedInteger(run.score, 0, 1000000),
                stars: boundedInteger(run.stars, 0, 3),
                accuracy: boundedNumber(run.accuracy, 0, 100),
                cpm: boundedInteger(run.cpm, 0, 5000),
                completedAt: cleanString(run.completedAt, 40) || null
            };
        }).filter((run) => run.codeId)
        : [];

    const lastMissionSource = source.lastMission && typeof source.lastMission === "object"
        ? source.lastMission
        : null;
    const lastMission = lastMissionSource ? {
        difficulty: ["beginner", "intermediate", "advanced"].includes(lastMissionSource.difficulty)
            ? lastMissionSource.difficulty
            : "beginner",
        length: ["short", "medium", "long"].includes(lastMissionSource.length)
            ? lastMissionSource.length
            : "short",
        codeId: cleanString(lastMissionSource.codeId, 80)
    } : null;

    return {
        version: boundedInteger(source.version, 1, 100, 2),
        xp: boundedInteger(source.xp, 0, 100000000),
        coins: boundedInteger(source.coins, 0, 100000000),
        totalRuns: boundedInteger(source.totalRuns, 0, 1000000),
        bestCpm: boundedInteger(source.bestCpm, 0, 5000),
        totalCorrectAttempts: boundedInteger(source.totalCorrectAttempts, 0, 1000000000),
        totalAttempts: boundedInteger(source.totalAttempts, 0, 1000000000),
        perfectRuns: boundedInteger(source.perfectRuns, 0, 1000000),
        missions,
        achievements: Array.isArray(source.achievements)
            ? [...new Set(source.achievements.map((id) => cleanString(id, 80)).filter(Boolean))].slice(0, 100)
            : [],
        recentRuns,
        lastMission: lastMission?.codeId ? lastMission : null,
        streak: {
            current: boundedInteger(source.streak?.current, 0, 100000),
            best: boundedInteger(source.streak?.best, 0, 100000),
            lastPlayed: cleanString(source.streak?.lastPlayed, 10) || null
        },
        daily: {
            date: cleanString(source.daily?.date, 10) || null,
            runs: boundedInteger(source.daily?.runs, 0, 100000)
        },
        settings: {
            sound: Boolean(source.settings?.sound),
            motion: source.settings?.motion !== false
        }
    };
}

function normalizePracticeRun(candidate, missions) {
    const source = candidate && typeof candidate === "object" && !Array.isArray(candidate)
        ? candidate
        : {};
    const clientRunId = cleanString(source.clientRunId, 80);
    const codeId = cleanString(source.codeId, 80);
    const mission = missions.get(codeId);

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientRunId)) {
        throw new Error("플레이 식별자가 올바르지 않습니다.");
    }
    if (!mission) throw new Error("퀘스트 정보를 찾을 수 없습니다.");

    const completedAt = new Date(source.completedAt);
    const safeCompletedAt = Number.isNaN(completedAt.getTime())
        ? new Date()
        : completedAt;

    return {
        clientRunId,
        codeId,
        title: cleanString(mission.title, 120) || "코드 퀘스트",
        difficulty: ["beginner", "intermediate", "advanced"].includes(mission.difficulty)
            ? mission.difficulty
            : "beginner",
        length: ["short", "medium", "long"].includes(mission.length)
            ? mission.length
            : "short",
        score: boundedInteger(source.score, 0, 1000000),
        rank: ["S", "A", "B", "C"].includes(source.rank) ? source.rank : "C",
        stars: boundedInteger(source.stars, 0, 3),
        accuracy: boundedNumber(source.accuracy, 0, 100),
        cpm: boundedInteger(source.cpm, 0, 5000),
        durationSeconds: boundedNumber(source.durationSeconds, 0, 36000),
        maxCombo: boundedInteger(source.maxCombo, 0, 100000),
        attempts: boundedInteger(source.attempts, 0, 1000000),
        correctAttempts: boundedInteger(source.correctAttempts, 0, 1000000),
        errors: boundedInteger(source.errors, 0, 1000000),
        corrections: boundedInteger(source.corrections, 0, 1000000),
        completedAt: safeCompletedAt.toISOString()
    };
}

function parseTeacherRange(value) {
    const range = TEACHER_RANGES.has(value) ? value : "30d";
    if (range === "all") return { range, startAt: null };

    const days = range === "7d" ? 7 : 30;
    const now = new Date();
    const seoul = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(now);
    const startAt = new Date(`${seoul}T00:00:00+09:00`);
    startAt.setUTCDate(startAt.getUTCDate() - (days - 1));
    return { range, startAt: startAt.toISOString() };
}

function profileLastActivity(profile) {
    const recent = Array.isArray(profile?.recentRuns) ? profile.recentRuns : [];
    const recentDate = recent.map((run) => run?.completedAt).find(Boolean);
    if (recentDate) return recentDate;

    const missionDates = Object.values(profile?.missions || {})
        .map((mission) => mission?.updatedAt)
        .filter(Boolean)
        .sort()
        .reverse();
    return missionDates[0] || null;
}

function summarizePlayerProfile(profileCandidate, missionTotal) {
    const profile = profileCandidate && typeof profileCandidate === "object"
        ? profileCandidate
        : {};
    const missions = profile.missions && typeof profile.missions === "object"
        ? Object.values(profile.missions)
        : [];
    const certifiedQuests = missions.filter((mission) =>
        Number(mission?.bestAccuracy || 0) >= BADGE_ACCURACY_THRESHOLD
    ).length;
    const totalAttempts = Number(profile.totalAttempts || 0);
    const totalCorrectAttempts = Number(profile.totalCorrectAttempts || 0);
    const bestScore = missions.reduce((best, mission) =>
        Math.max(best, Number(mission?.bestScore || 0)), 0);
    const bestAccuracy = missions.reduce((best, mission) =>
        Math.max(best, Number(mission?.bestAccuracy || 0)), 0);

    return {
        totalRuns: Number(profile.totalRuns || 0),
        completedQuests: missions.length,
        certifiedQuests,
        missionTotal,
        progressPercent: missionTotal > 0
            ? Math.round((certifiedQuests / missionTotal) * 100)
            : 0,
        overallAccuracy: totalAttempts > 0
            ? Math.round((totalCorrectAttempts / totalAttempts) * 1000) / 10
            : 0,
        bestScore,
        bestAccuracy,
        bestCpm: Number(profile.bestCpm || 0),
        stars: missions.reduce((total, mission) => total + Number(mission?.stars || 0), 0),
        badges: Array.isArray(profile.achievements) ? profile.achievements.length : 0,
        streak: Number(profile.streak?.current || 0),
        lastActivityAt: profileLastActivity(profile)
    };
}

function normalizeCode(code) {
    return String(code || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n")
        .replace(/\n+$/, "");
}

function sanitizeNickname(value) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, 12);
}

function isValidNickname(value) {
    return value.length >= 2 && value.length <= 12 && !/[<>]/.test(value);
}

function createRoomCode(existingRooms) {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (let attempt = 0; attempt < 50; attempt += 1) {
        let code = "";
        for (let index = 0; index < 6; index += 1) {
            code += alphabet[crypto.randomInt(0, alphabet.length)];
        }
        if (!existingRooms.has(code)) return code;
    }
    throw new Error("사용 가능한 방 코드를 만들지 못했습니다.");
}

function loadMissions() {
    const metadataPath = path.join(ROOT, "python-codes", "codes-metadata.json");
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    const missions = new Map();

    for (const [difficulty, lengths] of Object.entries(metadata)) {
        for (const [length, items] of Object.entries(lengths)) {
            for (const item of items) {
                const filePath = path.resolve(ROOT, "python-codes", item.file);
                const codeRoot = path.resolve(ROOT, "python-codes");
                if (!filePath.startsWith(`${codeRoot}${path.sep}`)) continue;
                missions.set(item.id, {
                    ...item,
                    difficulty,
                    length,
                    targetText: normalizeCode(fs.readFileSync(filePath, "utf8"))
                });
            }
        }
    }
    return missions;
}

class RaceTracker {
    constructor(targetText, startsAt, targetCpm = TARGET_CPM.short) {
        this.targetText = targetText;
        this.startsAt = startsAt;
        this.targetCpm = targetCpm;
        this.targetLines = targetText.split("\n");
        this.lineStarts = [];
        this.targetLines.reduce((offset, line) => {
            this.lineStarts.push(offset);
            return offset + line.length + 1;
        }, 0);
        this.previousValue = "";
        this.attempts = 0;
        this.correctAttempts = 0;
        this.errors = 0;
        this.corrections = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.lineCombo = 0;
        this.maxLineCombo = 0;
        this.perfectLines = 0;
        this.completedLines = new Set();
        this.lineErrors = new Set();
        this.finishedAt = null;
    }

    lineIndexAt(characterIndex) {
        for (let index = this.lineStarts.length - 1; index >= 0; index -= 1) {
            if (characterIndex >= this.lineStarts[index]) return index;
        }
        return 0;
    }

    updateLineCombos(value) {
        const userLines = value.split("\n");
        this.targetLines.forEach((targetLine, index) => {
            if (!targetLine || this.completedLines.has(index) || userLines[index] !== targetLine) return;
            this.completedLines.add(index);
            if (this.lineErrors.has(index)) {
                this.lineCombo = 0;
                return;
            }
            this.perfectLines += 1;
            this.lineCombo += 1;
            this.maxLineCombo = Math.max(this.maxLineCombo, this.lineCombo);
        });
    }

    diffText(previous, current) {
        let prefix = 0;
        const maxPrefix = Math.min(previous.length, current.length);
        while (prefix < maxPrefix && previous[prefix] === current[prefix]) prefix += 1;

        let suffix = 0;
        while (
            suffix < previous.length - prefix
            && suffix < current.length - prefix
            && previous[previous.length - 1 - suffix] === current[current.length - 1 - suffix]
        ) {
            suffix += 1;
        }

        return {
            prefix,
            removed: previous.slice(prefix, previous.length - suffix),
            inserted: current.slice(prefix, current.length - suffix)
        };
    }

    countCorrectPositions(value) {
        let correct = 0;
        const length = Math.min(value.length, this.targetText.length);
        for (let index = 0; index < length; index += 1) {
            if (value[index] === this.targetText[index]) correct += 1;
        }
        return correct;
    }

    apply(rawValue, now = Date.now()) {
        const value = normalizeCode(rawValue).slice(0, this.targetText.length + 20);
        const change = this.diffText(this.previousValue, value);

        for (let index = 0; index < change.inserted.length; index += 1) {
            const targetIndex = change.prefix + index;
            const correct = change.inserted[index] === this.targetText[targetIndex];
            this.attempts += 1;
            if (correct) {
                this.correctAttempts += 1;
                this.combo += 1;
                this.maxCombo = Math.max(this.maxCombo, this.combo);
            } else {
                this.errors += 1;
                this.combo = 0;
                this.lineErrors.add(this.lineIndexAt(targetIndex));
            }
        }
        this.corrections += change.removed.length;
        this.previousValue = value;
        this.updateLineCombos(value);

        if (value === this.targetText && !this.finishedAt) this.finishedAt = now;
        return this.snapshot(now);
    }

    snapshot(now = Date.now()) {
        const correct = this.countCorrectPositions(this.previousValue);
        const elapsed = Math.max(1, (this.finishedAt || now) - this.startsAt);
        const accuracy = this.attempts
            ? (this.correctAttempts / this.attempts) * 100
            : 0;
        const progress = this.targetText.length ? (correct / this.targetText.length) * 100 : 0;
        const cpm = Math.round((correct * 60000) / elapsed);
        const scorableLines = Math.max(1, this.targetLines.filter(Boolean).length);
        const accuracyScore = accuracy * 5.5;
        const speedScore = Math.min(150, (cpm / this.targetCpm) * 120);
        const characterComboScore = (this.maxCombo / Math.max(1, this.targetText.length)) * 180;
        const perfectLineScore = (this.perfectLines / scorableLines) * 120;
        const comboScore = Math.min(300, characterComboScore + perfectLineScore);
        const scoreBreakdown = {
            accuracy: Math.round(accuracyScore),
            combo: Math.round(comboScore),
            speed: Math.round(speedScore)
        };
        const score = Object.values(scoreBreakdown).reduce((total, part) => total + part, 0);
        return {
            progress,
            accuracy,
            cpm,
            combo: this.combo,
            maxCombo: this.maxCombo,
            lineCombo: this.lineCombo,
            maxLineCombo: this.maxLineCombo,
            perfectLines: this.perfectLines,
            totalLines: scorableLines,
            errors: this.errors,
            corrections: this.corrections,
            score,
            scoreBreakdown,
            finishedAt: this.finishedAt,
            durationMs: this.finishedAt ? this.finishedAt - this.startsAt : null
        };
    }
}

function createBattleServer(options = {}) {
    const app = express();
    app.set("trust proxy", 1);
    const server = http.createServer(app);
    const io = new Server(server, {
        cors: { origin: false },
        maxHttpBufferSize: 64 * 1024
    });
    const missions = options.missions || loadMissions();
    const retireWindowMs = options.retireWindowMs ?? RETIRE_WINDOW_MS;
    const rooms = new Map();
    const sessions = new Map();
    const loginAttempts = new Map();
    const ownsDatabasePool = !options.databasePool && Boolean(process.env.DATABASE_URL);
    const databasePool = options.databasePool || (process.env.DATABASE_URL ? new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
        idleTimeoutMillis: 30 * 1000,
        connectionTimeoutMillis: 10 * 1000,
        application_name: "pythonTypeAcademy"
    }) : null);

    function sessionFor(request) {
        const sessionId = parseCookies(request.headers.cookie)[SESSION_COOKIE];
        if (!sessionId) return null;
        const session = sessions.get(sessionId);
        if (!session || session.expiresAt <= Date.now()) {
            sessions.delete(sessionId);
            return null;
        }
        return { id: sessionId, ...session };
    }

    // SSO auto-login runs inside a third-party iframe (embedded under
    // platform.sdjgh-ai.kr). SameSite=Lax cookies are excluded from every
    // request made in that cross-site ancestor context — fetches AND the
    // iframe's own navigations, since the browser's actual top-level
    // document is a different site — so the session cookie set by
    // /api/auth/sso-login never came back on the reload that follows it.
    // SameSite=None (which requires Secure) fixes that; fall back to Lax
    // over plain http (local dev), where None without Secure would just be
    // rejected by the browser and isn't needed anyway (no iframe there).
    function cookieAttributes(request) {
        const secure = request.secure || process.env.NODE_ENV === "production";
        return secure ? ["SameSite=None", "Secure"] : ["SameSite=Lax"];
    }

    function setSessionCookie(request, response, sessionId) {
        const parts = [
            `${SESSION_COOKIE}=${sessionId}`,
            "HttpOnly",
            ...cookieAttributes(request),
            "Path=/",
            `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
        ];
        response.setHeader("Set-Cookie", parts.join("; "));
    }

    function clearSessionCookie(request, response) {
        const parts = [`${SESSION_COOKIE}=`, "HttpOnly", ...cookieAttributes(request), "Path=/", "Max-Age=0"];
        response.setHeader("Set-Cookie", parts.join("; "));
    }

    function loginAttemptKey(schoolName, studentNumber) {
        return crypto.createHash("sha256")
            .update(`${schoolName.toLowerCase()}:${studentNumber}`)
            .digest("base64url");
    }

    function loginIsLimited(key, now = Date.now()) {
        const attempt = loginAttempts.get(key);
        if (!attempt) return false;
        if (now - attempt.startedAt >= LOGIN_WINDOW_MS) {
            loginAttempts.delete(key);
            return false;
        }
        return attempt.count >= MAX_LOGIN_ATTEMPTS;
    }

    function recordFailedLogin(key, now = Date.now()) {
        const previous = loginAttempts.get(key);
        if (!previous || now - previous.startedAt >= LOGIN_WINDOW_MS) {
            loginAttempts.set(key, { count: 1, startedAt: now });
            return;
        }
        previous.count += 1;
    }

    function requirePageSession(request, response, next) {
        if (sessionFor(request)) {
            next();
            return;
        }
        if (isEmbeddedRequest(request)) {
            // Embedded in the platform shell with no local session yet — don't
            // redirect to our own /login (that would nest a login screen inside
            // the iframe). Serve the page and let sso-guard.js on the client
            // establish a session via /api/auth/sso-login, then reload.
            next();
            return;
        }
        response.redirect(302, `/login?next=${encodeURIComponent(request.originalUrl)}`);
    }

    function requireApiSession(request, response, next) {
        const session = sessionFor(request);
        if (!session) {
            response.status(401).json({ error: "로그인이 필요합니다." });
            return;
        }
        request.authSession = session;
        next();
    }

    function requireTeacherPage(request, response, next) {
        const session = sessionFor(request);
        if (!session) {
            response.redirect(302, `/login?next=${encodeURIComponent(request.originalUrl)}`);
            return;
        }
        if (session.user.role !== "teacher") {
            response.status(403).send("교사 계정만 접근할 수 있습니다.");
            return;
        }
        request.authSession = session;
        next();
    }

    function requireTeacherApi(request, response, next) {
        const session = sessionFor(request);
        if (!session) {
            response.status(401).json({ error: "로그인이 필요합니다." });
            return;
        }
        if (session.user.role !== "teacher") {
            response.status(403).json({ error: "교사 계정만 접근할 수 있습니다." });
            return;
        }
        request.authSession = session;
        next();
    }

    app.use(express.json({ limit: "256kb" }));
    app.use((request, response, next) => {
        response.setHeader("Content-Security-Policy", `frame-ancestors ${PLATFORM_ORIGIN}`);
        next();
    });
    app.use((request, response, next) => {
        if (/^\/(?:server\.js|package(?:-lock)?\.json|tests)(?:\/|$)/.test(request.path)) {
            response.sendStatus(404);
            return;
        }
        next();
    });

    app.get("/api/auth/session", (request, response) => {
        const session = sessionFor(request);
        if (!session) {
            response.status(401).json({ authenticated: false });
            return;
        }
        response.json({ authenticated: true, user: session.user });
    });

    app.post("/api/auth/login", async (request, response) => {
        const schoolName = String(request.body?.schoolName || "").trim();
        const studentNumber = String(request.body?.studentNumber || "").trim();
        const password = String(request.body?.password || "");

        if (!schoolName || !studentNumber || !password
            || schoolName.length > 80 || studentNumber.length > 32 || password.length > 128) {
            response.status(400).json({ error: "학교명, 학번, 비밀번호를 확인해 주세요." });
            return;
        }

        const attemptKey = loginAttemptKey(schoolName, studentNumber);
        if (loginIsLimited(attemptKey)) {
            response.status(429).json({ error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요." });
            return;
        }
        if (!databasePool) {
            response.status(503).json({ error: "로그인 서버가 아직 설정되지 않았습니다." });
            return;
        }

        try {
            const result = await databasePool.query(`
                SELECT u.id,
                       u.school_id,
                       u.username,
                       u.student_number,
                       u.role,
                       u.display_name,
                       u.nickname,
                       u.password_hash,
                       s.name AS school_name,
                       s.code AS school_code
                FROM public.users u
                JOIN public.schools s ON s.id = u.school_id
                WHERE lower(trim(s.code)) = lower(trim($1))
                  AND u.username = $2
                LIMIT 2
            `, [schoolName, studentNumber]);
            const user = result.rows.length === 1 ? result.rows[0] : null;
            const passwordMatches = await bcrypt.compare(password, user?.password_hash || DUMMY_PASSWORD_HASH);

            if (!user || !passwordMatches) {
                recordFailedLogin(attemptKey);
                response.status(401).json({ error: "학교명, 학번 또는 비밀번호가 올바르지 않습니다." });
                return;
            }

            loginAttempts.delete(attemptKey);
            const sessionId = crypto.randomBytes(32).toString("base64url");
            const publicUser = {
                id: user.id,
                schoolId: user.school_id,
                schoolName: user.school_name,
                schoolCode: user.school_code,
                studentNumber: user.student_number || user.username,
                role: user.role,
                displayName: user.display_name,
                nickname: user.nickname
            };
            sessions.set(sessionId, { user: publicUser, expiresAt: Date.now() + SESSION_TTL_MS });
            setSessionCookie(request, response, sessionId);
            response.json({ authenticated: true, user: publicUser });
        } catch (error) {
            console.error("Login database error:", error.message);
            response.status(503).json({ error: "로그인 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." });
        }
    });

    app.post("/api/auth/sso-login", async (request, response) => {
        const token = String(request.body?.token || "");
        if (!token) {
            response.status(400).json({ error: "토큰이 필요합니다." });
            return;
        }
        if (!databasePool) {
            response.status(503).json({ error: "로그인 서버가 아직 설정되지 않았습니다." });
            return;
        }

        const ssoUser = await verifySsoToken(token);
        if (!ssoUser) {
            response.status(401).json({ error: "유효하지 않은 토큰입니다." });
            return;
        }

        const role = SSO_ROLE_MAP[ssoUser.role] || "student";
        const usernames = legacySsoUsernameCandidates(ssoUser.uid);
        if (!usernames.length) {
            // 빈 uid는 여러 계정이 같은 빈 계정을 공유하게 되므로 받지 않는다.
            response.status(403).json({ error: "이 계정은 학번 정보가 없어 연결할 수 없습니다." });
            return;
        }

        try {
            const schoolResult = await databasePool.query(
                `SELECT id, name, code FROM public.schools WHERE lower(trim(code)) = lower(trim($1)) LIMIT 1`,
                [SSO_SCHOOL_CODE]
            );
            const school = schoolResult.rows[0];
            if (!school) {
                response.status(503).json({ error: "학교 정보를 찾을 수 없습니다." });
                return;
            }

            const existing = await databasePool.query(
                `SELECT id, school_id, username, student_number, role, display_name, nickname
                 FROM public.users WHERE school_id = $1 AND username = ANY($2::text[]) LIMIT 2`,
                [school.id, usernames]
            );

            const choice = chooseLegacySsoAccount(
                { uid: ssoUser.uid, name: ssoUser.name, role },
                existing.rows
            );
            let user = choice.kind === "existing" ? choice.user : null;
            if (!user) {
                const studentNumber = choice.studentNumber;
                const classInfo = role === "student" && studentNumber ? parseSchoolStudentNumber(studentNumber) : null;
                const randomPasswordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);
                const inserted = await databasePool.query(
                    `INSERT INTO public.users
                        (school_id, username, password_hash, role, display_name, nickname, student_number, grade, class_number, seat_number)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                     RETURNING id, school_id, username, student_number, role, display_name, nickname`,
                    [
                        school.id, choice.username, randomPasswordHash, role, ssoUser.name, "코드러너", studentNumber,
                        classInfo?.grade ?? null, classInfo?.classNumber ?? null, classInfo?.seatNumber ?? null
                    ]
                );
                user = inserted.rows[0];
            }

            const sessionId = crypto.randomBytes(32).toString("base64url");
            const publicUser = {
                id: user.id,
                schoolId: user.school_id,
                schoolName: school.name,
                schoolCode: school.code,
                studentNumber: user.student_number || user.username,
                role: user.role,
                displayName: user.display_name,
                nickname: user.nickname
            };
            sessions.set(sessionId, { user: publicUser, expiresAt: Date.now() + SESSION_TTL_MS });
            setSessionCookie(request, response, sessionId);
            response.json({ authenticated: true, user: publicUser });
        } catch (error) {
            console.error("SSO login database error:", error.message);
            response.status(503).json({ error: "로그인 서버에 연결할 수 없습니다." });
        }
    });

    app.post("/api/auth/logout", (request, response) => {
        const session = sessionFor(request);
        if (session) sessions.delete(session.id);
        clearSessionCookie(request, response);
        response.status(204).end();
    });

    app.get("/api/profile", requireApiSession, async (request, response) => {
        if (!databasePool) {
            response.status(503).json({ error: "데이터베이스가 설정되지 않았습니다." });
            return;
        }
        try {
            const result = await databasePool.query(`
                WITH inserted AS (
                    INSERT INTO academy.player_profiles (user_id)
                    VALUES ($1)
                    ON CONFLICT (user_id) DO NOTHING
                    RETURNING profile, updated_at
                )
                SELECT profile, updated_at FROM inserted
                UNION ALL
                SELECT profile, updated_at
                FROM academy.player_profiles
                WHERE user_id = $1
                LIMIT 1
            `, [request.authSession.user.id]);
            response.setHeader("Cache-Control", "no-store");
            response.json({
                profile: result.rows[0]?.profile || {},
                updatedAt: result.rows[0]?.updated_at || null
            });
        } catch (error) {
            console.error("Profile load database error:", error.message);
            response.status(503).json({ error: "플레이 기록을 불러오지 못했습니다." });
        }
    });

    app.put("/api/profile", requireApiSession, async (request, response) => {
        if (!databasePool) {
            response.status(503).json({ error: "데이터베이스가 설정되지 않았습니다." });
            return;
        }
        const profile = normalizeProfilePayload(request.body?.profile);
        try {
            const result = await databasePool.query(`
                INSERT INTO academy.player_profiles (user_id, profile)
                VALUES ($1, $2::jsonb)
                ON CONFLICT (user_id) DO UPDATE
                SET profile = EXCLUDED.profile,
                    updated_at = now()
                RETURNING profile, updated_at
            `, [request.authSession.user.id, JSON.stringify(profile)]);
            response.setHeader("Cache-Control", "no-store");
            response.json({
                profile: result.rows[0].profile,
                updatedAt: result.rows[0].updated_at
            });
        } catch (error) {
            console.error("Profile save database error:", error.message);
            response.status(503).json({ error: "플레이 기록을 저장하지 못했습니다." });
        }
    });

    app.post("/api/profile/runs", requireApiSession, async (request, response) => {
        if (!databasePool) {
            response.status(503).json({ error: "데이터베이스가 설정되지 않았습니다." });
            return;
        }
        if (!["student", "teacher"].includes(request.authSession.user.role)) {
            response.status(403).json({ error: "게임 기록을 저장할 수 없는 계정입니다." });
            return;
        }

        let run;
        try {
            run = normalizePracticeRun(request.body?.run, missions);
        } catch (error) {
            response.status(400).json({ error: error.message });
            return;
        }
        const profile = normalizeProfilePayload(request.body?.profile);
        const client = await databasePool.connect().catch(() => null);
        if (!client) {
            response.status(503).json({ error: "플레이 기록 저장소에 연결할 수 없습니다." });
            return;
        }

        try {
            await client.query("BEGIN");
            const profileResult = await client.query(`
                INSERT INTO academy.player_profiles (user_id, profile)
                VALUES ($1, $2::jsonb)
                ON CONFLICT (user_id) DO UPDATE
                SET profile = EXCLUDED.profile,
                    updated_at = now()
                RETURNING profile, updated_at
            `, [request.authSession.user.id, JSON.stringify(profile)]);
            const runResult = await client.query(`
                INSERT INTO academy.practice_runs (
                    user_id, client_run_id, code_id, title, difficulty, length,
                    score, rank, stars, accuracy, cpm, duration_seconds,
                    max_combo, attempts, correct_attempts, errors, corrections, completed_at
                ) VALUES (
                    $1, $2::uuid, $3, $4, $5, $6,
                    $7, $8, $9, $10, $11, $12,
                    $13, $14, $15, $16, $17, $18::timestamptz
                )
                ON CONFLICT (user_id, client_run_id) DO NOTHING
                RETURNING id
            `, [
                request.authSession.user.id,
                run.clientRunId,
                run.codeId,
                run.title,
                run.difficulty,
                run.length,
                run.score,
                run.rank,
                run.stars,
                run.accuracy,
                run.cpm,
                run.durationSeconds,
                run.maxCombo,
                run.attempts,
                run.correctAttempts,
                run.errors,
                run.corrections,
                run.completedAt
            ]);
            await client.query("COMMIT");
            response.setHeader("Cache-Control", "no-store");
            response.json({
                profile: profileResult.rows[0].profile,
                updatedAt: profileResult.rows[0].updated_at,
                runRecorded: runResult.rowCount > 0
            });
        } catch (error) {
            await client.query("ROLLBACK").catch(() => {});
            console.error("Practice run save database error:", error.message);
            response.status(503).json({ error: "플레이 기록을 저장하지 못했습니다." });
        } finally {
            client.release();
        }
    });

    app.get("/api/teacher/classes", requireTeacherApi, async (request, response) => {
        if (!databasePool) {
            response.status(503).json({ error: "데이터베이스가 설정되지 않았습니다." });
            return;
        }
        try {
            const result = await databasePool.query(`
                SELECT tca.grade,
                       tca.class_number,
                       count(student.id)::integer AS student_count
                FROM public.teacher_class_assignments tca
                JOIN public.users teacher ON teacher.id = tca.teacher_user_id
                LEFT JOIN public.users student
                  ON student.school_id = teacher.school_id
                 AND student.role = 'student'
                 AND student.grade = tca.grade
                 AND student.class_number = tca.class_number
                WHERE tca.teacher_user_id = $1
                GROUP BY tca.grade, tca.class_number
                ORDER BY tca.grade, tca.class_number
            `, [request.authSession.user.id]);
            response.setHeader("Cache-Control", "no-store");
            response.json({
                classes: result.rows.map((row) => ({
                    grade: Number(row.grade),
                    classNumber: Number(row.class_number),
                    studentCount: Number(row.student_count)
                }))
            });
        } catch (error) {
            console.error("Teacher classes load database error:", error.message);
            response.status(503).json({ error: "배정 학급을 불러오지 못했습니다." });
        }
    });

    app.get("/api/teacher/classes/:grade/:classNumber", requireTeacherApi, async (request, response) => {
        if (!databasePool) {
            response.status(503).json({ error: "데이터베이스가 설정되지 않았습니다." });
            return;
        }
        const grade = boundedInteger(request.params.grade, 1, 20, 0);
        const classNumber = boundedInteger(request.params.classNumber, 1, 100, 0);
        if (!grade || !classNumber) {
            response.status(400).json({ error: "학년과 반 정보를 확인해 주세요." });
            return;
        }
        const period = parseTeacherRange(request.query.range);

        try {
            const assignment = await databasePool.query(`
                SELECT 1
                FROM public.teacher_class_assignments
                WHERE teacher_user_id = $1
                  AND grade = $2
                  AND class_number = $3
                LIMIT 1
            `, [request.authSession.user.id, grade, classNumber]);
            if (assignment.rows.length === 0) {
                response.status(403).json({ error: "배정되지 않은 학급입니다." });
                return;
            }

            const studentsResult = await databasePool.query(`
                SELECT student.id,
                       student.display_name,
                       student.nickname,
                       student.student_number,
                       student.seat_number,
                       profile.profile,
                       profile.updated_at
                FROM public.users student
                LEFT JOIN academy.player_profiles profile ON profile.user_id = student.id
                WHERE student.school_id = $1
                  AND student.role = 'student'
                  AND student.grade = $2
                  AND student.class_number = $3
                ORDER BY student.seat_number NULLS LAST, student.student_number, student.display_name
            `, [request.authSession.user.schoolId, grade, classNumber]);
            const studentIds = studentsResult.rows.map((row) => Number(row.id));
            let rangeRows = [];
            let dailyRows = [];
            if (studentIds.length > 0) {
                const rangeResult = await databasePool.query(`
                    SELECT user_id,
                           count(*)::integer AS run_count,
                           coalesce(sum(duration_seconds), 0)::double precision AS duration_seconds,
                           coalesce(avg(accuracy), 0)::double precision AS average_accuracy,
                           max(completed_at) AS last_completed_at
                    FROM academy.practice_runs
                    WHERE user_id = ANY($1::integer[])
                      AND ($2::timestamptz IS NULL OR completed_at >= $2::timestamptz)
                    GROUP BY user_id
                `, [studentIds, period.startAt]);
                rangeRows = rangeResult.rows;
                const dailyResult = await databasePool.query(`
                    SELECT (completed_at AT TIME ZONE 'Asia/Seoul')::date AS date,
                           count(*)::integer AS run_count,
                           coalesce(sum(duration_seconds), 0)::double precision AS duration_seconds,
                           coalesce(avg(accuracy), 0)::double precision AS average_accuracy
                    FROM academy.practice_runs
                    WHERE user_id = ANY($1::integer[])
                      AND ($2::timestamptz IS NULL OR completed_at >= $2::timestamptz)
                    GROUP BY (completed_at AT TIME ZONE 'Asia/Seoul')::date
                    ORDER BY date
                `, [studentIds, period.startAt]);
                dailyRows = dailyResult.rows;
            }

            const rangeByStudent = new Map(rangeRows.map((row) => [Number(row.user_id), row]));
            const missionTotal = missions.size;
            const students = studentsResult.rows.map((row) => {
                const profile = row.profile || {};
                const cumulative = summarizePlayerProfile(profile, missionTotal);
                const range = rangeByStudent.get(Number(row.id));
                const rangeRuns = Number(range?.run_count || 0);
                return {
                    id: Number(row.id),
                    displayName: row.display_name || row.nickname || "이름 미등록",
                    nickname: row.nickname || "",
                    studentNumber: row.student_number || "",
                    seatNumber: row.seat_number === null ? null : Number(row.seat_number),
                    profileUpdatedAt: row.updated_at || null,
                    cumulative,
                    period: {
                        runs: rangeRuns,
                        durationMinutes: Math.round((Number(range?.duration_seconds || 0) / 60) * 10) / 10,
                        averageAccuracy: Math.round(Number(range?.average_accuracy || 0) * 10) / 10,
                        lastActivityAt: range?.last_completed_at || null
                    },
                    status: cumulative.totalRuns === 0
                        ? "untried"
                        : rangeRuns > 0 ? "active" : "resting"
                };
            });
            const certifiedTotal = students.reduce((total, student) => total + student.cumulative.certifiedQuests, 0);
            const durationSeconds = rangeRows.reduce((total, row) => total + Number(row.duration_seconds || 0), 0);
            const runCount = rangeRows.reduce((total, row) => total + Number(row.run_count || 0), 0);

            response.setHeader("Cache-Control", "no-store");
            response.json({
                class: { grade, classNumber, studentCount: students.length },
                range: period.range,
                summary: {
                    startedStudents: students.filter((student) => student.cumulative.totalRuns > 0).length,
                    activeStudents: students.filter((student) => student.period.runs > 0).length,
                    runCount,
                    durationMinutes: Math.round((durationSeconds / 60) * 10) / 10,
                    averageProgress: students.length > 0 && missionTotal > 0
                        ? Math.round((certifiedTotal / (students.length * missionTotal)) * 1000) / 10
                        : 0
                },
                dailyActivity: dailyRows.map((row) => ({
                    date: row.date,
                    runs: Number(row.run_count),
                    durationMinutes: Math.round((Number(row.duration_seconds || 0) / 60) * 10) / 10,
                    averageAccuracy: Math.round(Number(row.average_accuracy || 0) * 10) / 10
                })),
                students
            });
        } catch (error) {
            console.error("Teacher class dashboard load error:", error.message);
            response.status(503).json({ error: "학급 학습 현황을 불러오지 못했습니다." });
        }
    });

    app.get("/api/teacher/students/:studentId", requireTeacherApi, async (request, response) => {
        if (!databasePool) {
            response.status(503).json({ error: "데이터베이스가 설정되지 않았습니다." });
            return;
        }
        const studentId = boundedInteger(request.params.studentId, 1, 1000000000, 0);
        if (!studentId) {
            response.status(400).json({ error: "학생 정보를 확인해 주세요." });
            return;
        }
        const period = parseTeacherRange(request.query.range);
        const cursorDate = request.query.cursor ? new Date(String(request.query.cursor)) : null;
        const cursor = cursorDate && !Number.isNaN(cursorDate.getTime()) ? cursorDate.toISOString() : null;

        try {
            const studentResult = await databasePool.query(`
                SELECT student.id,
                       student.display_name,
                       student.nickname,
                       student.student_number,
                       student.grade,
                       student.class_number,
                       student.seat_number,
                       profile.profile,
                       profile.updated_at
                FROM public.users student
                JOIN public.users teacher ON teacher.id = $1
                LEFT JOIN academy.player_profiles profile ON profile.user_id = student.id
                WHERE student.id = $2
                  AND student.role = 'student'
                  AND student.school_id = teacher.school_id
                  AND EXISTS (
                      SELECT 1
                      FROM public.teacher_class_assignments assignment
                      WHERE assignment.teacher_user_id = teacher.id
                        AND assignment.grade = student.grade
                        AND assignment.class_number = student.class_number
                  )
                LIMIT 1
            `, [request.authSession.user.id, studentId]);
            if (studentResult.rows.length === 0) {
                response.status(403).json({ error: "배정된 학생만 확인할 수 있습니다." });
                return;
            }

            const row = studentResult.rows[0];
            const profile = row.profile || {};
            const cumulative = summarizePlayerProfile(profile, missions.size);
            const periodResult = await databasePool.query(`
                SELECT count(*)::integer AS run_count,
                       coalesce(sum(duration_seconds), 0)::double precision AS duration_seconds,
                       coalesce(avg(accuracy), 0)::double precision AS average_accuracy,
                       (
                           SELECT min(all_runs.completed_at)
                           FROM academy.practice_runs all_runs
                           WHERE all_runs.user_id = $1
                       ) AS history_available_since,
                       max(completed_at) AS last_completed_at
                FROM academy.practice_runs
                WHERE user_id = $1
                  AND ($2::timestamptz IS NULL OR completed_at >= $2::timestamptz)
            `, [studentId, period.startAt]);
            const dailyResult = await databasePool.query(`
                SELECT (completed_at AT TIME ZONE 'Asia/Seoul')::date AS date,
                       count(*)::integer AS run_count,
                       coalesce(sum(duration_seconds), 0)::double precision AS duration_seconds,
                       coalesce(avg(accuracy), 0)::double precision AS average_accuracy
                FROM academy.practice_runs
                WHERE user_id = $1
                  AND ($2::timestamptz IS NULL OR completed_at >= $2::timestamptz)
                GROUP BY (completed_at AT TIME ZONE 'Asia/Seoul')::date
                ORDER BY date
            `, [studentId, period.startAt]);
            const historyResult = await databasePool.query(`
                SELECT client_run_id,
                       code_id,
                       title,
                       difficulty,
                       length,
                       score,
                       rank,
                       stars,
                       accuracy,
                       cpm,
                       duration_seconds,
                       max_combo,
                       completed_at
                FROM academy.practice_runs
                WHERE user_id = $1
                  AND ($2::timestamptz IS NULL OR completed_at >= $2::timestamptz)
                  AND ($3::timestamptz IS NULL OR completed_at < $3::timestamptz)
                ORDER BY completed_at DESC, id DESC
                LIMIT 51
            `, [studentId, period.startAt, cursor]);
            const historyRows = historyResult.rows.slice(0, 50);
            const missionRecords = profile.missions && typeof profile.missions === "object"
                ? profile.missions
                : {};
            const quests = [...missions.values()].map((mission) => {
                const record = missionRecords[mission.id] || null;
                return {
                    id: mission.id,
                    title: mission.title,
                    difficulty: mission.difficulty,
                    length: mission.length,
                    levelGroup: Number(mission.levelGroup) || 1,
                    certified: Number(record?.bestAccuracy || 0) >= BADGE_ACCURACY_THRESHOLD,
                    stars: Number(record?.stars || 0),
                    bestScore: Number(record?.bestScore || 0),
                    bestAccuracy: Number(record?.bestAccuracy || 0),
                    bestCpm: Number(record?.bestCpm || 0),
                    clears: Number(record?.clears || 0),
                    updatedAt: record?.updatedAt || null
                };
            });
            const periodRow = periodResult.rows[0] || {};

            response.setHeader("Cache-Control", "no-store");
            response.json({
                student: {
                    id: Number(row.id),
                    displayName: row.display_name || row.nickname || "이름 미등록",
                    nickname: row.nickname || "",
                    studentNumber: row.student_number || "",
                    grade: Number(row.grade),
                    classNumber: Number(row.class_number),
                    seatNumber: row.seat_number === null ? null : Number(row.seat_number),
                    profileUpdatedAt: row.updated_at || null
                },
                range: period.range,
                cumulative,
                period: {
                    runs: Number(periodRow.run_count || 0),
                    durationMinutes: Math.round((Number(periodRow.duration_seconds || 0) / 60) * 10) / 10,
                    averageAccuracy: Math.round(Number(periodRow.average_accuracy || 0) * 10) / 10,
                    historyAvailableSince: periodRow.history_available_since || null,
                    lastActivityAt: periodRow.last_completed_at || null
                },
                dailyActivity: dailyResult.rows.map((activity) => ({
                    date: activity.date,
                    runs: Number(activity.run_count),
                    durationMinutes: Math.round((Number(activity.duration_seconds || 0) / 60) * 10) / 10,
                    averageAccuracy: Math.round(Number(activity.average_accuracy || 0) * 10) / 10
                })),
                quests,
                runs: historyRows.map((history) => ({
                    clientRunId: history.client_run_id,
                    codeId: history.code_id,
                    title: history.title,
                    difficulty: history.difficulty,
                    length: history.length,
                    score: Number(history.score),
                    rank: history.rank,
                    stars: Number(history.stars),
                    accuracy: Number(history.accuracy),
                    cpm: Number(history.cpm),
                    durationSeconds: Number(history.duration_seconds),
                    maxCombo: Number(history.max_combo),
                    completedAt: history.completed_at
                })),
                nextCursor: historyResult.rows.length > 50
                    ? historyRows.at(-1)?.completed_at || null
                    : null
            });
        } catch (error) {
            console.error("Teacher student detail load error:", error.message);
            response.status(503).json({ error: "학생 상세 기록을 불러오지 못했습니다." });
        }
    });

    app.get(["/login", "/login/", "/login.html"], (request, response) => {
        if (sessionFor(request)) {
            response.redirect(302, "/");
            return;
        }
        response.sendFile(path.join(ROOT, "login.html"));
    });
    app.get(["/", "/index.html"], requirePageSession, (request, response) => {
        response.sendFile(path.join(ROOT, "index.html"));
    });
    app.get(["/teacher", "/teacher/", "/teacher.html"], requireTeacherPage, (request, response) => {
        response.sendFile(path.join(ROOT, "teacher.html"));
    });
    app.use(express.static(ROOT, { dotfiles: "deny", index: false }));

    function missionPublic(mission) {
        const { targetText, file, ...publicMission } = mission;
        return publicMission;
    }

    function roomSnapshot(room) {
        const hideRaceJudgement = room.phase === "countdown" || room.phase === "racing";
        return {
            roomCode: room.code,
            phase: room.phase,
            startsAt: room.startsAt,
            retireAt: room.retireAt,
            retireRemainingMs: room.retireAt ? Math.max(0, room.retireAt - Date.now()) : null,
            finisherId: room.finisherId,
            hostId: room.hostId,
            mission: missionPublic(room.mission),
            players: [...room.players.values()].map((player) => {
                const stats = player.tracker ? player.tracker.snapshot() : {
                    progress: 0,
                    accuracy: 100,
                    cpm: 0,
                    combo: 0,
                    lineCombo: 0,
                    maxLineCombo: 0,
                    perfectLines: 0,
                    score: 0,
                    finishedAt: null,
                    durationMs: null
                };
                if (hideRaceJudgement && player.tracker) {
                    stats.progress = player.tracker.targetText.length
                        ? Math.min(100, (player.tracker.previousValue.length / player.tracker.targetText.length) * 100)
                        : 0;
                    stats.accuracy = 100;
                    stats.cpm = 0;
                    stats.combo = 0;
                    stats.maxCombo = 0;
                    stats.lineCombo = 0;
                    stats.maxLineCombo = 0;
                    stats.perfectLines = 0;
                    stats.errors = 0;
                    stats.corrections = 0;
                    stats.score = 0;
                    stats.scoreBreakdown = { accuracy: 0, combo: 0, speed: 0 };
                    stats.finishedAt = null;
                    stats.durationMs = null;
                }
                return {
                    id: player.id,
                    nickname: player.nickname,
                    ready: player.ready,
                    connected: player.connected,
                    isHost: player.id === room.hostId,
                    ...stats
                };
            })
        };
    }

    function touch(room) {
        room.updatedAt = Date.now();
    }

    function broadcastRoom(room) {
        io.to(room.code).emit("battle:room", roomSnapshot(room));
    }

    function errorPayload(code, message) {
        return { ok: false, error: { code, message } };
    }

    function bindPlayer(socket, room, player) {
        socket.join(room.code);
        socket.data.battle = { roomCode: room.code, playerId: player.id };
        player.socketId = socket.id;
        player.connected = true;
        if (player.disconnectTimer) {
            clearTimeout(player.disconnectTimer);
            player.disconnectTimer = null;
        }
    }

    function clearRoomTimers(room) {
        if (room.countdownTimer) clearTimeout(room.countdownTimer);
        if (room.finishTimer) clearTimeout(room.finishTimer);
        for (const player of room.players.values()) {
            if (player.disconnectTimer) clearTimeout(player.disconnectTimer);
        }
    }

    function removeRoom(room, reason = "closed") {
        clearRoomTimers(room);
        rooms.delete(room.code);
        io.to(room.code).emit("battle:error", {
            code: "ROOM_CLOSED",
            message: reason === "expired"
                ? "오래 사용하지 않아 배틀방이 종료되었습니다."
                : "배틀방이 종료되었습니다."
        });
        io.in(room.code).socketsLeave(room.code);
    }

    function resultFor(room, reason, forcedWinnerId = null) {
        const players = [...room.players.values()];
        let winnerId = forcedWinnerId;
        let tie = false;

        if (!winnerId) {
            const finishedPlayers = players.filter((player) => player.tracker?.finishedAt);
            if (finishedPlayers.length === 1) {
                winnerId = finishedPlayers[0].id;
            } else {
                const ranked = finishedPlayers
                .map((player) => ({ player, stats: player.tracker?.snapshot() || {} }))
                .sort((a, b) =>
                    (b.stats.score || 0) - (a.stats.score || 0)
                    || (b.stats.accuracy || 0) - (a.stats.accuracy || 0)
                    || (b.stats.perfectLines || 0) - (a.stats.perfectLines || 0)
                    || (a.stats.finishedAt || Number.POSITIVE_INFINITY)
                        - (b.stats.finishedAt || Number.POSITIVE_INFINITY)
                );
                const first = ranked[0];
                const second = ranked[1];
                tie = Boolean(second)
                    && (first.stats.score || 0) === (second.stats.score || 0)
                    && Math.abs((first.stats.accuracy || 0) - (second.stats.accuracy || 0)) < 0.05
                    && (first.stats.perfectLines || 0) === (second.stats.perfectLines || 0);
                winnerId = tie ? null : first?.player.id || null;
            }
        }

        return {
            roomCode: room.code,
            reason,
            winnerId: tie ? null : winnerId,
            tie,
            players: players.map((player) => ({
                id: player.id,
                nickname: player.nickname,
                connected: player.connected,
                ...(player.tracker ? player.tracker.snapshot() : {})
            }))
        };
    }

    function finishRace(room, reason = "finished", forcedWinnerId = null) {
        if (room.phase === "finished") return;
        if (room.finishTimer) clearTimeout(room.finishTimer);
        room.finishTimer = null;
        room.retireAt = null;
        room.phase = "finished";
        room.finishedAt = Date.now();
        touch(room);
        io.to(room.code).emit("battle:result", resultFor(room, reason, forcedWinnerId));
        broadcastRoom(room);
    }

    function scheduleFinish(room, finisherId) {
        if (room.finishTimer || room.phase !== "racing") return;
        room.retireAt = Date.now() + retireWindowMs;
        room.finisherId = finisherId;
        io.to(room.code).emit("battle:retire", {
            retireAt: room.retireAt,
            durationMs: retireWindowMs,
            finisherId
        });
        broadcastRoom(room);
        room.finishTimer = setTimeout(() => finishRace(room, "retired"), retireWindowMs);
    }

    function cancelCountdown(room) {
        if (room.countdownTimer) clearTimeout(room.countdownTimer);
        room.countdownTimer = null;
        room.phase = "waiting";
        room.startsAt = null;
        room.retireAt = null;
        room.finisherId = null;
        for (const player of room.players.values()) {
            player.ready = false;
            player.tracker = null;
        }
        broadcastRoom(room);
    }

    function maybeStartCountdown(room) {
        const players = [...room.players.values()];
        if (
            room.phase !== "waiting"
            || players.length !== 2
            || players.some((player) => !player.ready || !player.connected)
        ) return;

        room.phase = "countdown";
        room.startsAt = Date.now() + COUNTDOWN_MS;
        touch(room);
        io.to(room.code).emit("battle:countdown", {
            startsAt: room.startsAt,
            countdownMs: COUNTDOWN_MS,
            targetText: room.mission.targetText
        });
        broadcastRoom(room);

        room.countdownTimer = setTimeout(() => {
            if (room.phase !== "countdown") return;
            room.phase = "racing";
            for (const player of room.players.values()) {
                player.tracker = new RaceTracker(
                    room.mission.targetText,
                    room.startsAt,
                    TARGET_CPM[room.mission.length] || TARGET_CPM.short
                );
            }
            touch(room);
            io.to(room.code).emit("battle:start", { startsAt: room.startsAt });
            broadcastRoom(room);
        }, COUNTDOWN_MS);
    }

    io.on("connection", (socket) => {
        socket.on("battle:create", (payload = {}, acknowledge = () => {}) => {
            const nickname = sanitizeNickname(payload.nickname);
            const mission = missions.get(String(payload.missionId || ""));
            if (!isValidNickname(nickname)) {
                acknowledge(errorPayload("INVALID_NICKNAME", "닉네임은 2~12자로 입력해 주세요."));
                return;
            }
            if (!mission) {
                acknowledge(errorPayload("INVALID_MISSION", "선택한 배틀 미션을 찾을 수 없습니다."));
                return;
            }

            const code = createRoomCode(rooms);
            const player = {
                id: crypto.randomUUID(),
                resumeToken: crypto.randomBytes(24).toString("base64url"),
                nickname,
                ready: false,
                connected: true,
                tracker: null,
                inputWindow: [],
                lastSequence: 0
            };
            const room = {
                code,
                mission,
                hostId: player.id,
                phase: "waiting",
                players: new Map([[player.id, player]]),
                createdAt: Date.now(),
                updatedAt: Date.now(),
                startsAt: null,
                retireAt: null,
                finisherId: null,
                finishedAt: null,
                countdownTimer: null,
                finishTimer: null
            };
            rooms.set(code, room);
            bindPlayer(socket, room, player);
            acknowledge({
                ok: true,
                playerId: player.id,
                resumeToken: player.resumeToken,
                room: roomSnapshot(room),
                targetText: room.phase === "waiting" ? null : room.mission.targetText
            });
            broadcastRoom(room);
        });

        socket.on("battle:preview", (payload = {}, acknowledge = () => {}) => {
            const roomCode = String(payload.roomCode || "").trim().toUpperCase();
            const room = rooms.get(roomCode);
            if (!room) {
                acknowledge(errorPayload("ROOM_NOT_FOUND", "방 코드를 다시 확인해 주세요."));
                return;
            }
            if (room.phase !== "waiting") {
                acknowledge(errorPayload("ALREADY_STARTED", "이미 시작된 배틀방입니다."));
                return;
            }
            if (room.players.size >= 2) {
                acknowledge(errorPayload("ROOM_FULL", "이미 두 명이 참가한 배틀방입니다."));
                return;
            }

            const host = room.players.get(room.hostId);
            acknowledge({
                ok: true,
                room: {
                    roomCode: room.code,
                    mission: missionPublic(room.mission),
                    hostNickname: host?.nickname || "HOST"
                },
                targetText: room.mission.targetText
            });
        });

        socket.on("battle:join", (payload = {}, acknowledge = () => {}) => {
            const roomCode = String(payload.roomCode || "").trim().toUpperCase();
            const nickname = sanitizeNickname(payload.nickname);
            const room = rooms.get(roomCode);
            if (!room) {
                acknowledge(errorPayload("ROOM_NOT_FOUND", "방 코드를 다시 확인해 주세요."));
                return;
            }
            if (!isValidNickname(nickname)) {
                acknowledge(errorPayload("INVALID_NICKNAME", "닉네임은 2~12자로 입력해 주세요."));
                return;
            }
            if (room.phase !== "waiting") {
                acknowledge(errorPayload("ALREADY_STARTED", "이미 시작된 배틀방입니다."));
                return;
            }
            if (room.players.size >= 2) {
                acknowledge(errorPayload("ROOM_FULL", "이미 두 명이 참가한 배틀방입니다."));
                return;
            }
            if ([...room.players.values()].some((player) => player.nickname === nickname)) {
                acknowledge(errorPayload("DUPLICATE_NICKNAME", "상대와 다른 닉네임을 사용해 주세요."));
                return;
            }

            const player = {
                id: crypto.randomUUID(),
                resumeToken: crypto.randomBytes(24).toString("base64url"),
                nickname,
                ready: false,
                connected: true,
                tracker: null,
                inputWindow: [],
                lastSequence: 0
            };
            room.players.set(player.id, player);
            bindPlayer(socket, room, player);
            touch(room);
            acknowledge({
                ok: true,
                playerId: player.id,
                resumeToken: player.resumeToken,
                room: roomSnapshot(room),
                targetText: room.phase === "waiting" ? null : room.mission.targetText
            });
            broadcastRoom(room);
        });

        socket.on("battle:resume", (payload = {}, acknowledge = () => {}) => {
            const room = rooms.get(String(payload.roomCode || "").toUpperCase());
            const player = room?.players.get(String(payload.playerId || ""));
            if (!room || !player || player.resumeToken !== payload.resumeToken) {
                acknowledge(errorPayload("RESUME_FAILED", "배틀방에 다시 연결하지 못했습니다."));
                return;
            }
            bindPlayer(socket, room, player);
            touch(room);
            acknowledge({
                ok: true,
                playerId: player.id,
                resumeToken: player.resumeToken,
                room: roomSnapshot(room),
                targetText: room.phase === "waiting" ? null : room.mission.targetText,
                elapsedMs: room.phase === "racing" ? Math.max(0, Date.now() - room.startsAt) : 0
            });
            broadcastRoom(room);
        });

        socket.on("battle:ready", (payload = {}, acknowledge = () => {}) => {
            const binding = socket.data.battle;
            const room = rooms.get(binding?.roomCode);
            const player = room?.players.get(binding?.playerId);
            if (!room || !player || room.phase !== "waiting") {
                acknowledge(errorPayload("NOT_WAITING", "지금은 준비 상태를 변경할 수 없습니다."));
                return;
            }
            player.ready = Boolean(payload.ready);
            touch(room);
            acknowledge({ ok: true });
            broadcastRoom(room);
            maybeStartCountdown(room);
        });

        socket.on("battle:input", (payload = {}, acknowledge = () => {}) => {
            const binding = socket.data.battle;
            const room = rooms.get(binding?.roomCode);
            const player = room?.players.get(binding?.playerId);
            if (!room || !player || room.phase !== "racing" || !player.tracker) {
                acknowledge(errorPayload("NOT_RACING", "아직 레이스가 시작되지 않았습니다."));
                return;
            }
            if (player.tracker.finishedAt) {
                acknowledge({ ok: true });
                return;
            }

            const now = Date.now();
            player.inputWindow = player.inputWindow.filter((time) => now - time < 1000);
            if (player.inputWindow.length >= MAX_INPUT_EVENTS_PER_SECOND) {
                acknowledge(errorPayload("RATE_LIMIT", "입력 전송이 너무 빠릅니다."));
                return;
            }
            player.inputWindow.push(now);
            const sequence = Number(payload.sequence);
            if (!Number.isInteger(sequence) || sequence <= player.lastSequence) {
                acknowledge(errorPayload("STALE_INPUT", "입력 순서가 올바르지 않습니다."));
                return;
            }
            player.lastSequence = sequence;
            player.tracker.apply(payload.value, now);
            touch(room);
            acknowledge({ ok: true });
            io.to(room.code).emit("battle:state", roomSnapshot(room));
            if (player.tracker.finishedAt) {
                const everyoneFinished = [...room.players.values()]
                    .every((item) => Boolean(item.tracker?.finishedAt));
                if (everyoneFinished) finishRace(room, "scored");
                else scheduleFinish(room, player.id);
            }
        });

        socket.on("battle:leave", () => {
            const binding = socket.data.battle;
            const room = rooms.get(binding?.roomCode);
            const player = room?.players.get(binding?.playerId);
            if (!room || !player) return;
            if (room.phase === "finished") {
                room.players.delete(player.id);
                touch(room);
                if (room.players.size === 0) removeRoom(room);
                else broadcastRoom(room);
            } else if (room.phase === "racing") {
                const opponent = [...room.players.values()].find((item) => item.id !== player.id);
                finishRace(room, "forfeit", opponent?.id || null);
            } else if (player.id === room.hostId || room.players.size <= 1) {
                removeRoom(room);
            } else {
                room.players.delete(player.id);
                touch(room);
                broadcastRoom(room);
            }
            socket.leave(room.code);
            socket.data.battle = null;
        });

        socket.on("disconnect", () => {
            const binding = socket.data.battle;
            const room = rooms.get(binding?.roomCode);
            const player = room?.players.get(binding?.playerId);
            if (!room || !player) return;

            player.connected = false;
            player.socketId = null;
            touch(room);
            if (room.phase === "countdown") cancelCountdown(room);
            else broadcastRoom(room);

            player.disconnectTimer = setTimeout(() => {
                if (player.connected || !rooms.has(room.code)) return;
                if (room.phase === "racing") {
                    const opponent = [...room.players.values()].find((item) => item.id !== player.id);
                    finishRace(room, "forfeit", opponent?.id || null);
                } else if (player.id === room.hostId || room.players.size <= 1) {
                    removeRoom(room);
                } else {
                    room.players.delete(player.id);
                    broadcastRoom(room);
                }
            }, RECONNECT_GRACE_MS);
            player.disconnectTimer.unref?.();
        });
    });

    const cleanupTimer = setInterval(() => {
        const now = Date.now();
        for (const room of rooms.values()) {
            const lifetime = room.phase === "finished" ? FINISHED_ROOM_MS : ROOM_IDLE_MS;
            if (now - room.updatedAt > lifetime) removeRoom(room, "expired");
        }
    }, 30 * 1000);
    cleanupTimer.unref();

    const authCleanupTimer = setInterval(() => {
        const now = Date.now();
        for (const [sessionId, session] of sessions) {
            if (session.expiresAt <= now) sessions.delete(sessionId);
        }
        for (const [key, attempt] of loginAttempts) {
            if (now - attempt.startedAt >= LOGIN_WINDOW_MS) loginAttempts.delete(key);
        }
    }, 5 * 60 * 1000);
    authCleanupTimer.unref();

    return { app, server, io, rooms, missions, close: () => new Promise((resolve) => {
        clearInterval(cleanupTimer);
        clearInterval(authCleanupTimer);
        for (const room of rooms.values()) clearRoomTimers(room);
        io.close(() => server.close(async () => {
            if (ownsDatabasePool) await databasePool.end().catch(() => {});
            resolve();
        }));
    }) };
}

if (require.main === module) {
    const battleServer = createBattleServer();
    battleServer.server.listen(PORT, "0.0.0.0", () => {
        console.log("Python Quest Academy");
        console.log(`  Local:   http://localhost:${PORT}`);

        const networkAddresses = Object.values(os.networkInterfaces())
            .flat()
            .filter((address) => address?.family === "IPv4" && !address.internal)
            .map((address) => address.address);

        for (const address of [...new Set(networkAddresses)]) {
            console.log(`  Network: http://${address}:${PORT}`);
        }
    });
}

module.exports = {
    RaceTracker,
    createBattleServer,
    loadMissions,
    normalizeCode,
    sanitizeNickname
};
