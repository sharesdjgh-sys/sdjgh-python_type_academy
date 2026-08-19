"use strict";

// 1대1 실시간 코드 레이스 클라이언트
(() => {
    const LEGACY_SESSION_KEY = "pythonQuestBattleSessionV1";
    const COUNTDOWN_DURATION_MS = 3000;
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
        retireTimer: null,
        retireEndsAt: null,
        inputTimer: null,
        pendingInput: "",
        inputSequence: 0,
        ready: false,
        entryMode: null,
        previewRequestId: 0,
        joinPreviewTimer: null,
        joinPreviewRequestId: 0,
        initialized: false,
        finishing: false,
        completedLineIndexes: new Set(),
        lineErrorIndexes: new Set(),
        feedbackLineCombo: 0,
        feedbackNitro: 0
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
    const stageMarkers = {
        1: "🟢",
        2: "🔵",
        3: "🟣",
        4: "🟠",
        5: "🔴"
    };

    function clearLegacySession() {
        try {
            sessionStorage.removeItem(LEGACY_SESSION_KEY);
        } catch (error) {
            console.warn("기존 배틀 세션을 정리하지 못했습니다.", error);
        }
    }

    function saveSession(session) {
        state.session = session;
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
        syncVisualSelectors();
        refreshMissionOptions();
    }

    function syncVisualSelectors() {
        const difficulty = document.getElementById("battle-difficulty")?.value || "beginner";
        const length = document.getElementById("battle-length")?.value || "short";
        document.querySelectorAll("[data-battle-difficulty-option]").forEach((button) => {
            button.setAttribute("aria-pressed", String(button.dataset.battleDifficultyOption === difficulty));
        });
        document.querySelectorAll("[data-battle-length-option]").forEach((button) => {
            button.setAttribute("aria-pressed", String(button.dataset.battleLengthOption === length));
        });
    }

    async function selectBattleConfig(type, value) {
        const selectId = type === "difficulty" ? "battle-difficulty" : "battle-length";
        const select = document.getElementById(selectId);
        if (!select || !Array.from(select.options).some((option) => option.value === value)) return;
        select.value = value;
        syncVisualSelectors();
        await refreshMissionOptions();
    }

    async function refreshMissionOptions() {
        const metadata = await getMetadata();
        const difficulty = document.getElementById("battle-difficulty")?.value || "beginner";
        const length = document.getElementById("battle-length")?.value || "short";
        const missionSelect = document.getElementById("battle-mission");
        if (!missionSelect) return;
        const missions = metadata[difficulty]?.[length] || [];
        const stageGroups = missions.reduce((groups, mission) => {
            const stage = Number(mission.levelGroup) || 1;
            if (!groups.has(stage)) groups.set(stage, []);
            groups.get(stage).push(mission);
            return groups;
        }, new Map());
        missionSelect.innerHTML = Array.from(stageGroups.entries())
            .map(([stage, stageMissions]) => {
                const marker = stageMarkers[stage] || "⚪";
                const options = stageMissions.map((mission) => (
                    `<option class="stage-${stage}" data-stage="${stage}" value="${escapeHTML(mission.id)}">`
                    + `${marker} ${escapeHTML(mission.title)}</option>`
                )).join("");
                return `<optgroup label="${marker} STAGE ${stage}">${options}</optgroup>`;
            })
            .join("");
        await renderMissionPreview();
    }

    async function renderMissionPreview() {
        const metadata = await getMetadata();
        const difficulty = document.getElementById("battle-difficulty")?.value || "beginner";
        const length = document.getElementById("battle-length")?.value || "short";
        const missionId = document.getElementById("battle-mission")?.value;
        const mission = (metadata[difficulty]?.[length] || [])
            .find((item) => item.id === missionId);
        const codeElement = document.getElementById("battle-mission-code");
        const description = document.getElementById("battle-mission-preview-description");
        const lineCount = document.getElementById("battle-mission-code-lines");
        if (!codeElement || !mission) return;

        const stage = String(Number(mission.levelGroup) || 1);
        const missionSelect = document.getElementById("battle-mission");
        if (missionSelect) {
            missionSelect.dataset.stage = stage;
            missionSelect.setAttribute("aria-label", `배틀 미션, 스테이지 ${stage} 선택됨`);
        }

        const requestId = ++state.previewRequestId;
        codeElement.textContent = "코드를 불러오는 중...";
        setText("battle-mission-preview-title", mission.title);
        if (description) description.textContent = mission.description || "선택한 코드를 친구와 동시에 입력합니다.";
        if (lineCount) lineCount.textContent = "— LINES";

        try {
            const code = await window.loadCodeFromFile(mission.file);
            if (requestId !== state.previewRequestId) return;
            const normalizedCode = normalizeCode(code);
            codeElement.textContent = normalizedCode;
            if (lineCount) {
                const lines = normalizedCode ? normalizedCode.split("\n").length : 0;
                lineCount.textContent = `${lines} ${lines === 1 ? "LINE" : "LINES"}`;
            }
        } catch {
            if (requestId !== state.previewRequestId) return;
            codeElement.textContent = "코드 미리보기를 불러오지 못했습니다.";
        }
    }

    function setEntryMode(mode = null) {
        state.entryMode = mode;
        const createForm = document.getElementById("battle-create-form");
        const joinForm = document.getElementById("battle-join-form");
        const missionPreview = document.getElementById("battle-mission-preview");
        const joinRoomPreview = document.getElementById("battle-join-room-preview");
        const createButton = document.querySelector('[data-battle-action="show-create"]');
        const joinButton = document.querySelector('[data-battle-action="show-join"]');
        const isCreate = mode === "create";
        const isJoin = mode === "join";

        if (createForm) createForm.hidden = !isCreate;
        if (missionPreview) missionPreview.hidden = !isCreate;
        if (joinForm) joinForm.hidden = !isJoin;
        if (joinRoomPreview) joinRoomPreview.hidden = !isJoin;
        createButton?.classList.toggle("is-active", isCreate);
        joinButton?.classList.toggle("is-active", isJoin);
        createButton?.setAttribute("aria-expanded", String(isCreate));
        joinButton?.setAttribute("aria-expanded", String(isJoin));

        if (state.joinPreviewTimer) clearTimeout(state.joinPreviewTimer);
        state.joinPreviewTimer = null;
        if (isJoin) scheduleJoinRoomPreview(document.getElementById("battle-room-code-input")?.value || "");

        const activeForm = isCreate ? createForm : isJoin ? joinForm : null;
        if (activeForm) {
            requestAnimationFrame(() => {
                activeForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
                activeForm.querySelector("input, select")?.focus({ preventScroll: true });
            });
        }
    }

    const worldPreviewArts = {
        beginner: "assets/world-01-hub.webp",
        intermediate: "assets/world-02-hub.webp",
        advanced: "assets/world-03-hub.webp"
    };

    function setJoinPreviewState(status, message) {
        const preview = document.getElementById("battle-join-room-preview");
        if (preview) preview.dataset.state = status;
        setText("battle-join-preview-status", message);
    }

    function resetJoinRoomPreview(message = "방 코드를 기다리는 중") {
        state.joinPreviewRequestId += 1;
        setJoinPreviewState("idle", message);
        setText("battle-join-preview-title", "참가할 방 미리보기");
        setText("battle-join-preview-lines", "— LINES");
        setText("battle-join-world", "ROOM CODE를 입력하세요");
        setText("battle-join-mission", "경기 맵을 확인할 수 있어요");
        setText("battle-join-description", "6자리 방 코드가 완성되면 참가할 월드와 실제 경기 코드를 불러옵니다.");
        setText("battle-join-code", "ABC234");
        setText("battle-join-host", "친구에게 받은 초대 코드를 입력해 주세요.");
        const art = document.getElementById("battle-join-world-art");
        if (art) art.src = worldPreviewArts.beginner;
    }

    function scheduleJoinRoomPreview(rawRoomCode) {
        if (state.joinPreviewTimer) clearTimeout(state.joinPreviewTimer);
        state.joinPreviewTimer = null;
        const roomCode = String(rawRoomCode || "").toUpperCase();
        if (roomCode.length !== 6) {
            resetJoinRoomPreview(roomCode ? `${6 - roomCode.length}자리 더 입력해 주세요` : "방 코드를 기다리는 중");
            return;
        }
        setJoinPreviewState("loading", "배틀방을 확인하는 중...");
        state.joinPreviewTimer = setTimeout(() => {
            state.joinPreviewTimer = null;
            loadJoinRoomPreview(roomCode);
        }, 220);
    }

    async function loadJoinRoomPreview(roomCode) {
        const requestId = ++state.joinPreviewRequestId;
        try {
            const response = await emitWithAck("battle:preview", { roomCode });
            const currentCode = document.getElementById("battle-room-code-input")?.value || "";
            if (requestId !== state.joinPreviewRequestId || currentCode !== roomCode) return;
            const mission = response.room.mission;
            const code = normalizeCode(response.targetText || "");
            const lines = code ? code.split("\n").length : 0;
            setText("battle-join-preview-title", mission.title);
            setText("battle-join-preview-lines", `${lines} ${lines === 1 ? "LINE" : "LINES"}`);
            setText("battle-join-world", `${worldLabels[mission.difficulty]} · ${lengthLabels[mission.length]}`);
            setText("battle-join-mission", `STAGE ${mission.levelGroup} · ${mission.title}`);
            setText("battle-join-description", mission.description || "친구와 같은 코드를 입력하는 배틀입니다.");
            setText("battle-join-code", code);
            setText("battle-join-host", `${response.room.hostNickname} 님이 기다리고 있어요.`);
            const art = document.getElementById("battle-join-world-art");
            if (art) art.src = worldPreviewArts[mission.difficulty] || worldPreviewArts.beginner;
            setJoinPreviewState("ready", "참가 가능한 배틀방입니다");
        } catch (error) {
            if (requestId !== state.joinPreviewRequestId) return;
            resetJoinRoomPreview(error.message);
            setJoinPreviewState("error", error.message);
            setText("battle-join-host", "방 코드를 확인하고 다시 입력해 주세요.");
        }
    }

    async function openPortal() {
        stopRaceTimers();
        await populateMissionSelectors();
        setEntryMode();
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
        state.completedLineIndexes.clear();
        state.lineErrorIndexes.clear();
        state.feedbackLineCombo = 0;
        state.feedbackNitro = 0;
        setText("battle-line-streak", "0");
        setWidth("battle-nitro-fill", 0);
        targetText.split("\n").forEach((line) => {
            const item = document.createElement("li");
            const code = document.createElement("span");
            code.textContent = line || " ";
            item.appendChild(code);
            list.appendChild(item);
        });
    }

    function updateBattleInputLineNumbers(value = "") {
        const gutter = document.getElementById("battle-input-line-numbers");
        if (!gutter) return;
        const lineCount = Math.max(1, String(value).split("\n").length);
        gutter.innerHTML = Array.from(
            { length: lineCount },
            (_, index) => `<span>${index + 1}</span>`
        ).join("");
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
        setText("race-my-score", `${Math.round(me?.score || 0)} PTS`);
        setText("race-rival-score", `${Math.round(rival?.score || 0)} PTS`);
        setText("race-my-accuracy", `${Math.round(me?.accuracy ?? 100)}% ACC`);
        setText("race-rival-accuracy", `${Math.round(rival?.accuracy ?? 100)}% ACC`);
        setText("race-my-line-combo", `×${Math.round(me?.lineCombo || 0)} LINE`);
        setText("race-rival-line-combo", `×${Math.round(rival?.lineCombo || 0)} LINE`);
        setWidth("race-my-progress", me?.progress || 0);
        setWidth("race-rival-progress", rival?.progress || 0);
        setBattleKartIdentity("battle-my-kart", me);
        setBattleKartIdentity("battle-rival-kart", rival);
        setBattleKartPosition("battle-my-kart", me?.progress || 0);
        setBattleKartPosition("battle-rival-kart", rival?.progress || 0);
        const input = document.getElementById("battle-code-input");
        // Do not reveal whether either player's code is correct before the result.
        const notice = rival && !rival.connected
            ? "상대의 연결이 끊겼습니다. 15초 동안 재접속을 기다립니다."
            : "판정은 종료 후 공개됩니다. 코드만 보고 끝까지 입력하세요.";
        if (!state.retireEndsAt) setText("battle-race-notice", notice);
    }

    function setCompletionCard(prefix, status, detail, tone) {
        setText(`battle-${prefix}-state`, status);
        setText(`battle-${prefix}-state-detail`, detail);
        const card = document.getElementById(`battle-${prefix}-state-card`);
        if (card) card.dataset.state = tone;
    }

    function analyzeLocalCode(value) {
        let currentErrors = 0;
        const length = Math.min(value.length, state.targetText.length);
        for (let index = 0; index < length; index += 1) {
            if (value[index] !== state.targetText[index]) currentErrors += 1;
        }
        if (value.length > state.targetText.length) {
            currentErrors += value.length - state.targetText.length;
        }
        return {
            currentErrors,
            exact: value === state.targetText,
            empty: value.length === 0
        };
    }

    function updateBattleCompletionStatus(room, value) {
        const me = currentPlayer(room);
        const rival = rivalPlayer(room);
        const local = analyzeLocalCode(value);

        if (me?.finishedAt) {
            setCompletionCard(
                "my",
                "완주 완료 ✓",
                rival?.finishedAt ? "두 기록이 모두 확정됐어요." : "내 점수는 확정됐어요. 친구의 완주를 기다립니다.",
                "finished"
            );
        } else if (local.exact) {
            setCompletionCard("my", "완주 확인 중", "정확한 코드입니다. 서버에서 기록을 확인하고 있어요.", "checking");
        } else if (local.currentErrors > 0) {
            setCompletionCard(
                "my",
                `오탈자 ${local.currentErrors}개`,
                "현재 코드가 정답과 달라 아직 완주가 아닙니다. 표시된 줄을 수정하세요.",
                "error"
            );
        } else if (local.empty) {
            setCompletionCard(
                "my",
                state.raceStartsAt ? "입력 시작" : "입력 대기",
                state.raceStartsAt ? "코드를 입력하면 정확도와 진행 상태를 바로 확인할 수 있어요." : "GO 신호 후 코드를 입력하세요.",
                state.raceStartsAt ? "typing" : "waiting"
            );
        } else {
            setCompletionCard("my", "입력 중", "현재까지 오탈자 없이 진행 중이에요. 끝까지 입력하세요.", "typing");
        }

        if (!rival) {
            setCompletionCard("rival", "친구 대기", "친구와 연결되면 상태가 표시됩니다.", "waiting");
        } else if (!rival.connected) {
            setCompletionCard("rival", "재접속 대기", "연결이 끊겨 15초 동안 다시 접속하기를 기다려요.", "error");
        } else if (rival.finishedAt) {
            setCompletionCard(
                "rival",
                "친구 완주 ✓",
                me?.finishedAt ? "두 기록이 모두 확정됐어요." : "친구는 끝냈어요. 내 코드를 확인하고 계속 입력하세요.",
                "finished"
            );
        } else if (me?.finishedAt) {
            setCompletionCard(
                "rival",
                "친구 입력 중",
                `친구 진행률 ${Math.round(rival.progress || 0)}% · 리타이어 시간 동안 기다리는 중이에요.`,
                "typing"
            );
        } else {
            setCompletionCard(
                "rival",
                "친구 입력 중",
                `진행률 ${Math.round(rival.progress || 0)}% · 아직 완주하지 않았어요.`,
                "typing"
            );
        }
    }

    function playBattleLineSound(isPerfect) {
        if (!AppState.profile?.settings?.sound) return;
        try {
            if (!AppState.audioContext) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                AppState.audioContext = new AudioContext();
            }
            const context = AppState.audioContext;
            const notes = isPerfect ? [523.25, 659.25, 783.99] : [440, 554.37];
            notes.forEach((frequency, index) => {
                const startsAt = context.currentTime + index * 0.055;
                const oscillator = context.createOscillator();
                const gain = context.createGain();
                oscillator.type = "triangle";
                oscillator.frequency.value = frequency;
                gain.gain.setValueAtTime(0.0001, startsAt);
                gain.gain.exponentialRampToValueAtTime(0.075, startsAt + 0.012);
                gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + 0.14);
                oscillator.connect(gain);
                gain.connect(context.destination);
                oscillator.start(startsAt);
                oscillator.stop(startsAt + 0.15);
            });
        } catch {
            // Sound feedback is optional; visual feedback remains available.
        }
    }

    function triggerBattleLineCombo(lineIndex, isPerfect) {
        const effect = document.getElementById("battle-combo-effect");
        const arena = document.querySelector(".battle-kart-arena");
        const myKart = document.getElementById("battle-my-kart");
        const myLane = myKart?.closest(".battle-kart-lane");
        const scorableLines = Math.max(1, state.targetText.split("\n").filter(Boolean).length);
        const lineBonus = Math.round(120 / scorableLines);
        state.feedbackLineCombo = isPerfect ? state.feedbackLineCombo + 1 : 0;
        state.feedbackNitro = Math.min(100, state.feedbackNitro + (isPerfect ? 34 : 18));
        setText("battle-line-streak", String(state.feedbackLineCombo));
        setWidth("battle-nitro-fill", state.feedbackNitro);
        if (effect) {
            effect.dataset.judgement = isPerfect ? "perfect" : "clear";
            effect.innerHTML = isPerfect
                ? `<span>LINE ${lineIndex + 1}</span><strong>PERFECT!</strong><small>+${lineBonus} PTS · NITRO BOOST${state.feedbackLineCombo > 1 ? ` · ×${state.feedbackLineCombo} COMBO` : ""}</small>`
                : `<span>LINE ${lineIndex + 1}</span><strong>LINE CLEAR!</strong><small>CHECKPOINT · KEEP RACING</small>`;
            effect.classList.remove("show");
            void effect.offsetWidth;
            effect.classList.add("show");
        }
        if (arena) {
            arena.classList.remove("is-boosting");
            void arena.offsetWidth;
            arena.classList.add("is-boosting");
            window.setTimeout(() => arena.classList.remove("is-boosting"), 720);
        }
        if (myKart) {
            myKart.classList.remove("is-nitro");
            void myKart.offsetWidth;
            myKart.classList.add("is-nitro");
        }
        if (myLane) {
            myLane.classList.remove("rhythm-hit");
            void myLane.offsetWidth;
            myLane.classList.add("rhythm-hit");
        }
        playBattleLineSound(isPerfect);
    }

    function updateBattleLineStates(value) {
        const userLines = value.split("\n");
        const input = document.getElementById("battle-code-input");
        const cursorPosition = input?.selectionStart || 0;
        const currentLine = value.slice(0, cursorPosition).split("\n").length - 1;
        const targetLines = state.targetText.split("\n");
        targetLines.forEach((targetLine, index) => {
            const hasUserLine = index < userLines.length;
            const userLine = hasUserLine ? userLines[index] : null;
            const exact = hasUserLine && userLine === targetLine;
            const isPrefix = hasUserLine && targetLine.startsWith(userLine);
            if (exact) {
                if (targetLine && !state.completedLineIndexes.has(index)) {
                    state.completedLineIndexes.add(index);
                    triggerBattleLineCombo(index, !state.lineErrorIndexes.has(index));
                }
            } else if (hasUserLine && (!isPrefix || (index < currentLine && userLine !== targetLine))) {
                state.lineErrorIndexes.add(index);
            }
        });
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
        const renderElapsedTime = () => {
            if (!state.raceStartsAt) return;
            const seconds = Math.max(0, (Date.now() - state.raceStartsAt) / 1000);
            setText("battle-race-timer", formatTime(seconds));
        };
        renderElapsedTime();
        state.raceTimer = setInterval(renderElapsedTime, 250);
    }

    function stopRaceTimers() {
        if (state.raceTimer) clearInterval(state.raceTimer);
        if (state.countdownTimer) clearInterval(state.countdownTimer);
        if (state.retireTimer) clearInterval(state.retireTimer);
        if (state.inputTimer) clearTimeout(state.inputTimer);
        state.raceTimer = null;
        state.countdownTimer = null;
        state.retireTimer = null;
        state.retireEndsAt = null;
        state.inputTimer = null;
    }

    function startRetirePeriod(durationMs, finisherId = null) {
        if (state.retireTimer) clearInterval(state.retireTimer);
        state.retireEndsAt = Date.now() + Math.max(0, Number(durationMs) || 0);
        const notice = document.getElementById("battle-race-notice");
        const rivalFinished = Boolean(finisherId && finisherId !== state.session?.playerId);
        const input = document.getElementById("battle-code-input");
        const inputStatus = document.getElementById("battle-input-status");
        if (!rivalFinished && finisherId) {
            if (input) input.disabled = true;
            if (inputStatus) {
                inputStatus.textContent = "입력 완료 ✓";
                inputStatus.dataset.state = "complete";
            }
            document.querySelector(".battle-kart-arena")?.classList.add("finishing");
        }
        if (notice) notice.dataset.mode = "final-input";
        let previousSeconds = null;
        const renderRetireTime = () => {
            const remaining = Math.max(0, state.retireEndsAt - Date.now());
            const seconds = Math.ceil(remaining / 1000);
            if (notice && seconds !== previousSeconds) {
                previousSeconds = seconds;
                notice.innerHTML = remaining > 0
                    ? `<span class="battle-final-copy"><b>${rivalFinished ? "상대 입력 완료" : "입력 완료 ✓"}</b><small>${rivalFinished ? "역전할 수 있는 마지막 시간입니다" : "코드가 완성되었습니다 · 상대를 기다리는 중입니다"}</small></span><strong>${seconds}<small>초</small></strong>`
                    : `<span class="battle-final-copy"><b>입력 종료</b><small>최종 결과를 집계하고 있습니다</small></span><strong class="is-loading">···</strong>`;
            }
            if (remaining <= 0) {
                clearInterval(state.retireTimer);
                state.retireTimer = null;
            }
        };
        renderRetireTime();
        state.retireTimer = setInterval(renderRetireTime, 250);
    }

    function setCountdownValue(overlay, value) {
        const strong = overlay?.querySelector("strong");
        if (!strong || strong.textContent === String(value)) return;
        strong.textContent = value;
        strong.classList.remove("is-pulsing");
        void strong.offsetWidth;
        strong.classList.add("is-pulsing");
    }

    function showCountdown(startsAt, targetText, countdownMs = COUNTDOWN_DURATION_MS) {
        state.targetText = normalizeCode(targetText);
        state.raceStartsAt = null;
        state.inputSequence = 0;
        state.finishing = false;
        state.retireEndsAt = null;
        renderTargetLines(state.targetText);
        const notice = document.getElementById("battle-race-notice");
        if (notice) {
            delete notice.dataset.mode;
            notice.textContent = "판정은 종료 후 공개됩니다. 코드만 보고 끝까지 입력하세요.";
        }
        document.querySelector(".battle-kart-arena")?.classList.remove("racing", "finishing", "is-boosting");
        setText("battle-race-title", state.room?.mission?.title || "배틀 미션");
        setText("battle-race-mode", formatRoomMission(state.room?.mission));

        const input = document.getElementById("battle-code-input");
        if (input) {
            input.value = "";
            input.disabled = true;
            updateBattleInputLineNumbers();
        }
        const inputStatus = document.getElementById("battle-input-status");
        if (inputStatus) {
            inputStatus.textContent = "대기 중";
            delete inputStatus.dataset.state;
        }
        const overlay = document.getElementById("battle-countdown");
        if (overlay) {
            overlay.hidden = false;
            overlay.classList.remove("is-go");
            const label = overlay.querySelector("span");
            if (label) label.textContent = "GET READY";
        }
        setText("battle-race-timer", "00:00");
        showScreen("battle-race-screen");
        updateRacePlayers(state.room);

        // The server and players' device clocks can differ. Drive the visual
        // countdown from a local duration instead of comparing epoch times.
        const requestedCountdownMs = Number(countdownMs);
        const localCountdownMs = Number.isFinite(requestedCountdownMs)
            ? Math.max(0, requestedCountdownMs)
            : COUNTDOWN_DURATION_MS;
        const countdownEndsAt = Date.now() + localCountdownMs;
        setCountdownValue(overlay, Math.max(1, Math.ceil(localCountdownMs / 1000)));
        if (state.countdownTimer) clearInterval(state.countdownTimer);
        state.countdownTimer = setInterval(() => {
            const remaining = Math.max(0, countdownEndsAt - Date.now());
            if (remaining > 0) setCountdownValue(overlay, Math.max(1, Math.ceil(remaining / 1000)));
            if (remaining <= 0) {
                clearInterval(state.countdownTimer);
                state.countdownTimer = null;
            }
        }, 80);
    }

    function enableRaceInput(startsAt, elapsedMs = 0) {
        // Start the visible timer at GO. Only resumed races carry elapsed time.
        state.raceStartsAt = Date.now() - Math.max(0, Number(elapsedMs) || 0);
        const overlay = document.getElementById("battle-countdown");
        if (overlay) {
            if (state.countdownTimer) clearInterval(state.countdownTimer);
            state.countdownTimer = null;
            setCountdownValue(overlay, "GO!");
            const label = overlay.querySelector("span");
            if (label) label.textContent = "START";
            overlay.classList.add("is-go");
            setTimeout(() => {
                overlay.hidden = true;
                overlay.classList.remove("is-go");
                if (label) label.textContent = "GET READY";
            }, 450);
        }
        const input = document.getElementById("battle-code-input");
        if (input) {
            input.disabled = false;
            input.focus();
        }
        setText("battle-input-status", "배틀 진행 중");
        document.querySelector(".battle-kart-arena")?.classList.add("racing");
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

    function resultPlayerMarkup(player, winnerId, tie, index) {
        const won = !tie && player.id === winnerId;
        const isMe = player.id === state.session?.playerId;
        const duration = Number.isFinite(player.durationMs)
            ? `${(player.durationMs / 1000).toFixed(1)}초`
            : "미완주";
        const accuracy = Math.round(player.accuracy || 0);
        const cpm = Math.round(player.cpm || 0);
        const score = Math.round(player.score || 0);
        const lineCombo = Math.round(player.maxLineCombo || 0);
        const breakdown = player.scoreBreakdown || {};
        const accuracyPoints = Math.round(breakdown.accuracy || 0);
        const comboPoints = Math.round(breakdown.combo || 0);
        const speedPoints = Math.round(breakdown.speed || 0);
        const kartAsset = index === 0
            ? "assets/python-kart-battle-coral.png"
            : "assets/python-kart-battle-lavender.png";
        const resultLabel = won ? "TOP SCORE · WINNER" : tie ? "DRAW" : "SCORE RUNNER-UP";
        return `
            <article class="battle-result-player ${won ? "is-winner" : ""} ${isMe ? "is-me" : ""}">
                <div class="battle-player-rank">
                    <span>${resultLabel}</span>
                    ${isMe ? '<small>YOU</small>' : '<small>RIVAL</small>'}
                </div>
                <div class="battle-player-identity">
                    <span class="battle-result-kart"><img src="${kartAsset}" alt="" width="512" height="512"></span>
                    <div><h3>${escapeHTML(player.nickname)}</h3><p>${won ? "정확도와 콤보로 만든 최고 점수" : tie ? "과정까지 똑같았던 승부" : "다음 판에는 정확도와 콤보에 도전"}</p></div>
                    ${won ? '<span class="battle-winner-crown" aria-label="승자">♛</span>' : ''}
                </div>
                <dl class="battle-result-stats">
                    <div class="stat-score"><dt><i aria-hidden="true"></i>SCORE <small>총점</small></dt><dd>${score}<small> PTS</small></dd></div>
                    <div class="stat-finish"><dt><i aria-hidden="true"></i>FINISH <small>완주 기록</small></dt><dd>${duration}</dd></div>
                    <div class="stat-accuracy"><dt><i aria-hidden="true"></i>ACCURACY <small>정확도</small></dt><dd>${accuracy}<small>%</small></dd></div>
                    <div class="stat-combo"><dt><i aria-hidden="true"></i>LINE COMBO <small>연속 성공</small></dt><dd>×${lineCombo}</dd></div>
                </dl>
                <section class="battle-score-chart" aria-label="최종 점수 구성">
                    <header><div><span>SCORE DETAIL</span><strong>1,000점 만점 구성</strong></div><b>${score}<small> PTS</small></b></header>
                    <div class="battle-score-row score-accuracy" style="--value:${Math.min(100, (accuracyPoints / 550) * 100)}%">
                        <div><span>정확도 점수 <small>정확한 입력 비율</small></span><strong>${accuracyPoints}<small> / 550점</small></strong></div>
                        <span class="battle-score-track"><i></i></span>
                    </div>
                    <div class="battle-score-row score-combo" style="--value:${Math.min(100, (comboPoints / 300) * 100)}%">
                        <div><span>콤보 점수 <small>연속 입력과 완벽한 줄</small></span><strong>${comboPoints}<small> / 300점</small></strong></div>
                        <span class="battle-score-track"><i></i></span>
                    </div>
                    <div class="battle-score-row score-speed" style="--value:${Math.min(100, (speedPoints / 150) * 100)}%">
                        <div><span>속도 점수 <small>${cpm} CPM</small></span><strong>${speedPoints}<small> / 150점</small></strong></div>
                        <span class="battle-score-track"><i></i></span>
                    </div>
                </section>
            </article>
        `;
    }

    function resultHighlight(result, meWon) {
        if (result.reason === "forfeit") {
            return meWon ? "상대의 기권으로 승부가 결정됐어요" : "연결 종료로 승부가 마무리됐어요";
        }
        if (result.tie) return "정확도와 콤보 점수까지 같은 완벽한 접전";
        const scores = result.players.map((player) => Number(player.score) || 0);
        const gap = Math.abs((scores[0] || 0) - (scores[1] || 0));
        const winner = result.players.find((player) => player.id === result.winnerId);
        return winner ? `${winner.score}점 · ${gap}점 차이로 결정된 과정 중심 승부` : "끝까지 팽팽했던 타자 배틀";
    }

    function renderResult(result) {
        if (state.finishing) return;
        state.finishing = true;
        stopRaceTimers();
        document.querySelector(".battle-kart-arena")?.classList.remove("racing", "is-boosting");
        const input = document.getElementById("battle-code-input");
        if (input) input.disabled = true;

        const meWon = result.winnerId === state.session?.playerId;
        const winner = result.players.find((player) => player.id === result.winnerId);
        const winnerIndex = result.players.findIndex((player) => player.id === result.winnerId);
        const title = result.tie ? "완벽한 무승부!" : meWon ? "배틀 챔피언!" : `${winner?.nickname || "상대"}의 승리`;
        const emblem = result.tie ? "DRAW" : meWon ? "VICTORY" : "RESULT";
        const message = result.reason === "forfeit"
            ? meWon
                ? "상대의 연결이 종료되어 승리했습니다."
                : "배틀 연결이 종료되어 기권 처리되었습니다."
            : result.tie
                ? "정확도와 콤보를 포함한 최종 점수가 같았어요."
                : meWon
                    ? `${winner?.nickname || "플레이어"} 님, 멋진 코드 레이스였습니다! 정확도와 콤보로 정상에 올랐어요.`
                    : "속도보다 정확도와 LINE COMBO를 높이면 다음 배틀을 뒤집을 수 있어요.";

        setText("battle-result-emblem", emblem);
        setText("battle-result-overline", result.tie ? "PERFECT TIE" : meWon ? "BATTLE CHAMPION" : "MATCH COMPLETE");
        setText("battle-result-title", title);
        setText("battle-result-message", message);
        const winnerKart = document.getElementById("battle-result-winner-kart");
        if (winnerKart) {
            winnerKart.hidden = result.tie;
            if (!result.tie) {
                winnerKart.src = winnerIndex === 0
                    ? "assets/python-kart-battle-coral.png"
                    : "assets/python-kart-battle-lavender.png";
                winnerKart.alt = `${winner?.nickname || "승자"}의 승리 카트`;
            }
        }
        const highlight = document.getElementById("battle-result-highlight");
        if (highlight) {
            highlight.innerHTML = `<span>${result.tie ? "승부의 순간" : "결정적 한 수"}</span><strong>${resultHighlight(result, meWon)}</strong>`;
        }
        const container = document.getElementById("battle-result-players");
        if (container) {
            container.innerHTML = result.players
                .map((player, index) => resultPlayerMarkup(player, result.winnerId, result.tie, index))
                .join("");
        }
        document.getElementById("battle-result-screen")?.setAttribute("data-result", result.tie ? "draw" : meWon ? "win" : "lose");
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
                showCountdown(Date.now(), response.targetText, 0);
                enableRaceInput(response.room.startsAt || Date.now(), response.elapsedMs);
                if (response.room.retireRemainingMs > 0) {
                    startRetirePeriod(response.room.retireRemainingMs, response.room.finisherId);
                }
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
        state.socket.on("battle:countdown", ({ startsAt, targetText, countdownMs }) => {
            showCountdown(startsAt, targetText, countdownMs);
        });
        state.socket.on("battle:start", ({ startsAt }) => {
            enableRaceInput(startsAt);
        });
        state.socket.on("battle:retire", ({ durationMs, finisherId }) => {
            startRetirePeriod(durationMs, finisherId);
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
            else if (action === "show-create") setEntryMode("create");
            else if (action === "show-join") setEntryMode("join");
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
        document.getElementById("battle-mission")?.addEventListener("change", renderMissionPreview);
        document.querySelectorAll("[data-battle-difficulty-option]").forEach((button) => {
            button.addEventListener("click", () => {
                selectBattleConfig("difficulty", button.dataset.battleDifficultyOption)
                    .catch((error) => showToast(error.message, "error"));
            });
        });
        document.querySelectorAll("[data-battle-length-option]").forEach((button) => {
            button.addEventListener("click", () => {
                selectBattleConfig("length", button.dataset.battleLengthOption)
                    .catch((error) => showToast(error.message, "error"));
            });
        });
        document.getElementById("battle-room-code-input")?.addEventListener("input", (event) => {
            event.target.value = event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, "");
            scheduleJoinRoomPreview(event.target.value);
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
        input?.addEventListener("input", () => {
            const value = normalizeCode(input.value);
            updateBattleInputLineNumbers(input.value);
            updateBattleLineStates(value);
            queueInput(value);
        });
        input?.addEventListener("scroll", () => {
            const gutter = document.getElementById("battle-input-line-numbers");
            if (gutter) gutter.scrollTop = input.scrollTop;
        });
    }

    async function initialize() {
        if (state.initialized) return;
        state.initialized = true;
        clearLegacySession();
        state.session = null;
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
