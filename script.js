"use strict";

// =========================================================
// Python Quest Academy
// 코드 타이핑 학습을 월드 탐험과 전투 흐름으로 구성한 클라이언트 앱
// =========================================================

const PROFILE_VERSION = 2;
const LEGACY_PROFILE_KEYS = ["pythonQuestProfileV2", "gameProgress", "pythonTypingRecords"];
const PYODIDE_VERSION = "0.24.1";
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const PYODIDE_SCRIPT_URL = `${PYODIDE_INDEX_URL}pyodide.js`;

const WORLD_CONFIG = {
    beginner: {
        order: 1,
        code: "월드 01",
        symbol: "01",
        title: "문법 플레이룸",
        kicker: "STARTER STAGE",
        art: "assets/world-01-grammar.webp",
        artAlt: "키보드 발판을 달리며 문법 게이트로 향하는 로봇 캐릭터",
        hubArt: "assets/world-01-hub.webp",
        hubVideo: "assets/world-01-hub.mp4",
        hubAlt: "키보드 길을 따라 다섯 문법 스테이지를 탐험하는 로봇 캐릭터",
        stageArts: [
            "assets/world-01-zone-01-v2.webp",
            "assets/world-01-zone-02-v2.webp",
            "assets/world-01-zone-03-v2.webp",
            "assets/world-01-zone-04-v2.webp",
            "assets/world-01-zone-05-v2.webp"
        ],
        stageNames: [
            "첫 출력 신호",
            "메시지 메이커",
            "연산 콤보 존",
            "문자열 보관소",
            "숫자 변수 연구실"
        ],
        headline: "첫 코드를 모아 플레이룸을 완성해요.",
        description: "출력, 변수, 연산과 자료형을 짧은 퀘스트로 플레이하며 파이썬 감각을 깨워요.",
        cardDescription: "처음이어도 괜찮아요. 짧은 코드부터 리듬을 타듯 시작해요.",
        enemies: ["출력 비콘", "메시지 팩토리", "연산 콤보", "문자열 캡슐", "숫자 에너지"]
    },
    intermediate: {
        order: 2,
        code: "월드 02",
        symbol: "02",
        title: "로직 아케이드",
        kicker: "LOGIC STAGE",
        art: "assets/world-02-logic.webp",
        artAlt: "퍼즐 큐브를 연결해 로직 트랙을 완성하는 로봇 캐릭터",
        hubArt: "assets/world-02-hub.webp",
        hubVideo: "assets/world-02-hub.mp4",
        hubAlt: "빛나는 레일을 따라 다섯 로직 퍼즐 구역을 탐험하는 로봇 캐릭터",
        stageArts: [
            "assets/world-02-zone-01-v2.webp",
            "assets/world-02-zone-02-v2.webp",
            "assets/world-02-zone-03-v2.webp",
            "assets/world-02-zone-04-v2.webp",
            "assets/world-02-zone-05-v2.webp"
        ],
        stageNames: [
            "조건 분기 게이트",
            "등급 판정 센터",
            "문자열 스캐너",
            "리스트 큐브 랩",
            "반복문 리액터"
        ],
        headline: "흩어진 로직 조각으로 콤보를 이어가요.",
        description: "조건문, 반복문, 함수와 자료구조를 연결하며 문제 해결 루틴을 완성해요.",
        cardDescription: "조건과 반복을 연결하고, 한 단계 더 짜릿한 로직 콤보에 도전해요.",
        enemies: ["분기 스위치", "판정 스캐너", "문자열 시그널", "리스트 큐브", "루프 리액터"]
    },
    advanced: {
        order: 3,
        code: "월드 03",
        symbol: "03",
        title: "데이터 스테이지",
        kicker: "FINAL STAGE",
        art: "assets/world-03-data.webp",
        artAlt: "차트와 데이터 오브를 움직이며 파이널 포털을 여는 로봇 캐릭터",
        hubArt: "assets/world-03-hub.webp",
        hubVideo: "assets/world-03-hub.mp4",
        hubAlt: "데이터 도시의 다섯 분석 구역을 연결하며 대시보드를 조작하는 로봇 캐릭터",
        stageArts: [
            "assets/world-03-zone-01-v2.webp",
            "assets/world-03-zone-02-v2.webp",
            "assets/world-03-zone-03-v2.webp",
            "assets/world-03-zone-04-v2.webp",
            "assets/world-03-zone-05-v2.webp"
        ],
        stageNames: [
            "데이터프레임 보드",
            "넘파이 배열 플라자",
            "모델 트레이닝 가든",
            "결측값 클리닝 랩",
            "차트 피날레"
        ],
        headline: "데이터를 움직여 나만의 결과 화면을 만들어요.",
        description: "NumPy, pandas, 시각화와 머신러닝 코드를 입력하고 실제 실행 결과까지 확인해요.",
        cardDescription: "데이터와 차트를 직접 움직이는 파이널 스테이지를 플레이해요.",
        enemies: ["데이터 보드", "배열 매트릭스", "모델 가든", "결측치 고스트", "차트 스타"]
    }
};

const LENGTH_CONFIG = {
    short: {
        order: 1,
        code: "MODE 01",
        label: "워밍업",
        shortLabel: "워밍업",
        description: "짧은 코드로 가볍게 한 판",
        entryTitle: "워밍업 스테이지",
        entryDescription: "짧은 코드로 파이썬 감각을 빠르게 깨우는 모드예요.",
        reward: 1,
        targetCpm: 150
    },
    medium: {
        order: 2,
        code: "MODE 02",
        label: "메인 퀘스트",
        shortLabel: "메인 퀘스트",
        description: "여러 코드를 이어서 플레이",
        entryTitle: "메인 퀘스트 스테이지",
        entryDescription: "여러 문법을 연결하며 한 단계씩 공략하는 모드예요.",
        reward: 1.25,
        targetCpm: 125
    },
    long: {
        order: 3,
        code: "MODE 03",
        label: "파이널 스테이지",
        shortLabel: "파이널",
        description: "프로그램 하나를 완성하는 도전",
        entryTitle: "파이널 스테이지",
        entryDescription: "긴 프로그램을 완성하며 최종 보상에 도전하는 모드예요.",
        reward: 1.6,
        targetCpm: 105
    }
};

const LEVEL_TITLES = [
    { level: 1, title: "첫 코드 플레이어" },
    { level: 2, title: "문법 루키" },
    { level: 4, title: "콤보 메이커" },
    { level: 7, title: "로직 플레이어" },
    { level: 10, title: "파이썬 에이스" },
    { level: 15, title: "데이터 크리에이터" },
    { level: 20, title: "코드 레전드" }
];

const BADGE_ACCURACY_THRESHOLD = 80;

const STAGE_BADGES = [
    { id: "grammar_warmup", difficulty: "beginner", length: "short", title: "문법 스파크", image: "assets/badge-grammar-warmup.webp" },
    { id: "grammar_main", difficulty: "beginner", length: "medium", title: "문법 크리스탈", image: "assets/badge-grammar-main.webp" },
    { id: "grammar_final", difficulty: "beginner", length: "long", title: "플레이룸 챔피언", image: "assets/badge-grammar-final.webp" },
    { id: "logic_warmup", difficulty: "intermediate", length: "short", title: "로직 스파크", image: "assets/badge-logic-warmup.webp" },
    { id: "logic_main", difficulty: "intermediate", length: "medium", title: "로직 큐브", image: "assets/badge-logic-main.webp" },
    { id: "logic_final", difficulty: "intermediate", length: "long", title: "아케이드 챔피언", image: "assets/badge-logic-final.webp" },
    { id: "data_warmup", difficulty: "advanced", length: "short", title: "데이터 스파크", image: "assets/badge-data-warmup.webp" },
    { id: "data_main", difficulty: "advanced", length: "medium", title: "데이터 코어", image: "assets/badge-data-main.webp" },
    { id: "data_final", difficulty: "advanced", length: "long", title: "데이터 챔피언", image: "assets/badge-data-final.webp" }
];

const MASTER_BADGES = [
    { id: "grammar_master", difficulty: "beginner", title: "문법 마스터", image: "assets/badge-grammar-master.webp" },
    { id: "logic_master", difficulty: "intermediate", title: "로직 마스터", image: "assets/badge-logic-master.webp" },
    { id: "data_master", difficulty: "advanced", title: "데이터 마스터", image: "assets/badge-data-master.webp" }
];

function qualifiedMissionProgress(profile, difficulty, length, metadata = AppState.metadata) {
    const codes = metadata?.[difficulty]?.[length] || [];
    const qualified = codes.filter((code) =>
        Number(profile.missions[code.id]?.bestAccuracy || 0) >= BADGE_ACCURACY_THRESHOLD
    ).length;
    return { current: qualified, total: codes.length };
}

function masterBadgeProgress(profile, difficulty, metadata = AppState.metadata) {
    const lengths = Object.keys(LENGTH_CONFIG);
    const current = lengths.filter((length) => {
        const progress = qualifiedMissionProgress(profile, difficulty, length, metadata);
        return progress.total > 0 && progress.current === progress.total;
    }).length;
    return { current, total: lengths.length };
}

const STAGE_ACHIEVEMENTS = [
    ...STAGE_BADGES.map((badge) => ({
        ...badge,
        worldTitle: WORLD_CONFIG[badge.difficulty].title,
        description: `${LENGTH_CONFIG[badge.length].label} 퀘스트를 모두 정확도 ${BADGE_ACCURACY_THRESHOLD}% 이상으로 완료했어요.`,
        condition: `${LENGTH_CONFIG[badge.length].label} 퀘스트 15개를 각각 정확도 ${BADGE_ACCURACY_THRESHOLD}% 이상으로 완료`,
        progress: (profile) => qualifiedMissionProgress(profile, badge.difficulty, badge.length),
        check: (profile) => {
            const progress = qualifiedMissionProgress(profile, badge.difficulty, badge.length);
            return progress.total > 0 && progress.current === progress.total;
        }
    })),
    ...MASTER_BADGES.map((badge) => ({
        ...badge,
        worldTitle: WORLD_CONFIG[badge.difficulty].title,
        description: `${WORLD_CONFIG[badge.difficulty].title}의 세 스테이지를 모두 정복했어요.`,
        condition: `${WORLD_CONFIG[badge.difficulty].title} 스테이지 배지 3개 획득`,
        progress: (profile) => masterBadgeProgress(profile, badge.difficulty),
        check: (profile) => {
            const progress = masterBadgeProgress(profile, badge.difficulty);
            return progress.current === progress.total;
        }
    }))
];

const HIDDEN_ACHIEVEMENTS = [
    {
        id: "first_clear",
        image: "assets/achievement-first-clear.webp",
        title: "첫 클리어",
        description: "첫 번째 코드 퀘스트를 완료했어요.",
        condition: "코드 퀘스트를 1회 완료",
        check: (profile) => profile.totalRuns >= 1
    },
    {
        id: "perfect_code",
        image: "assets/achievement-perfect-code.webp",
        title: "퍼펙트 플레이",
        description: "정확도 100%로 퀘스트를 클리어했어요.",
        condition: "한 퀘스트를 정확도 100%로 완료",
        check: (profile) => profile.perfectRuns >= 1
    },
    {
        id: "combo_50",
        image: "assets/achievement-combo-50.webp",
        title: "50 COMBO",
        description: "한 판에서 50 콤보를 달성했어요.",
        condition: "한 번의 플레이에서 50 콤보 달성",
        check: (_profile, result) => Boolean(result && result.maxCombo >= 50)
    },
    {
        id: "boss_clear",
        image: "assets/achievement-boss-clear.webp",
        title: "파이널 클리어",
        description: "파이널 스테이지 퀘스트를 완료했어요.",
        condition: "아무 월드의 파이널 스테이지 퀘스트를 1회 완료",
        check: (profile, result) => Boolean(
            result?.length === "long"
            || Object.values(profile.missions).some((mission) => mission.length === "long")
        )
    },
    {
        id: "ten_clears",
        image: "assets/achievement-ten-clears.webp",
        title: "10판 완료",
        description: "코드 퀘스트를 누적 10회 완료했어요.",
        condition: "코드 퀘스트를 누적 10회 완료",
        check: (profile) => profile.totalRuns >= 10
    },
    {
        id: "speed_250",
        image: "assets/achievement-speed-250.webp",
        title: "스피드 스타",
        description: "타수/분 250 이상을 달성했어요.",
        condition: "한 퀘스트에서 타수/분 250 이상 달성",
        check: (profile) => profile.bestCpm >= 250
    }
].map((achievement) => ({ ...achievement, secret: true }));

const ACHIEVEMENTS = [...STAGE_ACHIEVEMENTS, ...HIDDEN_ACHIEVEMENTS];

const ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map((achievement) => achievement.id));

const AppState = {
    currentScreen: "main-menu",
    currentDifficulty: "beginner",
    currentLength: "short",
    currentCode: null,
    currentResult: null,
    game: null,
    profile: null,
    metadata: null,
    pendingAchievements: [],
    achievementDetailTrigger: null,
    pyodide: null,
    pyodidePromise: null,
    audioContext: null,
    profileSaveQueue: Promise.resolve(),
    initialized: false
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
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

function escapeHTML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function createClientRunId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();

    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function dayDifference(fromKey, toKey) {
    if (!fromKey || !toKey) return Number.POSITIVE_INFINITY;
    const from = new Date(`${fromKey}T00:00:00`);
    const to = new Date(`${toKey}T00:00:00`);
    return Math.round((to - from) / 86400000);
}

function formatTime(totalSeconds) {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function defaultProfile() {
    const prefersReducedMotion = window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    return {
        version: PROFILE_VERSION,
        xp: 0,
        coins: 0,
        totalRuns: 0,
        bestCpm: 0,
        totalCorrectAttempts: 0,
        totalAttempts: 0,
        perfectRuns: 0,
        missions: {},
        achievements: [],
        recentRuns: [],
        lastMission: null,
        streak: {
            current: 0,
            best: 0,
            lastPlayed: null
        },
        daily: {
            date: localDateKey(),
            runs: 0
        },
        settings: {
            sound: false,
            motion: !prefersReducedMotion
        }
    };
}

function mergeProfile(stored) {
    const base = defaultProfile();
    const candidate = stored && typeof stored === "object" ? stored : {};

    return {
        ...base,
        ...candidate,
        version: PROFILE_VERSION,
        missions: candidate.missions && typeof candidate.missions === "object"
            ? candidate.missions
            : {},
        achievements: Array.isArray(candidate.achievements)
            ? candidate.achievements.filter((id) => ACHIEVEMENT_IDS.has(id))
            : [],
        recentRuns: Array.isArray(candidate.recentRuns)
            ? candidate.recentRuns.slice(0, 12)
            : [],
        streak: {
            ...base.streak,
            ...(candidate.streak || {})
        },
        daily: {
            ...base.daily,
            ...(candidate.daily || {})
        },
        settings: {
            ...base.settings,
            ...(candidate.settings || {})
        }
    };
}

function clearLegacyProfileStorage() {
    try {
        for (const key of LEGACY_PROFILE_KEYS) localStorage.removeItem(key);
    } catch (error) {
        console.warn("기존 브라우저 기록을 정리하지 못했습니다.", error);
    }
}

async function parseProfileResponse(response, fallbackMessage) {
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) {
        window.location.replace("/login");
        throw new Error("로그인이 만료되었습니다.");
    }
    if (!response.ok) throw new Error(payload.error || fallbackMessage);
    return payload;
}

async function loadProfile() {
    clearLegacyProfileStorage();
    const response = await fetch("/api/profile", {
        headers: { Accept: "application/json" },
        cache: "no-store"
    });
    const payload = await parseProfileResponse(response, "플레이 기록을 불러오지 못했습니다.");
    AppState.profile = mergeProfile(payload.profile);

    const today = localDateKey();
    let profileChanged = !payload.profile || Object.keys(payload.profile).length === 0;
    if (AppState.profile.daily.date !== today) {
        AppState.profile.daily = { date: today, runs: 0 };
        profileChanged = true;
    }

    if (profileChanged) await saveProfile();
    return AppState.profile;
}

async function saveProfile(runResult = null) {
    const snapshot = JSON.parse(JSON.stringify(AppState.profile));
    const operation = AppState.profileSaveQueue.then(async () => {
        const response = await fetch(runResult ? "/api/profile/runs" : "/api/profile", {
            method: runResult ? "POST" : "PUT",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({
                profile: snapshot,
                ...(runResult
                    ? {
                        run: {
                            clientRunId: runResult.clientRunId,
                            codeId: runResult.codeId,
                            score: runResult.score,
                            rank: runResult.rank,
                            stars: runResult.stars,
                            accuracy: runResult.accuracy,
                            cpm: runResult.cpm,
                            durationSeconds: runResult.durationSeconds,
                            maxCombo: runResult.maxCombo,
                            attempts: runResult.attempts,
                            correctAttempts: runResult.correctAttempts,
                            errors: runResult.errors,
                            corrections: runResult.corrections,
                            completedAt: runResult.completedAt
                        }
                    }
                    : {})
            })
        });
        return parseProfileResponse(response, "플레이 기록을 저장하지 못했습니다.");
    });
    AppState.profileSaveQueue = operation.catch(() => {});

    try {
        const payload = await operation;
        AppState.profile = mergeProfile(payload.profile);
        return AppState.profile;
    } catch (error) {
        console.error("DB 플레이 기록 저장 실패:", error);
        showToast(error.message || "DB에 플레이 기록을 저장하지 못했습니다.", "error");
        throw error;
    }
}

function getLevelData(xp = 0) {
    const safeXp = Math.max(0, Number(xp) || 0);
    const level = Math.floor(Math.sqrt(safeXp / 100)) + 1;
    const currentFloor = 100 * Math.pow(level - 1, 2);
    const nextFloor = 100 * Math.pow(level, 2);
    const withinLevel = safeXp - currentFloor;
    const required = nextFloor - currentFloor;

    return {
        level,
        currentFloor,
        nextFloor,
        withinLevel,
        required,
        progress: required > 0 ? clamp((withinLevel / required) * 100, 0, 100) : 0
    };
}

function getLevelTitle(level) {
    return LEVEL_TITLES
        .filter((item) => item.level <= level)
        .at(-1)?.title || LEVEL_TITLES[0].title;
}

function getNextLevelTitle(level) {
    return LEVEL_TITLES.find((item) => item.level > level)?.title || "코드 레전드";
}

function getProfileSummary() {
    const missionRecords = Object.values(AppState.profile.missions);
    return {
        completedMissions: missionRecords.length,
        stars: missionRecords.reduce((total, record) => total + (Number(record.stars) || 0), 0),
        accuracy: AppState.profile.totalAttempts > 0
            ? Math.round((AppState.profile.totalCorrectAttempts / AppState.profile.totalAttempts) * 100)
            : 100
    };
}

async function getMetadata() {
    if (AppState.metadata) return AppState.metadata;

    if (typeof window.ensureCodeSystemInitialized !== "function" ||
        typeof window.loadMetadata !== "function") {
        throw new Error("코드 데이터 시스템을 찾을 수 없습니다.");
    }

    const ready = await window.ensureCodeSystemInitialized();
    if (!ready) {
        throw new Error("코드 데이터 시스템을 초기화하지 못했습니다.");
    }

    const metadata = await window.loadMetadata();
    if (!metadata || !metadata.beginner) {
        throw new Error("미션 메타데이터가 비어 있습니다.");
    }

    AppState.metadata = metadata;
    return metadata;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function setWidth(id, value) {
    const element = document.getElementById(id);
    if (element) element.style.width = `${clamp(value, 0, 100)}%`;
}

function showScreen(screenId, options = {}) {
    const target = document.getElementById(screenId);
    if (!target) return;

    $$(".screen").forEach((screen) => {
        const active = screen === target;
        screen.classList.toggle("active", active);
        screen.setAttribute("aria-hidden", active ? "false" : "true");
    });

    AppState.currentScreen = screenId;
    document.body.dataset.screen = screenId;

    $$('video[data-screen-video]').forEach((video) => {
        const isActive = video.closest('.screen') === target;
        if (isActive) {
            video.play().catch(() => {
                // 자동 재생이 차단되면 poster 이미지가 대체 화면으로 유지됩니다.
            });
        } else {
            video.pause();
        }
    });

    const missionWorldVideo = $("#mission-world-video");
    if (missionWorldVideo) {
        if (screenId === "mission-screen" && !missionWorldVideo.hidden) {
            missionWorldVideo.play().catch(() => {
                // 자동 재생이 차단되면 poster 이미지가 그대로 대체 화면이 됩니다.
            });
        } else {
            missionWorldVideo.pause();
        }
    }

    if (!options.preserveScroll) {
        // 화면 전환은 항상 맨 위에서 시작해 이전 화면의 스크롤 위치가 비치지 않게 합니다.
        window.scrollTo({ top: 0, behavior: "auto" });
    }

    const heading = target.querySelector("h1, h2");
    if (heading && options.focus !== false) {
        heading.setAttribute("tabindex", "-1");
        window.setTimeout(() => heading.focus({ preventScroll: true }), 80);
    }
}

function showToast(message, type = "success", title = null) {
    const region = $("#toast-region");
    if (!region) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const marker = document.createElement("strong");
    marker.textContent = type === "error" ? "!" : type === "info" ? "i" : "✓";

    const copy = document.createElement("span");
    copy.textContent = title ? `${title} · ${message}` : message;

    toast.append(marker, copy);
    region.appendChild(toast);

    window.setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(14px)";
        window.setTimeout(() => toast.remove(), 250);
    }, 3200);
}

function updateProfileUI() {
    const profile = AppState.profile;
    const levelData = getLevelData(profile.xp);
    const summary = getProfileSummary();
    const title = getLevelTitle(levelData.level);

    setText("header-level", levelData.level);
    setText("header-coins", profile.coins);
    setWidth("header-xp-fill", levelData.progress);

    setText("operative-art-level", levelData.level);
    setText("hero-level", levelData.level);
    setText("level-title", title);
    setText("hero-current-xp", levelData.withinLevel);
    setText("hero-next-xp", levelData.required);
    setWidth("hero-xp-fill", levelData.progress);
    setText("hero-completed", summary.completedMissions);
    setText("hero-best-cpm", profile.bestCpm);
    setText("hero-stars", summary.stars);
    setText("streak-badge", `${profile.streak.current}일째 출석`);
    setText("next-title-text", getNextLevelTitle(levelData.level));

    const ring = $("#level-ring");
    if (ring) ring.style.setProperty("--level-progress", `${levelData.progress}%`);

    const today = localDateKey();
    if (profile.daily.date !== today) {
        profile.daily = { date: today, runs: 0 };
    }
    const dailyComplete = profile.daily.runs >= 1;
    setText("daily-quest-text", dailyComplete ? "오늘의 퀘스트 완료! ✦" : "오늘 한 판 클리어하기");
    setText("daily-quest-progress", `${Math.min(profile.daily.runs, 1)} / 1`);
    setWidth("daily-quest-fill", dailyComplete ? 100 : 0);

    document.body.dataset.motion = profile.settings.motion ? "on" : "off";
}

async function renderWorldCards() {
    const container = $("#world-grid");
    if (!container) return;

    container.innerHTML = '<div class="world-card"><p>월드 데이터를 불러오고 있습니다…</p></div>';

    try {
        const metadata = await getMetadata();
        container.innerHTML = "";

        for (const [difficulty, config] of Object.entries(WORLD_CONFIG)) {
            const codes = Object.values(metadata[difficulty] || {}).flat();
            const completed = codes.filter((code) =>
                Number(AppState.profile.missions[code.id]?.bestAccuracy || 0) >= BADGE_ACCURACY_THRESHOLD
            ).length;
            const percentage = codes.length > 0 ? Math.round((completed / codes.length) * 100) : 0;

            const card = document.createElement("button");
            card.type = "button";
            card.className = `world-card world-${difficulty}`;
            card.dataset.action = "select-world";
            card.dataset.difficulty = difficulty;
            card.innerHTML = `
                <span class="world-card-art">
                    <img
                        src="${escapeHTML(config.art)}"
                        alt="${escapeHTML(config.artAlt)}"
  width="1024"
  height="1024"
  loading="eager"
  decoding="async"
>
                    <span class="world-card-index">
                        <span>${escapeHTML(config.code)}</span>
                        <span>${completed}/${codes.length} 인증</span>
                    </span>
                    <span class="world-card-symbol" aria-hidden="true">${escapeHTML(config.symbol)}</span>
                </span>
                <span class="world-card-body">
                    <span class="world-card-kicker">${escapeHTML(config.kicker)}</span>
                    <h3>${escapeHTML(config.title)}</h3>
                    <p>${escapeHTML(config.cardDescription)}</p>
                    <span class="world-card-footer">
                        <span class="world-card-progress">
                            <span>${percentage}% 배지 진행</span>
                            <span class="wide-progress"><span style="width:${percentage}%"></span></span>
                        </span>
                        <span class="world-card-arrow" aria-hidden="true">→</span>
                    </span>
                </span>
            `;
            container.appendChild(card);
        }
    } catch (error) {
        console.error("월드 목록 로드 실패:", error);
        container.innerHTML = `
            <article class="world-card">
                <span class="world-card-index">데이터 오류</span>
                <h3>미션 데이터를 불러오지 못했습니다.</h3>
                <p>로컬 파일을 직접 열었다면 HTTP 서버로 실행해 주세요.</p>
                <button class="button button-primary" type="button" data-action="reload-data">다시 시도</button>
            </article>
        `;
    }
}

async function renderHome() {
    updateProfileUI();
    await renderWorldCards();
}

async function showHome() {
    if (AppState.game && !AppState.game.completed) {
        AppState.game.destroy();
    }
    await renderHome();
    showScreen("main-menu");
}

function getEnemyName(difficulty, levelGroup) {
    const enemies = WORLD_CONFIG[difficulty]?.enemies || [];
    return enemies[clamp((Number(levelGroup) || 1) - 1, 0, enemies.length - 1)] || "코드 블록";
}

function starIconMarkup(earned = false) {
    return `
        <svg class="star-icon${earned ? " earned" : ""}" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m12 2.7 2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.51l-5.8 3.05 1.11-6.46-4.7-4.58 6.49-.94Z"></path>
        </svg>
    `;
}

function missionStarsMarkup(stars) {
    const count = clamp(Number(stars) || 0, 0, 3);
    return Array.from({ length: 3 }, (_, index) => starIconMarkup(index < count)).join("");
}

function setMissionView(view = "lobby", options = {}) {
    const missionScreen = $("#mission-screen");
    const lobby = $("#mode-lobby");
    const stageRoute = $("#stage-route-view");
    const showStages = view === "stages";

    if (!missionScreen || !lobby || !stageRoute) return;

    missionScreen.dataset.view = showStages ? "stages" : "lobby";
    lobby.hidden = showStages;
    stageRoute.hidden = !showStages;
    lobby.classList.remove("is-leaving");
    stageRoute.classList.toggle("is-entering", showStages);

    if (!showStages) {
        $$(".mission-mode-tabs button").forEach((button) => {
            button.setAttribute("aria-selected", "false");
            button.classList.remove("is-launching");
        });
    }

    if (options.scroll !== false) {
        window.scrollTo({
            top: 0,
            behavior: AppState.profile.settings.motion ? "smooth" : "auto"
        });
    }
}

async function showWorld(difficulty, length = null, view = "lobby") {
    if (!WORLD_CONFIG[difficulty]) difficulty = "beginner";
    AppState.currentDifficulty = difficulty;
    AppState.currentLength = length || AppState.currentLength || "short";

    await renderMissionScreen();
    setMissionView(view, { scroll: false });
    showScreen("mission-screen");
}

async function renderMissionScreen() {
    const metadata = await getMetadata();
    const difficulty = AppState.currentDifficulty;
    const length = AppState.currentLength;
    const config = WORLD_CONFIG[difficulty];
    const modeConfig = LENGTH_CONFIG[length];
    const codes = metadata[difficulty]?.[length] || [];
    const allWorldCodes = Object.values(metadata[difficulty] || {}).flat();
    const completedWorld = allWorldCodes.filter((code) =>
        Number(AppState.profile.missions[code.id]?.bestAccuracy || 0) >= BADGE_ACCURACY_THRESHOLD
    ).length;
    const worldPercentage = allWorldCodes.length
        ? Math.round((completedWorld / allWorldCodes.length) * 100)
        : 0;

    setText("mission-world-code", config.code);
    setText("mission-screen-title", config.title);
    setText("mission-world-symbol", config.symbol);
    setText("mission-world-kicker", config.kicker);
    setText("mission-world-title", config.headline);
    setText("mission-world-description", config.description);
    setText("world-progress-label", `${completedWorld} / ${allWorldCodes.length} 인증`);
    setText("world-brief-progress-value", `${worldPercentage}%`);
    setText("mode-entry-code", modeConfig.code);
    setText("mode-entry-count", `${codes.length} QUESTS`);
    setText("mode-entry-title", modeConfig.entryTitle);
    setText("mode-entry-description", modeConfig.entryDescription);
    setWidth("world-progress-fill", worldPercentage);

    const missionScreen = $("#mission-screen");
    const missionWorldArt = $("#mission-world-art");
    const missionWorldVideo = $("#mission-world-video");
    if (missionScreen) {
        missionScreen.dataset.world = difficulty;
        missionScreen.dataset.visualMap = config.stageArts?.length ? "true" : "false";
        missionScreen.dataset.heroMedia = config.hubVideo ? "video" : "image";
        missionScreen.dataset.mode = length;
    }
    if (missionWorldArt) {
        missionWorldArt.src = config.hubArt || config.art;
        missionWorldArt.alt = config.hubAlt || config.artAlt;
        missionWorldArt.hidden = Boolean(config.hubVideo);
    }
    if (missionWorldVideo) {
        if (config.hubVideo) {
            if (missionWorldVideo.getAttribute("src") !== config.hubVideo) {
                missionWorldVideo.src = config.hubVideo;
                missionWorldVideo.load();
            }
            missionWorldVideo.poster = config.hubArt || config.art;
            missionWorldVideo.setAttribute("aria-label", config.hubAlt || config.artAlt);
            missionWorldVideo.hidden = false;
        } else {
            missionWorldVideo.pause();
            missionWorldVideo.hidden = true;
        }
    }

    $$(".mission-mode-tabs button").forEach((button) => {
        button.setAttribute("aria-selected", button.dataset.length === length ? "true" : "false");
        const modeCodes = metadata[difficulty]?.[button.dataset.length] || [];
        const qualified = modeCodes.filter((code) =>
            Number(AppState.profile.missions[code.id]?.bestAccuracy || 0) >= BADGE_ACCURACY_THRESHOLD
        ).length;
        const progressLabel = button.querySelector(".mode-card-footer > span:first-child");
        if (progressLabel) {
            progressLabel.textContent = qualified === modeCodes.length && modeCodes.length > 0
                ? "BADGE COMPLETE"
                : `${qualified} / ${modeCodes.length} 인증`;
        }
    });

    const groups = new Map();
    codes.forEach((code) => {
        const level = Number(code.levelGroup) || 1;
        if (!groups.has(level)) groups.set(level, []);
        groups.get(level).push(code);
    });

    const map = $("#stage-map");
    map.innerHTML = "";

    const orderedGroups = [...groups.entries()].sort((a, b) => a[0] - b[0]);

    for (const [stageIndex, [level, stageCodes]] of orderedGroups.entries()) {
        const completedCount = stageCodes.filter((code) =>
            Number(AppState.profile.missions[code.id]?.bestAccuracy || 0) >= BADGE_ACCURACY_THRESHOLD
        ).length;
        const stageStars = stageCodes.reduce(
            (total, code) => total + (AppState.profile.missions[code.id]?.stars || 0),
            0
        );
        const stateClass = completedCount === stageCodes.length
            ? "completed"
            : completedCount > 0
                ? "in-progress"
                : "";
        const enemy = getEnemyName(difficulty, level);
        const stageArt = config.stageArts?.[stageIndex] || config.hubArt || config.art;
        const stageName = config.stageNames?.[stageIndex] || stageCodes[0]?.title || `레벨 ${level}`;
        const maxStageStars = stageCodes.length * 3;
        const starPercentage = maxStageStars
            ? Math.round((stageStars / maxStageStars) * 100)
            : 0;

        const article = document.createElement("article");
        article.className = `stage-card ${stateClass}`;
        article.innerHTML = `
            <figure class="stage-zone-art" aria-hidden="true">
                <img
                    src="${escapeHTML(stageArt)}"
                    alt=""
                    width="720"
                    height="405"
                    loading="eager"
                    decoding="async"
                >
                <span class="stage-node">
                    ${completedCount === stageCodes.length ? "✓ CLEAR" : `STAGE ${String(level).padStart(2, "0")}`}
                </span>
                <span class="stage-art-label">${escapeHTML(enemy)}</span>
            </figure>
            <div class="stage-card-content">
                <div class="stage-info">
                    <div>
                        <p>${escapeHTML(LENGTH_CONFIG[length].shortLabel)} · ${stageCodes.length} QUESTS</p>
                        <h3>${escapeHTML(stageName)}</h3>
                    </div>
                    <span class="stage-clear-badge">${completedCount} / ${stageCodes.length} CLEAR</span>
                </div>
                <div class="stage-missions">
                    ${stageCodes.map((code, index) => {
                        const record = AppState.profile.missions[code.id];
                        return `
                            <button
                                class="mission-button"
                                type="button"
                                data-action="start-mission"
                                data-code-id="${escapeHTML(code.id)}"
                                aria-label="${escapeHTML(code.title)} 미리보기"
                            >
                                <span class="mission-step">${String(index + 1).padStart(2, "0")}</span>
                                <strong>${escapeHTML(code.title)}</strong>
                                <span class="mission-rating" aria-label="획득 별 ${record?.stars || 0}개">${missionStarsMarkup(record?.stars || 0)}</span>
                                <span class="mission-action">도전하기 <i aria-hidden="true">→</i></span>
                            </button>
                        `;
                    }).join("")}
                </div>
                <div class="stage-reward">
                    <div class="stage-reward-copy">
                        <span>STAR COLLECTION</span>
                        <strong>${stageStars} / ${maxStageStars} ${starIconMarkup(true)}</strong>
                    </div>
                    <span class="stage-reward-progress" aria-label="별 수집 ${starPercentage}%">
                        <span style="width:${starPercentage}%"></span>
                    </span>
                </div>
            </div>
        `;
        map.appendChild(article);
    }
}

async function findRecommendedMission() {
    const metadata = await getMetadata();
    const difficulties = Object.keys(WORLD_CONFIG);
    const lengths = Object.keys(LENGTH_CONFIG);

    for (const difficulty of difficulties) {
        for (const length of lengths) {
            const codes = metadata[difficulty]?.[length] || [];
            const unfinished = codes.find((code) =>
                Number(AppState.profile.missions[code.id]?.bestAccuracy || 0) < BADGE_ACCURACY_THRESHOLD
            );
            if (unfinished) return { difficulty, length, code: unfinished };
        }
    }

    return {
        difficulty: "beginner",
        length: "short",
        code: metadata.beginner.short[0]
    };
}

function codeDifficultyAndLength(metadata, codeId) {
    for (const difficulty of Object.keys(metadata)) {
        for (const length of Object.keys(metadata[difficulty])) {
            const code = metadata[difficulty][length].find((item) => item.id === codeId);
            if (code) return { difficulty, length, code };
        }
    }
    return null;
}

async function startGame(difficulty, length, codeId) {
    const metadata = await getMetadata();
    const located = codeDifficultyAndLength(metadata, codeId);

    if (!located) {
        showToast("선택한 미션 코드를 찾을 수 없습니다.", "error");
        return;
    }

    if (located.difficulty !== difficulty || located.length !== length) {
        difficulty = located.difficulty;
        length = located.length;
    }

    const code = await window.codeManager.findCodeById(codeId);

    if (AppState.game) AppState.game.destroy();

    AppState.currentDifficulty = difficulty;
    AppState.currentLength = length;
    AppState.currentCode = code;
    AppState.currentResult = null;

    showScreen("game-screen");

    AppState.game = new TypingBattle({
        code,
        difficulty,
        length
    });
    AppState.game.start();
}

function closeMissionPreview() {
    const dialog = $("#mission-preview");
    if (!dialog?.open) return;
    dialog.close();
    document.body.classList.remove("preview-open");
}

async function showMissionPreview(difficulty, length, codeId) {
    const metadata = await getMetadata();
    const located = codeDifficultyAndLength(metadata, codeId);

    if (!located) {
        showToast("선택한 퀘스트 정보를 찾을 수 없습니다.", "error");
        return;
    }

    const code = await window.codeManager.findCodeById(codeId);
    const dialog = $("#mission-preview");
    if (!dialog) return;

    difficulty = located.difficulty;
    length = located.length;
    const record = AppState.profile.missions[codeId];
    const stars = clamp(Number(record?.stars) || 0, 0, 3);
    const lineCount = normalizeCode(code.code).split("\n").length;

    dialog.dataset.codeId = codeId;
    dialog.dataset.difficulty = difficulty;
    dialog.dataset.length = length;
    setText("mission-preview-title", code.title || "코드 퀘스트");
    setText("mission-preview-world", WORLD_CONFIG[difficulty]?.title || "Python World");
    setText("mission-preview-mode", LENGTH_CONFIG[length]?.label || "퀘스트");
    setText("mission-preview-lines", lineCount);
    setText("mission-preview-cpm", LENGTH_CONFIG[length]?.targetCpm || 0);
    setText("mission-preview-description", code.description || "코드를 미리 살펴보고 퀘스트에 도전해 보세요.");
    setText("mission-preview-best", record
        ? `최고 ${Number(record.bestScore || 0).toLocaleString("ko-KR")}점 · ${Number(record.bestAccuracy || 0)}%`
        : "아직 도전 전");
    $("#mission-preview-code").textContent = normalizeCode(code.code);

    const rating = $("#mission-preview-rating");
    rating.innerHTML = missionStarsMarkup(stars);
    rating.setAttribute("aria-label", `현재 획득 별 ${stars}개`);

    if (dialog.open) dialog.close();
    dialog.showModal();
    document.body.classList.add("preview-open");
    window.requestAnimationFrame(() => $("#mission-preview-start")?.focus());
}

class TypingBattle {
    constructor({ code, difficulty, length }) {
        this.code = code;
        this.difficulty = difficulty;
        this.length = length;
        this.targetText = normalizeCode(code.code);
        this.targetLines = this.targetText.split("\n");
        this.previousValue = "";
        this.startTime = null;
        this.timerId = null;
        this.completed = false;
        this.completing = false;
        this.isComposing = false;
        this.compositionBaseValue = "";
        this.attackedLines = new Set();
        this.metrics = {
            attempts: 0,
            correctAttempts: 0,
            errors: 0,
            corrections: 0,
            combo: 0,
            maxCombo: 0
        };

        this.input = $("#user-code-input");
        this.languageStatus = $("#input-language-status");
        this.boundInput = (event) => this.handleInput(event);
        this.boundCompositionStart = () => this.handleCompositionStart();
        this.boundCompositionEnd = () => this.handleCompositionEnd();
        this.boundKeydown = (event) => this.handleKeydown(event);
        this.boundPaste = (event) => this.blockPaste(event);
        this.boundCursor = () => this.updateLineStates(this.input.value);
    }

    start() {
        const levelGroup = Number(this.code.levelGroup) || 1;
        const level = getLevelData(AppState.profile.xp).level;

        setText("game-mode-label", `${LENGTH_CONFIG[this.length].label} · 스테이지 ${levelGroup}`);
        setText("game-mission-title", this.code.title);
        setText("battle-player-level", `LV.${level}`);
        setText("race-stage-name", `${this.code.title} COURSE`);
        setText("race-status", "READY");
        setText("race-distance", "0%");
        setText("target-line-count", `${this.targetLines.length}줄`);
        setText("timer", "00:00");

        this.renderTargetCode();
        this.input.value = "";
        this.input.scrollTop = 0;
        this.setInputLanguage("unknown");
        this.input.addEventListener("input", this.boundInput);
        this.input.addEventListener("compositionstart", this.boundCompositionStart);
        this.input.addEventListener("compositionend", this.boundCompositionEnd);
        this.input.addEventListener("keydown", this.boundKeydown);
        this.input.addEventListener("paste", this.boundPaste);
        this.input.addEventListener("drop", this.boundPaste);
        this.input.addEventListener("click", this.boundCursor);
        this.input.addEventListener("keyup", this.boundCursor);

        this.updateBattleView("");
        window.setTimeout(() => this.input.focus(), 100);
    }

    renderTargetCode() {
        const list = $("#target-code-lines");
        list.innerHTML = "";

        this.targetLines.forEach((line) => {
            const item = document.createElement("li");
            const code = document.createElement("span");
            code.textContent = line || " ";
            item.appendChild(code);
            list.appendChild(item);
        });
    }

    handleKeydown(event) {
        if (event.key === "HangulMode" || event.code === "Lang1") {
            const currentLanguage = this.languageStatus?.dataset.language;
            if (currentLanguage === "english") this.setInputLanguage("korean");
            else if (currentLanguage === "korean") this.setInputLanguage("english");
            else this.setInputLanguage("unknown");
        } else if (!event.ctrlKey && !event.metaKey && event.key.length === 1 && /^[\x20-\x7E]$/.test(event.key)) {
            this.setInputLanguage("english");
        }

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
            event.preventDefault();
            showToast("이 미션은 직접 입력해야 공격할 수 있어요.", "info");
            return;
        }

        if (event.key !== "Tab") return;

        event.preventDefault();
        const start = this.input.selectionStart;
        const end = this.input.selectionEnd;
        this.input.setRangeText("    ", start, end, "end");

        const inputEvent = typeof InputEvent === "function"
            ? new InputEvent("input", {
                bubbles: true,
                inputType: "insertText",
                data: "    "
            })
            : new Event("input", { bubbles: true });

        this.input.dispatchEvent(inputEvent);
    }

    blockPaste(event) {
        event.preventDefault();
        showToast("붙여넣기는 사용할 수 없습니다. 손으로 입력해 콤보를 이어가세요.", "info");
    }

    diffText(previous, current) {
        let prefix = 0;
        const maxPrefix = Math.min(previous.length, current.length);

        while (prefix < maxPrefix && previous[prefix] === current[prefix]) {
            prefix += 1;
        }

        let suffix = 0;
        const remainingPrevious = previous.length - prefix;
        const remainingCurrent = current.length - prefix;

        while (
            suffix < remainingPrevious &&
            suffix < remainingCurrent &&
            previous[previous.length - 1 - suffix] === current[current.length - 1 - suffix]
        ) {
            suffix += 1;
        }

        return {
            prefix,
            removed: previous.slice(prefix, previous.length - suffix),
            inserted: current.slice(prefix, current.length - suffix)
        };
    }

    handleCompositionStart() {
        if (this.completed || this.completing) return;

        this.isComposing = true;
        this.compositionBaseValue = this.previousValue;
        this.setInputLanguage("korean");
    }

    handleCompositionEnd() {
        if (this.completed || this.completing) return;

        this.isComposing = false;
        const currentValue = normalizeCode(this.input.value);
        this.commitInput(this.compositionBaseValue, currentValue);
        this.compositionBaseValue = currentValue;
    }

    setInputLanguage(language) {
        if (!this.languageStatus) return;

        const labels = {
            english: "A · 영문 입력 중",
            korean: "가 · 한글 입력 중",
            unknown: "입력 언어가 A인지 확인하세요"
        };
        const label = labels[language] || labels.unknown;
        const text = this.languageStatus.querySelector("span");

        this.languageStatus.dataset.language = language;
        this.languageStatus.title = language === "unknown"
            ? "한 글자를 입력하면 현재 입력 언어를 표시합니다."
            : `현재 감지된 입력 언어: ${label}`;
        if (text) text.textContent = label;
    }

    handleInput(event) {
        if (this.completed || this.completing) return;

        const currentValue = normalizeCode(this.input.value);

        if (this.isComposing || event?.isComposing) {
            this.updateBattleView(currentValue);
            return;
        }

        if (event?.data && /^[\x20-\x7E]+$/.test(event.data)) {
            this.setInputLanguage("english");
        }

        this.commitInput(this.previousValue, currentValue);
    }

    commitInput(previousValue, currentValue) {
        const change = this.diffText(previousValue, currentValue);

        if (!this.startTime && (change.inserted.length > 0 || change.removed.length > 0)) {
            this.startTimer();
        }

        let correctInChange = 0;
        let incorrectInChange = 0;

        for (let index = 0; index < change.inserted.length; index += 1) {
            const targetIndex = change.prefix + index;
            const insertedCharacter = change.inserted[index];
            const correct = insertedCharacter === this.targetText[targetIndex];

            this.metrics.attempts += 1;

            if (correct) {
                this.metrics.correctAttempts += 1;
                this.metrics.combo += 1;
                this.metrics.maxCombo = Math.max(this.metrics.maxCombo, this.metrics.combo);
                correctInChange += 1;
            } else {
                this.metrics.errors += 1;
                this.metrics.combo = 0;
                incorrectInChange += 1;
            }
        }

        if (change.removed.length > 0) {
            this.metrics.corrections += 1;
        }

        this.previousValue = currentValue;
        this.playTypingSound(correctInChange > 0 && incorrectInChange === 0);
        this.updateBattleView(currentValue);

        if (incorrectInChange > 0) {
            this.triggerSkid();
        }

        if (currentValue === this.targetText) {
            this.complete();
        }
    }

    startTimer() {
        this.startTime = Date.now();
        this.timerId = window.setInterval(() => {
            const elapsed = this.getElapsedMilliseconds();
            setText("timer", formatTime(elapsed / 1000));
            this.updateLiveMetrics(this.previousValue);
        }, 250);
    }

    getElapsedMilliseconds() {
        return this.startTime ? Math.max(0, Date.now() - this.startTime) : 0;
    }

    countCorrectPositions(value) {
        let correct = 0;
        const length = Math.min(value.length, this.targetText.length);

        for (let index = 0; index < length; index += 1) {
            if (value[index] === this.targetText[index]) correct += 1;
        }

        return correct;
    }

    getAccuracy() {
        return this.metrics.attempts > 0
            ? (this.metrics.correctAttempts / this.metrics.attempts) * 100
            : 100;
    }

    getCpm(value) {
        const elapsed = this.getElapsedMilliseconds();
        if (!elapsed) return 0;
        const correctPositions = this.countCorrectPositions(value);
        return Math.round((correctPositions * 60000) / elapsed);
    }

    getLiveScore(value) {
        if (this.metrics.attempts === 0) return 0;

        const accuracy = this.getAccuracy();
        const completion = this.targetText.length
            ? (this.countCorrectPositions(value) / this.targetText.length) * 100
            : 0;
        const comboBonus = Math.min(150, this.metrics.maxCombo * 2);
        return Math.round(accuracy * 5 + completion * 2.5 + comboBonus);
    }

    updateBattleView(value) {
        this.updateLineStates(value);
        this.updateLiveMetrics(value);
    }

    updateLineStates(value) {
        const userLines = value.split("\n");
        const cursorPosition = this.input.selectionStart || 0;
        const currentLine = value.slice(0, cursorPosition).split("\n").length - 1;
        const elements = $$("#target-code-lines li");

        elements.forEach((element, index) => {
            const targetLine = this.targetLines[index] || "";
            const hasUserLine = index < userLines.length;
            const userLine = hasUserLine ? userLines[index] : null;
            const exact = hasUserLine && userLine === targetLine;
            const isPrefix = hasUserLine && targetLine.startsWith(userLine);
            const isPastCursor = index < currentLine;

            element.classList.remove("correct", "current", "error");

            if (exact) {
                element.classList.add("correct");
                if (targetLine.length > 0 && !this.attackedLines.has(index)) {
                    this.attackedLines.add(index);
                    this.triggerCheckpoint(index);
                }
            } else if (index === currentLine && isPrefix) {
                element.classList.add("current");
            } else if (hasUserLine && (!isPrefix || isPastCursor)) {
                element.classList.add("error");
            }
        });
    }

    updateLiveMetrics(value) {
        const accuracy = this.getAccuracy();
        const cpm = this.getCpm(value);
        const correctPositions = this.countCorrectPositions(value);
        const completion = this.targetText.length
            ? (correctPositions / this.targetText.length) * 100
            : 0;
        const roundedCompletion = Math.round(completion);

        setText("combo", this.metrics.combo);
        setText("accuracy", Math.round(accuracy));
        setText("cpm", cpm);
        setText("corrections", this.metrics.corrections);
        setText("completion", roundedCompletion);
        setText("live-score", this.getLiveScore(value));
        setText("focus-value", `${Math.round(accuracy)}%`);
        setText("race-distance", `${roundedCompletion}%`);
        setText(
            "race-status",
            completion >= 100 ? "FINISH!" : this.startTime ? (this.metrics.combo >= 20 ? "BOOST!" : "RACING") : "READY"
        );

        setWidth("focus-bar", accuracy);
        setWidth("race-progress-fill", completion);
        setWidth("game-progress-fill", completion);

        const kart = $("#race-kart");
        if (kart) kart.style.left = `${7 + completion * 0.89}%`;

        const hud = $("#race-hud");
        if (hud) hud.classList.toggle("racing", Boolean(this.startTime));
    }

    triggerCheckpoint(lineIndex) {
        const kart = $("#race-kart");
        const signal = $("#battle-signal");
        const effect = $("#battle-effect");
        const boost = 12 + Math.min(30, Math.floor(this.metrics.combo / 8));

        if (kart) {
            kart.classList.remove("boost");
            void kart.offsetWidth;
            kart.classList.add("boost");
        }

        if (signal) {
            signal.classList.remove("burst");
            void signal.offsetWidth;
            signal.classList.add("burst");
        }

        if (effect) {
            effect.textContent = `CHECKPOINT ${lineIndex + 1} · BOOST +${boost}`;
            effect.classList.remove("show");
            void effect.offsetWidth;
            effect.classList.add("show");
        }

        this.playTone(520, 0.045);
    }

    triggerSkid() {
        const kart = $("#race-kart");
        if (!kart) return;
        kart.classList.remove("skid");
        void kart.offsetWidth;
        kart.classList.add("skid");
    }

    triggerFinish() {
        const hud = $("#race-hud");
        const kart = $("#race-kart");
        const effect = $("#battle-effect");

        if (hud) hud.classList.add("finishing");

        if (kart) {
            kart.classList.remove("boost", "skid");
            void kart.offsetWidth;
            kart.style.left = "112%";
        }

        setText("race-status", "FINISH!");
        setText("race-distance", "100%");

        if (effect) {
            effect.textContent = "FINISH! · QUEST CLEAR";
            effect.classList.remove("show");
            void effect.offsetWidth;
            effect.classList.add("show");
        }
    }

    playTypingSound(correct) {
        if (!AppState.profile.settings.sound) return;
        this.playTone(correct ? 280 : 140, 0.018);
    }

    playTone(frequency, duration) {
        if (!AppState.profile.settings.sound) return;

        try {
            if (!AppState.audioContext) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                AppState.audioContext = new AudioContext();
            }

            const context = AppState.audioContext;
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            const now = context.currentTime;

            oscillator.type = "square";
            oscillator.frequency.setValueAtTime(frequency, now);
            gain.gain.setValueAtTime(0.012, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start(now);
            oscillator.stop(now + duration);
        } catch (error) {
            console.debug("효과음을 재생하지 못했습니다.", error);
        }
    }

    calculateResult() {
        const durationMs = Math.max(1000, this.getElapsedMilliseconds());
        const durationSeconds = durationMs / 1000;
        const accuracy = this.getAccuracy();
        const cpm = Math.round((this.targetText.length * 60) / durationSeconds);
        const targetCpm = LENGTH_CONFIG[this.length].targetCpm;
        const speedRatio = cpm / targetCpm;

        let stars = 1;
        if (accuracy >= 95) stars += 1;
        if (accuracy >= 98 && cpm >= targetCpm) stars += 1;

        const accuracyScore = accuracy * 6;
        const speedScore = Math.min(250, speedRatio * 180);
        const comboScore = Math.min(
            150,
            (this.metrics.maxCombo / Math.max(1, this.targetText.length)) * 180
        );
        const score = Math.round(accuracyScore + speedScore + comboScore);
        const roundedAccuracyScore = Math.round(accuracyScore);
        let roundedSpeedScore = Math.round(speedScore);
        let roundedComboScore = score - roundedAccuracyScore - roundedSpeedScore;

        if (roundedComboScore < 0) {
            roundedSpeedScore += roundedComboScore;
            roundedComboScore = 0;
        }

        let rank = "C";
        if (accuracy >= 99 && speedRatio >= 1.15) rank = "S";
        else if (accuracy >= 97) rank = "A";
        else if (accuracy >= 93) rank = "B";

        const multiplier = LENGTH_CONFIG[this.length].reward;
        const xp = Math.round((45 + stars * 22 + score / 24) * multiplier);
        const coins = Math.round((8 + stars * 6 + score / 110) * multiplier);

        return {
            clientRunId: createClientRunId(),
            codeId: this.code.id,
            title: this.code.title,
            difficulty: this.difficulty,
            length: this.length,
            levelGroup: Number(this.code.levelGroup) || 1,
            score,
            rank,
            stars,
            xp,
            coins,
            accuracy: Math.round(accuracy * 10) / 10,
            cpm,
            durationSeconds: Math.round(durationSeconds * 10) / 10,
            maxCombo: this.metrics.maxCombo,
            attempts: this.metrics.attempts,
            correctAttempts: this.metrics.correctAttempts,
            errors: this.metrics.errors,
            corrections: this.metrics.corrections,
            targetCpm,
            scoreBreakdown: {
                accuracy: roundedAccuracyScore,
                speed: roundedSpeedScore,
                combo: roundedComboScore
            },
            code: this.targetText,
            completedAt: new Date().toISOString()
        };
    }

    async complete() {
        if (this.completing || this.completed) return;
        this.completing = true;
        this.completed = true;
        this.destroy();

        const result = this.calculateResult();
        this.triggerFinish();
        this.playTone(660, 0.1);

        const finishDelay = AppState.profile.settings.motion ? 850 : 80;
        await new Promise((resolve) => window.setTimeout(resolve, finishDelay));

        let rewardState;
        try {
            rewardState = await applyRewards(result);
        } catch {
            showToast("DB 저장에 실패해 이번 기록은 반영되지 않았습니다. 다시 시도해 주세요.", "error");
            await showHome();
            return;
        }

        result.isPersonalBest = rewardState.isPersonalBest;
        result.newAchievements = rewardState.newAchievements;
        AppState.currentResult = result;

        renderResult(result);
        updateProfileUI();
        showScreen("result-screen");

        if (result.newAchievements.length > 0) {
            const revealDelay = AppState.profile.settings.motion ? 520 : 0;
            window.setTimeout(() => {
                if (AppState.currentScreen === "result-screen") {
                    showAchievementReveal(result.newAchievements);
                }
            }, revealDelay);
        }

        executeAndRenderCode(result.code);
    }

    destroy() {
        if (this.timerId) {
            window.clearInterval(this.timerId);
            this.timerId = null;
        }

        if (!this.input) return;
        this.input.removeEventListener("input", this.boundInput);
        this.input.removeEventListener("compositionstart", this.boundCompositionStart);
        this.input.removeEventListener("compositionend", this.boundCompositionEnd);
        this.input.removeEventListener("keydown", this.boundKeydown);
        this.input.removeEventListener("paste", this.boundPaste);
        this.input.removeEventListener("drop", this.boundPaste);
        this.input.removeEventListener("click", this.boundCursor);
        this.input.removeEventListener("keyup", this.boundCursor);
    }
}

function updateStreak(profile) {
    const today = localDateKey();
    const difference = dayDifference(profile.streak.lastPlayed, today);

    if (difference === 0) return;
    if (difference === 1) profile.streak.current += 1;
    else profile.streak.current = 1;

    profile.streak.best = Math.max(profile.streak.best, profile.streak.current);
    profile.streak.lastPlayed = today;
}

function unlockAchievements(profile, result = null) {
    const unlocked = new Set(profile.achievements);
    const newlyUnlocked = [];

    for (const achievement of ACHIEVEMENTS) {
        if (unlocked.has(achievement.id)) continue;
        if (!achievement.check(profile, result)) continue;

        unlocked.add(achievement.id);
        newlyUnlocked.push(achievement);
    }

    profile.achievements = [...unlocked];
    return newlyUnlocked;
}

async function applyRewards(result) {
    const previousProfile = JSON.parse(JSON.stringify(AppState.profile));
    const profile = AppState.profile;
    const previous = profile.missions[result.codeId];
    const isPersonalBest = !previous || result.score > (previous.bestScore || 0);

    profile.xp += result.xp;
    profile.coins += result.coins;
    profile.totalRuns += 1;
    profile.bestCpm = Math.max(profile.bestCpm, result.cpm);
    profile.totalCorrectAttempts += result.correctAttempts;
    profile.totalAttempts += result.attempts;
    if (result.accuracy >= 100) profile.perfectRuns += 1;

    profile.missions[result.codeId] = {
        difficulty: result.difficulty,
        length: result.length,
        stars: Math.max(previous?.stars || 0, result.stars),
        bestScore: Math.max(previous?.bestScore || 0, result.score),
        bestCpm: Math.max(previous?.bestCpm || 0, result.cpm),
        bestAccuracy: Math.max(previous?.bestAccuracy || 0, result.accuracy),
        clears: (previous?.clears || 0) + 1,
        updatedAt: result.completedAt
    };

    profile.lastMission = {
        difficulty: result.difficulty,
        length: result.length,
        codeId: result.codeId
    };

    profile.recentRuns.unshift({
        codeId: result.codeId,
        title: result.title,
        difficulty: result.difficulty,
        length: result.length,
        score: result.score,
        stars: result.stars,
        accuracy: result.accuracy,
        cpm: result.cpm,
        completedAt: result.completedAt
    });
    profile.recentRuns = profile.recentRuns.slice(0, 12);

    const today = localDateKey();
    if (profile.daily.date !== today) profile.daily = { date: today, runs: 0 };
    profile.daily.runs += 1;
    updateStreak(profile);

    const newAchievements = unlockAchievements(profile, result);
    try {
        await saveProfile(result);
    } catch (error) {
        AppState.profile = mergeProfile(previousProfile);
        throw error;
    }

    return { isPersonalBest, newAchievements };
}

function resultMessage(result) {
    if (result.rank === "S") return "속도도 정확도도 퍼펙트! 오늘의 베스트 플레이예요.";
    if (result.rank === "A") return "리듬을 놓치지 않고 깔끔하게 클리어했어요.";
    if (result.rank === "B") return "스테이지 클리어! 오타를 조금만 줄이면 A 랭크예요.";
    return "첫 클리어 성공! 한 판 더 하면 별을 더 모을 수 있어요.";
}

function coachTip(result) {
    if (result.accuracy < BADGE_ACCURACY_THRESHOLD) {
        return `이번 기록은 배지 진행 기준인 정확도 ${BADGE_ACCURACY_THRESHOLD}%에 도달하지 못했어요. 같은 퀘스트를 다시 도전해 인증해봐요.`;
    }
    if (result.accuracy < 95) {
        return `수정 ${result.corrections}회 · 다음 판에는 괄호와 들여쓰기부터 천천히 맞춰봐요.`;
    }
    if (result.stars < 3) {
        return `${LENGTH_CONFIG[result.length].targetCpm} 타수/분을 넘으면 세 번째 별까지 모을 수 있어요.`;
    }
    if (result.maxCombo < 50) {
        return "지금 정확도를 유지하면서 50 COMBO 배지에도 도전해봐요.";
    }
    return "완벽한 리듬이에요. 다음 스테이지에서도 그대로 이어가 봐요.";
}

function launchResultConfetti() {
    const container = $("#result-confetti");
    if (!container) return;

    container.innerHTML = "";
    if (!AppState.profile.settings.motion) return;

    const colors = ["#ed6f73", "#f2b84b", "#76b9e6", "#a98ad2", "#55b98b"];
    const symbols = ["", "", "", "★", "✦"];

    for (let index = 0; index < 28; index += 1) {
        const piece = document.createElement("span");
        const isSymbol = index % 5 >= 3;
        piece.className = `confetti-piece${isSymbol ? " is-symbol" : ""}`;
        piece.textContent = isSymbol ? symbols[index % symbols.length] : "";
        piece.style.setProperty("--confetti-x", `${4 + ((index * 37) % 92)}%`);
        piece.style.setProperty("--confetti-delay", `${(index % 7) * 55}ms`);
        piece.style.setProperty("--confetti-drift", `${-48 + ((index * 29) % 96)}px`);
        piece.style.setProperty("--confetti-rotate", `${120 + ((index * 47) % 320)}deg`);
        piece.style.setProperty("--confetti-color", colors[index % colors.length]);
        container.appendChild(piece);
    }

    window.setTimeout(() => {
        container.innerHTML = "";
    }, 2200);
}

function playAchievementFanfare() {
    if (!AppState.profile.settings.sound) return;

    try {
        if (!AppState.audioContext) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            AppState.audioContext = new AudioContext();
        }

        const context = AppState.audioContext;
        context.resume().catch(() => {});
        const startAt = context.currentTime + 0.02;
        const notes = [523.25, 659.25, 783.99, 1046.5];

        notes.forEach((frequency, index) => {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            const noteStart = startAt + index * 0.11;
            const noteEnd = noteStart + (index === notes.length - 1 ? 0.42 : 0.22);

            oscillator.type = index === notes.length - 1 ? "sine" : "triangle";
            oscillator.frequency.setValueAtTime(frequency, noteStart);
            gain.gain.setValueAtTime(0.0001, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.045, noteStart + 0.025);
            gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start(noteStart);
            oscillator.stop(noteEnd);
        });
    } catch (error) {
        console.debug("배지 획득 효과음을 재생하지 못했습니다.", error);
    }
}

function showAchievementReveal(achievements) {
    const reveal = $("#achievement-reveal");
    const list = $("#achievement-reveal-list");
    const particles = reveal?.querySelector(".achievement-reveal-particles");
    if (!reveal || !list || !particles || achievements.length === 0) return;

    const secretOnly = achievements.every((achievement) => achievement.secret);
    const hasSecret = achievements.some((achievement) => achievement.secret);
    const kicker = reveal.querySelector(".achievement-reveal-kicker");
    const title = $("#achievement-reveal-title");
    const message = reveal.querySelector(".achievement-reveal-message");
    if (kicker) {
        kicker.innerHTML = `<span>✦</span> ${secretOnly ? "SECRET BADGE DISCOVERED" : "ACHIEVEMENT UNLOCKED"} <span>✦</span>`;
    }
    if (title) {
        title.textContent = secretOnly
            ? "히든 배지를 발견했어요!"
            : hasSecret
                ? "새로운 배지들을 획득했어요!"
                : "새 배지를 획득했어요!";
    }
    if (message) {
        message.textContent = secretOnly
            ? "특별한 플레이로 숨겨진 컬렉션을 발견했습니다."
            : "멋진 플레이의 증표가 컬렉션에 추가됩니다.";
    }

    list.innerHTML = "";
    particles.innerHTML = "";

    achievements.forEach((achievement, index) => {
        const card = document.createElement("article");
        card.className = `achievement-reward-card${achievement.secret ? " is-secret" : ""}`;
        card.style.setProperty("--reveal-index", index);

        const imageWrap = document.createElement("div");
        imageWrap.className = "achievement-reward-image";
        const image = document.createElement("img");
        image.src = achievement.image;
        image.alt = "";
        image.width = 320;
        image.height = 320;
        imageWrap.appendChild(image);

        const title = document.createElement("h3");
        title.textContent = achievement.title;
        const description = document.createElement("p");
        description.textContent = achievement.description;
        card.append(imageWrap, title, description);
        list.appendChild(card);
    });

    if (AppState.profile.settings.motion) {
        const colors = ["#ffd45c", "#ff7f83", "#72c9f3", "#ae8ce0", "#68c99b"];
        for (let index = 0; index < 36; index += 1) {
            const particle = document.createElement("i");
            particle.className = index % 4 === 0 ? "reward-particle is-star" : "reward-particle";
            particle.textContent = index % 4 === 0 ? "✦" : "";
            particle.style.setProperty("--particle-x", `${3 + ((index * 31) % 94)}%`);
            particle.style.setProperty("--particle-delay", `${(index % 9) * 45}ms`);
            particle.style.setProperty("--particle-drift", `${-70 + ((index * 43) % 140)}px`);
            particle.style.setProperty("--particle-color", colors[index % colors.length]);
            particles.appendChild(particle);
        }
    }

    reveal.hidden = false;
    document.body.classList.add("achievement-reveal-open");
    document.querySelector(".app-shell")?.setAttribute("inert", "");
    window.requestAnimationFrame(() => reveal.classList.add("is-active"));
    playAchievementFanfare();

    window.setTimeout(() => {
        reveal.querySelector(".achievement-claim-button")?.focus();
    }, AppState.profile.settings.motion ? 850 : 0);
}

function closeAchievementReveal() {
    const reveal = $("#achievement-reveal");
    if (!reveal || reveal.hidden) return;

    reveal.classList.remove("is-active");
    document.body.classList.remove("achievement-reveal-open");
    document.querySelector(".app-shell")?.removeAttribute("inert");
    const delay = AppState.profile.settings.motion ? 180 : 0;
    window.setTimeout(() => {
        reveal.hidden = true;
        reveal.querySelector(".achievement-reveal-particles")?.replaceChildren();
        $("[data-action='next-mission']")?.focus();
    }, delay);
}

function renderResult(result) {
    const targetCpm = result.targetCpm || LENGTH_CONFIG[result.length]?.targetCpm || 1;
    const fallbackAccuracyScore = Math.round(result.accuracy * 6);
    const fallbackSpeedScore = Math.round(Math.min(250, (result.cpm / targetCpm) * 180));
    const scoreBreakdown = result.scoreBreakdown || {
        accuracy: fallbackAccuracyScore,
        speed: fallbackSpeedScore,
        combo: result.score - fallbackAccuracyScore - fallbackSpeedScore
    };

    setText("result-rank", result.rank);
    setText("result-stars", "★".repeat(result.stars) + "☆".repeat(3 - result.stars));
    setText("result-title", `${result.title} 클리어`);
    setText("result-message", resultMessage(result));
    setText("reward-xp", result.xp);
    setText("reward-coins", result.coins);
    setText("result-combo", result.maxCombo);
    setText("result-score", result.score);
    setText("result-accuracy", result.accuracy);
    setText("result-cpm", result.cpm);
    setText("result-time", `${result.durationSeconds}초`);
    setText("result-corrections", result.corrections);
    setText("result-target-cpm", targetCpm);
    setText("result-accuracy-score", scoreBreakdown.accuracy);
    setText("result-speed-score", scoreBreakdown.speed);
    setText("result-combo-score", scoreBreakdown.combo);
    setText("result-coach-tip", coachTip(result));
    setText("result-code", result.code);

    const scoreRing = $("#result-score-ring");
    if (scoreRing) {
        scoreRing.setAttribute("aria-valuenow", String(result.score));
        scoreRing.style.setProperty("--score-progress", "0%");
    }

    const scoreFills = [
        ["result-accuracy-score-fill", (scoreBreakdown.accuracy / 600) * 100],
        ["result-speed-score-fill", (scoreBreakdown.speed / 250) * 100],
        ["result-combo-score-fill", (scoreBreakdown.combo / 150) * 100]
    ];

    scoreFills.forEach(([id]) => setWidth(id, 0));
    window.requestAnimationFrame(() => {
        if (scoreRing) scoreRing.style.setProperty("--score-progress", `${clamp(result.score / 10, 0, 100)}%`);
        scoreFills.forEach(([id, value]) => setWidth(id, clamp(value, 0, 100)));
    });

    const bestBadge = $("#personal-best-badge");
    if (bestBadge) bestBadge.hidden = !result.isPersonalBest;

    const unlockSection = $("#achievement-unlocks");
    const unlockList = $("#achievement-unlock-list");
    unlockList.innerHTML = "";

    if (result.newAchievements.length > 0) {
        result.newAchievements.forEach((achievement) => {
            const chip = document.createElement("span");
            chip.className = "unlock-chip";
            const image = document.createElement("img");
            image.src = achievement.image;
            image.alt = "";
            image.width = 40;
            image.height = 40;
            const label = document.createElement("span");
            label.textContent = achievement.title;
            chip.append(image, label);
            unlockList.appendChild(chip);
        });
        unlockSection.hidden = false;
    } else {
        unlockSection.hidden = true;
    }

    const loading = $("#execution-loading");
    const output = $("#execution-output");
    const error = $("#execution-error");
    const images = $("#execution-images");
    const status = $("#execution-status");

    loading.hidden = false;
    loading.textContent = "파이썬 엔진을 불러오고 있습니다…";
    output.hidden = true;
    error.hidden = true;
    output.textContent = "";
    error.textContent = "";
    images.innerHTML = "";
    status.textContent = "엔진 준비 중";
    status.className = "execution-status";

    launchResultConfetti();
}

async function findNextMission() {
    const metadata = await getMetadata();
    const difficulties = Object.keys(WORLD_CONFIG);
    const lengths = Object.keys(LENGTH_CONFIG);
    const difficultyIndex = difficulties.indexOf(AppState.currentDifficulty);
    const lengthIndex = lengths.indexOf(AppState.currentLength);
    const currentCodes = metadata[AppState.currentDifficulty]?.[AppState.currentLength] || [];
    const currentIndex = currentCodes.findIndex((code) => code.id === AppState.currentCode?.id);

    if (currentIndex >= 0 && currentIndex < currentCodes.length - 1) {
        return {
            difficulty: AppState.currentDifficulty,
            length: AppState.currentLength,
            code: currentCodes[currentIndex + 1]
        };
    }

    if (lengthIndex >= 0 && lengthIndex < lengths.length - 1) {
        const nextLength = lengths[lengthIndex + 1];
        const nextCodes = metadata[AppState.currentDifficulty]?.[nextLength] || [];
        if (nextCodes.length > 0) {
            return {
                difficulty: AppState.currentDifficulty,
                length: nextLength,
                code: nextCodes[0]
            };
        }
    }

    if (difficultyIndex >= 0 && difficultyIndex < difficulties.length - 1) {
        const nextDifficulty = difficulties[difficultyIndex + 1];
        const nextCodes = metadata[nextDifficulty]?.short || [];
        if (nextCodes.length > 0) {
            return {
                difficulty: nextDifficulty,
                length: "short",
                code: nextCodes[0]
            };
        }
    }

    return null;
}

async function ensurePyodide() {
    if (AppState.pyodide) return AppState.pyodide;
    if (AppState.pyodidePromise) return AppState.pyodidePromise;

    AppState.pyodidePromise = (async () => {
        if (typeof window.loadPyodide !== "function") {
            await new Promise((resolve, reject) => {
                const existing = document.querySelector(`script[src="${PYODIDE_SCRIPT_URL}"]`);
                // 이전 오프라인 시도에서 실패한 script 요소가 남아 있을 수 있으므로 새로 요청합니다.
                if (existing) existing.remove();

                const script = document.createElement("script");
                script.src = PYODIDE_SCRIPT_URL;
                script.async = true;
                script.addEventListener("load", resolve, { once: true });
                script.addEventListener(
                    "error",
                    () => {
                        script.remove();
                        reject(new Error("인터넷 연결 또는 CDN 응답을 확인해 주세요."));
                    },
                    { once: true }
                );
                document.head.appendChild(script);
            });
        }

        const pyodide = await window.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
        AppState.pyodide = pyodide;
        return pyodide;
    })().catch((error) => {
        AppState.pyodidePromise = null;
        throw error;
    });

    return AppState.pyodidePromise;
}

async function runPythonCode(code) {
    const pyodide = await ensurePyodide();

    if (typeof pyodide.loadPackagesFromImports === "function") {
        await pyodide.loadPackagesFromImports(code);
    }

    if (/^\s*(?:from\s+matplotlib|import\s+matplotlib)/m.test(code)) {
        await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use("AGG")
        `);
    }

    pyodide.globals.set("_pta_user_code", code);

    await pyodide.runPythonAsync(`
import base64 as _pta_base64
import contextlib as _pta_contextlib
import io as _pta_io
import sys as _pta_sys
import traceback as _pta_traceback

_pta_stdout = _pta_io.StringIO()
_pta_stderr = _pta_io.StringIO()
_pta_error = ""
_pta_images = []
_pta_namespace = {"__name__": "__main__"}

try:
    with _pta_contextlib.redirect_stdout(_pta_stdout), _pta_contextlib.redirect_stderr(_pta_stderr):
        exec(compile(_pta_user_code, "<mission>", "exec"), _pta_namespace)
except Exception:
    _pta_error = _pta_traceback.format_exc()

try:
    if "matplotlib.pyplot" in _pta_sys.modules:
        import matplotlib.pyplot as _pta_plt
        for _pta_number in _pta_plt.get_fignums():
            _pta_figure = _pta_plt.figure(_pta_number)
            _pta_buffer = _pta_io.BytesIO()
            _pta_figure.savefig(_pta_buffer, format="png", bbox_inches="tight", dpi=120)
            _pta_images.append(_pta_base64.b64encode(_pta_buffer.getvalue()).decode("ascii"))
        _pta_plt.close("all")
except Exception:
    if not _pta_error:
        _pta_error = _pta_traceback.format_exc()

_pta_payload = {
    "output": _pta_stdout.getvalue(),
    "stderr": _pta_stderr.getvalue(),
    "error": _pta_error,
    "images": _pta_images
}
    `);

    const proxy = pyodide.globals.get("_pta_payload");
    const result = proxy.toJs({ dict_converter: Object.fromEntries });
    proxy.destroy();

    ["_pta_user_code", "_pta_payload"].forEach((name) => {
        try {
            pyodide.globals.delete(name);
        } catch (_error) {
            // 실행 결과를 정리하지 못해도 다음 실행은 계속할 수 있습니다.
        }
    });

    return result;
}

async function executeAndRenderCode(code) {
    const loading = $("#execution-loading");
    const output = $("#execution-output");
    const error = $("#execution-error");
    const images = $("#execution-images");
    const status = $("#execution-status");

    try {
        const result = await runPythonCode(code);
        loading.hidden = true;

        if (result.output || result.stderr) {
            output.textContent = [result.output, result.stderr].filter(Boolean).join("\n").trim() ||
                "코드가 정상적으로 실행되었습니다.";
            output.hidden = false;
        }

        if (result.error) {
            error.textContent = result.error;
            error.hidden = false;
            status.textContent = "실행 오류";
            status.className = "execution-status error";
        } else {
            if (!result.output && !result.stderr && (!result.images || result.images.length === 0)) {
                output.textContent = "코드가 정상적으로 실행되었습니다. 출력 내용은 없습니다.";
                output.hidden = false;
            }
            status.textContent = "실행 완료";
            status.className = "execution-status ready";
        }

        (result.images || []).forEach((base64, index) => {
            const image = document.createElement("img");
            image.src = `data:image/png;base64,${base64}`;
            image.alt = `파이썬 코드가 생성한 그래프 ${index + 1}`;
            images.appendChild(image);
        });
    } catch (executionError) {
        console.warn("Python 코드 실행 실패:", executionError);
        loading.hidden = true;
        error.hidden = false;
        error.textContent = `코드 실행 엔진을 사용할 수 없습니다.\n${executionError.message}`;
        status.textContent = "엔진 연결 실패";
        status.className = "execution-status error";
    }
}

function getAchievementById(achievementId) {
    return ACHIEVEMENTS.find((achievement) => achievement.id === achievementId) || null;
}

function formatBadgeAccuracy(value) {
    const accuracy = Math.max(0, Number(value) || 0);
    return Number.isInteger(accuracy) ? String(accuracy) : accuracy.toFixed(1);
}

function buildAchievementDetail(achievement) {
    const profile = AppState.profile;
    const unlocked = profile.achievements.includes(achievement.id);

    if (achievement.secret) {
        if (!unlocked) {
            return {
                unlocked,
                secretLocked: true,
                kicker: "SECRET BADGE · 미발견",
                title: "히든 배지 ???",
                image: achievement.image,
                status: "조건 탐색 중",
                condition: "획득 전까지 정확한 조건은 비밀이에요.",
                progress: null,
                sectionTitle: "히든 배지 플레이 힌트",
                countLabel: "플레이 힌트",
                items: [
                    {
                        type: "hint",
                        title: "여러 방식으로 플레이해보세요",
                        meta: "정확도·속도·콤보·누적 플레이처럼 평소와 다른 목표에 도전하면 발견할 수 있어요."
                    }
                ],
                target: null
            };
        }

        return {
            unlocked,
            secretLocked: false,
            kicker: "SECRET BADGE · 발견 완료",
            title: achievement.title,
            image: achievement.image,
            status: "획득 완료",
            condition: achievement.condition,
            progress: { current: 1, total: 1 },
            sectionTitle: "히든 배지 획득 기록",
            countLabel: "완료",
            items: [
                {
                    type: "complete",
                    title: "히든 조건을 달성했어요",
                    meta: achievement.description
                }
            ],
            target: null
        };
    }

    if (achievement.length) {
        const codes = AppState.metadata?.[achievement.difficulty]?.[achievement.length] || [];
        const progress = achievement.progress(profile);
        const questItems = codes.map((code) => {
            const record = profile.missions[code.id];
            const bestAccuracy = Number(record?.bestAccuracy || 0);
            const attempted = Boolean(record);
            const qualified = bestAccuracy >= BADGE_ACCURACY_THRESHOLD;
            const gap = Math.max(0, BADGE_ACCURACY_THRESHOLD - bestAccuracy);
            const stars = clamp(Number(record?.stars) || 0, 0, 3);
            const bestScore = Math.max(0, Number(record?.bestScore) || 0);
            return {
                type: qualified ? "complete" : attempted ? "retry" : "untried",
                title: code.title || "코드 퀘스트",
                statusLabel: qualified ? "인증 완료" : attempted ? "재인증 필요" : "미도전",
                accuracyValue: attempted ? `${formatBadgeAccuracy(bestAccuracy)}%` : "—",
                scoreValue: attempted ? `${bestScore.toLocaleString("ko-KR")}점` : "—",
                guidance: qualified
                    ? `${BADGE_ACCURACY_THRESHOLD}% 인증 기준 통과`
                    : attempted
                        ? `인증까지 ${formatBadgeAccuracy(gap)}%p 더 필요`
                        : "첫 플레이 기록을 만들어보세요",
                stars,
                progressValue: clamp(bestAccuracy, 0, 100),
                progressLabel: `최고 정확도 ${formatBadgeAccuracy(bestAccuracy)}%`,
                thresholdMarker: true,
                actionLabel: attempted ? "다시 도전" : "도전하기",
                target: {
                    difficulty: achievement.difficulty,
                    length: achievement.length,
                    codeId: code.id
                }
            };
        });
        const missing = questItems.filter((item) => item.type !== "complete");

        return {
            unlocked,
            secretLocked: false,
            kicker: `${achievement.worldTitle} · ${LENGTH_CONFIG[achievement.length].label}`,
            title: achievement.title,
            image: achievement.image,
            status: unlocked ? "획득 완료" : `${missing.length}개 퀘스트 남음`,
            condition: achievement.condition,
            progress,
            sectionTitle: "퀘스트별 인증 현황",
            countLabel: `${progress.current} / ${progress.total} 인증 · 기준 ${BADGE_ACCURACY_THRESHOLD}%`,
            items: questItems,
            target: missing[0]?.target || null
        };
    }

    const progress = achievement.progress(profile);
    const stageItems = Object.keys(LENGTH_CONFIG).map((length) => {
        const stageProgress = qualifiedMissionProgress(profile, achievement.difficulty, length);
        const complete = stageProgress.total > 0 && stageProgress.current === stageProgress.total;
        const codes = AppState.metadata?.[achievement.difficulty]?.[length] || [];
        const firstMissing = codes.find((code) =>
            Number(profile.missions[code.id]?.bestAccuracy || 0) < BADGE_ACCURACY_THRESHOLD
        );
        return {
            type: complete ? "complete" : stageProgress.current > 0 ? "retry" : "untried",
            title: `${LENGTH_CONFIG[length].label} 스테이지`,
            meta: complete
                ? `${stageProgress.current} / ${stageProgress.total} 퀘스트 인증 완료`
                : `${stageProgress.current} / ${stageProgress.total} 퀘스트 인증 · 각 정확도 ${BADGE_ACCURACY_THRESHOLD}% 이상`,
            progressValue: stageProgress.total > 0
                ? Math.round((stageProgress.current / stageProgress.total) * 100)
                : 0,
            progressLabel: `${stageProgress.current} / ${stageProgress.total} 퀘스트 인증`,
            actionLabel: complete ? null : "이어 도전",
            target: firstMissing
                ? {
                    difficulty: achievement.difficulty,
                    length,
                    codeId: firstMissing.id
                }
                : null
        };
    });
    const incompleteStages = stageItems.filter((item) => item.type !== "complete");
    const firstIncomplete = incompleteStages.find((item) => item.target);

    return {
        unlocked,
        secretLocked: false,
        kicker: `${achievement.worldTitle} · MASTER BADGE`,
        title: achievement.title,
        image: achievement.image,
        status: unlocked ? "획득 완료" : `${incompleteStages.length}개 스테이지 남음`,
        condition: achievement.condition,
        progress,
        sectionTitle: "스테이지별 인증 현황",
        countLabel: `${progress.current} / ${progress.total} 배지 획득`,
        items: stageItems,
        target: firstIncomplete?.target || null
    };
}

function closeAchievementDetail(options = {}) {
    const dialog = $("#achievement-detail-dialog");
    if (!dialog?.open) return;

    const restoreFocus = options.restoreFocus !== false;
    dialog.close();
    document.body.classList.remove("achievement-detail-open");

    if (restoreFocus && AppState.achievementDetailTrigger?.isConnected) {
        window.requestAnimationFrame(() => AppState.achievementDetailTrigger.focus());
    }
    AppState.achievementDetailTrigger = null;
}

async function openAchievementDetail(achievementId, trigger) {
    const achievement = getAchievementById(achievementId);
    const dialog = $("#achievement-detail-dialog");
    if (!achievement || !dialog) return;

    await getMetadata();
    const detail = buildAchievementDetail(achievement);
    const progressSection = $("#achievement-detail-progress");
    const progressFill = $("#achievement-detail-progress-fill");
    const missingList = $("#achievement-detail-missing-list");
    const action = $("#achievement-detail-action");
    const actions = $(".achievement-detail-actions", dialog);
    const status = $("#achievement-detail-status");

    AppState.achievementDetailTrigger = trigger || document.activeElement;
    dialog.classList.toggle("is-secret-locked", detail.secretLocked);
    setText("achievement-detail-kicker", detail.kicker);
    setText("achievement-detail-title", detail.title);
    setText("achievement-detail-condition", detail.condition);
    setText("achievement-detail-status", detail.status);
    setText("achievement-detail-missing-title", detail.sectionTitle);
    setText("achievement-detail-missing-count", detail.countLabel);
    $("#achievement-detail-image").src = detail.image;
    status.className = `achievement-detail-status ${detail.unlocked ? "is-complete" : "is-in-progress"}`;

    progressSection.hidden = !detail.progress;
    if (detail.progress) {
        const percentage = detail.progress.total > 0
            ? Math.round((detail.progress.current / detail.progress.total) * 100)
            : 0;
        setText("achievement-detail-progress-value", detail.unlocked
            ? "획득 완료"
            : `${detail.progress.current} / ${detail.progress.total}`);
        progressFill.style.width = `${percentage}%`;
        progressSection.setAttribute(
            "aria-label",
            `배지 진행도 ${detail.progress.current} / ${detail.progress.total}`
        );
    }

    missingList.innerHTML = detail.items.map((item) => {
        const itemProgress = Number.isFinite(item.progressValue)
            ? `
                <span class="achievement-detail-item-progress ${item.thresholdMarker ? "has-threshold" : ""}" aria-label="${escapeHTML(item.progressLabel)}">
                    <i style="width:${clamp(item.progressValue, 0, 100)}%"></i>
                    ${item.thresholdMarker ? `<b aria-hidden="true" title="인증 기준 ${BADGE_ACCURACY_THRESHOLD}%"></b>` : ""}
                </span>
            `
            : "";
        const itemAction = item.target && item.actionLabel
            ? `
                <button
                    class="achievement-detail-item-action"
                    type="button"
                    data-action="go-achievement-quest"
                    data-difficulty="${escapeHTML(item.target.difficulty)}"
                    data-length="${escapeHTML(item.target.length)}"
                    data-code-id="${escapeHTML(item.target.codeId)}"
                    aria-label="${escapeHTML(item.title)} ${escapeHTML(item.actionLabel)}"
                >${escapeHTML(item.actionLabel)}<i aria-hidden="true">→</i></button>
            `
            : "";
        const itemStars = Number.isFinite(item.stars)
            ? `<span class="achievement-detail-item-stars" aria-label="획득 별 ${item.stars}개">${missionStarsMarkup(item.stars)}</span>`
            : "";
        const itemMetrics = item.statusLabel
            ? `
                <span class="achievement-detail-item-status-row">
                    <span class="achievement-detail-item-state">${escapeHTML(item.statusLabel)}</span>
                    <span class="achievement-detail-item-guidance">${escapeHTML(item.guidance)}</span>
                </span>
                <span class="achievement-detail-item-performance">
                    <span class="achievement-detail-performance-card is-accuracy">
                        <span class="achievement-detail-performance-label">
                            <small>BEST ACCURACY</small>
                            <b>최고 정확도</b>
                        </span>
                        <strong>${escapeHTML(item.accuracyValue)}</strong>
                        ${itemProgress}
                    </span>
                    <span class="achievement-detail-performance-card is-score">
                        <span class="achievement-detail-performance-label">
                            <small>BEST SCORE</small>
                            <b>최고 점수</b>
                        </span>
                        <strong>${escapeHTML(item.scoreValue)}</strong>
                    </span>
                </span>
            `
            : `<small>${escapeHTML(item.meta)}</small>${itemProgress}`;

        return `
            <li class="achievement-detail-item is-${escapeHTML(item.type)}">
                <span class="achievement-detail-item-icon" aria-hidden="true">${item.type === "complete" ? "✓" : item.type === "hint" ? "?" : item.type === "untried" ? "+" : "!"}</span>
                <span class="achievement-detail-item-copy">
                    <span class="achievement-detail-item-title">
                        <strong>${escapeHTML(item.title)}</strong>
                        ${itemStars}
                    </span>
                    ${itemMetrics}
                </span>
                ${itemAction}
            </li>
        `;
    }).join("");

    action.hidden = !detail.target;
    actions.classList.toggle("has-primary", Boolean(detail.target));
    if (detail.target) {
        action.dataset.difficulty = detail.target.difficulty;
        action.dataset.length = detail.target.length;
        action.dataset.codeId = detail.target.codeId;
    } else {
        delete action.dataset.difficulty;
        delete action.dataset.length;
        delete action.dataset.codeId;
    }

    if (dialog.open) dialog.close();
    dialog.showModal();
    document.body.classList.add("achievement-detail-open");
    window.requestAnimationFrame(() => $(".achievement-detail-close", dialog)?.focus());
}

function renderStats() {
    const profile = AppState.profile;
    const levelData = getLevelData(profile.xp);
    const summary = getProfileSummary();

    setText("stats-avatar-level", levelData.level);
    setText("stats-level", levelData.level);
    setText("stats-level-title", getLevelTitle(levelData.level));
    setText("stats-xp", profile.xp);
    setWidth("stats-xp-fill", levelData.progress);
    setText("stats-runs", profile.totalRuns);
    setText("stats-best-cpm", profile.bestCpm);
    setText("stats-accuracy", summary.accuracy);
    setText("stats-streak", profile.streak.best);
    setText("stats-stars", summary.stars);
    setText("stats-perfect", profile.perfectRuns);
    const stageUnlocked = STAGE_ACHIEVEMENTS.filter((achievement) =>
        profile.achievements.includes(achievement.id)
    ).length;
    const hiddenUnlocked = HIDDEN_ACHIEVEMENTS.filter((achievement) =>
        profile.achievements.includes(achievement.id)
    ).length;
    setText("achievement-count", `${stageUnlocked} / ${STAGE_ACHIEVEMENTS.length} 획득`);
    setText("hidden-achievement-count", `${hiddenUnlocked} / ${HIDDEN_ACHIEVEMENTS.length} 발견`);

    renderRecentRuns(profile);

    const grid = $("#achievement-grid");
    grid.innerHTML = "";

    STAGE_ACHIEVEMENTS.forEach((achievement) => {
        const unlocked = profile.achievements.includes(achievement.id);
        const progress = achievement.progress(profile);
        const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
        const card = document.createElement("button");
        card.type = "button";
        card.className = `achievement-card ${unlocked ? "" : "locked"}`;
        card.dataset.action = "open-achievement-detail";
        card.dataset.achievementId = achievement.id;
        card.setAttribute("aria-label", `${achievement.title} 배지 상세 정보 보기. ${unlocked ? "획득 완료" : `진행도 ${progress.current} / ${progress.total}`}`);
        card.innerHTML = `
            <span class="achievement-icon" aria-hidden="true">
                <img src="${escapeHTML(achievement.image)}" alt="" width="320" height="320" loading="lazy">
            </span>
            <div>
                <span class="achievement-world-label">${escapeHTML(achievement.worldTitle)}</span>
                <h3>${escapeHTML(achievement.title)}</h3>
                <p>${escapeHTML(unlocked ? achievement.description : achievement.condition)}</p>
                <div class="achievement-progress" aria-label="배지 진행도 ${progress.current} / ${progress.total}">
                    <span><i style="width:${percentage}%"></i></span>
                    <strong>${unlocked ? "획득 완료" : `${progress.current} / ${progress.total}`}</strong>
                </div>
                <span class="achievement-card-action">상세 보기 <i aria-hidden="true">→</i></span>
            </div>
        `;
        grid.appendChild(card);
    });

    const hiddenGrid = $("#hidden-achievement-grid");
    hiddenGrid.innerHTML = "";

    HIDDEN_ACHIEVEMENTS.forEach((achievement) => {
        const unlocked = profile.achievements.includes(achievement.id);
        const card = document.createElement("button");
        card.type = "button";
        card.className = `achievement-card secret ${unlocked ? "" : "locked"}`;
        card.dataset.action = "open-achievement-detail";
        card.dataset.achievementId = achievement.id;
        card.setAttribute("aria-label", unlocked
            ? `${achievement.title} 히든 배지 상세 정보 보기. 발견 완료`
            : "미발견 히든 배지의 플레이 힌트 보기");
        card.innerHTML = `
            <span class="achievement-icon" aria-hidden="true">
                <img src="${escapeHTML(achievement.image)}" alt="" width="320" height="320" loading="lazy">
            </span>
            <div>
                <span class="achievement-world-label">SECRET BADGE</span>
                <h3>${escapeHTML(unlocked ? achievement.title : "???")}</h3>
                <p>${escapeHTML(unlocked ? achievement.description : "숨겨진 플레이 조건을 발견해보세요.")}</p>
                <div class="achievement-secret-status">
                    <span aria-hidden="true">${unlocked ? "✦" : "?"}</span>
                    <strong>${unlocked ? "발견 완료" : "미발견"}</strong>
                </div>
                <span class="achievement-card-action">${unlocked ? "상세 보기" : "힌트 보기"} <i aria-hidden="true">→</i></span>
            </div>
        `;
        hiddenGrid.appendChild(card);
    });
}

function formatPlayDate(completedAt) {
    const date = new Date(completedAt);
    if (Number.isNaN(date.getTime())) return "최근 플레이";

    const dateKey = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");

    if (dateKey === localDateKey()) return "오늘";

    return new Intl.DateTimeFormat("ko-KR", {
        month: "short",
        day: "numeric"
    }).format(date);
}

function renderRecentRuns(profile) {
    const list = $("#recent-run-list");
    const recentRuns = profile.recentRuns.slice(0, 3);

    setText("recent-run-count", `최근 ${recentRuns.length}판`);
    list.innerHTML = "";

    if (recentRuns.length === 0) {
        const empty = document.createElement("article");
        empty.className = "recent-run-empty";
        empty.innerHTML = `
            <span class="recent-empty-symbol" aria-hidden="true">PLAY</span>
            <div>
                <h3>첫 플레이를 기다리고 있어요!</h3>
                <p>월드를 골라 퀘스트를 완료하면 이곳에 모험 장면과 기록이 쌓여요.</p>
            </div>
        `;
        list.appendChild(empty);
        return;
    }

    recentRuns.forEach((run) => {
        const missionRecord = profile.missions[run.codeId] || {};
        const difficulty = run.difficulty || missionRecord.difficulty || "beginner";
        const world = WORLD_CONFIG[difficulty] || WORLD_CONFIG.beginner;
        const stars = clamp(Number(run.stars) || 0, 0, 3);
        const card = document.createElement("article");

        card.className = `recent-run-card recent-run-${difficulty}`;
        card.innerHTML = `
            <figure class="recent-run-art">
                <img
                    src="${escapeHTML(world.art)}"
                    alt=""
                    width="1024"
                    height="1024"
                    loading="eager"
                    decoding="async"
                >
                <span>${escapeHTML(world.code)}</span>
            </figure>
            <div class="recent-run-copy">
                <div class="recent-run-meta">
                    <span>${escapeHTML(world.title)}</span>
                    <time datetime="${escapeHTML(run.completedAt || "")}">${escapeHTML(formatPlayDate(run.completedAt))}</time>
                </div>
                <h3>${escapeHTML(run.title || "코드 퀘스트")}</h3>
                <div class="recent-run-rating">
                    <span class="recent-run-stars" aria-label="별 ${stars}개">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</span>
                    <strong>${Number(run.score || 0).toLocaleString("ko-KR")}점</strong>
                </div>
                <dl class="recent-run-metrics">
                    <div><dt>정확도</dt><dd>${Number(run.accuracy || 0)}%</dd></div>
                    <div><dt>타수</dt><dd>${Number(run.cpm || 0)}</dd></div>
                </dl>
            </div>
        `;
        list.appendChild(card);
    });
}

function showStats() {
    renderStats();
    showScreen("stats-screen");
}

function renderSettings() {
    const sound = $("#sound-toggle");
    const motion = $("#motion-toggle");
    sound.checked = Boolean(AppState.profile.settings.sound);
    motion.checked = Boolean(AppState.profile.settings.motion);
}

function showSettings() {
    renderSettings();
    showScreen("settings-screen");
}

async function applySettingChanges() {
    const previousSettings = { ...AppState.profile.settings };
    AppState.profile.settings.sound = $("#sound-toggle").checked;
    AppState.profile.settings.motion = $("#motion-toggle").checked;
    document.body.dataset.motion = AppState.profile.settings.motion ? "on" : "off";
    try {
        await saveProfile();
    } catch {
        AppState.profile.settings = previousSettings;
        document.body.dataset.motion = previousSettings.motion ? "on" : "off";
        renderSettings();
    }
}

async function handleAction(button) {
    const action = button.dataset.action;

    switch (action) {
        case "home":
            await showHome();
            break;
        case "show-stats":
            showStats();
            break;
        case "show-settings":
            showSettings();
            break;
        case "scroll-worlds":
            $("#world-section")?.scrollIntoView({
                behavior: AppState.profile.settings.motion ? "smooth" : "auto",
                block: "start"
            });
            break;
        case "continue": {
            button.disabled = true;
            try {
                const mission = await findRecommendedMission();
                await startGame(mission.difficulty, mission.length, mission.code.id);
            } finally {
                button.disabled = false;
            }
            break;
        }
        case "select-world":
            await showWorld(button.dataset.difficulty, "short");
            break;
        case "select-length":
            if (!LENGTH_CONFIG[button.dataset.length]) break;
            AppState.currentLength = button.dataset.length;
            button.classList.add("is-launching");
            await renderMissionScreen();
            $("#mode-lobby")?.classList.add("is-leaving");
            if (AppState.profile.settings.motion) {
                await new Promise((resolve) => window.setTimeout(resolve, 220));
            }
            setMissionView("stages");
            break;
        case "choose-mode":
            setMissionView("lobby");
            break;
        case "start-mission":
            await showMissionPreview(
                AppState.currentDifficulty,
                AppState.currentLength,
                button.dataset.codeId
            );
            break;
        case "open-achievement-detail":
            await openAchievementDetail(button.dataset.achievementId, button);
            break;
        case "close-achievement-detail":
            closeAchievementDetail();
            break;
        case "go-achievement-quest": {
            const { difficulty, length, codeId } = button.dataset;
            if (!difficulty || !length || !codeId) break;
            closeAchievementDetail({ restoreFocus: false });
            await showWorld(difficulty, length, "stages");
            await showMissionPreview(difficulty, length, codeId);
            break;
        }
        case "close-mission-preview":
            closeMissionPreview();
            break;
        case "close-achievement-reveal":
            closeAchievementReveal();
            break;
        case "confirm-mission-preview": {
            const dialog = $("#mission-preview");
            if (!dialog?.dataset.codeId) break;
            const { difficulty, length, codeId } = dialog.dataset;
            closeMissionPreview();
            await startGame(difficulty, length, codeId);
            break;
        }
        case "exit-game":
            if (AppState.game) AppState.game.destroy();
            await showWorld(AppState.currentDifficulty, AppState.currentLength, "stages");
            break;
        case "retry":
            if (AppState.currentCode) {
                await startGame(
                    AppState.currentDifficulty,
                    AppState.currentLength,
                    AppState.currentCode.id
                );
            }
            break;
        case "mission-map":
            await showWorld(AppState.currentDifficulty, AppState.currentLength, "stages");
            break;
        case "next-mission": {
            button.disabled = true;
            try {
                const next = await findNextMission();
                if (next) {
                    await startGame(next.difficulty, next.length, next.code.id);
                } else {
                    showToast("모든 미션을 완료했습니다. 원하는 월드를 다시 공략해보세요!", "success");
                    await showHome();
                }
            } finally {
                button.disabled = false;
            }
            break;
        }
        case "reload-data":
            AppState.metadata = null;
            await renderWorldCards();
            break;
        default:
            break;
    }
}

function bindEvents() {
    $("#achievement-detail-dialog")?.addEventListener("cancel", (event) => {
        event.preventDefault();
        closeAchievementDetail();
    });

    $("#mission-preview")?.addEventListener("cancel", (event) => {
        event.preventDefault();
        closeMissionPreview();
    });

    document.addEventListener("click", (event) => {
        const achievementDetail = $("#achievement-detail-dialog");
        if (event.target === achievementDetail) {
            closeAchievementDetail();
            return;
        }

        const preview = $("#mission-preview");
        if (event.target === preview) {
            closeMissionPreview();
            return;
        }

        const button = event.target.closest("[data-action]");
        if (!button || button.disabled) return;

        Promise.resolve(handleAction(button)).catch((error) => {
            console.error(`액션 처리 실패 (${button.dataset.action}):`, error);
            showToast("요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.", "error");
        });
    });

    $("#sound-toggle").addEventListener("change", () => applySettingChanges().catch(() => {}));
    $("#motion-toggle").addEventListener("change", () => applySettingChanges().catch(() => {}));

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;

        const achievementReveal = $("#achievement-reveal");
        if (achievementReveal && !achievementReveal.hidden) {
            event.preventDefault();
            closeAchievementReveal();
            return;
        }

        if ($("#achievement-detail-dialog")?.open) {
            event.preventDefault();
            closeAchievementDetail();
            return;
        }

        if ($("#mission-preview")?.open) {
            event.preventDefault();
            closeMissionPreview();
            return;
        }

        if (window.BattleMode?.isBattleScreen()) {
            window.BattleMode.handleEscape();
        } else if (AppState.currentScreen === "game-screen") {
            if (AppState.game) AppState.game.destroy();
            showWorld(AppState.currentDifficulty, AppState.currentLength, "stages").catch(console.error);
        } else if (
            AppState.currentScreen === "mission-screen"
            && $("#mission-screen")?.dataset.view === "stages"
        ) {
            setMissionView("lobby");
        } else if (AppState.currentScreen !== "main-menu") {
            showHome().catch(console.error);
        }
    });
}

async function initializeApp() {
    if (AppState.initialized) return;
    AppState.initialized = true;

    AppState.profile = await loadProfile();
    bindEvents();
    updateProfileUI();

    try {
        await getMetadata();
        const achievementsBeforeSync = [...AppState.profile.achievements];
        AppState.pendingAchievements = unlockAchievements(AppState.profile);
        if (AppState.pendingAchievements.length > 0) {
            try {
                await saveProfile();
            } catch {
                AppState.profile.achievements = achievementsBeforeSync;
                AppState.pendingAchievements = [];
                showToast("기존 기록의 배지 동기화에 실패했습니다. 다음 접속 때 다시 시도합니다.", "error");
            }
        }
        await renderHome();
    } catch (error) {
        console.error("앱 초기화 실패:", error);
        showToast("미션 데이터를 불러오지 못했습니다. HTTP 서버 실행 여부를 확인해 주세요.", "error");
    }

    showScreen("main-menu", { focus: false, preserveScroll: true });

    if (AppState.pendingAchievements.length > 0) {
        const pending = [...AppState.pendingAchievements];
        AppState.pendingAchievements = [];
        window.setTimeout(() => showAchievementReveal(pending), AppState.profile.settings.motion ? 520 : 0);
    }
}

window.PythonQuest = {
    showHome,
    showWorld,
    startGame,
    getState: () => AppState,
    getProfile: () => AppState.profile
};

window.showDifficulty = showWorld;
window.startGame = startGame;
window.showStats = showStats;
window.showSettings = showSettings;

window.addEventListener("error", (event) => {
    console.error("전역 오류:", event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
    console.error("처리되지 않은 비동기 오류:", event.reason);
});

document.addEventListener("DOMContentLoaded", () => {
    initializeApp().catch((error) => {
        console.error("Python Quest Academy 초기화 실패:", error);
        showToast("앱을 시작하지 못했습니다. 페이지를 새로고침해 주세요.", "error");
    });
});
