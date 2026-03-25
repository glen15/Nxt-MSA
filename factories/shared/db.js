// 공장 공통 SQLite DB (3개 공장 + 허브 대시보드 공유)
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.FACTORY_DB_PATH || path.join(__dirname, 'factory.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    factory TEXT NOT NULL,
    purchaseOrderId TEXT NOT NULL,
    partId TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    status TEXT NOT NULL,
    statusType TEXT NOT NULL DEFAULT 'progress',
    progress INTEGER DEFAULT 0,
    detail TEXT,
    startedAt TEXT NOT NULL,
    completedAt TEXT
  )
`);

const upsertStmt = db.prepare(`
  INSERT OR REPLACE INTO jobs
    (id, factory, purchaseOrderId, partId, quantity, status, statusType, progress, detail, startedAt, completedAt)
  VALUES
    (@id, @factory, @purchaseOrderId, @partId, @quantity, @status, @statusType, @progress, @detail, @startedAt, @completedAt)
`);

function upsertJob(job) {
  upsertStmt.run({
    id: job.id,
    factory: job.factory,
    purchaseOrderId: job.purchaseOrderId,
    partId: job.partId,
    quantity: job.quantity,
    status: job.status,
    statusType: job.statusType,
    progress: job.progress ?? 0,
    detail: job.detail || null,
    startedAt: job.startedAt,
    completedAt: job.completedAt || null,
  });
}

function getJobsByFactory(factory) {
  return db.prepare('SELECT * FROM jobs WHERE factory = ? ORDER BY startedAt DESC').all(factory);
}

function getAllJobs() {
  return db.prepare('SELECT * FROM jobs ORDER BY startedAt DESC').all();
}

function getStatsByFactory(factory) {
  const row = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN statusType != 'done' THEN 1 ELSE 0 END) as inProgress,
      SUM(CASE WHEN statusType = 'done' THEN 1 ELSE 0 END) as completed
    FROM jobs WHERE factory = ?
  `).get(factory);
  return { total: row.total, inProgress: row.inProgress, completed: row.completed };
}

function getAllStats() {
  const row = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN statusType != 'done' THEN 1 ELSE 0 END) as inProgress,
      SUM(CASE WHEN statusType = 'done' THEN 1 ELSE 0 END) as completed
    FROM jobs
  `).get();
  return { total: row.total, inProgress: row.inProgress, completed: row.completed };
}

module.exports = { db, upsertJob, getJobsByFactory, getAllJobs, getStatsByFactory, getAllStats };
