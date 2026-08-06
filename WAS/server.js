const path = require("path");
const express = require("express");
const cors = require("cors");
const {
  initDatabase,
  findStudentByIdentity,
  getStudentById,
  createSubmission,
  getDashboard,
  getStudentReflectionDetail
} = require("../DB/database");
const { INDICATORS, evaluateReflection } = require("./services/evaluator");

const app = express();
const PORT = process.env.PORT || 3000;

function normalizeClassName(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return raw;
  }

  // Accept "1" or "1반" as the same class label.
  if (/^\d+$/.test(raw)) {
    return `${raw}반`;
  }

  return raw;
}

initDatabase();

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "..", "WEB")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "WEB", "login.html"));
});

app.get("/app", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "WEB", "index.html"));
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "AIRead literacy service" });
});

app.get("/api/indicators", (req, res) => {
  res.json({ indicators: INDICATORS });
});

app.post("/api/auth/login", (req, res) => {
  const { name, school, grade, className, studentNumber } = req.body || {};

  if (!name || !school || !grade || !className || !studentNumber) {
    return res.status(400).json({ message: "이름, 학교, 학년, 반, 번호를 모두 입력해 주세요." });
  }

  const parsedGrade = Number(grade);
  if (!Number.isInteger(parsedGrade) || parsedGrade < 1 || parsedGrade > 6) {
    return res.status(400).json({ message: "학년은 1~6 사이의 숫자로 입력해 주세요." });
  }

  const parsedNumber = Number(studentNumber);
  if (!Number.isInteger(parsedNumber) || parsedNumber <= 0) {
    return res.status(400).json({ message: "번호는 1 이상의 숫자로 입력해 주세요." });
  }

  const student = findStudentByIdentity({
    name: String(name).trim(),
    school: String(school).trim(),
    grade: parsedGrade,
    className: normalizeClassName(className),
    studentNumber: parsedNumber
  });

  if (!student) {
    return res.status(404).json({
      message: "등록된 학생 정보를 찾을 수 없습니다. 이름/학교/학년/반/번호를 확인해 주세요."
    });
  }

  return res.json({
    message: "로그인되었습니다.",
    student: {
      id: student.id,
      name: student.name,
      school: student.school,
      grade: student.grade,
      className: student.class_name,
      studentNumber: student.student_number
    }
  });
});

app.post("/api/auth/teacher-login", (req, res) => {
  const { name, password } = req.body || {};

  if (!name || !password) {
    return res.status(400).json({ message: "이름과 비밀번호를 입력해 주세요." });
  }

  if (String(password) !== "0000") {
    return res.status(401).json({ message: "비밀번호가 올바르지 않습니다." });
  }

  return res.json({
    message: "교사 로그인되었습니다.",
    teacher: {
      name: String(name).trim(),
      role: "teacher"
    }
  });
});

app.post("/api/evaluate", (req, res) => {
  const { reflectionText } = req.body || {};

  if (!reflectionText || reflectionText.trim().length < 20) {
    return res.status(400).json({ message: "감상문은 20자 이상 입력해 주세요." });
  }

  const result = evaluateReflection(reflectionText);
  return res.json(result);
});

app.post("/api/submissions", (req, res) => {
  const { studentId, reflection } = req.body || {};

  if (!studentId || !reflection) {
    return res.status(400).json({ message: "로그인 정보와 감상문 정보가 필요합니다." });
  }

  const parsedStudentId = Number(studentId);
  if (!Number.isInteger(parsedStudentId) || parsedStudentId <= 0) {
    return res.status(400).json({ message: "유효하지 않은 학생 계정입니다." });
  }

  const student = getStudentById(parsedStudentId);
  if (!student) {
    return res.status(404).json({ message: "학생 계정을 찾을 수 없습니다. 다시 로그인해 주세요." });
  }

  if (!reflection.bookTitle || !reflection.reflectionText) {
    return res.status(400).json({ message: "책 제목과 감상문을 입력해 주세요." });
  }

  if (reflection.reflectionText.trim().length < 20) {
    return res.status(400).json({ message: "감상문은 20자 이상 입력해 주세요." });
  }

  const evaluation = evaluateReflection(reflection.reflectionText);
  const ids = createSubmission(parsedStudentId, reflection, evaluation);

  return res.status(201).json({
    message: "저장 및 평가가 완료되었습니다.",
    ids,
    student: {
      id: student.id,
      name: student.name,
      school: student.school,
      grade: student.grade,
      className: student.class_name,
      studentNumber: student.student_number
    },
    evaluation
  });
});

app.get("/api/my-dashboard", (req, res) => {
  const studentId = Number(req.query.studentId);
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return res.status(400).json({ message: "studentId가 필요합니다." });
  }

  const student = getStudentById(studentId);
  if (!student) {
    return res.status(404).json({ message: "학생 계정을 찾을 수 없습니다." });
  }

  const limit = Number(req.query.limit || 100);
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 300) : 100;
  const dashboard = getDashboard(safeLimit, studentId);

  return res.json({
    student: {
      id: student.id,
      name: student.name,
      school: student.school,
      grade: student.grade,
      className: student.class_name,
      studentNumber: student.student_number
    },
    ...dashboard
  });
});

app.get("/api/my-reflection-detail", (req, res) => {
  const studentId = Number(req.query.studentId);
  const reflectionId = Number(req.query.reflectionId);

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return res.status(400).json({ message: "studentId가 필요합니다." });
  }

  if (!Number.isInteger(reflectionId) || reflectionId <= 0) {
    return res.status(400).json({ message: "reflectionId가 필요합니다." });
  }

  const student = getStudentById(studentId);
  if (!student) {
    return res.status(404).json({ message: "학생 계정을 찾을 수 없습니다." });
  }

  const detail = getStudentReflectionDetail(studentId, reflectionId);
  if (!detail) {
    return res.status(404).json({ message: "해당 독서 기록을 찾을 수 없습니다." });
  }

  return res.json({ detail });
});

app.get("/api/dashboard", (req, res) => {
  const limit = Number(req.query.limit || 100);
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 300) : 100;

  const dashboard = getDashboard(safeLimit);
  return res.json(dashboard);
});

app.listen(PORT, () => {
  console.log(`AIRead server running on http://localhost:${PORT}`);
});
