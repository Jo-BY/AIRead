const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "literacy.db");
const db = new Database(dbPath);

function initDatabase() {
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS student_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      school TEXT NOT NULL,
      grade INTEGER NOT NULL,
      class_name TEXT NOT NULL,
      student_number INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS book_reflections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      book_title TEXT NOT NULL,
      book_author TEXT,
      reflection_text TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES student_accounts(id)
    );

    CREATE TABLE IF NOT EXISTS literacy_evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reflection_id INTEGER NOT NULL,
      total_score INTEGER NOT NULL,
      comprehension INTEGER NOT NULL,
      inference INTEGER NOT NULL,
      critical_thinking INTEGER NOT NULL,
      expression INTEGER NOT NULL,
      vocab_grammar INTEGER NOT NULL,
      feedback_json TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(reflection_id) REFERENCES book_reflections(id)
    );
  `);

  const columns = db.prepare("PRAGMA table_info(student_accounts)").all();
  const hasGradeColumn = columns.some((col) => col.name === "grade");
  if (!hasGradeColumn) {
    db.exec("ALTER TABLE student_accounts ADD COLUMN grade INTEGER NOT NULL DEFAULT 1");
  }

  // Merge legacy duplicates so one student key maps to one account consistently.
  const duplicates = db
    .prepare(
      `
      SELECT school, grade, class_name, student_number, GROUP_CONCAT(id) AS ids
      FROM student_accounts
      GROUP BY school, grade, class_name, student_number
      HAVING COUNT(*) > 1
    `
    )
    .all();

  const moveReflections = db.prepare("UPDATE book_reflections SET student_id = ? WHERE student_id = ?");
  const deleteStudent = db.prepare("DELETE FROM student_accounts WHERE id = ?");

  const dedupeTx = db.transaction(() => {
    for (const group of duplicates) {
      const ids = String(group.ids)
        .split(",")
        .map((v) => Number(v))
        .filter((v) => Number.isInteger(v));

      if (ids.length < 2) {
        continue;
      }

      const keepId = Math.min(...ids);
      const removeIds = ids.filter((id) => id !== keepId);
      for (const removeId of removeIds) {
        moveReflections.run(keepId, removeId);
        deleteStudent.run(removeId);
      }
    }
  });
  dedupeTx();

  db.exec(`
    DROP INDEX IF EXISTS idx_student_accounts_unique;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_student_accounts_unique
    ON student_accounts(school, grade, class_name, student_number);
  `);
}

function findStudentByIdentity(identity) {
  return db
    .prepare(
      `
      SELECT id, name, school, grade, class_name, student_number
      FROM student_accounts
      WHERE school = ? AND grade = ? AND class_name = ? AND student_number = ?
    `
    )
    .get(identity.school, identity.grade, identity.className, identity.studentNumber);
}

function createOrGetStudentAccount(identity) {
  const existing = findStudentByIdentity(identity);
  if (existing) {
    return existing;
  }

  const result = db
    .prepare(
      `
      INSERT INTO student_accounts (name, school, grade, class_name, student_number)
      VALUES (?, ?, ?, ?, ?)
    `
    )
    .run(identity.name, identity.school, identity.grade, identity.className, identity.studentNumber);

  return {
    id: result.lastInsertRowid,
    name: identity.name,
    school: identity.school,
    grade: identity.grade,
    class_name: identity.className,
    student_number: identity.studentNumber
  };
}

function getStudentById(studentId) {
  return db
    .prepare(
      `
      SELECT id, name, school, grade, class_name, student_number
      FROM student_accounts
      WHERE id = ?
    `
    )
    .get(studentId);
}

function createSubmission(studentId, reflection, evaluation) {
  const tx = db.transaction(() => {
    const reflectionStmt = db.prepare(`
      INSERT INTO book_reflections (student_id, book_title, book_author, reflection_text)
      VALUES (?, ?, ?, ?)
    `);

    const reflectionResult = reflectionStmt.run(
      studentId,
      reflection.bookTitle,
      reflection.bookAuthor || null,
      reflection.reflectionText
    );

    const evaluationStmt = db.prepare(`
      INSERT INTO literacy_evaluations (
        reflection_id,
        total_score,
        comprehension,
        inference,
        critical_thinking,
        expression,
        vocab_grammar,
        feedback_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    evaluationStmt.run(
      reflectionResult.lastInsertRowid,
      evaluation.totalScore,
      evaluation.scores.comprehension,
      evaluation.scores.inference,
      evaluation.scores.criticalThinking,
      evaluation.scores.expression,
      evaluation.scores.vocabGrammar,
      JSON.stringify(evaluation.feedback)
    );

    return {
      studentId,
      reflectionId: reflectionResult.lastInsertRowid
    };
  });

  return tx();
}

function getDashboard(limit = 100, studentId = null) {
  const whereClause = studentId ? "WHERE r.student_id = ?" : "";
  const rowParams = studentId ? [studentId, limit] : [limit];

  const rows = db
    .prepare(
      `
      SELECT
        s.id AS student_id,
        s.name,
        s.school,
        s.grade,
        s.class_name,
        s.student_number,
        r.id AS reflection_id,
        r.book_title,
        r.book_author,
        r.reflection_text,
        r.created_at AS submitted_at,
        e.total_score,
        e.comprehension,
        e.inference,
        e.critical_thinking,
        e.expression,
        e.vocab_grammar,
        e.feedback_json
      FROM book_reflections r
      JOIN student_accounts s ON r.student_id = s.id
      JOIN literacy_evaluations e ON e.reflection_id = r.id
      ${whereClause}
      ORDER BY r.id DESC
      LIMIT ?
    `
    )
    .all(...rowParams);

  const stats = studentId
    ? db
        .prepare(
          `
          SELECT
            (SELECT COUNT(*) FROM book_reflections WHERE student_id = ?) AS reflection_count,
            (
              SELECT ROUND(AVG(e.total_score), 1)
              FROM literacy_evaluations e
              JOIN book_reflections r ON e.reflection_id = r.id
              WHERE r.student_id = ?
            ) AS avg_score
        `
        )
        .get(studentId, studentId)
    : db
        .prepare(
          `
          SELECT
            (SELECT COUNT(*) FROM student_accounts) AS student_count,
            (SELECT COUNT(*) FROM book_reflections) AS reflection_count,
            (SELECT ROUND(AVG(total_score), 1) FROM literacy_evaluations) AS avg_score
        `
        )
        .get();

  return {
    stats,
    rows: rows.map((row) => ({
      ...row,
      feedback: JSON.parse(row.feedback_json || "{}")
    }))
  };
}

function getStudentReflectionDetail(studentId, reflectionId) {
  const row = db
    .prepare(
      `
      SELECT
        s.id AS student_id,
        s.name,
        s.school,
        s.grade,
        s.class_name,
        s.student_number,
        r.id AS reflection_id,
        r.book_title,
        r.book_author,
        r.reflection_text,
        r.created_at AS submitted_at,
        e.total_score,
        e.comprehension,
        e.inference,
        e.critical_thinking,
        e.expression,
        e.vocab_grammar,
        e.feedback_json
      FROM book_reflections r
      JOIN student_accounts s ON r.student_id = s.id
      JOIN literacy_evaluations e ON e.reflection_id = r.id
      WHERE r.id = ? AND r.student_id = ?
      LIMIT 1
    `
    )
    .get(reflectionId, studentId);

  if (!row) {
    return null;
  }

  const peerAvg = db
    .prepare(
      `
      SELECT
        COUNT(*) AS peer_count,
        ROUND(AVG(e.comprehension), 2) AS comprehension,
        ROUND(AVG(e.inference), 2) AS inference,
        ROUND(AVG(e.critical_thinking), 2) AS critical_thinking,
        ROUND(AVG(e.expression), 2) AS expression,
        ROUND(AVG(e.vocab_grammar), 2) AS vocab_grammar
      FROM book_reflections r
      JOIN literacy_evaluations e ON e.reflection_id = r.id
      WHERE r.book_title = ?
        AND r.student_id != ?
    `
    )
    .get(row.book_title, studentId);

  return {
    ...row,
    feedback: JSON.parse(row.feedback_json || "{}"),
    peer_average: {
      peer_count: Number(peerAvg?.peer_count || 0),
      comprehension: Number(peerAvg?.comprehension || 0),
      inference: Number(peerAvg?.inference || 0),
      critical_thinking: Number(peerAvg?.critical_thinking || 0),
      expression: Number(peerAvg?.expression || 0),
      vocab_grammar: Number(peerAvg?.vocab_grammar || 0)
    }
  };
}

module.exports = {
  initDatabase,
  findStudentByIdentity,
  createOrGetStudentAccount,
  getStudentById,
  createSubmission,
  getDashboard,
  getStudentReflectionDetail
};
