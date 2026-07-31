"use strict";

const assert = require("node:assert/strict");
const { afterEach, describe, test } = require("node:test");
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

async function createHarness() {
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
    const battleServer = createBattleServer({ missions });
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

describe("RaceTracker", () => {
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

        const resultPromise = once(host, "battle:result");
        const inputResponse = await emitAck(host, "battle:input", {
            sequence: 1,
            value: "print('hi')"
        });
        assert.equal(inputResponse.ok, true);
        const result = await resultPromise;
        assert.equal(result.winnerId, created.playerId);
        assert.equal(result.reason, "finished");
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
