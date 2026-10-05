const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'mocu_assets.db');

// Ensure directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA synchronous = NORMAL;');
  }
  return dbInstance;
}

const db = {
  getRawDb() {
    return getDb();
  },

  query(sql, params = []) {
    try {
      const stmt = getDb().prepare(sql);
      const rows = stmt.all(...params);
      return rows.map(row => ({ ...row }));
    } catch (err) {
      console.error('SQL Query Error:', err.message, 'SQL:', sql, 'Params:', params);
      throw err;
    }
  },

  get(sql, params = []) {
    try {
      const stmt = getDb().prepare(sql);
      const row = stmt.get(...params);
      return row ? { ...row } : null;
    } catch (err) {
      console.error('SQL Get Error:', err.message, 'SQL:', sql, 'Params:', params);
      throw err;
    }
  },

  run(sql, params = []) {
    try {
      const stmt = getDb().prepare(sql);
      const result = stmt.run(...params);
      return {
        changes: Number(result.changes || 0),
        lastInsertRowid: Number(result.lastInsertRowid || 0)
      };
    } catch (err) {
      console.error('SQL Run Error:', err.message, 'SQL:', sql, 'Params:', params);
      throw err;
    }
  },

  exec(sql) {
    try {
      return getDb().exec(sql);
    } catch (err) {
      console.error('SQL Exec Error:', err.message);
      throw err;
    }
  },

  transaction(fn) {
    const raw = getDb();
    raw.exec('BEGIN TRANSACTION;');
    try {
      const result = fn(db);
      raw.exec('COMMIT;');
      return result;
    } catch (err) {
      raw.exec('ROLLBACK;');
      throw err;
    }
  }
};

module.exports = db;
