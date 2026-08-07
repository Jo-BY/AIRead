const logoutButton = document.getElementById("logoutButton");
const loginStatusEl = document.getElementById("loginStatus");
const form = document.getElementById("submissionForm");
const totalScoreEl = document.getElementById("totalScore");
const scoreRowsEl = document.getElementById("scoreRows");
const indicatorListEl = document.getElementById("indicatorList");
const dashboardBodyEl = document.getElementById("dashboardBody");
const statsEl = document.getElementById("stats");
const refreshButton = document.getElementById("refreshButton");
const timelineRefreshButton = document.getElementById("timelineRefreshButton");
const timelineSummaryEl = document.getElementById("timelineSummary");
const timelineEmptyEl = document.getElementById("timelineEmpty");
const timelineChartGroupEl = document.getElementById("timelineChartGroup");
const timelineTotalChartEl = document.getElementById("timelineTotalChart");
const timelineIndicatorChartEl = document.getElementById("timelineIndicatorChart");
const timelineIndicatorLegendEl = document.getElementById("timelineIndicatorLegend");
const aiDiagnosisRefreshButton = document.getElementById("aiDiagnosisRefreshButton");
const aiDiagnosisMetaEl = document.getElementById("aiDiagnosisMeta");
const aiDiagnosisEmptyEl = document.getElementById("aiDiagnosisEmpty");
const aiDiagnosisPanelEl = document.getElementById("aiDiagnosisPanel");
const aiDiagnosisHeadlineEl = document.getElementById("aiDiagnosisHeadline");
const aiDiagnosisOverviewEl = document.getElementById("aiDiagnosisOverview");
const aiDiagnosisTimelineListEl = document.getElementById("aiDiagnosisTimelineList");
const aiDiagnosisIndicatorListEl = document.getElementById("aiDiagnosisIndicatorList");
const aiTextbookListEl = document.getElementById("aiTextbookList");
const aiBookListEl = document.getElementById("aiBookList");
const aiActionPlanListEl = document.getElementById("aiActionPlanList");
const studentDetailModalEl = document.getElementById("studentDetailModal");
const studentDetailCloseButton = document.getElementById("studentDetailCloseButton");
const studentDetailTitleEl = document.getElementById("studentDetailTitle");
const studentDetailSubmittedAtEl = document.getElementById("studentDetailSubmittedAt");
const studentDetailMetaEl = document.getElementById("studentDetailMeta");
const studentDetailTotalScoreEl = document.getElementById("studentDetailTotalScore");
const studentDetailSummaryEl = document.getElementById("studentDetailSummary");
const studentIndicatorScoreListEl = document.getElementById("studentIndicatorScoreList");
const studentRadarChartEl = document.getElementById("studentRadarChart");
const studentRadarLegendEl = document.getElementById("studentRadarLegend");
const studentDetailReflectionTextEl = document.getElementById("studentDetailReflectionText");
const teacherStatsEl = document.getElementById("teacherStats");
const teacherDashboardBodyEl = document.getElementById("teacherDashboardBody");
const teacherRefreshButton = document.getElementById("teacherRefreshButton");
const teacherSearchInput = document.getElementById("teacherSearchInput");
const teacherGradeFilter = document.getElementById("teacherGradeFilter");
const teacherClassFilter = document.getElementById("teacherClassFilter");
const teacherFilterResetButton = document.getElementById("teacherFilterResetButton");
const teacherDetailModalEl = document.getElementById("teacherDetailModal");
const teacherDetailCardEl = document.getElementById("teacherDetailCard");
const teacherDetailDragBarEl = document.getElementById("teacherDetailDragBar");
const teacherResizeHandleEl = document.getElementById("teacherResizeHandle");
const teacherDetailCloseButton = document.getElementById("teacherDetailCloseButton");
const teacherDetailTitleEl = document.getElementById("teacherDetailTitle");
const teacherDetailBodyEl = document.getElementById("teacherDetailBody");
const gnbButtons = Array.from(document.querySelectorAll(".gnb-btn"));

const SESSION_STORAGE_KEY = "airead-auth-session";
let currentSession = null;
let teacherGroupedRows = [];
let teacherFilteredRows = [];
let myDashboardRows = [];
const teacherModalState = {
  drag: null,
  resize: null,
  lastBounds: null
};

const indicatorNameMap = {
  comprehension: "내용 이해",
  inference: "추론/해석",
  criticalThinking: "비판/평가",
  expression: "표현/구성",
  vocabGrammar: "어휘/문장 사용"
};

const radarIndicators = [
  { key: "comprehension", scoreKey: "comprehension", feedbackKey: "comprehension", label: "내용이해" },
  { key: "inference", scoreKey: "inference", feedbackKey: "inference", label: "추론" },
  { key: "critical_thinking", scoreKey: "critical_thinking", feedbackKey: "criticalThinking", label: "비판" },
  { key: "expression", scoreKey: "expression", feedbackKey: "expression", label: "표현" },
  { key: "vocab_grammar", scoreKey: "vocab_grammar", feedbackKey: "vocabGrammar", label: "어휘" }
];

const timelineIndicatorConfig = [
  { key: "comprehension", label: "내용이해", color: "#1d8f6a" },
  { key: "inference", label: "추론", color: "#1982c4" },
  { key: "critical_thinking", label: "비판", color: "#6a4c93" },
  { key: "expression", label: "표현", color: "#ff7b00" },
  { key: "vocab_grammar", label: "어휘", color: "#c9184a" }
];

const SVG_NS = "http://www.w3.org/2000/svg";
let aiDiagnosisLoaded = false;

async function fetchJSON(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "요청 중 오류가 발생했어요.");
  }
  return response.json();
}

function goToLogin() {
  window.location.href = "./login.html";
}

function restoreSession() {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    goToLogin();
    return false;
  }

  try {
    currentSession = JSON.parse(raw);
  } catch (error) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    goToLogin();
    return false;
  }

  if (currentSession.role === "student") {
    const student = currentSession.student || {};
    const grade = Number(student.grade);
    if (!student.id || !Number.isInteger(grade) || grade < 1 || grade > 6) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      goToLogin();
      return false;
    }
    return true;
  }

  if (currentSession.role === "teacher") {
    if (!currentSession.teacher?.name) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      goToLogin();
      return false;
    }
    return true;
  }

  localStorage.removeItem(SESSION_STORAGE_KEY);
  goToLogin();
  return false;
}

function applyRoleUI() {
  document.body.classList.remove("role-student", "role-teacher");
  if (currentSession.role === "teacher") {
    document.body.classList.add("role-teacher");
    return;
  }
  document.body.classList.add("role-student");
}

function getCurrentStudent() {
  return currentSession?.student || null;
}

function getCurrentTeacher() {
  return currentSession?.teacher || null;
}

function getActiveRole() {
  return currentSession?.role;
}

function renderLoginStatus() {
  if (getActiveRole() === "teacher") {
    const teacher = getCurrentTeacher();
    loginStatusEl.textContent = `교사 ${teacher.name}`;
    return;
  }

  const currentStudent = getCurrentStudent();
  if (!currentStudent) {
    loginStatusEl.textContent = "";
    return;
  }

  loginStatusEl.textContent = `${currentStudent.school} ${currentStudent.grade}학년 ${currentStudent.className} ${currentStudent.studentNumber}번 ${currentStudent.name}`;
}

function renderTeacherDashboard(data) {
  teacherDashboardBodyEl.innerHTML = "";
  teacherDetailBodyEl.innerHTML = "";
  teacherGroupedRows = [];
  teacherFilteredRows = [];
  closeTeacherDetailModal();

  const studentCount = data.stats.student_count || 0;
  const reflectionCount = data.stats.reflection_count || 0;
  const avgScore = data.stats.avg_score || 0;

  teacherStatsEl.innerHTML = `
    <div class="stat-pill">전체 학생 수: ${studentCount}</div>
    <div class="stat-pill">전체 제출 수: ${reflectionCount}</div>
    <div class="stat-pill">전체 평균 점수: ${avgScore || 0}</div>
  `;

  if (!data.rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5">아직 저장된 전체 평가 히스토리가 없어요.</td>`;
    teacherDashboardBodyEl.appendChild(tr);
    teacherDetailTitleEl.textContent = "학생 상세 히스토리";
    return;
  }

  const groupedMap = new Map();
  data.rows.forEach((row) => {
    const key = String(row.student_id);
    if (!groupedMap.has(key)) {
      groupedMap.set(key, {
        student_id: row.student_id,
        name: row.name,
        school: row.school,
        grade: row.grade,
        class_name: row.class_name,
        student_number: row.student_number,
        items: []
      });
    }
    groupedMap.get(key).items.push(row);
  });

  teacherGroupedRows = Array.from(groupedMap.values()).map((group) => {
    const scoreSum = group.items.reduce((sum, item) => sum + Number(item.total_score || 0), 0);
    const avg = group.items.length ? (scoreSum / group.items.length).toFixed(1) : "0.0";
    return {
      ...group,
      count: group.items.length,
      avgScore: avg,
      latestSubmittedAt: group.items[0]?.submitted_at || null
    };
  });

  teacherGroupedRows.sort((a, b) => {
    if (a.grade !== b.grade) {
      return Number(a.grade) - Number(b.grade);
    }

    const classA = Number(String(a.class_name).replace(/\D/g, "")) || 0;
    const classB = Number(String(b.class_name).replace(/\D/g, "")) || 0;
    if (classA !== classB) {
      return classA - classB;
    }

    return Number(a.student_number) - Number(b.student_number);
  });

  populateTeacherClassFilterOptions();
  applyTeacherFiltersAndRender();
}

function normalizeClassNumber(className) {
  return Number(String(className || "").replace(/\D/g, "")) || 0;
}

function populateTeacherClassFilterOptions() {
  const selectedGrade = teacherGradeFilter.value;
  const classSet = new Set();

  teacherGroupedRows.forEach((row) => {
    if (selectedGrade && String(row.grade) !== selectedGrade) {
      return;
    }
    classSet.add(row.class_name);
  });

  const currentClass = teacherClassFilter.value;
  const sorted = Array.from(classSet).sort((a, b) => normalizeClassNumber(a) - normalizeClassNumber(b));

  teacherClassFilter.innerHTML = '<option value="">전체</option>';
  sorted.forEach((className) => {
    const opt = document.createElement("option");
    opt.value = className;
    opt.textContent = className;
    teacherClassFilter.appendChild(opt);
  });

  if (sorted.includes(currentClass)) {
    teacherClassFilter.value = currentClass;
  }
}

function applyTeacherFiltersAndRender() {
  teacherDashboardBodyEl.innerHTML = "";

  const search = teacherSearchInput.value.trim().toLowerCase();
  const grade = teacherGradeFilter.value;
  const className = teacherClassFilter.value;

  teacherFilteredRows = teacherGroupedRows
    .filter((row) => {
      const matchesName = !search || String(row.name).toLowerCase().includes(search);
      const matchesGrade = !grade || String(row.grade) === grade;
      const matchesClass = !className || row.class_name === className;
      return matchesName && matchesGrade && matchesClass;
    })
    .sort((a, b) => {
      if (a.grade !== b.grade) {
        return Number(a.grade) - Number(b.grade);
      }

      const classA = normalizeClassNumber(a.class_name);
      const classB = normalizeClassNumber(b.class_name);
      if (classA !== classB) {
        return classA - classB;
      }

      return Number(a.student_number) - Number(b.student_number);
    });

  if (!teacherFilteredRows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5">조건에 맞는 학생이 없어요.</td>`;
    teacherDashboardBodyEl.appendChild(tr);
    return;
  }

  teacherFilteredRows.forEach((group) => {
    const tr = document.createElement("tr");
    const when = group.latestSubmittedAt ? new Date(group.latestSubmittedAt).toLocaleString("ko-KR") : "-";

    tr.innerHTML = `
      <td><button type="button" class="student-link" data-student-id="${group.student_id}">${group.name}</button> (${group.student_number}번)</td>
      <td>${group.school} ${group.grade}학년 ${group.class_name}</td>
      <td>${group.count}건</td>
      <td>${group.avgScore}점</td>
      <td>${when}</td>
    `;

    teacherDashboardBodyEl.appendChild(tr);
  });

  teacherDashboardBodyEl.querySelectorAll(".student-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      const studentId = Number(btn.dataset.studentId);
      const selected = teacherGroupedRows.find((row) => row.student_id === studentId);
      if (selected) {
        renderTeacherDetail(selected);
      }
    });
  });
}

function renderTeacherDetail(group) {
  teacherDetailBodyEl.innerHTML = "";

  if (!group) {
    teacherDetailTitleEl.textContent = "학생 상세 히스토리";
    return;
  }

  teacherDetailTitleEl.textContent = `${group.name} (${group.student_number}번) 상세 히스토리`;

  group.items.forEach((item) => {
    const tr = document.createElement("tr");
    const when = new Date(item.submitted_at).toLocaleString("ko-KR");
    tr.innerHTML = `
      <td>${when}</td>
      <td><strong>${item.book_title}</strong><br/>${item.book_author || ""}</td>
      <td>${item.total_score}점</td>
      <td>${item.comprehension}/5</td>
      <td>${item.inference}/5</td>
      <td>${item.critical_thinking}/5</td>
      <td>${item.expression}/5</td>
      <td>${item.vocab_grammar}/5</td>
      <td class="reflection-text">${item.reflection_text || ""}</td>
    `;
    teacherDetailBodyEl.appendChild(tr);
  });

  openTeacherDetailModal();
}

function openTeacherDetailModal() {
  applyTeacherModalBounds();
  teacherDetailModalEl.classList.add("open");
  teacherDetailModalEl.setAttribute("aria-hidden", "false");
}

function closeTeacherDetailModal() {
  teacherDetailModalEl.classList.remove("open");
  teacherDetailModalEl.setAttribute("aria-hidden", "true");
}

function openStudentDetailModal() {
  studentDetailModalEl.classList.add("open");
  studentDetailModalEl.setAttribute("aria-hidden", "false");
}

function closeStudentDetailModal() {
  studentDetailModalEl.classList.remove("open");
  studentDetailModalEl.setAttribute("aria-hidden", "true");
}

function toRadarPoints(values, cx, cy, radius) {
  return values
    .map((value, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length;
      const scaled = (Number(value) / 5) * radius;
      const x = cx + Math.cos(angle) * scaled;
      const y = cy + Math.sin(angle) * scaled;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => {
    el.setAttribute(key, String(value));
  });
  return el;
}

function formatTimelineDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}.${day}`;
}

function normalizeTotalScoreTo100(score) {
  const numeric = Number(score || 0);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  // Support both legacy 25-point totals and already-normalized 100-point totals.
  if (numeric <= 25) {
    return (numeric / 25) * 100;
  }

  return numeric;
}

function getTimelineChartGeometry(totalPoints, width, height) {
  const left = 58;
  const right = 20;
  const top = 18;
  const bottom = 40;
  const usableWidth = width - left - right;
  const usableHeight = height - top - bottom;
  const step = totalPoints > 1 ? usableWidth / (totalPoints - 1) : 0;

  const xForIndex = (index) => {
    if (totalPoints === 1) {
      return left + usableWidth / 2;
    }
    return left + index * step;
  };

  const yForValue = (value, maxValue) => {
    const ratio = maxValue > 0 ? Number(value) / maxValue : 0;
    return top + usableHeight - ratio * usableHeight;
  };

  return {
    left,
    right,
    top,
    bottom,
    usableWidth,
    usableHeight,
    xForIndex,
    yForValue
  };
}

function drawTimelineAxes(svg, geometry, maxValue, tickCount, rows) {
  const { left, top, usableHeight, xForIndex, yForValue } = geometry;
  const chartBottom = top + usableHeight;

  for (let tick = 0; tick <= tickCount; tick += 1) {
    const value = (maxValue / tickCount) * tick;
    const y = yForValue(value, maxValue);

    const grid = createSvgElement("line", {
      x1: left,
      y1: y.toFixed(2),
      x2: (left + geometry.usableWidth).toFixed(2),
      y2: y.toFixed(2),
      stroke: "#deebf8",
      "stroke-width": 1
    });
    svg.appendChild(grid);

    const label = createSvgElement("text", {
      x: left - 10,
      y: (y + 4).toFixed(2),
      "text-anchor": "end",
      "font-size": 12,
      "font-weight": 700,
      fill: "#43607e"
    });
    label.textContent = value.toFixed(value % 1 === 0 ? 0 : 1);
    svg.appendChild(label);
  }

  const axisX = createSvgElement("line", {
    x1: left,
    y1: chartBottom,
    x2: left + geometry.usableWidth,
    y2: chartBottom,
    stroke: "#7f9bbb",
    "stroke-width": 1.5
  });
  svg.appendChild(axisX);

  if (!rows.length) {
    return;
  }

  const maxLabels = 7;
  const skip = Math.max(1, Math.ceil(rows.length / maxLabels));

  rows.forEach((row, idx) => {
    if (idx % skip !== 0 && idx !== rows.length - 1) {
      return;
    }

    const x = xForIndex(idx);
    const tick = createSvgElement("line", {
      x1: x.toFixed(2),
      y1: chartBottom,
      x2: x.toFixed(2),
      y2: chartBottom + 6,
      stroke: "#7f9bbb",
      "stroke-width": 1.3
    });
    svg.appendChild(tick);

    const label = createSvgElement("text", {
      x: x.toFixed(2),
      y: chartBottom + 20,
      "text-anchor": "middle",
      "font-size": 11,
      "font-weight": 700,
      fill: "#466382"
    });
    label.textContent = formatTimelineDateLabel(row.submitted_at);
    svg.appendChild(label);
  });
}

function drawTimelineSeries(svg, geometry, rows, options) {
  const { xForIndex, yForValue } = geometry;
  const maxValue = options.maxValue;

  if (!rows.length) {
    return;
  }

  const points = rows.map((row, idx) => {
    const rawValue = Number(options.valueGetter(row) || 0);
    const value = Math.max(0, Math.min(maxValue, rawValue));
    return {
      row,
      rawValue,
      value,
      x: xForIndex(idx),
      y: yForValue(value, maxValue)
    };
  });

  const pathData = points
    .map((point, idx) => `${idx === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(" ");

  if (options.fillColor) {
    const baseY = yForValue(0, maxValue);
    const areaPath = `${pathData} L${points[points.length - 1].x.toFixed(2)},${baseY.toFixed(2)} L${points[0].x.toFixed(2)},${baseY.toFixed(2)} Z`;
    const area = createSvgElement("path", {
      d: areaPath,
      fill: options.fillColor,
      stroke: "none"
    });
    svg.appendChild(area);
  }

  const line = createSvgElement("path", {
    d: pathData,
    fill: "none",
    stroke: options.color,
    "stroke-width": options.strokeWidth || 2.4,
    "stroke-linejoin": "round",
    "stroke-linecap": "round"
  });
  svg.appendChild(line);

  points.forEach((point) => {
    const dot = createSvgElement("circle", {
      cx: point.x.toFixed(2),
      cy: point.y.toFixed(2),
      r: options.dotRadius || 3.8,
      fill: "#ffffff",
      stroke: options.color,
      "stroke-width": 2
    });

    const title = createSvgElement("title");
    title.textContent = `${new Date(point.row.submitted_at).toLocaleString("ko-KR")} · ${point.row.book_title || "책 제목 없음"} · ${options.tooltipLabel}: ${point.rawValue.toFixed(1)}`;
    dot.appendChild(title);
    svg.appendChild(dot);

    if (options.showPointLabels) {
      const pointLabel = createSvgElement("text", {
        x: point.x.toFixed(2),
        y: (point.y - 10).toFixed(2),
        "text-anchor": "middle",
        "font-size": 11,
        "font-weight": 700,
        fill: options.color
      });
      const formatter = options.pointLabelFormatter || ((v) => v.toFixed(0));
      pointLabel.textContent = formatter(point.rawValue);
      svg.appendChild(pointLabel);
    }
  });
}

function renderTimelineLegend() {
  timelineIndicatorLegendEl.innerHTML = "";

  timelineIndicatorConfig.forEach((item) => {
    const legendItem = document.createElement("span");
    legendItem.className = "timeline-legend-item";
    legendItem.innerHTML = `<span class="timeline-legend-dot" style="background:${item.color}"></span>${item.label}`;
    timelineIndicatorLegendEl.appendChild(legendItem);
  });
}

function renderSimpleList(listEl, items) {
  listEl.innerHTML = "";
  if (!items || !items.length) {
    const li = document.createElement("li");
    li.textContent = "추천/진단 데이터가 아직 충분하지 않습니다.";
    listEl.appendChild(li);
    return;
  }

  items.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    listEl.appendChild(li);
  });
}

function renderRecommendationList(listEl, items, type) {
  listEl.innerHTML = "";
  if (!items || !items.length) {
    const li = document.createElement("li");
    li.textContent = "추천 데이터가 아직 충분하지 않습니다.";
    listEl.appendChild(li);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    if (type === "book") {
      li.innerHTML = `<strong>${item.title}</strong> · ${item.author || "저자 미상"}<br/><span>${item.reason || ""}${item.level ? ` (${item.level})` : ""}</span>`;
    } else {
      li.innerHTML = `<strong>${item.title}</strong><br/><span>${item.reason || ""}</span>`;
    }
    listEl.appendChild(li);
  });
}

function renderAiDiagnosis(result) {
  const meta = result.meta || {};
  const diagnosis = result.diagnosis || {};
  const recommendations = result.recommendations || {};

  aiDiagnosisMetaEl.textContent = `${meta.school || "-"} ${meta.grade || "-"}학년 ${meta.className || "-"} · 분석 기록 ${meta.attemptCount || 0}건`;

  const hasData = Number(meta.attemptCount || 0) > 0;
  aiDiagnosisEmptyEl.hidden = hasData;
  aiDiagnosisPanelEl.hidden = !hasData;

  aiDiagnosisHeadlineEl.textContent = diagnosis.headline || "AI 진단 결과";
  aiDiagnosisOverviewEl.textContent = diagnosis.overview || "";

  renderSimpleList(aiDiagnosisTimelineListEl, diagnosis.timelineInsights || []);
  renderSimpleList(aiDiagnosisIndicatorListEl, diagnosis.indicatorInsights || []);
  renderSimpleList(aiActionPlanListEl, diagnosis.actionPlan || []);
  renderRecommendationList(aiTextbookListEl, recommendations.textbooks || [], "textbook");
  renderRecommendationList(aiBookListEl, recommendations.books || [], "book");
}

async function loadAiDiagnosis(forceRefresh = false) {
  if (getActiveRole() !== "student") {
    return;
  }

  if (aiDiagnosisLoaded && !forceRefresh) {
    return;
  }

  const currentStudent = getCurrentStudent();
  const result = await fetchJSON(`/api/my-ai-diagnosis?studentId=${currentStudent.id}`);
  renderAiDiagnosis(result);
  aiDiagnosisLoaded = true;
}

function renderTimelineCharts(rows) {
  const sortedRows = [...rows].sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
  const count = sortedRows.length;

  timelineTotalChartEl.innerHTML = "";
  timelineIndicatorChartEl.innerHTML = "";
  timelineIndicatorLegendEl.innerHTML = "";

  if (!count) {
    timelineSummaryEl.textContent = "내 평가 기록이 아직 없어요.";
    timelineEmptyEl.hidden = false;
    timelineChartGroupEl.hidden = true;
    return;
  }

  timelineEmptyEl.hidden = true;
  timelineChartGroupEl.hidden = false;

  const latest = sortedRows[count - 1];
  const latestScore = normalizeTotalScoreTo100(latest.total_score);
  const highest = sortedRows.reduce((max, row) => Math.max(max, normalizeTotalScoreTo100(row.total_score)), 0);
  timelineSummaryEl.textContent = `총 ${count}건의 평가 기록이 있습니다. 최근 총점 ${latestScore.toFixed(1)}점, 최고 총점 ${highest.toFixed(1)}점입니다.`;

  const totalWidth = 920;
  const totalHeight = 280;
  const totalGeometry = getTimelineChartGeometry(count, totalWidth, totalHeight);
  drawTimelineAxes(timelineTotalChartEl, totalGeometry, 100, 5, sortedRows);
  drawTimelineSeries(timelineTotalChartEl, totalGeometry, sortedRows, {
    maxValue: 100,
    valueGetter: (row) => normalizeTotalScoreTo100(row.total_score),
    color: "#ff6b35",
    fillColor: "rgba(255, 160, 90, 0.2)",
    strokeWidth: 3,
    dotRadius: 4.2,
    tooltipLabel: "총점",
    showPointLabels: true,
    pointLabelFormatter: (value) => `${value.toFixed(0)}점`
  });

  const indicatorWidth = 920;
  const indicatorHeight = 320;
  const indicatorGeometry = getTimelineChartGeometry(count, indicatorWidth, indicatorHeight);
  drawTimelineAxes(timelineIndicatorChartEl, indicatorGeometry, 5, 5, sortedRows);

  timelineIndicatorConfig.forEach((indicator) => {
    drawTimelineSeries(timelineIndicatorChartEl, indicatorGeometry, sortedRows, {
      maxValue: 5,
      valueGetter: (row) => row[indicator.key],
      color: indicator.color,
      strokeWidth: 2.2,
      dotRadius: 3.5,
      tooltipLabel: indicator.label
    });
  });

  renderTimelineLegend();
}

function renderStudentRadarChart(selfScores, peerScores, peerCount) {
  const svg = studentRadarChartEl;
  const cx = 170;
  const cy = 145;
  const radius = 100;

  svg.innerHTML = "";

  for (let level = 1; level <= 5; level += 1) {
    const ringValues = radarIndicators.map(() => level);
    const ring = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    ring.setAttribute("points", toRadarPoints(ringValues, cx, cy, radius));
    ring.setAttribute("fill", level % 2 ? "#f8fbff" : "#eef5ff");
    ring.setAttribute("stroke", "#d4dfef");
    ring.setAttribute("stroke-width", "1");
    svg.appendChild(ring);
  }

  radarIndicators.forEach((indicator, idx) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * idx) / radarIndicators.length;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    const lx = cx + Math.cos(angle) * (radius + 22);
    const ly = cy + Math.sin(angle) * (radius + 22);

    const axis = document.createElementNS("http://www.w3.org/2000/svg", "line");
    axis.setAttribute("x1", String(cx));
    axis.setAttribute("y1", String(cy));
    axis.setAttribute("x2", x.toFixed(2));
    axis.setAttribute("y2", y.toFixed(2));
    axis.setAttribute("stroke", "#c3d2e7");
    axis.setAttribute("stroke-width", "1");
    svg.appendChild(axis);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", lx.toFixed(2));
    label.setAttribute("y", ly.toFixed(2));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-size", "12");
    label.setAttribute("font-weight", "700");
    label.setAttribute("fill", "#385270");
    label.textContent = indicator.label;
    svg.appendChild(label);
  });

  const peerPolygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  peerPolygon.setAttribute("points", toRadarPoints(peerScores, cx, cy, radius));
  peerPolygon.setAttribute("fill", "rgba(47, 128, 237, 0.24)");
  peerPolygon.setAttribute("stroke", "#2f80ed");
  peerPolygon.setAttribute("stroke-width", "2");
  svg.appendChild(peerPolygon);

  const selfPolygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  selfPolygon.setAttribute("points", toRadarPoints(selfScores, cx, cy, radius));
  selfPolygon.setAttribute("fill", "rgba(255, 122, 69, 0.28)");
  selfPolygon.setAttribute("stroke", "#ff7a45");
  selfPolygon.setAttribute("stroke-width", "2.2");
  svg.appendChild(selfPolygon);

  studentRadarLegendEl.innerHTML = `
    <span class="legend-item"><span class="legend-dot" style="background:#ff7a45"></span>내 점수</span>
    <span class="legend-item"><span class="legend-dot" style="background:#2f80ed"></span>동일 도서 타학생 평균 (${peerCount}명)</span>
  `;
}

function pickSummaryText(detail) {
  const feedback = detail.feedback || {};
  const parts = radarIndicators
    .map((indicator) => feedback[indicator.feedbackKey])
    .filter((value) => typeof value === "string" && value.trim().length > 0);

  if (!parts.length) {
    return "저장된 평가 요약이 없습니다.";
  }

  return parts.slice(0, 2).join(" ");
}

function renderStudentDetail(detail) {
  const submittedAt = new Date(detail.submitted_at).toLocaleString("ko-KR");
  studentDetailTitleEl.textContent = `${detail.book_title} 독서 기록`;
  studentDetailSubmittedAtEl.textContent = submittedAt;
  studentDetailMetaEl.textContent = `${detail.book_author || "저자 미입력"} · ${detail.school} ${detail.grade}학년 ${detail.class_name}`;
  studentDetailTotalScoreEl.textContent = detail.total_score;
  studentDetailSummaryEl.textContent = pickSummaryText(detail);
  studentDetailReflectionTextEl.textContent = detail.reflection_text || "";

  const selfScores = radarIndicators.map((indicator) => Number(detail[indicator.scoreKey] || 0));
  const peerScores = radarIndicators.map((indicator) => Number(detail.peer_average?.[indicator.key] || 0));
  const peerCount = Number(detail.peer_average?.peer_count || 0);

  studentIndicatorScoreListEl.innerHTML = "";
  radarIndicators.forEach((indicator, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${indicator.label}</span>
      <strong>${selfScores[idx].toFixed(1)}/5 · 평균 ${peerScores[idx].toFixed(1)}/5</strong>
    `;
    studentIndicatorScoreListEl.appendChild(li);
  });

  renderStudentRadarChart(selfScores, peerScores, peerCount);
}

async function openStudentDetailModalByReflection(reflectionId) {
  const currentStudent = getCurrentStudent();
  const detailResult = await fetchJSON(
    `/api/my-reflection-detail?studentId=${currentStudent.id}&reflectionId=${reflectionId}`
  );

  renderStudentDetail(detailResult.detail);
  openStudentDetailModal();
}

function getTeacherModalMinSize() {
  const minWidth = window.matchMedia("(max-width: 760px)").matches ? 320 : 620;
  const minHeight = window.matchMedia("(max-width: 760px)").matches ? 260 : 320;
  return { minWidth, minHeight };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function setTeacherModalBounds(bounds) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const { minWidth, minHeight } = getTeacherModalMinSize();

  const widthMax = Math.max(minWidth, viewportWidth - 24);
  const heightMax = Math.max(minHeight, viewportHeight - 24);
  const width = clamp(bounds.width, minWidth, widthMax);
  const height = clamp(bounds.height, minHeight, heightMax);

  const leftMax = Math.max(12, viewportWidth - width - 12);
  const topMax = Math.max(12, viewportHeight - height - 12);
  const left = clamp(bounds.left, 12, leftMax);
  const top = clamp(bounds.top, 12, topMax);

  teacherDetailCardEl.style.width = `${width}px`;
  teacherDetailCardEl.style.height = `${height}px`;
  teacherDetailCardEl.style.left = `${left}px`;
  teacherDetailCardEl.style.top = `${top}px`;

  teacherModalState.lastBounds = { left, top, width, height };
}

function applyTeacherModalBounds() {
  if (teacherModalState.lastBounds) {
    setTeacherModalBounds(teacherModalState.lastBounds);
    return;
  }

  const defaultWidth = Math.min(1100, window.innerWidth - 24);
  const defaultHeight = Math.min(640, window.innerHeight - 24);
  const left = Math.max(12, Math.round((window.innerWidth - defaultWidth) / 2));
  const top = Math.max(12, Math.round((window.innerHeight - defaultHeight) / 2));
  setTeacherModalBounds({ left, top, width: defaultWidth, height: defaultHeight });
}

function handleTeacherModalPointerMove(event) {
  if (teacherModalState.drag) {
    const nextLeft = event.clientX - teacherModalState.drag.offsetX;
    const nextTop = event.clientY - teacherModalState.drag.offsetY;
    setTeacherModalBounds({
      ...teacherModalState.lastBounds,
      left: nextLeft,
      top: nextTop
    });
    return;
  }

  if (teacherModalState.resize) {
    const nextWidth = event.clientX - teacherModalState.resize.startLeft;
    const nextHeight = event.clientY - teacherModalState.resize.startTop;
    setTeacherModalBounds({
      ...teacherModalState.lastBounds,
      width: nextWidth,
      height: nextHeight
    });
  }
}

function stopTeacherModalInteractions() {
  if (!teacherModalState.drag && !teacherModalState.resize) {
    return;
  }

  teacherModalState.drag = null;
  teacherModalState.resize = null;
  document.body.style.userSelect = "";
}

async function loadAllDashboard() {
  const data = await fetchJSON("/api/dashboard?limit=300");
  renderTeacherDashboard(data);
}

logoutButton.addEventListener("click", () => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  goToLogin();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (getActiveRole() !== "student") {
    alert("학생 계정에서만 문해력 평가를 저장할 수 있어요.");
    return;
  }

  const currentStudent = getCurrentStudent();
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
timelineRefreshButton.addEventListener("click", loadMyDashboard);
aiDiagnosisRefreshButton.addEventListener("click", async () => {
  try {
    await loadAiDiagnosis(true);
  } catch (error) {
    alert(error.message);
  }
});
teacherRefreshButton.addEventListener("click", loadAllDashboard);
teacherSearchInput.addEventListener("input", applyTeacherFiltersAndRender);
teacherGradeFilter.addEventListener("change", () => {
  populateTeacherClassFilterOptions();
  applyTeacherFiltersAndRender();
});
teacherClassFilter.addEventListener("change", applyTeacherFiltersAndRender);
teacherFilterResetButton.addEventListener("click", () => {
  teacherSearchInput.value = "";
  teacherGradeFilter.value = "";
  populateTeacherClassFilterOptions();
  teacherClassFilter.value = "";
  applyTeacherFiltersAndRender();
});
studentDetailCloseButton.addEventListener("click", closeStudentDetailModal);
studentDetailModalEl.addEventListener("click", (event) => {
  if (event.target === studentDetailModalEl) {
    closeStudentDetailModal();
  }
});
teacherDetailCloseButton.addEventListener("click", closeTeacherDetailModal);
teacherDetailModalEl.addEventListener("click", (event) => {
  if (event.target === teacherDetailModalEl) {
    closeTeacherDetailModal();
  }
});
teacherDetailDragBarEl.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) {
    return;
  }

  if (event.target.closest("button")) {
    return;
  }

  const rect = teacherDetailCardEl.getBoundingClientRect();
  teacherModalState.drag = {
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top
  };
  teacherDetailDragBarEl.setPointerCapture(event.pointerId);
  document.body.style.userSelect = "none";
});
teacherDetailDragBarEl.addEventListener("pointermove", handleTeacherModalPointerMove);
teacherDetailDragBarEl.addEventListener("pointerup", stopTeacherModalInteractions);
teacherDetailDragBarEl.addEventListener("pointercancel", stopTeacherModalInteractions);

teacherResizeHandleEl.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) {
    return;
  }

  const rect = teacherDetailCardEl.getBoundingClientRect();
  teacherModalState.resize = {
    startLeft: rect.left,
    startTop: rect.top
  };
  teacherResizeHandleEl.setPointerCapture(event.pointerId);
  document.body.style.userSelect = "none";
});
teacherResizeHandleEl.addEventListener("pointermove", handleTeacherModalPointerMove);
teacherResizeHandleEl.addEventListener("pointerup", stopTeacherModalInteractions);
teacherResizeHandleEl.addEventListener("pointercancel", stopTeacherModalInteractions);

window.addEventListener("resize", () => {
  if (teacherModalState.lastBounds) {
    setTeacherModalBounds(teacherModalState.lastBounds);
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeStudentDetailModal();
    closeTeacherDetailModal();
  }
});

gnbButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    activateView(button.dataset.view);
    if (button.dataset.view === "ai-diagnosis") {
      try {
        await loadAiDiagnosis();
      } catch (error) {
        alert(error.message);
      }
    }
  });
});

(async function init() {
  if (!restoreSession()) {
    return;
  }

  applyRoleUI();

  try {
    renderLoginStatus();

    if (getActiveRole() === "teacher") {
      await loadAllDashboard();
      activateView("teacher-dashboard");
      return;
    }

    await Promise.all([loadIndicators(), loadMyDashboard()]);
    activateView("dashboard");
  } catch (error) {
    alert(`초기 로딩 오류: ${error.message}`);
  }
})();
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
  myDashboardRows = data.rows || [];
  renderTimelineCharts(myDashboardRows);

  const reflectionCount = data.stats.reflection_count || 0;
  const avgScore = data.stats.avg_score || 0;

  statsEl.innerHTML = `
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
      <td><button type="button" class="student-book-link" data-reflection-id="${row.reflection_id}">${row.book_title}</button><br/>${row.book_author || ""}</td>
      <td>${row.total_score}점</td>
      <td>${row.feedback?.comprehension || ""}</td>
      <td>${when}</td>
    `;

    dashboardBodyEl.appendChild(tr);
  });

  dashboardBodyEl.querySelectorAll(".student-book-link").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const reflectionId = Number(btn.dataset.reflectionId);
      if (!Number.isInteger(reflectionId) || reflectionId <= 0) {
        return;
      }

      try {
        await openStudentDetailModalByReflection(reflectionId);
      } catch (error) {
        alert(error.message);
      }
    });
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
  const currentStudent = getCurrentStudent();
  const data = await fetchJSON(`/api/my-dashboard?studentId=${currentStudent.id}&limit=100`);
  renderDashboard(data);
}
