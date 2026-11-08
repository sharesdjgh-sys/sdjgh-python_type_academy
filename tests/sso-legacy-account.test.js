"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { chooseLegacySsoAccount, legacySsoUsernameCandidates } = require("../sso-legacy-account");

const row = (username, display_name) => ({ username, display_name });

test("표준 학번은 예전처럼 접두를 떼고 같은 계정을 찾는다", () => {
    assert.deepEqual(legacySsoUsernameCandidates("24-10101"), ["10101"]);
    const hit = row("10101", "다른이름이어도됨");
    assert.deepEqual(chooseLegacySsoAccount({ uid: "24-10101", name: "학생", role: "student" }, [hit]),
        { kind: "existing", user: hit });
    assert.deepEqual(chooseLegacySsoAccount({ uid: "10101", name: "학생", role: "student" }, []),
        { kind: "create", username: "10101", studentNumber: "10101" });
});

test("교직원 uid는 숫자만 같은 다른 사람 계정으로 들어가지 않는다", () => {
    assert.deepEqual(legacySsoUsernameCandidates("T-012"), ["T-012", "012"]);
    assert.deepEqual(chooseLegacySsoAccount({ uid: "T-012", name: "김교사", role: "teacher" }, [row("012", "다른선생님")]),
        { kind: "create", username: "T-012", studentNumber: null });
});

test("교직원의 예전 계정은 표시 이름이 같을 때만 이어 주고, uid 전체 계정이 우선이다", () => {
    const mine = row("012", " 김 교사 ");
    assert.deepEqual(chooseLegacySsoAccount({ uid: "T-012", name: "김교사", role: "teacher" }, [mine]),
        { kind: "existing", user: mine });
    const full = row("T-012", "아무이름");
    assert.deepEqual(chooseLegacySsoAccount({ uid: "T-012", name: "김교사", role: "teacher" }, [mine, full]),
        { kind: "existing", user: full });
});

test("빈 uid나 uid 없는 응답은 거부한다", () => {
    assert.deepEqual(legacySsoUsernameCandidates(""), []);
    assert.deepEqual(legacySsoUsernameCandidates(undefined), []);
    assert.deepEqual(chooseLegacySsoAccount({ uid: "", name: "학급", role: "student" }, [row("", null)]),
        { kind: "reject" });
});
