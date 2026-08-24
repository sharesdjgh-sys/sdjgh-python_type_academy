"use strict";

const state = {
    session: null,
    classes: [],
    selectedClass: null,
    range: "30d",
    classData: null,
    detail: null,
    nextCursor: null,
    detailStudentId: null
};

const els = {
    teacherName: document.querySelector("#teacher-name"),
    teacherSchool: document.querySelector("#teacher-school"),
    teacherAvatar: document.querySelector("#teacher-avatar"),
    logout: document.querySelector("#teacher-logout"),
    classTabs: document.querySelector("#class-tabs"),
    rangeTabs: document.querySelector("#range-tabs"),
    pageMessage: document.querySelector("#page-message"),
    dashboard: document.querySelector("#dashboard-content"),
    summary: document.querySelector("#summary-cards"),
    activity: document.querySelector("#class-activity-chart"),
    activityCaption: document.querySelector("#activity-caption"),
    studentRows: document.querySelector("#student-rows"),
    rosterEmpty: document.querySelector("#roster-empty"),
    search: document.querySelector("#student-search"),
    status: document.querySelector("#status-filter"),
    sort: document.querySelector("#student-sort"),
    dialog: document.querySelector("#student-dialog"),
    dialogClose: document.querySelector("#dialog-close"),
    detailLoading: document.querySelector("#detail-loading"),
    detailContent: document.querySelector("#detail-content"),
    detailClass: document.querySelector("#detail-class"),
    detailName: document.querySelector("#detail-name"),
    detailMeta: document.querySelector("#detail-meta"),
    detailSummary: document.querySelector("#detail-summary"),
    studentActivity: document.querySelector("#student-activity-chart"),
    stageProgress: document.querySelector("#stage-progress"),
    questRows: document.querySelector("#quest-rows"),
    difficulty: document.querySelector("#difficulty-filter"),
    length: document.querySelector("#length-filter"),
    history: document.querySelector("#run-history"),
    historyNote: document.querySelector("#history-note"),
    loadMore: document.querySelector("#load-more-runs")
};

const LABELS = {
    range: { "7d": "최근 7일", "30d": "최근 30일", all: "전체 기간" },
    status: { active: "최근 활동", resting: "휴식중", untried: "미도전" },
    difficulty: { beginner: "초급 월드", intermediate: "중급 월드", advanced: "고급 월드" },
    length: { short: "스테이지 1", medium: "스테이지 2", long: "스테이지 3" }
};

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function api(path) {
    const response = await fetch(path, { headers: { Accept: "application/json" } });
    if (response.status === 401) {
        window.location.replace("/login");
        throw new Error("로그인이 필요합니다.");
    }
    if (response.status === 403) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "배정된 정보만 확인할 수 있습니다.");
    }
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "정보를 불러오지 못했습니다.");
    }
    return response.json();
}

function setMessage(message, error = false) {
    els.pageMessage.textContent = message;
    els.pageMessage.classList.toggle("error", error);
    els.pageMessage.hidden = false;
    els.dashboard.hidden = true;
}

function formatNumber(value, maximumFractionDigits = 0) {
    return new Intl.NumberFormat("ko-KR", { maximumFractionDigits }).format(Number(value) || 0);
}

function formatDateTime(value) {
    if (!value) return "기록 없음";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "기록 없음";
    return new Intl.DateTimeFormat("ko-KR", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    }).format(date);
}

function dateKey(value) {
    if (!value) return "";
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

function stars(value) {
    const count = Math.max(0, Math.min(3, Number(value) || 0));
    return `<span class="stars" aria-label="별 ${count}개">${"★".repeat(count)}<span class="empty-star">${"☆".repeat(3 - count)}</span></span>`;
}

function renderClassTabs() {
    els.classTabs.innerHTML = state.classes.map((item) => {
        const selected = state.selectedClass?.grade === item.grade && state.selectedClass?.classNumber === item.classNumber;
        return `<button type="button" role="tab" data-grade="${item.grade}" data-class-number="${item.classNumber}" class="${selected ? "active" : ""}" aria-selected="${selected}">${item.grade}학년 ${item.classNumber}반 <small>${item.studentCount}명</small></button>`;
    }).join("");
}

function summaryCard(icon, label, value, suffix, tone, tint) {
    return `<article class="summary-card" style="--tone:${tone};--tint:${tint}"><span class="summary-icon" aria-hidden="true">${icon}</span><p>${label}</p><strong>${value}</strong><small>${suffix}</small></article>`;
}

function renderSummary(data) {
    const total = data.class.studentCount;
    els.summary.innerHTML = [
        summaryCard("人", "학습 시작 학생", `${data.summary.startedStudents}/${total}`, "명", "#7658b6", "#f0eaff"),
        summaryCard("↻", `${LABELS.range[state.range]} 연습`, formatNumber(data.summary.runCount), "회", "#d9585d", "#fff0ed"),
        summaryCard("◷", "완료한 연습 시간", formatNumber(data.summary.durationMinutes, 1), "분", "#3c9a80", "#eaf8f3"),
        summaryCard("✓", "평균 배지 인증 진도", formatNumber(data.summary.averageProgress, 1), "%", "#b87834", "#fff3df")
    ].join("");
}

function expandDays(activity) {
    if (state.range === "all") return activity;
    const count = state.range === "7d" ? 7 : 30;
    const byDate = new Map(activity.map((item) => [dateKey(item.date), item]));
    return Array.from({ length: count }, (_, index) => {
        const date = new Date();
        date.setHours(12, 0, 0, 0);
        date.setDate(date.getDate() - (count - 1 - index));
        const key = date.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
        return byDate.get(key) || { date: key, runs: 0, durationMinutes: 0, averageAccuracy: 0 };
    });
}

function renderActivity(target, rawActivity, compact = false) {
    const activity = expandDays(rawActivity || []);
    if (activity.length === 0) {
        target.innerHTML = `<p class="chart-empty">아직 저장된 연습 이력이 없습니다.</p>`;
        return;
    }
    const max = Math.max(1, ...activity.map((item) => Number(item.runs) || 0));
    const labelEvery = activity.length > 15 ? 5 : activity.length > 8 ? 2 : 1;
    target.innerHTML = activity.map((item, index) => {
        const height = item.runs ? Math.max(8, (item.runs / max) * 100) : 2;
        const key = dateKey(item.date);
        const day = key ? `${Number(key.slice(5, 7))}/${Number(key.slice(8, 10))}` : "";
        const label = (index % labelEvery === 0 || index === activity.length - 1) ? day : "";
        const title = `${day} · ${item.runs}회 · ${formatNumber(item.durationMinutes, 1)}분`;
        return `<div class="chart-day" title="${title}"><span class="chart-bar" style="height:${height}%"></span><small>${label}</small></div>`;
    }).join("");
    target.classList.toggle("compact", compact);
}

function renderClassActivity(data) {
    els.activityCaption.textContent = `${LABELS.range[state.range]} · 막대는 연습 횟수`;
    renderActivity(els.activity, data.dailyActivity);
}

function filteredStudents() {
    const query = els.search.value.trim().toLocaleLowerCase("ko-KR");
    const wantedStatus = els.status.value;
    const students = (state.classData?.students || []).filter((student) => {
        const haystack = `${student.displayName} ${student.nickname} ${student.studentNumber}`.toLocaleLowerCase("ko-KR");
        return (!query || haystack.includes(query)) && (wantedStatus === "all" || student.status === wantedStatus);
    });
    const sort = els.sort.value;
    students.sort((a, b) => {
        if (sort === "progress") return b.cumulative.certifiedQuests - a.cumulative.certifiedQuests || b.cumulative.totalRuns - a.cumulative.totalRuns;
        if (sort === "effort") return b.period.runs - a.period.runs || b.cumulative.totalRuns - a.cumulative.totalRuns;
        if (sort === "seat") return (a.seatNumber ?? 9999) - (b.seatNumber ?? 9999) || String(a.studentNumber).localeCompare(String(b.studentNumber));
        return new Date(b.period.lastActivityAt || b.cumulative.lastActivityAt || 0) - new Date(a.period.lastActivityAt || a.cumulative.lastActivityAt || 0);
    });
    return students;
}

function renderStudents() {
    const students = filteredStudents();
    els.rosterEmpty.hidden = students.length > 0;
    els.studentRows.innerHTML = students.map((student) => {
        const progress = Number(student.cumulative.progressPercent) || 0;
        const lastActivity = student.period.lastActivityAt || student.cumulative.lastActivityAt;
        return `<tr>
            <td data-label="학생"><span class="student-name"><strong>${escapeHtml(student.displayName)}</strong><span>${student.seatNumber ? `${student.seatNumber}번 · ` : ""}${escapeHtml(student.studentNumber || student.nickname)}</span></span></td>
            <td data-label="상태"><span class="status-pill ${student.status}">${LABELS.status[student.status]}</span></td>
            <td data-label="배지 인증 진도" class="progress-cell"><div><div class="progress-copy"><span>${student.cumulative.certifiedQuests}/${student.cumulative.missionTotal} 퀘스트</span><strong>${formatNumber(progress, 1)}%</strong></div><div class="progress-track"><span style="width:${Math.min(100, progress)}%"></span></div></div></td>
            <td data-label="기간 연습"><span class="metric-stack"><strong>${formatNumber(student.period.runs)}회 · ${formatNumber(student.period.durationMinutes, 1)}분</strong><span>평균 정확도 ${student.period.runs ? `${formatNumber(student.period.averageAccuracy, 1)}%` : "-"}</span></span></td>
            <td data-label="누적 최고 기록"><span class="metric-stack"><strong>${formatNumber(student.cumulative.bestScore)}점</strong><span>정확도 ${formatNumber(student.cumulative.bestAccuracy, 1)}%</span></span></td>
            <td data-label="최근 활동">${formatDateTime(lastActivity)}</td>
            <td><button type="button" class="detail-button" data-student-id="${student.id}">상세 보기</button></td>
        </tr>`;
    }).join("");
}

async function loadClass() {
    if (!state.selectedClass) return;
    setMessage(`${state.selectedClass.grade}학년 ${state.selectedClass.classNumber}반 현황을 불러오는 중입니다.`);
    renderClassTabs();
    try {
        const { grade, classNumber } = state.selectedClass;
        const data = await api(`/api/teacher/classes/${grade}/${classNumber}?range=${state.range}`);
        state.classData = data;
        renderSummary(data);
        renderClassActivity(data);
        renderStudents();
        els.pageMessage.hidden = true;
        els.dashboard.hidden = false;
    } catch (error) {
        setMessage(error.message, true);
    }
}

function detailStats(data) {
    return [
        ["기간 연습", `${formatNumber(data.period.runs)}회`],
        ["기간 연습 시간", `${formatNumber(data.period.durationMinutes, 1)}분`],
        ["인증 퀘스트", `${data.cumulative.certifiedQuests}/${data.cumulative.missionTotal}`],
        ["누적 최고 점수", `${formatNumber(data.cumulative.bestScore)}점`]
    ].map(([label, value]) => `<article class="detail-stat"><span>${label}</span><strong>${value}</strong></article>`).join("");
}

function filteredQuests() {
    const difficulty = els.difficulty.value;
    const length = els.length.value;
    return (state.detail?.quests || []).filter((quest) =>
        (difficulty === "all" || quest.difficulty === difficulty)
        && (length === "all" || quest.length === length));
}

function renderQuestProgress() {
    const quests = state.detail?.quests || [];
    const combinations = ["beginner", "intermediate", "advanced"].flatMap((difficulty) =>
        ["short", "medium", "long"].map((length) => ({ difficulty, length })));
    els.stageProgress.innerHTML = combinations.map(({ difficulty, length }) => {
        const group = quests.filter((quest) => quest.difficulty === difficulty && quest.length === length);
        const certified = group.filter((quest) => quest.certified).length;
        const percent = group.length ? (certified / group.length) * 100 : 0;
        return `<article class="stage-card"><div class="stage-card-top"><strong>${LABELS.difficulty[difficulty]} · ${LABELS.length[length]}</strong><span class="cert-pill ${group.length && certified === group.length ? "done" : ""}">${certified}/${group.length}</span></div><p>${group.length ? (certified === group.length ? "배지 획득 조건 달성" : `${group.length - certified}개 퀘스트가 더 필요해요`) : "등록된 퀘스트 없음"}</p><div class="progress-track"><span style="width:${percent}%"></span></div></article>`;
    }).join("");

    const filtered = filteredQuests();
    els.questRows.innerHTML = filtered.map((quest) => `<tr>
        <td><span class="student-name"><strong>${escapeHtml(quest.title)}</strong><span>${LABELS.difficulty[quest.difficulty]} · ${LABELS.length[quest.length]}</span></span></td>
        <td>${stars(quest.stars)}</td>
        <td><strong>${quest.clears ? `${formatNumber(quest.bestAccuracy, 1)}%` : "미도전"}</strong></td>
        <td>${quest.clears ? `${formatNumber(quest.bestScore)}점` : "-"}</td>
        <td>${formatNumber(quest.clears)}회</td>
        <td><span class="cert-pill ${quest.certified ? "done" : ""}">${quest.certified ? "인증 완료" : "80% 필요"}</span></td>
    </tr>`).join("") || `<tr><td colspan="6" class="empty-state">선택한 조건의 퀘스트가 없습니다.</td></tr>`;
}

function runItem(run) {
    return `<article class="run-item"><div><strong>${escapeHtml(run.title)}</strong><small>${formatDateTime(run.completedAt)} · ${LABELS.difficulty[run.difficulty] || run.difficulty} · ${LABELS.length[run.length] || run.length}</small></div><span>${stars(run.stars)}</span><span><strong>${formatNumber(run.score)}점</strong><small>점수</small></span><span><strong>${formatNumber(run.accuracy, 1)}%</strong><small>정확도</small></span><span><strong>${formatNumber(run.cpm)} CPM</strong><small>타수</small></span></article>`;
}

function renderHistory(runs, append = false) {
    if (!append) els.history.innerHTML = "";
    if (runs.length) els.history.insertAdjacentHTML("beforeend", runs.map(runItem).join(""));
    if (!els.history.children.length) els.history.innerHTML = `<div class="empty-state">선택한 기간에 저장된 연습 이력이 없습니다.</div>`;
    const since = state.detail?.period.historyAvailableSince;
    els.historyNote.textContent = since ? `이력 수집 시작 ${formatDateTime(since)}` : "이 기능 적용 이후 기록부터 표시됩니다.";
    els.loadMore.hidden = !state.nextCursor;
}

function renderDetail(data) {
    const student = data.student;
    els.detailClass.textContent = `${student.grade}학년 ${student.classNumber}반 · ${LABELS.range[state.range]}`;
    els.detailName.textContent = student.displayName;
    els.detailMeta.textContent = `${student.seatNumber ? `${student.seatNumber}번 · ` : ""}${student.studentNumber || student.nickname || "학생 ID 없음"}`;
    els.detailSummary.innerHTML = detailStats(data);
    renderActivity(els.studentActivity, data.dailyActivity, true);
    renderQuestProgress();
    renderHistory(data.runs);
}

async function openStudent(studentId) {
    state.detailStudentId = studentId;
    state.detail = null;
    state.nextCursor = null;
    els.detailContent.hidden = true;
    els.detailLoading.hidden = false;
    els.detailLoading.textContent = "학습 기록을 불러오는 중입니다.";
    if (!els.dialog.open) els.dialog.showModal();
    try {
        const data = await api(`/api/teacher/students/${studentId}?range=${state.range}`);
        state.detail = data;
        state.nextCursor = data.nextCursor;
        els.difficulty.value = "all";
        els.length.value = "all";
        renderDetail(data);
        els.detailLoading.hidden = true;
        els.detailContent.hidden = false;
    } catch (error) {
        els.detailLoading.textContent = error.message;
    }
}

async function loadMoreRuns() {
    if (!state.nextCursor || !state.detailStudentId || els.loadMore.disabled) return;
    els.loadMore.disabled = true;
    els.loadMore.textContent = "불러오는 중…";
    try {
        const cursor = encodeURIComponent(state.nextCursor);
        const data = await api(`/api/teacher/students/${state.detailStudentId}?range=${state.range}&cursor=${cursor}`);
        state.nextCursor = data.nextCursor;
        renderHistory(data.runs, true);
    } catch (error) {
        els.loadMore.textContent = error.message;
        return;
    } finally {
        els.loadMore.disabled = false;
        if (els.loadMore.textContent === "불러오는 중…") els.loadMore.textContent = "이력 더 보기";
    }
}

async function initialize() {
    try {
        const session = await api("/api/auth/session");
        if (session.user?.role !== "teacher") {
            window.location.replace("/");
            return;
        }
        state.session = session;
        const name = session.user.displayName || session.user.nickname || "선생님";
        els.teacherName.textContent = name;
        els.teacherSchool.textContent = session.user.schoolName || "학교";
        els.teacherAvatar.textContent = Array.from(name)[0] || "T";

        const data = await api("/api/teacher/classes");
        state.classes = data.classes || [];
        if (!state.classes.length) {
            setMessage("Pyrun Studio에 배정된 학급이 없습니다. 학급 배정을 확인해 주세요.");
            return;
        }
        state.selectedClass = state.classes[0];
        renderClassTabs();
        await loadClass();
    } catch (error) {
        setMessage(error.message, true);
    }
}

els.classTabs.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-grade]");
    if (!button) return;
    state.selectedClass = { grade: Number(button.dataset.grade), classNumber: Number(button.dataset.classNumber) };
    loadClass();
});

els.rangeTabs.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-range]");
    if (!button || button.dataset.range === state.range) return;
    state.range = button.dataset.range;
    els.rangeTabs.querySelectorAll("button").forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
    });
    if (els.dialog.open) els.dialog.close();
    loadClass();
});

[els.search, els.status, els.sort].forEach((control) => control.addEventListener(control === els.search ? "input" : "change", renderStudents));
els.studentRows.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-student-id]");
    if (button) openStudent(Number(button.dataset.studentId));
});
[els.difficulty, els.length].forEach((control) => control.addEventListener("change", renderQuestProgress));
els.loadMore.addEventListener("click", loadMoreRuns);
els.dialogClose.addEventListener("click", () => els.dialog.close());
els.dialog.addEventListener("click", (event) => {
    if (event.target === els.dialog) els.dialog.close();
});
els.logout.addEventListener("click", async () => {
    els.logout.disabled = true;
    try { await fetch("/api/auth/logout", { method: "POST" }); } finally { window.location.replace("/login"); }
});

initialize();
