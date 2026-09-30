import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../src/infrastructure/migrations.js';
import { SqliteTodoRepository } from '../../src/repository/SqliteTodoRepository.js';
import { createTodo } from '../../src/model/todo.js';

const NOW = new Date('2026-05-10T00:00:00.000Z');

let db: Database.Database;
let repo: SqliteTodoRepository;

beforeEach(() => {
  db = new Database(':memory:');
  runMigrations(db);
  repo = new SqliteTodoRepository(db);
});

describe('SqliteTodoRepository', () => {
  it('round-trips a todo with all fields via insert/findById', () => {
    const todo = createTodo(
      { title: 'Pay rent', description: 'Direct debit', dueDate: '2026-06-01' },
      NOW,
    );
    repo.insert(todo);

    expect(repo.findById(todo.id)).toEqual(todo);
  });

  it('stores NULL for absent optional fields and reads them back as omitted', () => {
    const todo = createTodo({ title: 'Plain' }, NOW);
    repo.insert(todo);

    const found = repo.findById(todo.id);
    expect(found).toEqual(todo);
    expect(found?.description).toBeUndefined();
    expect(found?.dueDate).toBeUndefined();
  });

  it('returns undefined for a missing id', () => {
    expect(repo.findById('nope')).toBeUndefined();
  });

  it('findAll returns every inserted todo', () => {
    const a = createTodo({ title: 'a' }, NOW);
    const b = createTodo({ title: 'b' }, NOW);
    repo.insert(a);
    repo.insert(b);

    const all = repo.findAll();
    expect(all).toHaveLength(2);
    expect(all.map((t) => t.id).sort()).toEqual([a.id, b.id].sort());
  });

  it('update persists changes and clears fields set to null', () => {
    const todo = createTodo(
      { title: 'Old', description: 'keep', dueDate: '2026-01-01' },
      NOW,
    );
    repo.insert(todo);

    repo.update({
      ...todo,
      title: 'New',
      dueDate: '2026-12-31',
      isCompleted: true,
      description: undefined,
    });

    const found = repo.findById(todo.id);
    expect(found?.title).toBe('New');
    expect(found?.dueDate).toBe('2026-12-31');
    expect(found?.isCompleted).toBe(true);
    expect(found?.description).toBeUndefined();
  });

  it('delete removes the todo', () => {
    const todo = createTodo({ title: 'gone' }, NOW);
    repo.insert(todo);
    repo.delete(todo.id);
    expect(repo.findById(todo.id)).toBeUndefined();
    expect(repo.findAll()).toHaveLength(0);
  });

  it('delete of a missing id is a no-op and does not throw', () => {
    expect(() => repo.delete('missing')).not.toThrow();
  });

  it('persists is_completed as 0/1 in the database', () => {
    const active = createTodo({ title: 'active' }, NOW);
    const done = createTodo({ title: 'done' }, NOW);
    repo.insert(active);
    repo.insert(done);
    repo.update({ ...done, isCompleted: true });

    const rows = db
      .prepare('SELECT title, is_completed FROM todos ORDER BY title')
      .all() as Array<{ title: string; is_completed: number }>;
    expect(rows.find((r) => r.title === 'active')?.is_completed).toBe(0);
    expect(rows.find((r) => r.title === 'done')?.is_completed).toBe(1);
  });
});