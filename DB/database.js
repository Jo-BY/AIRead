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
      class_name TEXT NOT NULL,
      student_number INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_student_accounts_unique
    ON student_accounts(name, school, class_name, student_number);

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
}

function findStudentByIdentity(identity) {
  return db
    .prepare(
      `
      SELECT id, name, school, class_name, student_number
      FROM student_accounts
      WHERE name = ? AND school = ? AND class_name = ? AND student_number = ?
    `
    )
    .get(identity.name, identity.school, identity.className, identity.studentNumber);
}

function createOrGetStudentAccount(identity) {
  const existing = findStudentByIdentity(identity);
  if (existing) {
    return existing;
  }

  const result = db
    .prepare(
      `
      INSERT INTO student_accounts (name, school, class_name, student_number)
      VALUES (?, ?, ?, ?)
    `
    )
    .run(identity.name, identity.school, identity.className, identity.studentNumber);

  return {
    id: result.lastInsertRowid,
    name: identity.name,
    school: identity.school,
    class_name: identity.className,
    student_number: identity.studentNumber
  };
}

function getStudentById(studentId) {
  return db
    .prepare(
      `
      SELECT id, name, school, class_name, student_number
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
        s.class_name,
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
            (SELECT COUNT(*) FROM student_accounts) AS student_count,
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

module.exports = {
  initDatabase,
  createOrGetStudentAccount,
  getStudentById,
  createSubmission,
  getDashboard
};
