import Database from 'better-sqlite3';
import { runMigrations } from './migrations.js';

export function openDatabase(filename: string): Database.Database {
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

export function resolveDbPath(): string {
  return process.env.DB_PATH ?? 'todo.db';
}