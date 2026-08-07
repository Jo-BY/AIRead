const DB_SERVICE_URL = (process.env.DB_SERVICE_URL || "http://localhost:10000").replace(/\/+$/, "");

async function requestJson(path, options) {
  const response = await fetch(`${DB_SERVICE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message = err.message || `DB service error (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

async function createOrGetStudentAccount(identity) {
  const result = await requestJson("/internal/students/login", {
    method: "POST",
    body: JSON.stringify({ identity })
  });
  return result.student;
}

async function getStudentById(studentId) {
  const result = await requestJson(`/internal/students/${studentId}`);
  return result.student;
}

async function createSubmission(studentId, reflection, evaluation) {
  const result = await requestJson("/internal/submissions", {
    method: "POST",
    body: JSON.stringify({ studentId, reflection, evaluation })
  });
  return result.ids;
}

async function getDashboard(limit = 100, studentId = null) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (studentId) {
    params.set("studentId", String(studentId));
  }

  return requestJson(`/internal/dashboard?${params.toString()}`);
}

async function getStudentReflectionDetail(studentId, reflectionId) {
  const params = new URLSearchParams({
    studentId: String(studentId),
    reflectionId: String(reflectionId)
  });
  const result = await requestJson(`/internal/reflections/detail?${params.toString()}`);
  return result.detail;
}

module.exports = {
  createOrGetStudentAccount,
  getStudentById,
  createSubmission,
  getDashboard,
  getStudentReflectionDetail
};