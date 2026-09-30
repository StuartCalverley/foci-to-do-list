import { describe, it, expect } from 'vitest';
import { createTodo } from '../../src/domain/todo.js';
import { ValidationError } from '../../src/domain/errors.js';

const now = new Date('2026-01-01T00:00:00.000Z');

describe('createTodo', () => {
  it('creates a todo with defaults when only title is given', () => {
    const todo = createTodo({ title: '  Buy milk  ' }, now);

    expect(todo.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(todo.title).toBe('Buy milk');
    expect(todo.isCompleted).toBe(false);
    expect(todo.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(todo.description).toBeUndefined();
    expect(todo.dueDate).toBeUndefined();
  });

  it('preserves optional description and dueDate when provided', () => {
    const todo = createTodo(
      { title: 'Pay rent', description: 'Direct debit', dueDate: '2026-02-01' },
      now,
    );

    expect(todo.description).toBe('Direct debit');
    expect(todo.dueDate).toBe('2026-02-01');
  });

  it('uses the supplied now for createdAt', () => {
    const later = new Date('2026-03-15T12:30:00.000Z');
    expect(createTodo({ title: 'x' }, later).createdAt).toBe(
      '2026-03-15T12:30:00.000Z',
    );
  });

  it('rejects a title that is empty or whitespace-only', () => {
    expect(() => createTodo({ title: '' }, now)).toThrow(ValidationError);
    expect(() => createTodo({ title: '   ' }, now)).toThrow(ValidationError);
  });

  it('trims surrounding whitespace from the title', () => {
    expect(createTodo({ title: '  hello  ' }, now).title).toBe('hello');
  });

  it('generates a unique id per call', () => {
    const a = createTodo({ title: 'a' }, now);
    const b = createTodo({ title: 'b' }, now);
    expect(a.id).not.toBe(b.id);
  });
});