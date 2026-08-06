const logoutButton = document.getElementById("logoutButton");
const loginStatusEl = document.getElementById("loginStatus");
const form = document.getElementById("submissionForm");
const totalScoreEl = document.getElementById("totalScore");
const scoreRowsEl = document.getElementById("scoreRows");
const indicatorListEl = document.getElementById("indicatorList");
const dashboardBodyEl = document.getElementById("dashboardBody");
const statsEl = document.getElementById("stats");
const refreshButton = document.getElementById("refreshButton");
const gnbButtons = Array.from(document.querySelectorAll(".gnb-btn"));

const STUDENT_STORAGE_KEY = "airead-current-student";
let currentStudent = null;

const indicatorNameMap = {
  comprehension: "내용 이해",
  inference: "추론/해석",
  criticalThinking: "비판/평가",
  expression: "표현/구성",
  vocabGrammar: "어휘/문장 사용"
};

async function fetchJSON(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "요청 중 오류가 발생했어요.");
  }
  return response.json();
}

function goToLogin() {
  window.location.href = "/login.html";
}

function restoreStudentSession() {
  const raw = localStorage.getItem(STUDENT_STORAGE_KEY);
  if (!raw) {
    goToLogin();
    return false;
  }

  try {
    currentStudent = JSON.parse(raw);
  } catch (error) {
    localStorage.removeItem(STUDENT_STORAGE_KEY);
    goToLogin();
    return false;
  }

  return true;
}

function renderLoginStatus() {
  if (!currentStudent) {
    loginStatusEl.textContent = "";
    return;
  }

  loginStatusEl.textContent = `${currentStudent.school} ${currentStudent.className} ${currentStudent.studentNumber}번 ${currentStudent.name}`;
}

function activateView(viewName) {
  gnbButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });

  document.querySelectorAll(".view-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `view-${viewName}`);
  });
}

function renderEvaluation(evaluation) {
  totalScoreEl.textContent = evaluation.totalScore;
  scoreRowsEl.innerHTML = "";

  Object.entries(evaluation.scores).forEach(([key, value]) => {
    const row = document.createElement("div");
    row.className = "score-row";

    const percent = (value / 5) * 100;
    row.innerHTML = `
      <strong>${indicatorNameMap[key] || key}: ${value}/5</strong>
      <div class="bar"><div class="fill" style="width:${percent}%"></div></div>
      <div>${evaluation.feedback[key] || ""}</div>
    `;
    scoreRowsEl.appendChild(row);
  });
}

function renderDashboard(data) {
  dashboardBodyEl.innerHTML = "";

  const studentCount = data.stats.student_count || 0;
  const reflectionCount = data.stats.reflection_count || 0;
  const avgScore = data.stats.avg_score || 0;

  statsEl.innerHTML = `
    <div class="stat-pill">전체 학생 수: ${studentCount}</div>
    <div class="stat-pill">내 제출 수: ${reflectionCount}</div>
    <div class="stat-pill">내 평균 점수: ${avgScore || 0}</div>
  `;

  if (!data.rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="4">아직 저장된 평가가 없어요. 문해력 평가 메뉴에서 첫 감상문을 작성해보세요.</td>`;
    dashboardBodyEl.appendChild(tr);
    return;
  }

  data.rows.forEach((row) => {
    const tr = document.createElement("tr");
    const when = new Date(row.submitted_at).toLocaleString("ko-KR");

    tr.innerHTML = `
      <td><strong>${row.book_title}</strong><br/>${row.book_author || ""}</td>
      <td>${row.total_score}점</td>
      <td>${row.feedback?.comprehension || ""}</td>
      <td>${when}</td>
    `;

    dashboardBodyEl.appendChild(tr);
  });
}

async function loadIndicators() {
  const data = await fetchJSON("/api/indicators");
  indicatorListEl.innerHTML = "";

  data.indicators.forEach((i) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${i.name}</strong> (${Math.round(i.weight * 100)}%) - ${i.description} <small>[${i.source}]</small>`;
    indicatorListEl.appendChild(li);
  });
}

async function loadMyDashboard() {
  const data = await fetchJSON(`/api/my-dashboard?studentId=${currentStudent.id}&limit=100`);
  renderDashboard(data);
}

logoutButton.addEventListener("click", () => {
  localStorage.removeItem(STUDENT_STORAGE_KEY);
  goToLogin();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = {
    studentId: currentStudent.id,
    reflection: {
      bookTitle: formData.get("bookTitle"),
      bookAuthor: formData.get("bookAuthor"),
      reflectionText: formData.get("reflectionText")
    }
  };

  try {
    const result = await fetchJSON("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    renderEvaluation(result.evaluation);
    await loadMyDashboard();
    activateView("dashboard");
    alert("평가와 저장이 완료되었어요.");
  } catch (error) {
    alert(error.message);
  }
});

refreshButton.addEventListener("click", loadMyDashboard);

gnbButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activateView(button.dataset.view);
  });
});

(async function init() {
  if (!restoreStudentSession()) {
    return;
  }

  try {
    renderLoginStatus();
    await Promise.all([loadIndicators(), loadMyDashboard()]);
    activateView("dashboard");
  } catch (error) {
    alert(`초기 로딩 오류: ${error.message}`);
  }
})();
