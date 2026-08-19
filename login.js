"use strict";

const form = document.querySelector("#login-form");
const schoolNameInput = document.querySelector("#school-name");
const studentNumberInput = document.querySelector("#student-number");
const passwordInput = document.querySelector("#password");
const passwordToggle = document.querySelector("#password-toggle");
const loginStatus = document.querySelector("#login-status");
const loginButton = document.querySelector("#login-button");

const fields = [
    {
        input: schoolNameInput,
        error: document.querySelector("#school-name-error"),
        message: "학교명을 입력해 주세요."
    },
    {
        input: studentNumberInput,
        error: document.querySelector("#student-number-error"),
        message: "학번을 입력해 주세요."
    },
    {
        input: passwordInput,
        error: document.querySelector("#password-error"),
        message: "비밀번호를 입력해 주세요."
    }
];

function setFieldError(field, message = "") {
    field.input.setAttribute("aria-invalid", message ? "true" : "false");
    field.error.textContent = message;
}

function validateField(field) {
    const isEmpty = !field.input.value.trim();
    setFieldError(field, isEmpty ? field.message : "");
    return !isEmpty;
}

fields.forEach((field) => {
    field.input.addEventListener("input", () => {
        if (field.input.getAttribute("aria-invalid") === "true") validateField(field);
        loginStatus.textContent = "";
    });
    field.input.addEventListener("blur", () => {
        if (field.input.value) validateField(field);
    });
});

passwordToggle.addEventListener("click", () => {
    const shouldShow = passwordInput.type === "password";
    passwordInput.type = shouldShow ? "text" : "password";
    passwordToggle.textContent = shouldShow ? "숨김" : "보기";
    passwordToggle.setAttribute("aria-label", shouldShow ? "비밀번호 숨기기" : "비밀번호 표시");
    passwordToggle.setAttribute("aria-pressed", String(shouldShow));
    passwordInput.focus();
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const results = fields.map(validateField);
    const firstInvalidIndex = results.findIndex((result) => !result);

    if (firstInvalidIndex >= 0) {
        fields[firstInvalidIndex].input.focus();
        loginStatus.textContent = "입력하지 않은 정보를 확인해 주세요.";
        return;
    }

    loginButton.disabled = true;
    loginButton.firstElementChild.textContent = "계정을 확인하고 있어요...";
    loginStatus.textContent = "";

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                schoolName: schoolNameInput.value.trim(),
                studentNumber: studentNumberInput.value.trim(),
                password: passwordInput.value
            })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            loginStatus.textContent = payload.error || "로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.";
            passwordInput.select();
            return;
        }

        const next = new URLSearchParams(window.location.search).get("next");
        const destination = next?.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login")
            ? next
            : "/";
        window.location.assign(destination);
    } catch {
        loginStatus.textContent = "로그인 서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.";
    } finally {
        loginButton.disabled = false;
        loginButton.firstElementChild.textContent = "Python Type Quest 시작하기";
    }
});
