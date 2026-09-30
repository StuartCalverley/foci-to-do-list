import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { migrations, runMigrations } from '../../src/infrastructure/migrations.js';

function tableInfo(db: Database.Database, name: string): Array<{ name: string }> {
  return db.prepare(`PRAGMA table_info(${name})`).all() as Array<{ name: string }>;
}

describe('runMigrations', () => {
  it('creates the migrations bookkeeping table', () => {
    const db = new Database(':memory:');
    runMigrations(db);
    expect(tableInfo(db, 'migrations').map((c) => c.name)).toEqual([
      'id',
      'name',
      'applied_at',
    ]);
    db.close();
  });

  it('creates the todos table with the expected columns', () => {
    const db = new Database(':memory:');
    runMigrations(db);
    const columns = tableInfo(db, 'todos').map((c) => c.name);
    expect(columns).toEqual([
      'id',
      'title',
      'description',
      'due_date',
      'is_completed',
      'created_at',
    ]);
    db.close();
  });

  it('applies default column values', () => {
    const db = new Database(':memory:');
    runMigrations(db);
    const info = db.prepare('PRAGMA table_info(todos)').all() as Array<{
      name: string;
      dflt_value: string | null;
      notnull: number;
    }>;
    const byName = new Map(info.map((c) => [c.name, c]));
    expect(byName.get('title')?.notnull).toBe(1);
    expect(byName.get('is_completed')?.dflt_value).toBe('0');
    expect(byName.get('is_completed')?.notnull).toBe(1);
    expect(byName.get('created_at')?.notnull).toBe(1);
    db.close();
  });

  it('creates indexes on due_date and created_at', () => {
    const db = new Database(':memory:');
    runMigrations(db);
    const indexes = db.prepare('PRAGMA index_list(todos)').all() as Array<{
      name: string;
    }>;
    const names = indexes
      .map((i) => i.name)
      .filter((n) => !n.startsWith('sqlite_autoindex_'))
      .sort();
    expect(names).toEqual(['idx_todos_created_at', 'idx_todos_due_date']);
    db.close();
  });

  it('is idempotent: running twice is a no-op', () => {
    const db = new Database(':memory:');
    runMigrations(db);
    const before = db
      .prepare('SELECT COUNT(*) AS count FROM migrations')
      .get() as { count: number };
    runMigrations(db);
    const after = db
      .prepare('SELECT COUNT(*) AS count FROM migrations')
      .get() as { count: number };
    expect(before.count).toBe(migrations.length);
    expect(after.count).toBe(before.count);
    db.close();
  });

  it('records each migration with id and name', () => {
    const db = new Database(':memory:');
    runMigrations(db);
    const rows = db
      .prepare('SELECT id, name, applied_at FROM migrations ORDER BY id')
      .all() as Array<{ id: number; name: string; applied_at: string }>;
    expect(rows).toHaveLength(migrations.length);
    rows.forEach((row, i) => {
      expect(row.id).toBe(migrations[i]?.id);
      expect(row.name).toBe(migrations[i]?.name);
      expect(typeof row.applied_at).toBe('string');
    });
    db.close();
  });
});