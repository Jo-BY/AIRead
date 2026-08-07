const studentLoginForm = document.getElementById("studentLoginForm");
const teacherLoginForm = document.getElementById("teacherLoginForm");
const loginHelp = document.getElementById("loginHelp");
const authTabs = Array.from(document.querySelectorAll(".auth-tab"));

const SESSION_STORAGE_KEY = "airead-auth-session";
const API_BASE = String(window.AIREAD_API_BASE || "").replace(/\/+$/, "");

function buildApiUrl(url) {
  if (typeof url !== "string") {
    return url;
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  if (url.startsWith("/")) {
    return `${API_BASE}${url}`;
  }
  return url;
}

async function fetchJSON(url, options) {
  const response = await fetch(buildApiUrl(url), options);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "요청 중 오류가 발생했어요.");
  }
  return response.json();
}

function redirectToMain() {
  window.location.href = "./app";
}

function activateAuthTab(target) {
  authTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.auth === target);
  });

  document.querySelectorAll(".auth-form").forEach((form) => {
    form.classList.toggle("active", form.id === `${target}LoginForm`);
  });

  loginHelp.textContent =
    target === "teacher"
      ? "교사 비밀번호는 0000입니다."
      : "학생은 처음 로그인하면 계정이 자동으로 만들어져요.";
}

(function init() {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (raw) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    loginHelp.textContent = "다른 계정으로 로그인할 수 있도록 이전 로그인 정보를 초기화했어요.";
  }

  activateAuthTab("student");
})();

authTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activateAuthTab(tab.dataset.auth);
  });
});

studentLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(studentLoginForm);

  try {
    const result = await fetchJSON("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        school: formData.get("school"),
        grade: Number(formData.get("grade")),
        className: formData.get("className"),
        studentNumber: Number(formData.get("studentNumber"))
      })
    });

    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        role: "student",
        student: result.student
      })
    );
    redirectToMain();
  } catch (error) {
    loginHelp.textContent = error.message;
  }
});

teacherLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(teacherLoginForm);

  try {
    const result = await fetchJSON("/api/auth/teacher-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("teacherName"),
        password: formData.get("teacherPassword")
      })
    });

    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        role: "teacher",
        teacher: result.teacher
      })
    );
    redirectToMain();
  } catch (error) {
    loginHelp.textContent = error.message;
  }
});
