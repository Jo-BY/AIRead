const loginForm = document.getElementById("loginForm");
const loginHelp = document.getElementById("loginHelp");
const STUDENT_STORAGE_KEY = "airead-current-student";
const API_BASE = (window.AIREAD_API_BASE || "").replace(/\/$/, "");

async function fetchJSON(url, options) {
  const targetUrl = `${API_BASE}${url}`;
  const response = await fetch(targetUrl, options);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "요청 중 오류가 발생했어요.");
  }
  return response.json();
}

function redirectToMain() {
  window.location.href = "./index.html";
}

(function init() {
  const raw = localStorage.getItem(STUDENT_STORAGE_KEY);
  if (raw) {
    redirectToMain();
  }
})();

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);

  try {
    const result = await fetchJSON("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        school: formData.get("school"),
        className: formData.get("className"),
        studentNumber: Number(formData.get("studentNumber"))
      })
    });

    localStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(result.student));
    redirectToMain();
  } catch (error) {
    loginHelp.textContent = error.message;
  }
});
