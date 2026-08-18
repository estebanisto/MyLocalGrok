import DatabaseConstructor from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const workspaceDir = path.resolve(process.cwd(), 'workspace');
const uploadsDir = path.join(workspaceDir, 'uploads', 'thumbnails');

if (!fs.existsSync(workspaceDir)) {
  fs.mkdirSync(workspaceDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(workspaceDir, 'database.sqlite');
const db = new DatabaseConstructor(dbPath, { verbose: console.log });

db.pragma('journal_mode = WAL');

const initDB = () => {
  // Creating tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      owner_id TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      thumbnail_url TEXT,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS project_assignments (
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      PRIMARY KEY (project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Migration: Add thumbnail_url if it doesn't exist
  try {
    const tableInfo = db.prepare("PRAGMA table_info(projects)").all() as any[];
    const hasThumbnailUrl = tableInfo.some(col => col.name === 'thumbnail_url');
    if (!hasThumbnailUrl) {
      db.exec("ALTER TABLE projects ADD COLUMN thumbnail_url TEXT;");
      console.log("Migration: Added thumbnail_url column to projects table.");
    }
    const hasDescription = tableInfo.some(col => col.name === 'description');
    if (!hasDescription) {
      db.exec("ALTER TABLE projects ADD COLUMN description TEXT;");
      console.log("Migration: Added description column to projects table.");
    }
  } catch (err) {
    console.error("Migration error:", err);
  }
};

initDB();

export default db;
