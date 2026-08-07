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
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || "0000";

const INDICATOR_META = [
  { key: "comprehension", label: "내용 이해" },
  { key: "inference", label: "추론/해석" },
  { key: "critical_thinking", label: "비판/평가" },
  { key: "expression", label: "표현/구성" },
  { key: "vocab_grammar", label: "어휘/문장 사용" }
];

function normalizeTotalTo100(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) {
    return 0;
  }
  if (n <= 25) {
    return (n / 25) * 100;
  }
  return n;
}

function normalizeIndicatorTo100(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) {
    return 0;
  }
  if (n <= 5) {
    return n * 20;
  }
  return n;
}

function average(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, v) => sum + Number(v || 0), 0) / values.length;
}

function calcSlope(values) {
  if (values.length < 2) {
    return 0;
  }

  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY = average(values);
  let num = 0;
  let den = 0;

  values.forEach((value, idx) => {
    const dx = idx - meanX;
    num += dx * (value - meanY);
    den += dx * dx;
  });

  return den === 0 ? 0 : num / den;
}

function buildStudentDiagnosis(student, rows) {
  const sortedRows = [...rows].sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
  const attempts = sortedRows.length;

  if (!attempts) {
    return {
      diagnosis: {
        headline: `${student.name} 학생의 진단을 위해 평가 기록이 필요합니다.`,
        overview:
          "아직 분석 가능한 문해력 평가 기록이 없습니다. 문해력 평가 탭에서 최소 2건 이상 작성하면 성장 패턴과 지표별 약점을 더 정확하게 진단할 수 있어요.",
        timelineInsights: ["기록 2건 이상 누적 시 추세(상승/정체/하락) 분석을 제공합니다."],
        indicatorInsights: [],
        actionPlan: [
          "주 2회 이상 감상문을 작성해 시간 흐름 데이터(타임라인)를 확보하세요.",
          "책 내용 요약 3문장 + 이유/근거 2문장 구조로 꾸준히 작성해 보세요."
        ]
      },
      recommendations: {
        textbooks: [],
        books: []
      },
      meta: {
        attemptCount: 0,
        school: student.school,
        grade: student.grade,
        className: student.class_name
      }
    };
  }

  const totalSeries = sortedRows.map((row) => normalizeTotalTo100(row.total_score));
  const firstTotal = totalSeries[0];
  const latestTotal = totalSeries[totalSeries.length - 1];
  const totalDelta = latestTotal - firstTotal;
  const totalSlope = calcSlope(totalSeries);

  const trendText = totalSlope > 1.2 ? "상승" : totalSlope < -1.2 ? "하락" : "정체";
  const recentWindow = sortedRows.slice(-Math.min(3, attempts));
  const prevWindow = sortedRows.slice(0, Math.max(1, attempts - recentWindow.length));

  const indicatorStats = INDICATOR_META.map((meta) => {
    const recentAvg = average(recentWindow.map((row) => normalizeIndicatorTo100(row[meta.key])));
    const prevAvg = average(prevWindow.map((row) => normalizeIndicatorTo100(row[meta.key])));
    return {
      ...meta,
      recentAvg,
      prevAvg,
      delta: recentAvg - prevAvg
    };
  });

  const weakest = [...indicatorStats].sort((a, b) => a.recentAvg - b.recentAvg)[0];
  const strongest = [...indicatorStats].sort((a, b) => b.recentAvg - a.recentAvg)[0];
  const mostImproved = [...indicatorStats].sort((a, b) => b.delta - a.delta)[0];

  const textbookByGrade = {
    low: [
      "국어 교과서: 이야기 인물의 마음 추론하기 단원",
      "국어 활동: 중심 문장 찾기와 단락 요약 단원"
    ],
    mid: [
      "국어 교과서: 주장과 근거 구분하기 단원",
      "국어 활동: 글의 구조(도입-전개-마무리) 재구성 단원"
    ],
    high: [
      "국어 교과서: 관점 비교와 비판적 읽기 단원",
      "국어 활동: 자료 해석 기반 논리적 쓰기 단원"
    ]
  };

  const gradeBand = student.grade <= 2 ? "low" : student.grade <= 4 ? "mid" : "high";
  const weaknessBookMap = {
    comprehension: [
      { title: "짜장 짬뽕 탕수육", author: "김영주", reason: "사건 흐름 정리와 핵심 내용 파악 훈련" },
      { title: "만복이네 떡집", author: "김리리", reason: "에피소드별 핵심 사건 요약 연습" }
    ],
    inference: [
      { title: "마당을 나온 암탉", author: "황선미", reason: "인물 선택의 원인-결과 추론 훈련" },
      { title: "아낌없이 주는 나무", author: "셸 실버스타인", reason: "직접 쓰이지 않은 감정과 관계 해석" }
    ],
    critical_thinking: [
      { title: "강아지똥", author: "권정생", reason: "가치 판단 근거 쓰기와 관점 비교" },
      { title: "모모", author: "미하엘 엔데", reason: "주제와 사회적 메시지에 대한 비판적 질문 생성" }
    ],
    expression: [
      { title: "내 이름은 삐삐 롱스타킹", author: "아스트리드 린드그렌", reason: "사건 재구성 및 문단 연결 표현 확장" },
      { title: "수일이와 수일이", author: "김우경", reason: "인물 비교 문장 구성 훈련" }
    ],
    vocab_grammar: [
      { title: "우리말 모으기 대작전 말모이", author: "정명섭", reason: "어휘 확장과 문장 변주 연습" },
      { title: "받침구조대", author: "곽미영", reason: "문장 정확성과 표현 다양성 강화" }
    ]
  };

  const weaknessBooks = weaknessBookMap[weakest.key] || [];

  const timelineInsights = [
    `초기 대비 최근 총점 변화: ${firstTotal.toFixed(1)}점 -> ${latestTotal.toFixed(1)}점 (${totalDelta >= 0 ? "+" : ""}${totalDelta.toFixed(1)}점)`,
    `타임라인 추세는 ${trendText} 흐름입니다. (회차당 기울기 ${totalSlope.toFixed(2)})`,
    `최근 ${recentWindow.length}회 평균 총점: ${average(recentWindow.map((row) => normalizeTotalTo100(row.total_score))).toFixed(1)}점`
  ];

  const indicatorInsights = indicatorStats.map((item) => {
    const deltaPrefix = item.delta >= 0 ? "+" : "";
    return `${item.label}: 최근 평균 ${item.recentAvg.toFixed(1)}점 (이전 대비 ${deltaPrefix}${item.delta.toFixed(1)}점)`;
  });

  const actionPlan = [
    `${weakest.label} 보완이 최우선입니다. 한 편을 읽고 '핵심 3문장 + 근거 2문장' 형식으로 작성하세요.`,
    `${mostImproved.label}은(는) 상승폭이 가장 큽니다. 현재 학습 전략을 유지해 강점을 고정하세요.`,
    `${student.school} ${student.grade}학년 학습 수준에 맞춰 주 2회, 회당 20분 독후 요약 루틴을 권장합니다.`
  ];

  return {
    diagnosis: {
      headline: `${student.name} 학생 AI 진단 결과`,
      overview: `${student.school} ${student.grade}학년 ${student.class_name} 기준으로 타임라인 ${attempts}건을 분석했습니다. 현재 핵심 강점은 ${strongest.label}, 보완 필요 영역은 ${weakest.label}입니다.`,
      timelineInsights,
      indicatorInsights,
      actionPlan
    },
    recommendations: {
      textbooks: textbookByGrade[gradeBand].map((item) => ({
        title: item,
        reason: `${student.grade}학년 권장 난이도와 ${weakest.label} 보완 목표를 반영한 교과 연계 활동`
      })),
      books: weaknessBooks.map((item) => ({
        ...item,
        level: `${student.grade}학년 권장`
      }))
    },
    meta: {
      attemptCount: attempts,
      school: student.school,
      grade: student.grade,
      className: student.class_name,
      weakestIndicator: weakest.label,
      strongestIndicator: strongest.label
    }
  };
}

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

  if (String(password) !== TEACHER_PASSWORD) {
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

app.get("/api/my-ai-diagnosis", (req, res) => {
  const studentId = Number(req.query.studentId);

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return res.status(400).json({ message: "studentId가 필요합니다." });
  }

  const student = getStudentById(studentId);
  if (!student) {
    return res.status(404).json({ message: "학생 계정을 찾을 수 없습니다." });
  }

  const dashboard = getDashboard(300, studentId);
  const result = buildStudentDiagnosis(student, dashboard.rows || []);
  return res.json(result);
});

app.get("/api/dashboard", (req, res) => {
  const limit = Number(req.query.limit || 100);
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 300) : 100;

  const dashboard = getDashboard(safeLimit);
  return res.json(dashboard);
});

app.listen(PORT, () => {
  console.log(`AIRead server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  if (process.env.DB_PATH || process.env.DB_DIR) {
    console.log("Custom DB path configuration is enabled.");
  }
});
