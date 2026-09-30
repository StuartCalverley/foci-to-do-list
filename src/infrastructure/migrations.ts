import type { Database } from 'better-sqlite3';

export interface Migration {
  id: number;
  name: string;
  up: (db: Database) => void;
}

export const migrations: readonly Migration[] = [
  {
    id: 1,
    name: 'create_todos',
    up(db) {
      db.exec(`
        CREATE TABLE todos (
          id           TEXT PRIMARY KEY,
          title        TEXT NOT NULL,
          description  TEXT,
          due_date     TEXT,
          is_completed INTEGER NOT NULL DEFAULT 0,
          created_at   TEXT NOT NULL
        );

        CREATE INDEX idx_todos_due_date ON todos (due_date);
        CREATE INDEX idx_todos_created_at ON todos (created_at);
      `);
    },
  },
];

export function runMigrations(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id         INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedIds = new Set(
    (db.prepare('SELECT id FROM migrations').all() as Array<{ id: number }>).map(
      (row) => row.id,
    ),
  );

  const apply = db.transaction(() => {
    for (const migration of migrations) {
      if (appliedIds.has(migration.id)) {
        continue;
      }
      migration.up(db);
      db.prepare(
        'INSERT INTO migrations (id, name, applied_at) VALUES (?, ?, ?)',
      ).run(migration.id, migration.name, new Date().toISOString());
    }
  });

  apply();
}