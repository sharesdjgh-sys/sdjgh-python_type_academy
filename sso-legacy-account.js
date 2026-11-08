"use strict";

// 스마트 캠퍼스 SSO의 uid(중앙 명부 E열)로 PyRun 공용 users 표의 계정을 고르는 규칙.
// PyRun lib/sso-legacy-account.ts와 같은 판정을 쓴다(두 앱이 같은 계정 표를 공유한다).
//
// 표준 학번 uid(5자리, 입학연도 접두 허용)는 예전처럼 접두를 떼고 username과 비교한다.
// 교직원·특수 형식 uid("T-012" 같은 영문-숫자)는 접두를 떼면 숫자만 같은 다른 사람의
// 계정과 겹치므로, uid 전체 계정 → 표시 이름이 같은 예전 계정 → uid 전체로 새 계정 순서로 고른다.
// 빈 uid는 여러 사람이 같은 빈 계정을 쓰게 되므로 거부한다.

const STANDARD_STUDENT_UID = /^(\d{2,4}-)?\d{5}$/;

function stripUidPrefix(uid) {
    const dashIndex = uid.indexOf("-");
    return dashIndex >= 0 ? uid.slice(dashIndex + 1) : uid;
}

function normalizeName(value) {
    return String(value ?? "").normalize("NFKC").replace(/\s+/g, "").toLowerCase();
}

function sameDisplayName(a, b) {
    const left = normalizeName(a);
    return left !== "" && left === normalizeName(b);
}

/** DB에서 먼저 찾아볼 username 후보. 표준 학번은 예전과 같은 한 개뿐이다. */
function legacySsoUsernameCandidates(uid) {
    if (typeof uid !== "string" || !uid) return [];
    if (STANDARD_STUDENT_UID.test(uid)) return [stripUidPrefix(uid)];
    const legacy = stripUidPrefix(uid);
    return legacy && legacy !== uid ? [uid, legacy] : [uid];
}

/** rows: { username, display_name } 목록. */
function chooseLegacySsoAccount({ uid, name, role }, rows) {
    if (typeof uid !== "string" || !uid) return { kind: "reject" };
    if (STANDARD_STUDENT_UID.test(uid)) {
        // 표준 학번은 현재 운영 규칙과 완전히 같다.
        const key = stripUidPrefix(uid);
        const hit = rows.find((row) => row.username === key);
        return hit ? { kind: "existing", user: hit } : { kind: "create", username: key, studentNumber: key };
    }
    const exact = rows.find((row) => row.username === uid);
    if (exact) return { kind: "existing", user: exact };
    const legacyKey = stripUidPrefix(uid);
    if (legacyKey !== uid) {
        const legacy = rows.find((row) => row.username === legacyKey);
        if (legacy && sameDisplayName(legacy.display_name, name)) return { kind: "existing", user: legacy };
    }
    // uid 전체는 중앙 명부에서 고유하다. 교직원 계정에는 학번을 두지 않는다.
    return { kind: "create", username: uid, studentNumber: role === "student" ? uid : null };
}

module.exports = { STANDARD_STUDENT_UID, stripUidPrefix, sameDisplayName,
    legacySsoUsernameCandidates, chooseLegacySsoAccount };
