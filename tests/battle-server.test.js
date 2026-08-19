"use strict";

const assert = require("node:assert/strict");
const { afterEach, describe, test } = require("node:test");
const bcrypt = require("bcryptjs");
const { io: createClient } = require("socket.io-client");
const { RaceTracker, createBattleServer } = require("../server");

const openServers = [];
const openClients = [];

function once(socket, eventName, timeout = 6000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${eventName} 이벤트 시간 초과`)), timeout);
        socket.once(eventName, (payload) => {
            clearTimeout(timer);
            resolve(payload);
        });
    });
}

function emitAck(socket, eventName, payload) {
    return new Promise((resolve, reject) => {
        socket.timeout(5000).emit(eventName, payload, (error, response) => {
            if (error) reject(error);
            else resolve(response);
        });
    });
}

async function createHarness(options = {}) {
    const missions = new Map([[
        "test_1",
        {
            id: "test_1",
            title: "테스트 출력",
            description: "실시간 배틀 테스트",
            difficulty: "beginner",
            length: "short",
            levelGroup: 1,
            category: "basic",
            file: "test.py",
            targetText: "print('hi')"
        }
    ]]);
    const battleServer = createBattleServer({ missions, retireWindowMs: 250, ...options });
    await new Promise((resolve) => battleServer.server.listen(0, "127.0.0.1", resolve));
    openServers.push(battleServer);
    const address = battleServer.server.address();
    const url = `http://127.0.0.1:${address.port}`;
    return { battleServer, url };
}

async function connect(url) {
    const socket = createClient(url, {
        transports: ["websocket"],
        forceNew: true,
        reconnection: false
    });
    openClients.push(socket);
    await once(socket, "connect");
    return socket;
}

afterEach(async () => {
    for (const client of openClients.splice(0)) client.close();
    for (const server of openServers.splice(0)) await server.close();
});

describe("Login page", () => {
    test("/login 경로에서 독립 로그인 페이지를 제공한다", async () => {
        const { url } = await createHarness();
        const response = await fetch(`${url}/login`);
        const body = await response.text();

        assert.equal(response.status, 200);
        assert.match(response.headers.get("content-type"), /text\/html/);
        assert.match(body, /id="login-form"/);
        assert.match(body, /Pyrun Studio 계정/);
    });

    test("로그인하지 않은 사용자는 대시보드에서 로그인 페이지로 이동한다", async () => {
        const { url } = await createHarness();
        const response = await fetch(`${url}/`, { redirect: "manual" });

        assert.equal(response.status, 302);
        assert.equal(response.headers.get("location"), "/login?next=%2F");
    });

    test("Pyrun 계정 인증 후 세션으로 대시보드에 접근한다", async () => {
        const passwordHash = await bcrypt.hash("correct-password", 4);
        const databasePool = {
            query: async (query, parameters) => {
                assert.match(query, /s\.code/);
                assert.match(query, /u\.username/);
                assert.deepEqual(parameters, ["서대전여고", "10101"]);
                return { rows: [{
                    id: 7,
                    school_id: 1,
                    school_name: "서대전여자고등학교",
                    school_code: "서대전여고",
                    username: "10101",
                    student_number: "10101",
                    role: "student",
                    display_name: "테스트 학생",
                    nickname: "바이트",
                    password_hash: passwordHash
                }] };
            }
        };
        const { url } = await createHarness({ databasePool });
        const loginResponse = await fetch(`${url}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                schoolName: "서대전여고",
                studentNumber: "10101",
                password: "correct-password"
            })
        });
        const cookie = loginResponse.headers.get("set-cookie").split(";", 1)[0];
        const dashboardResponse = await fetch(`${url}/`, { headers: { Cookie: cookie } });
        const body = await dashboardResponse.text();

        assert.equal(loginResponse.status, 200);
        assert.match(cookie, /^pta_session=/);
        assert.equal(dashboardResponse.status, 200);
        assert.match(body, /id="main-menu"/);

        const logoutResponse = await fetch(`${url}/api/auth/logout`, {
            method: "POST",
            headers: { Cookie: cookie }
        });
        const afterLogout = await fetch(`${url}/`, {
            redirect: "manual",
            headers: { Cookie: cookie }
        });

        assert.equal(logoutResponse.status, 204);
        assert.equal(afterLogout.status, 302);
        assert.equal(afterLogout.headers.get("location"), "/login?next=%2F");
    });
});

describe("RaceTracker", () => {
    test("아무것도 입력하지 않으면 정확도와 점수가 0이다", () => {
        const tracker = new RaceTracker("abc", 1000);
        const result = tracker.snapshot(2000);

        assert.equal(result.accuracy, 0);
        assert.equal(result.score, 0);
        assert.deepEqual(result.scoreBreakdown, { accuracy: 0, combo: 0, speed: 0 });
        assert.equal(result.finishedAt, null);
    });

    test("정확도와 완주 상태를 서버에서 계산한다", () => {
        const tracker = new RaceTracker("abc", 1000);
        tracker.apply("ax", 1500);
        tracker.apply("a", 1600);
        const result = tracker.apply("abc", 2000);

        assert.equal(result.progress, 100);
        assert.equal(result.finishedAt, 2000);
        assert.equal(result.durationMs, 1000);
        assert.equal(result.errors, 1);
        assert.equal(result.corrections, 1);
        assert.ok(result.accuracy < 100);
    });

    test("완벽한 줄은 LINE COMBO가 되고 정확한 과정이 더 높은 점수를 만든다", () => {
        const accurate = new RaceTracker("ab\ncd", 1000, 105);
        const rushed = new RaceTracker("ab\ncd", 1000, 105);

        const accurateResult = accurate.apply("ab\ncd", 3000);
        rushed.apply("ax\ncd", 1400);
        const rushedResult = rushed.apply("ab\ncd", 1600);

        assert.equal(accurateResult.perfectLines, 2);
        assert.equal(accurateResult.maxLineCombo, 2);
        assert.equal(rushedResult.perfectLines, 1);
        assert.ok(accurateResult.score > rushedResult.score);
        assert.equal(accurateResult.score, 1000);
        assert.deepEqual(Object.keys(accurateResult.scoreBreakdown).sort(), ["accuracy", "combo", "speed"]);
    });
});

describe("배틀방 프로토콜", () => {
    test("방 생성과 참가 시 동일한 미션과 두 플레이어를 공유한다", async () => {
        const { url } = await createHarness();
        const host = await connect(url);
        const guest = await connect(url);

        const created = await emitAck(host, "battle:create", {
            nickname: "하늘",
            missionId: "test_1"
        });
        assert.equal(created.ok, true);
        assert.match(created.room.roomCode, /^[A-Z2-9]{6}$/);

        const preview = await emitAck(guest, "battle:preview", {
            roomCode: created.room.roomCode
        });
        assert.equal(preview.ok, true);
        assert.equal(preview.room.mission.id, "test_1");
        assert.equal(preview.room.hostNickname, "하늘");
        assert.equal(preview.targetText, "print('hi')");

        const joined = await emitAck(guest, "battle:join", {
            nickname: "소윤",
            roomCode: created.room.roomCode
        });
        assert.equal(joined.ok, true);
        assert.equal(joined.room.mission.id, "test_1");
        assert.equal(joined.room.players.length, 2);
        assert.equal(joined.room.players[0].nickname, "하늘");
        assert.equal(joined.room.players[1].nickname, "소윤");
    });

    test("두 플레이어가 준비하면 같은 코드로 시작하고 서버가 승자를 판정한다", async () => {
        const { url } = await createHarness();
        const host = await connect(url);
        const guest = await connect(url);
        const created = await emitAck(host, "battle:create", {
            nickname: "하늘",
            missionId: "test_1"
        });
        const joined = await emitAck(guest, "battle:join", {
            nickname: "소윤",
            roomCode: created.room.roomCode
        });

        const countdownPromise = once(host, "battle:countdown");
        await emitAck(host, "battle:ready", { ready: true });
        await emitAck(guest, "battle:ready", { ready: true });
        const countdown = await countdownPromise;
        assert.equal(countdown.targetText, "print('hi')");
        assert.equal(countdown.countdownMs, 3000);
        await once(host, "battle:start", 5000);

        guest.disconnect();
        const resumedGuest = await connect(url);
        const resumed = await emitAck(resumedGuest, "battle:resume", {
            roomCode: created.room.roomCode,
            playerId: joined.playerId,
            resumeToken: joined.resumeToken
        });
        assert.equal(resumed.ok, true);
        assert.equal(resumed.room.phase, "racing");
        assert.equal(resumed.targetText, "print('hi')");
        assert.ok(resumed.elapsedMs >= 0);

        const retirePromise = once(host, "battle:retire");
        const resultPromise = once(host, "battle:result");
        const inputResponse = await emitAck(host, "battle:input", {
            sequence: 1,
            value: "print('hi')"
        });
        assert.equal(inputResponse.ok, true);
        const retire = await retirePromise;
        assert.equal(retire.durationMs, 250);
        assert.equal(retire.finisherId, created.playerId);
        const result = await resultPromise;
        assert.equal(result.winnerId, created.playerId);
        assert.equal(result.reason, "retired");
        assert.equal(result.players.find((player) => player.id === created.playerId).progress, 100);
        assert.notEqual(result.winnerId, joined.playerId);

        await new Promise((resolve) => setTimeout(resolve, 50));
        let roomClosed = false;
        resumedGuest.once("battle:error", () => {
            roomClosed = true;
        });
        const remainingRoomPromise = once(resumedGuest, "battle:room");
        host.emit("battle:leave");
        const remainingRoom = await remainingRoomPromise;
        assert.equal(remainingRoom.phase, "finished");
        assert.equal(remainingRoom.players.length, 1);
        assert.equal(roomClosed, false);
    });

    test("먼저 끝내지 않아도 정확도와 콤보 점수가 높으면 승리한다", async () => {
        const { url } = await createHarness();
        const host = await connect(url);
        const guest = await connect(url);
        const created = await emitAck(host, "battle:create", {
            nickname: "빠름",
            missionId: "test_1"
        });
        const joined = await emitAck(guest, "battle:join", {
            nickname: "정확",
            roomCode: created.room.roomCode
        });

        await emitAck(host, "battle:ready", { ready: true });
        await emitAck(guest, "battle:ready", { ready: true });
        await once(host, "battle:start", 5000);

        const hiddenJudgementPromise = once(host, "battle:state");
        await emitAck(host, "battle:input", { sequence: 1, value: "print('hx')" });
        const hiddenJudgement = await hiddenJudgementPromise;
        const hiddenHost = hiddenJudgement.players.find((player) => player.id === created.playerId);
        assert.equal(hiddenHost.progress, 100);
        assert.equal(hiddenHost.errors, 0);
        assert.equal(hiddenHost.score, 0);
        assert.equal(hiddenHost.finishedAt, null);

        await emitAck(host, "battle:input", { sequence: 2, value: "print('hi')" });
        const resultPromise = once(host, "battle:result");
        await emitAck(guest, "battle:input", { sequence: 1, value: "print('hi')" });
        const result = await resultPromise;

        const hostResult = result.players.find((player) => player.id === created.playerId);
        const guestResult = result.players.find((player) => player.id === joined.playerId);
        assert.ok(hostResult.finishedAt < guestResult.finishedAt);
        assert.ok(guestResult.score > hostResult.score);
        assert.equal(result.winnerId, joined.playerId);
        assert.equal(result.reason, "scored");
    });

    test("중복 닉네임과 세 번째 참가자를 거부한다", async () => {
        const { url } = await createHarness();
        const host = await connect(url);
        const guest = await connect(url);
        const third = await connect(url);
        const created = await emitAck(host, "battle:create", {
            nickname: "하늘",
            missionId: "test_1"
        });

        const duplicate = await emitAck(guest, "battle:join", {
            nickname: "하늘",
            roomCode: created.room.roomCode
        });
        assert.equal(duplicate.ok, false);
        assert.equal(duplicate.error.code, "DUPLICATE_NICKNAME");

        await emitAck(guest, "battle:join", {
            nickname: "소윤",
            roomCode: created.room.roomCode
        });
        const full = await emitAck(third, "battle:join", {
            nickname: "유나",
            roomCode: created.room.roomCode
        });
        assert.equal(full.ok, false);
        assert.equal(full.error.code, "ROOM_FULL");
    });
});
