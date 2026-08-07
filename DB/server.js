const express = require("express");
const {
  initDatabase,
  createOrGetStudentAccount,
  getStudentById,
  createSubmission,
  getDashboard,
  getStudentReflectionDetail
} = require("./database");

const app = express();
const PORT = Number(process.env.PORT) || 10000;

initDatabase();

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "AIRead DB service" });
});

app.post("/internal/students/login", (req, res) => {
  const identity = req.body?.identity;
  if (!identity) {
    return res.status(400).json({ message: "identity가 필요합니다." });
  }

  const student = createOrGetStudentAccount(identity);
  return res.json({ student });
});

app.get("/internal/students/:id", (req, res) => {
  const studentId = Number(req.params.id);
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return res.status(400).json({ message: "유효한 student id가 필요합니다." });
  }

  const student = getStudentById(studentId);
  if (!student) {
    return res.status(404).json({ message: "학생 계정을 찾을 수 없습니다." });
  }

  return res.json({ student });
});

app.post("/internal/submissions", (req, res) => {
  const { studentId, reflection, evaluation } = req.body || {};
  if (!studentId || !reflection || !evaluation) {
    return res.status(400).json({ message: "studentId, reflection, evaluation이 필요합니다." });
  }

  const ids = createSubmission(studentId, reflection, evaluation);
  return res.status(201).json({ ids });
});

app.get("/internal/dashboard", (req, res) => {
  const limit = Number(req.query.limit || 100);
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 300) : 100;

  const studentId = req.query.studentId ? Number(req.query.studentId) : null;
  if (req.query.studentId && (!Number.isInteger(studentId) || studentId <= 0)) {
    return res.status(400).json({ message: "studentId가 유효하지 않습니다." });
  }

  const dashboard = getDashboard(safeLimit, studentId);
  return res.json(dashboard);
});

app.get("/internal/reflections/detail", (req, res) => {
  const studentId = Number(req.query.studentId);
  const reflectionId = Number(req.query.reflectionId);

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return res.status(400).json({ message: "studentId가 필요합니다." });
  }

  if (!Number.isInteger(reflectionId) || reflectionId <= 0) {
    return res.status(400).json({ message: "reflectionId가 필요합니다." });
  }

  const detail = getStudentReflectionDetail(studentId, reflectionId);
  if (!detail) {
    return res.status(404).json({ message: "해당 독서 기록을 찾을 수 없습니다." });
  }

  return res.json({ detail });
});

app.listen(PORT, () => {
  console.log(`AIRead DB service running on http://localhost:${PORT}`);
});