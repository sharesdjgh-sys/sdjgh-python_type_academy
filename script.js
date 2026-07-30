"use strict";

// =========================================================
// Python Quest Academy
// 코드 타이핑 학습을 월드 탐험과 전투 흐름으로 구성한 클라이언트 앱
// =========================================================

const PROFILE_KEY = "pythonQuestProfileV2";
const PROFILE_VERSION = 2;
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
            "assets/world-01-zone-01.webp",
            "assets/world-01-zone-02.webp",
            "assets/world-01-zone-03.webp",
            "assets/world-01-zone-04.webp",
            "assets/world-01-zone-05.webp"
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
        enemies: ["출력 젤리", "연산 폭스", "리스트 큐브", "문자열 고스트", "루프 베어"]
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
        hubAlt: "빛나는 레일을 따라 다섯 로직 퍼즐 구역을 탐험하는 로봇 캐릭터",
        stageArts: [
            "assets/world-02-zone-01.webp",
            "assets/world-02-zone-02.webp",
            "assets/world-02-zone-03.webp",
            "assets/world-02-zone-04.webp",
            "assets/world-02-zone-05.webp"
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
        enemies: ["조건문 블록", "루프 스피너", "함수 캡슐", "자료구조 큐브", "정렬 비트"]
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
        hubAlt: "데이터 도시의 다섯 분석 구역을 연결하며 대시보드를 조작하는 로봇 캐릭터",
        stageArts: [
            "assets/world-03-zone-01.webp",
            "assets/world-03-zone-02.webp",
            "assets/world-03-zone-03.webp",
            "assets/world-03-zone-04.webp",
            "assets/world-03-zone-05.webp"
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
        enemies: ["데이터 비트", "배열 웨이브", "모델 픽셀", "결측치 고스트", "차트 스타"]
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

const ACHIEVEMENTS = [
    {
        id: "first_clear",
        icon: "01",
        title: "첫 클리어",
        description: "첫 번째 코드 퀘스트를 완료했어요.",
        check: (profile) => profile.totalRuns >= 1
    },
    {
        id: "perfect_code",
        icon: "100",
        title: "퍼펙트 플레이",
        description: "정확도 100%로 퀘스트를 클리어했어요.",
        check: (profile) => profile.perfectRuns >= 1
    },
    {
        id: "combo_50",
        icon: "×50",
        title: "50 COMBO",
        description: "한 판에서 50 콤보를 달성했어요.",
        check: (_profile, result) => Boolean(result && result.maxCombo >= 50)
    },
    {
        id: "boss_clear",
        icon: "B",
        title: "파이널 클리어",
        description: "긴 코드 파이널 스테이지를 완료했어요.",
        check: (_profile, result) => Boolean(result && result.length === "long")
    },
    {
        id: "ten_clears",
        icon: "10",
        title: "10판 완료",
        description: "코드 퀘스트를 누적 10회 완료했어요.",
        check: (profile) => profile.totalRuns >= 10
    },
    {
        id: "speed_250",
        icon: "250",
        title: "스피드 스타",
        description: "타수/분 250 이상을 달성했어요.",
        check: (profile) => profile.bestCpm >= 250
    }
];

const AppState = {
    currentScreen: "main-menu",
    currentDifficulty: "beginner",
    currentLength: "short",
    currentCode: null,
    currentResult: null,
    game: null,
    profile: null,
    metadata: null,
    pyodide: null,
    pyodidePromise: null,
    audioContext: null,
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

function safeParse(value, fallback) {
    try {
        return JSON.parse(value);
    } catch (error) {
        console.warn("저장 데이터를 읽는 중 형식 오류가 발견되었습니다.", error);
        return fallback;
    }
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
            ? candidate.achievements
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

function migrateLegacyProfile(profile) {
    const legacyProgress = safeParse(localStorage.getItem("gameProgress"), {});
    const legacyRecords = safeParse(localStorage.getItem("pythonTypingRecords"), []);

    for (const [difficulty, records] of Object.entries(legacyProgress || {})) {
        if (!records || typeof records !== "object") continue;

        for (const [codeId, record] of Object.entries(records)) {
            if (!record || !record.completed || profile.missions[codeId]) continue;
            profile.missions[codeId] = {
                difficulty,
                length: codeId.split("_")[1] === "s"
                    ? "short"
                    : codeId.split("_")[1] === "m"
                        ? "medium"
                        : "long",
                stars: 1,
                bestScore: 0,
                bestCpm: 0,
                bestAccuracy: 100,
                clears: 1,
                updatedAt: record.timestamp || new Date().toISOString()
            };
        }
    }

    if (Array.isArray(legacyRecords) && legacyRecords.length > 0) {
        profile.totalRuns = Math.max(profile.totalRuns, legacyRecords.length);
        profile.bestCpm = Math.max(
            profile.bestCpm,
            ...legacyRecords.map((record) => Number(record.wpm) || 0)
        );
    }

    return profile;
}

function loadProfile() {
    const stored = safeParse(localStorage.getItem(PROFILE_KEY), null);
    let profile = mergeProfile(stored);

    if (!stored) {
        profile = migrateLegacyProfile(profile);
    }

    const today = localDateKey();
    if (profile.daily.date !== today) {
        profile.daily = { date: today, runs: 0 };
    }

    return profile;
}

function saveProfile() {
    try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(AppState.profile));
        return true;
    } catch (error) {
        console.error("플레이 기록 저장 실패:", error);
        showToast("브라우저 저장 공간을 사용할 수 없어 이번 기록을 저장하지 못했습니다.", "error");
        return false;
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
            const completed = codes.filter((code) => AppState.profile.missions[code.id]).length;
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
                        <span>${completed}/${codes.length} 미션</span>
                    </span>
                    <span class="world-card-symbol" aria-hidden="true">${escapeHTML(config.symbol)}</span>
                </span>
                <span class="world-card-body">
                    <span class="world-card-kicker">${escapeHTML(config.kicker)}</span>
                    <h3>${escapeHTML(config.title)}</h3>
                    <p>${escapeHTML(config.cardDescription)}</p>
                    <span class="world-card-footer">
                        <span class="world-card-progress">
                            <span>${percentage}% 완료</span>
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

function missionStarsMarkup(stars) {
    const count = clamp(Number(stars) || 0, 0, 3);
    return Array.from({ length: 3 }, (_, index) =>
        `<span class="${index < count ? "earned" : ""}">★</span>`
    ).join("");
}

async function showWorld(difficulty, length = null) {
    if (!WORLD_CONFIG[difficulty]) difficulty = "beginner";
    AppState.currentDifficulty = difficulty;
    AppState.currentLength = length || AppState.currentLength || "short";

    await renderMissionScreen();
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
    const completedWorld = allWorldCodes.filter((code) => AppState.profile.missions[code.id]).length;
    const worldPercentage = allWorldCodes.length
        ? Math.round((completedWorld / allWorldCodes.length) * 100)
        : 0;

    setText("mission-world-code", config.code);
    setText("mission-screen-title", config.title);
    setText("mission-world-symbol", config.symbol);
    setText("mission-world-kicker", config.kicker);
    setText("mission-world-title", config.headline);
    setText("mission-world-description", config.description);
    setText("world-progress-label", `${completedWorld} / ${allWorldCodes.length} 미션`);
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
        const completedCount = stageCodes.filter((code) => AppState.profile.missions[code.id]).length;
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
                                aria-label="${escapeHTML(code.title)} 미션 시작"
                            >
                                <span class="mission-step">${String(index + 1).padStart(2, "0")}</span>
                                <strong>${escapeHTML(code.title)}</strong>
                                <span class="mission-rating">${missionStarsMarkup(record?.stars || 0)}</span>
                            </button>
                        `;
                    }).join("")}
                </div>
                <div class="stage-reward">
                    <div class="stage-reward-copy">
                        <span>STAR COLLECTION</span>
                        <strong>${stageStars} / ${maxStageStars} ★</strong>
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
            const unfinished = codes.find((code) => !AppState.profile.missions[code.id]);
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
        this.boundInput = (event) => this.handleInput(event);
        this.boundKeydown = (event) => this.handleKeydown(event);
        this.boundPaste = (event) => this.blockPaste(event);
        this.boundCursor = () => this.updateLineStates(this.input.value);
    }

    start() {
        const levelGroup = Number(this.code.levelGroup) || 1;
        const enemy = getEnemyName(this.difficulty, levelGroup);
        const level = getLevelData(AppState.profile.xp).level;

        setText("game-mode-label", `${LENGTH_CONFIG[this.length].label} · 스테이지 ${levelGroup}`);
        setText("game-mission-title", this.code.title);
        setText("battle-player-level", `LV.${level}`);
        setText("enemy-name", enemy);
        setText("target-line-count", `${this.targetLines.length}줄`);
        setText("timer", "00:00");

        this.renderTargetCode();
        this.input.value = "";
        this.input.scrollTop = 0;
        this.input.addEventListener("input", this.boundInput);
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

    handleInput() {
        if (this.completed || this.completing) return;

        const currentValue = normalizeCode(this.input.value);
        const change = this.diffText(this.previousValue, currentValue);

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
            this.metrics.corrections += change.removed.length;
        }

        this.previousValue = currentValue;
        this.playTypingSound(correctInChange > 0 && incorrectInChange === 0);
        this.updateBattleView(currentValue);

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
                    this.triggerAttack(index);
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
        const enemyHealth = 100 - completion;

        setText("combo", this.metrics.combo);
        setText("accuracy", Math.round(accuracy));
        setText("cpm", cpm);
        setText("corrections", this.metrics.corrections);
        setText("completion", Math.round(completion));
        setText("live-score", this.getLiveScore(value));
        setText("focus-value", `${Math.round(accuracy)}%`);
        setText("enemy-health-value", `${Math.round(enemyHealth)}%`);

        setWidth("focus-bar", accuracy);
        setWidth("enemy-health-bar", enemyHealth);
        setWidth("game-progress-fill", completion);
    }

    triggerAttack(lineIndex) {
        const enemyAvatar = $("#enemy-avatar");
        const signal = $("#battle-signal");
        const effect = $("#battle-effect");
        const damage = 12 + Math.min(30, Math.floor(this.metrics.combo / 8));

        if (enemyAvatar) {
            enemyAvatar.classList.remove("hit");
            void enemyAvatar.offsetWidth;
            enemyAvatar.classList.add("hit");
        }

        if (signal) {
            signal.classList.remove("burst");
            void signal.offsetWidth;
            signal.classList.add("burst");
        }

        if (effect) {
            effect.textContent = `LINE ${lineIndex + 1} CLEAR!  +${damage} BEAT`;
            effect.classList.remove("show");
            void effect.offsetWidth;
            effect.classList.add("show");
        }

        this.playTone(520, 0.045);
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

        const score = Math.round(
            accuracy * 6 +
            Math.min(250, speedRatio * 180) +
            Math.min(150, (this.metrics.maxCombo / Math.max(1, this.targetText.length)) * 180)
        );

        let rank = "C";
        if (accuracy >= 99 && speedRatio >= 1.15) rank = "S";
        else if (accuracy >= 97) rank = "A";
        else if (accuracy >= 93) rank = "B";

        const multiplier = LENGTH_CONFIG[this.length].reward;
        const xp = Math.round((45 + stars * 22 + score / 24) * multiplier);
        const coins = Math.round((8 + stars * 6 + score / 110) * multiplier);

        return {
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
        const rewardState = applyRewards(result);

        result.isPersonalBest = rewardState.isPersonalBest;
        result.newAchievements = rewardState.newAchievements;
        AppState.currentResult = result;

        renderResult(result);
        updateProfileUI();
        showScreen("result-screen");
        this.playTone(660, 0.1);

        executeAndRenderCode(result.code);
    }

    destroy() {
        if (this.timerId) {
            window.clearInterval(this.timerId);
            this.timerId = null;
        }

        if (!this.input) return;
        this.input.removeEventListener("input", this.boundInput);
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

function unlockAchievements(profile, result) {
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

function applyRewards(result) {
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
    saveProfile();

    return { isPersonalBest, newAchievements };
}

function resultMessage(result) {
    if (result.rank === "S") return "속도도 정확도도 퍼펙트! 오늘의 베스트 플레이예요.";
    if (result.rank === "A") return "리듬을 놓치지 않고 깔끔하게 클리어했어요.";
    if (result.rank === "B") return "스테이지 클리어! 오타를 조금만 줄이면 A 랭크예요.";
    return "첫 클리어 성공! 한 판 더 하면 별을 더 모을 수 있어요.";
}

function coachTip(result) {
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

function renderResult(result) {
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
    setText("result-coach-tip", coachTip(result));
    setText("result-code", result.code);

    const bestBadge = $("#personal-best-badge");
    if (bestBadge) bestBadge.hidden = !result.isPersonalBest;

    const unlockSection = $("#achievement-unlocks");
    const unlockList = $("#achievement-unlock-list");
    unlockList.innerHTML = "";

    if (result.newAchievements.length > 0) {
        result.newAchievements.forEach((achievement) => {
            const chip = document.createElement("span");
            chip.className = "unlock-chip";
            chip.textContent = `${achievement.icon} · ${achievement.title}`;
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
    setText("achievement-count", `${profile.achievements.length} / ${ACHIEVEMENTS.length} 획득`);

    renderRecentRuns(profile);

    const grid = $("#achievement-grid");
    grid.innerHTML = "";

    ACHIEVEMENTS.forEach((achievement) => {
        const unlocked = profile.achievements.includes(achievement.id);
        const card = document.createElement("article");
        card.className = `achievement-card ${unlocked ? "" : "locked"}`;
        card.innerHTML = `
            <span class="achievement-icon" aria-hidden="true">${escapeHTML(achievement.icon)}</span>
            <div>
                <h3>${escapeHTML(unlocked ? achievement.title : "잠긴 업적")}</h3>
                <p>${escapeHTML(unlocked ? achievement.description : "미션을 진행하면 조건이 공개됩니다.")}</p>
            </div>
        `;
        grid.appendChild(card);
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

function applySettingChanges() {
    AppState.profile.settings.sound = $("#sound-toggle").checked;
    AppState.profile.settings.motion = $("#motion-toggle").checked;
    document.body.dataset.motion = AppState.profile.settings.motion ? "on" : "off";
    saveProfile();
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
            await renderMissionScreen();
            {
                const modeEntry = $("#mode-stage-entry");
                if (modeEntry) {
                    modeEntry.classList.remove("is-entering");
                    void modeEntry.offsetWidth;
                    modeEntry.classList.add("is-entering");
                    modeEntry.scrollIntoView({
                        behavior: AppState.profile.settings.motion ? "smooth" : "auto",
                        block: "start"
                    });
                }
            }
            break;
        case "start-mission":
            await startGame(
                AppState.currentDifficulty,
                AppState.currentLength,
                button.dataset.codeId
            );
            break;
        case "exit-game":
            if (AppState.game) AppState.game.destroy();
            await showWorld(AppState.currentDifficulty, AppState.currentLength);
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
            await showWorld(AppState.currentDifficulty, AppState.currentLength);
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
    document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-action]");
        if (!button || button.disabled) return;

        Promise.resolve(handleAction(button)).catch((error) => {
            console.error(`액션 처리 실패 (${button.dataset.action}):`, error);
            showToast("요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.", "error");
        });
    });

    $("#sound-toggle").addEventListener("change", applySettingChanges);
    $("#motion-toggle").addEventListener("change", applySettingChanges);

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;

        if (AppState.currentScreen === "game-screen") {
            if (AppState.game) AppState.game.destroy();
            showWorld(AppState.currentDifficulty, AppState.currentLength).catch(console.error);
        } else if (AppState.currentScreen !== "main-menu") {
            showHome().catch(console.error);
        }
    });
}

async function initializeApp() {
    if (AppState.initialized) return;
    AppState.initialized = true;

    AppState.profile = loadProfile();
    bindEvents();
    updateProfileUI();

    try {
        await renderHome();
    } catch (error) {
        console.error("앱 초기화 실패:", error);
        showToast("미션 데이터를 불러오지 못했습니다. HTTP 서버 실행 여부를 확인해 주세요.", "error");
    }

    showScreen("main-menu", { focus: false, preserveScroll: true });
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
