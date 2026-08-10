"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const express = require("express");
const { Server } = require("socket.io");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8000;
const ROOM_IDLE_MS = 10 * 60 * 1000;
const FINISHED_ROOM_MS = 5 * 60 * 1000;
const RECONNECT_GRACE_MS = 15 * 1000;
const COUNTDOWN_MS = 3000;
const FINISH_WINDOW_MS = 180;
const MAX_INPUT_EVENTS_PER_SECOND = 20;

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
    constructor(targetText, startsAt) {
        this.targetText = targetText;
        this.startsAt = startsAt;
        this.previousValue = "";
        this.attempts = 0;
        this.correctAttempts = 0;
        this.errors = 0;
        this.corrections = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.finishedAt = null;
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
            }
        }
        this.corrections += change.removed.length;
        this.previousValue = value;

        if (value === this.targetText && !this.finishedAt) this.finishedAt = now;
        return this.snapshot(now);
    }

    snapshot(now = Date.now()) {
        const correct = this.countCorrectPositions(this.previousValue);
        const elapsed = Math.max(1, now - this.startsAt);
        const accuracy = this.attempts
            ? (this.correctAttempts / this.attempts) * 100
            : 100;
        return {
            progress: this.targetText.length ? (correct / this.targetText.length) * 100 : 0,
            accuracy,
            cpm: Math.round((correct * 60000) / elapsed),
            combo: this.combo,
            maxCombo: this.maxCombo,
            errors: this.errors,
            corrections: this.corrections,
            finishedAt: this.finishedAt,
            durationMs: this.finishedAt ? this.finishedAt - this.startsAt : null
        };
    }
}

function createBattleServer(options = {}) {
    const app = express();
    const server = http.createServer(app);
    const io = new Server(server, {
        cors: { origin: false },
        maxHttpBufferSize: 64 * 1024
    });
    const missions = options.missions || loadMissions();
    const rooms = new Map();

    app.use((request, response, next) => {
        if (/^\/(?:server\.js|package(?:-lock)?\.json|tests)(?:\/|$)/.test(request.path)) {
            response.sendStatus(404);
            return;
        }
        next();
    });
    app.use(express.static(ROOT, { dotfiles: "deny", index: "index.html" }));

    function missionPublic(mission) {
        const { targetText, file, ...publicMission } = mission;
        return publicMission;
    }

    function roomSnapshot(room) {
        return {
            roomCode: room.code,
            phase: room.phase,
            startsAt: room.startsAt,
            hostId: room.hostId,
            mission: missionPublic(room.mission),
            players: [...room.players.values()].map((player) => ({
                id: player.id,
                nickname: player.nickname,
                ready: player.ready,
                connected: player.connected,
                isHost: player.id === room.hostId,
                ...(player.tracker ? player.tracker.snapshot() : {
                    progress: 0,
                    accuracy: 100,
                    cpm: 0,
                    combo: 0,
                    finishedAt: null,
                    durationMs: null
                })
            }))
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
            const finished = players.filter((player) => player.tracker?.finishedAt);
            if (finished.length === 1) {
                winnerId = finished[0].id;
            } else if (finished.length === 2) {
                finished.sort((a, b) => a.tracker.finishedAt - b.tracker.finishedAt);
                const timeDifference = Math.abs(
                    finished[0].tracker.finishedAt - finished[1].tracker.finishedAt
                );
                if (timeDifference <= 150) {
                    const firstAccuracy = finished[0].tracker.snapshot().accuracy;
                    const secondAccuracy = finished[1].tracker.snapshot().accuracy;
                    if (Math.abs(firstAccuracy - secondAccuracy) < 0.05) tie = true;
                    else winnerId = firstAccuracy > secondAccuracy ? finished[0].id : finished[1].id;
                } else {
                    winnerId = finished[0].id;
                }
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
        room.phase = "finished";
        room.finishedAt = Date.now();
        touch(room);
        io.to(room.code).emit("battle:result", resultFor(room, reason, forcedWinnerId));
        broadcastRoom(room);
    }

    function scheduleFinish(room) {
        if (room.finishTimer || room.phase !== "racing") return;
        room.finishTimer = setTimeout(() => finishRace(room), FINISH_WINDOW_MS);
    }

    function cancelCountdown(room) {
        if (room.countdownTimer) clearTimeout(room.countdownTimer);
        room.countdownTimer = null;
        room.phase = "waiting";
        room.startsAt = null;
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
            targetText: room.mission.targetText
        });
        broadcastRoom(room);

        room.countdownTimer = setTimeout(() => {
            if (room.phase !== "countdown") return;
            room.phase = "racing";
            for (const player of room.players.values()) {
                player.tracker = new RaceTracker(room.mission.targetText, room.startsAt);
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
                targetText: room.phase === "waiting" ? null : room.mission.targetText
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
            if (player.tracker.finishedAt) scheduleFinish(room);
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

    return { app, server, io, rooms, missions, close: () => new Promise((resolve) => {
        clearInterval(cleanupTimer);
        for (const room of rooms.values()) clearRoomTimers(room);
        io.close(() => server.close(resolve));
    }) };
}

if (require.main === module) {
    const battleServer = createBattleServer();
    battleServer.server.listen(PORT, "0.0.0.0", () => {
        console.log(`Python Quest Academy: http://localhost:${PORT}`);
    });
}

module.exports = {
    RaceTracker,
    createBattleServer,
    loadMissions,
    normalizeCode,
    sanitizeNickname
};
