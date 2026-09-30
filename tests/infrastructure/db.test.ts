import { describe, it, expect, afterAll } from 'vitest';
import { resolveDbPath } from '../../src/infrastructure/db.js';

const ORIGINAL = process.env.DB_PATH;

describe('resolveDbPath', () => {
  it('defaults to todo.db when DB_PATH is unset', () => {
    delete process.env.DB_PATH;
    expect(resolveDbPath()).toBe('todo.db');
  });

  it('returns the DB_PATH env value when set', () => {
    process.env.DB_PATH = '/data/items.db';
    expect(resolveDbPath()).toBe('/data/items.db');
  });

  afterAll(() => {
    if (ORIGINAL === undefined) {
      delete process.env.DB_PATH;
    } else {
      process.env.DB_PATH = ORIGINAL;
    }
  });
});