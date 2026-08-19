"use strict";

const logoutButton = document.querySelector("#logout-button");
const headerUser = document.querySelector("#header-user");

function renderHeaderUser(user) {
    if (!headerUser || !user) return;

    const nickname = String(user.nickname || "").trim();
    const displayName = String(user.displayName || "").trim();
    const visibleNickname = nickname || "플레이어";
    const showDisplayName = displayName && displayName !== visibleNickname;
    const fullLabel = [visibleNickname, showDisplayName ? displayName : ""].filter(Boolean).join(" ");

    const nicknameElement = document.querySelector("#header-user-nickname");
    const nameElement = document.querySelector("#header-user-name");
    const avatarElement = document.querySelector("#header-user-avatar");

    if (nicknameElement) nicknameElement.textContent = visibleNickname;
    if (nameElement) {
        nameElement.textContent = showDisplayName ? displayName : "";
        nameElement.hidden = !showDisplayName;
    }
    if (avatarElement) avatarElement.textContent = Array.from(visibleNickname)[0] || "P";

    headerUser.setAttribute("aria-label", `로그인 사용자 ${fullLabel}`);
    headerUser.title = fullLabel;
    headerUser.hidden = false;
}

async function loadAuthenticatedUser() {
    try {
        const response = await fetch("/api/auth/session", {
            headers: { Accept: "application/json" }
        });

        if (response.status === 401) {
            window.location.replace("/login");
            return;
        }
        if (!response.ok) return;

        const session = await response.json();
        renderHeaderUser(session.user);
    } catch (error) {
        console.warn("로그인 사용자 정보를 불러오지 못했습니다.", error);
    }
}

loadAuthenticatedUser();

logoutButton?.addEventListener("click", async () => {
    if (logoutButton.disabled) return;
    logoutButton.disabled = true;
    logoutButton.setAttribute("aria-busy", "true");

    try {
        await fetch("/api/auth/logout", { method: "POST" });
    } finally {
        window.location.replace("/login");
    }
});
