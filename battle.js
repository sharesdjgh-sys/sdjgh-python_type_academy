"use strict";

// 1대1 실시간 코드 레이스 클라이언트
(() => {
    const SESSION_KEY = "pythonQuestBattleSessionV1";
    const battleScreens = new Set([
        "battle-portal-screen",
        "battle-room-screen",
        "battle-race-screen",
        "battle-result-screen"
    ]);

    const state = {
        socket: null,
        session: null,
        room: null,
        targetText: "",
        raceStartsAt: null,
        raceTimer: null,
        countdownTimer: null,
        inputTimer: null,
        pendingInput: "",
        inputSequence: 0,
        ready: false,
        initialized: false,
        finishing: false
    };

    const worldLabels = {
        beginner: "월드 01 · 문법 플레이룸",
        intermediate: "월드 02 · 로직 아케이드",
        advanced: "월드 03 · 데이터 스테이지"
    };
    const lengthLabels = {
        short: "워밍업",
        medium: "메인 퀘스트",
        long: "파이널 스테이지"
    };

    function loadSession() {
        try {
            return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
        } catch {
            return null;
        }
    }

    function saveSession(session) {
        state.session = session;
        if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        else sessionStorage.removeItem(SESSION_KEY);
    }

    function setServerStatus(connected, text = null) {
        const status = document.getElementById("battle-server-status");
        if (!status) return;
        status.classList.toggle("is-connected", connected);
        status.lastChild.textContent = ` ${text || (connected ? "서버 연결됨" : "서버 연결 끊김")}`;
    }

    function emitWithAck(eventName, payload = {}) {
        return new Promise((resolve, reject) => {
            if (!state.socket?.connected) {
                reject(new Error("배틀 서버에 연결되지 않았습니다."));
                return;
            }
            state.socket.timeout(5000).emit(eventName, payload, (error, response) => {
                if (error) {
                    reject(new Error("배틀 서버 응답이 늦어지고 있습니다."));
                    return;
                }
                if (!response?.ok) {
                    reject(new Error(response?.error?.message || "배틀 요청을 처리하지 못했습니다."));
                    return;
                }
                resolve(response);
            });
        });
    }

    function currentPlayer(room = state.room) {
        return room?.players?.find((player) => player.id === state.session?.playerId) || null;
    }

    function rivalPlayer(room = state.room) {
        return room?.players?.find((player) => player.id !== state.session?.playerId) || null;
    }

    function setBusy(form, busy) {
        const button = form?.querySelector('button[type="submit"]');
        if (!button) return;
        button.disabled = busy;
        button.classList.toggle("is-loading", busy);
    }

    async function populateMissionSelectors() {
        const difficultySelect = document.getElementById("battle-difficulty");
        const lengthSelect = document.getElementById("battle-length");
        if (!difficultySelect || !lengthSelect || difficultySelect.options.length) return;

        const metadata = await getMetadata();
        difficultySelect.innerHTML = Object.keys(metadata)
            .map((difficulty) => `<option value="${difficulty}">${worldLabels[difficulty]}</option>`)
            .join("");
        lengthSelect.innerHTML = Object.keys(lengthLabels)
            .map((length) => `<option value="${length}">${lengthLabels[length]}</option>`)
            .join("");
        refreshMissionOptions();
    }

    async function refreshMissionOptions() {
        const metadata = await getMetadata();
        const difficulty = document.getElementById("battle-difficulty")?.value || "beginner";
        const length = document.getElementById("battle-length")?.value || "short";
        const missionSelect = document.getElementById("battle-mission");
        if (!missionSelect) return;
        missionSelect.innerHTML = (metadata[difficulty]?.[length] || [])
            .map((mission) => (
                `<option value="${escapeHTML(mission.id)}">`
                + `스테이지 ${mission.levelGroup} · ${escapeHTML(mission.title)}</option>`
            ))
            .join("");
    }

    async function openPortal() {
        stopRaceTimers();
        await populateMissionSelectors();
        showScreen("battle-portal-screen");
        setServerStatus(Boolean(state.socket?.connected));
    }

    function formatRoomMission(mission) {
        return `${worldLabels[mission?.difficulty] || "배틀 월드"} · ${lengthLabels[mission?.length] || ""}`;
    }

    function playerSlotMarkup(player, index) {
        const kartAsset = index === 0
            ? "assets/python-kart-battle-coral.png"
            : "assets/python-kart-battle-lavender.png";
        if (!player) {
            return `
                <span class="player-slot-avatar" aria-hidden="true"><img src="${kartAsset}" alt=""></span>
                <div><small>${index === 0 ? "HOST" : "CHALLENGER"}</small>
                <strong>기다리는 중</strong><span>연결 대기</span></div>
            `;
        }
        const readyText = player.ready ? "READY!" : player.connected ? "준비 중" : "재접속 대기";
        return `
            <span class="player-slot-avatar" aria-hidden="true"><img src="${kartAsset}" alt=""></span>
            <div><small>${player.isHost ? "HOST" : "CHALLENGER"}</small>
            <strong>${escapeHTML(player.nickname)}${player.id === state.session?.playerId ? " · 나" : ""}</strong>
            <span>${readyText}</span></div>
        `;
    }

    function renderWaitingRoom(room) {
        state.room = room;
        const mission = room.mission;
        setText("battle-room-code", room.roomCode);
        setText("battle-room-world", formatRoomMission(mission));
        setText("battle-room-mission", mission.title);
        setText("battle-room-description", mission.description || "선택한 코드를 친구와 동시에 입력합니다.");

        const players = room.players || [];
        const slotOne = document.getElementById("battle-player-one");
        const slotTwo = document.getElementById("battle-player-two");
        if (slotOne) {
            slotOne.innerHTML = playerSlotMarkup(players[0], 0);
            slotOne.classList.toggle("is-ready", Boolean(players[0]?.ready));
            slotOne.classList.toggle("is-offline", Boolean(players[0] && !players[0].connected));
        }
        if (slotTwo) {
            slotTwo.innerHTML = playerSlotMarkup(players[1], 1);
            slotTwo.classList.toggle("is-ready", Boolean(players[1]?.ready));
            slotTwo.classList.toggle("is-offline", Boolean(players[1] && !players[1].connected));
        }

        const me = currentPlayer(room);
        state.ready = Boolean(me?.ready);
        const readyButton = document.getElementById("battle-ready-button");
        if (readyButton) {
            readyButton.disabled = players.length !== 2 || room.phase !== "waiting";
            readyButton.classList.toggle("is-ready", state.ready);
            readyButton.textContent = state.ready ? "준비 취소" : "준비 완료";
        }

        const message = players.length < 2
            ? "친구가 참가할 때까지 방 코드를 알려주세요."
            : room.phase === "countdown"
                ? "배틀이 곧 시작됩니다!"
                : players.every((player) => player.ready)
                    ? "두 플레이어 모두 준비 완료!"
                    : "준비 버튼을 누르면 상대와 상태가 공유됩니다.";
        setText("battle-room-message", message);

        if (AppState.currentScreen !== "battle-room-screen" && room.phase === "waiting") {
            showScreen("battle-room-screen");
        }
    }

    function renderTargetLines(targetText) {
        const list = document.getElementById("battle-target-lines");
        if (!list) return;
        list.innerHTML = "";
        targetText.split("\n").forEach((line) => {
            const item = document.createElement("li");
            const code = document.createElement("span");
            code.textContent = line || " ";
            item.appendChild(code);
            list.appendChild(item);
        });
    }

    function updateRacePlayers(room) {
        state.room = room;
        const me = currentPlayer(room);
        const rival = rivalPlayer(room);
        setText("race-my-name", me?.nickname || "나");
        setText("race-rival-name", rival?.nickname || "상대");
        setText("race-my-percent", `${Math.round(me?.progress || 0)}%`);
        setText("race-rival-percent", `${Math.round(rival?.progress || 0)}%`);
        setText("race-my-cpm", `${Math.round(me?.cpm || 0)} CPM`);
        setText("race-rival-cpm", `${Math.round(rival?.cpm || 0)} CPM`);
        setWidth("race-my-progress", me?.progress || 0);
        setWidth("race-rival-progress", rival?.progress || 0);
        setBattleKartIdentity("battle-my-kart", me);
        setBattleKartIdentity("battle-rival-kart", rival);
        setBattleKartPosition("battle-my-kart", me?.progress || 0);
        setBattleKartPosition("battle-rival-kart", rival?.progress || 0);
        const notice = rival && !rival.connected
            ? "상대의 연결이 끊겼습니다. 15초 동안 재접속을 기다립니다."
            : "먼저 정확하게 완성하면 승리합니다.";
        setText("battle-race-notice", notice);
    }

    function setBattleKartIdentity(id, player) {
        const kart = document.getElementById(id);
        if (!kart || !player) return;

        const isHost = Boolean(player.isHost);
        const image = kart.querySelector("img");
        const lane = kart.closest(".battle-kart-lane");
        if (image) {
            image.src = isHost
                ? "assets/python-kart-battle-coral.png"
                : "assets/python-kart-battle-lavender.png";
            image.alt = isHost ? "HOST 코럴 카트" : "CHALLENGER 라벤더 카트";
        }
        if (lane) {
            lane.classList.toggle("kart-coral", isHost);
            lane.classList.toggle("kart-lavender", !isHost);
        }
    }

    function setBattleKartPosition(id, progress) {
        const kart = document.getElementById(id);
        if (!kart) return;

        const normalizedProgress = Math.min(100, Math.max(0, Number(progress) || 0));
        kart.style.left = `${8 + normalizedProgress * 0.82}%`;
        kart.classList.toggle("is-moving", normalizedProgress > 0 && normalizedProgress < 100);
        kart.classList.toggle("is-finished", normalizedProgress >= 100);
    }

    function startRaceTimer() {
        if (state.raceTimer) clearInterval(state.raceTimer);
        state.raceTimer = setInterval(() => {
            if (!state.raceStartsAt) return;
            const seconds = Math.max(0, (Date.now() - state.raceStartsAt) / 1000);
            setText("battle-race-timer", formatTime(seconds));
        }, 250);
    }

    function stopRaceTimers() {
        if (state.raceTimer) clearInterval(state.raceTimer);
        if (state.countdownTimer) clearInterval(state.countdownTimer);
        if (state.inputTimer) clearTimeout(state.inputTimer);
        state.raceTimer = null;
        state.countdownTimer = null;
        state.inputTimer = null;
    }

    function showCountdown(startsAt, targetText) {
        state.targetText = normalizeCode(targetText);
        state.raceStartsAt = startsAt;
        state.inputSequence = 0;
        state.finishing = false;
        renderTargetLines(state.targetText);
        setText("battle-race-title", state.room?.mission?.title || "배틀 미션");
        setText("battle-race-mode", formatRoomMission(state.room?.mission));

        const input = document.getElementById("battle-code-input");
        if (input) {
            input.value = "";
            input.disabled = true;
        }
        const overlay = document.getElementById("battle-countdown");
        if (overlay) overlay.hidden = false;
        showScreen("battle-race-screen");
        updateRacePlayers(state.room);

        if (state.countdownTimer) clearInterval(state.countdownTimer);
        state.countdownTimer = setInterval(() => {
            const remaining = Math.max(0, startsAt - Date.now());
            const number = Math.max(1, Math.ceil(remaining / 1000));
            const strong = overlay?.querySelector("strong");
            if (strong) strong.textContent = remaining > 0 ? number : "GO!";
            if (remaining <= 0) {
                clearInterval(state.countdownTimer);
                state.countdownTimer = null;
            }
        }, 80);
    }

    function enableRaceInput(startsAt) {
        state.raceStartsAt = startsAt;
        const overlay = document.getElementById("battle-countdown");
        if (overlay) {
            overlay.classList.add("is-go");
            setTimeout(() => {
                overlay.hidden = true;
                overlay.classList.remove("is-go");
            }, 450);
        }
        const input = document.getElementById("battle-code-input");
        if (input) {
            input.disabled = false;
            input.focus();
        }
        setText("battle-input-status", "레이스 중");
        startRaceTimer();
    }

    function queueInput(value) {
        state.pendingInput = value;
        if (state.inputTimer) return;
        state.inputTimer = setTimeout(async () => {
            state.inputTimer = null;
            try {
                state.inputSequence += 1;
                await emitWithAck("battle:input", {
                    sequence: state.inputSequence,
                    value: state.pendingInput
                });
            } catch (error) {
                setText("battle-race-notice", error.message);
            }
        }, 100);
    }

    function resultPlayerMarkup(player, winnerId, tie) {
        const won = !tie && player.id === winnerId;
        const duration = Number.isFinite(player.durationMs)
            ? `${(player.durationMs / 1000).toFixed(1)}초`
            : "미완주";
        return `
            <article class="battle-result-player ${won ? "is-winner" : ""}">
                <span>${won ? "WINNER" : tie ? "DRAW" : "PLAYER"}</span>
                <h2>${escapeHTML(player.nickname)}</h2>
                <dl>
                    <div><dt>완주</dt><dd>${duration}</dd></div>
                    <div><dt>정확도</dt><dd>${Math.round(player.accuracy || 0)}%</dd></div>
                    <div><dt>CPM</dt><dd>${Math.round(player.cpm || 0)}</dd></div>
                </dl>
            </article>
        `;
    }

    function renderResult(result) {
        if (state.finishing) return;
        state.finishing = true;
        stopRaceTimers();
        const input = document.getElementById("battle-code-input");
        if (input) input.disabled = true;

        const meWon = result.winnerId === state.session?.playerId;
        const title = result.tie ? "무승부!" : meWon ? "승리!" : "아쉬운 패배";
        const emblem = result.tie ? "DRAW" : meWon ? "WIN" : "LOSE";
        const message = result.reason === "forfeit"
            ? meWon
                ? "상대의 연결이 종료되어 승리했습니다."
                : "배틀 연결이 종료되어 기권 처리되었습니다."
            : result.tie
                ? "완주 시간과 정확도가 거의 같았어요."
                : meWon
                    ? "정확한 타이핑으로 코드 레이스를 먼저 완주했어요."
                    : "기록을 확인하고 다음 레이스에서 다시 도전해 보세요.";

        setText("battle-result-emblem", emblem);
        setText("battle-result-title", title);
        setText("battle-result-message", message);
        const container = document.getElementById("battle-result-players");
        if (container) {
            container.innerHTML = result.players
                .map((player) => resultPlayerMarkup(player, result.winnerId, result.tie))
                .join("");
        }
        document.getElementById("battle-result-screen")?.setAttribute("data-result", emblem.toLowerCase());
        showScreen("battle-result-screen");
    }

    async function acceptSession(response) {
        saveSession({
            roomCode: response.room.roomCode,
            playerId: response.playerId,
            resumeToken: response.resumeToken
        });
        state.room = response.room;
        if (response.targetText) state.targetText = response.targetText;
        renderWaitingRoom(response.room);
    }

    async function createRoom(form) {
        setBusy(form, true);
        try {
            const formData = new FormData(form);
            const response = await emitWithAck("battle:create", {
                nickname: formData.get("nickname"),
                missionId: formData.get("missionId")
            });
            await acceptSession(response);
        } catch (error) {
            showToast(error.message, "error");
        } finally {
            setBusy(form, false);
        }
    }

    async function joinRoom(form) {
        setBusy(form, true);
        try {
            const formData = new FormData(form);
            const response = await emitWithAck("battle:join", {
                nickname: formData.get("nickname"),
                roomCode: String(formData.get("roomCode") || "").toUpperCase()
            });
            await acceptSession(response);
        } catch (error) {
            showToast(error.message, "error");
        } finally {
            setBusy(form, false);
        }
    }

    async function resumeSession() {
        if (!state.session || !state.socket?.connected) return;
        try {
            const response = await emitWithAck("battle:resume", state.session);
            await acceptSession(response);
            if (response.room.phase === "racing" && response.targetText) {
                showCountdown(response.room.startsAt || Date.now(), response.targetText);
                enableRaceInput(response.room.startsAt || Date.now());
            }
        } catch {
            saveSession(null);
        }
    }

    function leaveRoom(destination = "portal") {
        if (state.socket?.connected && state.session) state.socket.emit("battle:leave");
        saveSession(null);
        state.room = null;
        state.targetText = "";
        stopRaceTimers();
        if (destination === "home") showHome();
        else openPortal().catch((error) => showToast(error.message, "error"));
    }

    async function toggleReady() {
        try {
            await emitWithAck("battle:ready", { ready: !state.ready });
        } catch (error) {
            showToast(error.message, "error");
        }
    }

    async function copyRoomCode() {
        const code = state.room?.roomCode;
        if (!code) return;
        try {
            await navigator.clipboard.writeText(code);
            showToast(`방 코드 ${code}를 복사했습니다.`, "success");
        } catch {
            showToast(`방 코드: ${code}`, "info");
        }
    }

    function bindSocket() {
        if (typeof window.io !== "function") {
            setServerStatus(false, "Node 서버로 실행해 주세요");
            return;
        }
        state.socket = window.io({ reconnection: true, reconnectionAttempts: 10 });
        state.socket.on("connect", () => {
            setServerStatus(true);
            resumeSession();
        });
        state.socket.on("disconnect", () => {
            setServerStatus(false, "재연결 중");
            setText("battle-race-notice", "서버와 연결이 끊겼습니다. 다시 연결하고 있어요.");
        });
        state.socket.on("battle:room", (room) => {
            state.room = room;
            if (room.phase === "waiting" || room.phase === "countdown") renderWaitingRoom(room);
            else updateRacePlayers(room);
        });
        state.socket.on("battle:countdown", ({ startsAt, targetText }) => {
            showCountdown(startsAt, targetText);
        });
        state.socket.on("battle:start", ({ startsAt }) => {
            enableRaceInput(startsAt);
        });
        state.socket.on("battle:state", (room) => updateRacePlayers(room));
        state.socket.on("battle:result", (result) => renderResult(result));
        state.socket.on("battle:error", (error) => {
            showToast(error.message || "배틀방 연결이 종료되었습니다.", "error");
            if (error.code === "ROOM_CLOSED" && state.session) {
                saveSession(null);
                openPortal();
            }
        });
    }

    function bindEvents() {
        document.addEventListener("click", (event) => {
            const button = event.target.closest("[data-battle-action]");
            if (!button || button.disabled) return;
            const action = button.dataset.battleAction;
            if (action === "open" || action === "new-room") openPortal();
            else if (action === "home") leaveRoom("home");
            else if (action === "leave") leaveRoom("portal");
            else if (action === "toggle-ready") toggleReady();
            else if (action === "copy-code") copyRoomCode();
        });

        document.getElementById("battle-create-form")?.addEventListener("submit", (event) => {
            event.preventDefault();
            createRoom(event.currentTarget);
        });
        document.getElementById("battle-join-form")?.addEventListener("submit", (event) => {
            event.preventDefault();
            joinRoom(event.currentTarget);
        });
        document.getElementById("battle-difficulty")?.addEventListener("change", refreshMissionOptions);
        document.getElementById("battle-length")?.addEventListener("change", refreshMissionOptions);
        document.getElementById("battle-room-code-input")?.addEventListener("input", (event) => {
            event.target.value = event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, "");
        });

        const input = document.getElementById("battle-code-input");
        input?.addEventListener("paste", (event) => {
            event.preventDefault();
            showToast("배틀에서는 붙여넣기를 사용할 수 없습니다.", "info");
        });
        input?.addEventListener("drop", (event) => event.preventDefault());
        input?.addEventListener("keydown", (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
                event.preventDefault();
                return;
            }
            if (event.key !== "Tab") return;
            event.preventDefault();
            input.setRangeText("    ", input.selectionStart, input.selectionEnd, "end");
            input.dispatchEvent(new Event("input", { bubbles: true }));
        });
        input?.addEventListener("input", () => queueInput(normalizeCode(input.value)));
    }

    async function initialize() {
        if (state.initialized) return;
        state.initialized = true;
        state.session = loadSession();
        bindEvents();
        bindSocket();
        try {
            await populateMissionSelectors();
        } catch (error) {
            console.error("배틀 미션 목록 준비 실패:", error);
        }
    }

    window.BattleMode = {
        open: openPortal,
        leaveToPortal: () => leaveRoom("portal"),
        leaveToHome: () => leaveRoom("home"),
        handleEscape: () => {
            if (AppState.currentScreen === "battle-portal-screen") showHome();
            else leaveRoom("portal");
        },
        isBattleScreen: () => battleScreens.has(AppState.currentScreen)
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, { once: true });
    } else {
        initialize();
    }
})();
