"use strict";

// Auto-signs students in when this app is embedded inside the school's
// SmartCampus platform iframe, so they never see this app's own login screen
// there. Direct (non-embedded) visits are untouched — this app's own login
// keeps working exactly as before.
(function () {
    var PLATFORM_ORIGIN = "https://platform.sdjgh-ai.kr";

    var embedded = window.self !== window.top;
    if (!embedded) return;

    var settled = false;
    var overlay = null;

    function showOverlay(message) {
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.style.position = "fixed";
            overlay.style.inset = "0";
            overlay.style.display = "flex";
            overlay.style.alignItems = "center";
            overlay.style.justifyContent = "center";
            overlay.style.background = "#fff8f3";
            overlay.style.fontSize = "1rem";
            overlay.style.color = "#333";
            overlay.style.zIndex = "99999";
            (document.body || document.documentElement).appendChild(overlay);
        }
        overlay.textContent = message;
    }

    function hideOverlay() {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlay = null;
    }

    function fail() {
        if (settled) return;
        settled = true;
        showOverlay("세션이 만료됐어요. 스마트 캠퍼스에서 다시 접속해 주세요.");
        window.parent.postMessage({ type: "sso:expired" }, PLATFORM_ORIGIN);
    }

    function onMessage(event) {
        if (event.origin !== PLATFORM_ORIGIN || event.source !== window.parent) return;
        var data = event.data || {};
        if (data.type !== "sso:token" || !data.token) return;

        fetch("/api/auth/sso-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: data.token })
        })
            .then(function (res) { return res.ok ? res.json() : Promise.reject(); })
            .then(function () {
                if (settled) return;
                settled = true;
                window.location.reload();
            })
            .catch(fail);
    }

    function startHandshake() {
        showOverlay("연결 확인 중...");
        window.addEventListener("message", onMessage);
        window.parent.postMessage({ type: "sso:ready" }, PLATFORM_ORIGIN);
        setTimeout(fail, 8000);
    }

    // Already have a local session (e.g. a page reload after sign-in) —
    // nothing to do, let the game load with no overlay flash.
    fetch("/api/auth/session", { headers: { Accept: "application/json" } })
        .then(function (res) {
            if (res.ok) { hideOverlay(); return; }
            startHandshake();
        })
        .catch(startHandshake);
})();
