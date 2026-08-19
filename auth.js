"use strict";

const logoutButton = document.querySelector("#logout-button");

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
