import { describe, it, expect, beforeEach } from 'vitest';
import type { Todo } from '../../src/model/todo.js';
import type { TodoRepository } from '../../src/repository/TodoRepository.js';
import { CachedTodoRepository } from '../../src/repository/CachedTodoRepository.js';
import { InMemoryTodoRepository } from '../support/InMemoryTodoRepository.js';
import { FakeClock } from '../support/FakeClock.js';

class CountingRepository implements TodoRepository {
  constructor(private readonly delegate: TodoRepository) {}

  findByIdCalls = 0;
  findAllCalls = 0;
  insertCalls = 0;
  updateCalls = 0;
  deleteCalls = 0;

  findById(id: string): Todo | undefined {
    this.findByIdCalls += 1;
    return this.delegate.findById(id);
  }

  findAll(): Todo[] {
    this.findAllCalls += 1;
    return this.delegate.findAll();
  }

  insert(todo: Todo): void {
    this.insertCalls += 1;
    this.delegate.insert(todo);
  }

  update(todo: Todo): void {
    this.updateCalls += 1;
    this.delegate.update(todo);
  }

  delete(id: string): void {
    this.deleteCalls += 1;
    this.delegate.delete(id);
  }
}

function makeTodo(title: string, overrides: Partial<Todo> = {}): Todo {
  return {
    id: overrides.id ?? `id-${title}`,
    title,
    isCompleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const BASE = new Date('2026-01-01T00:00:00.000Z');
const TTL = 10_000;

describe('CachedTodoRepository', () => {
  let delegate: InMemoryTodoRepository;
  let counting: CountingRepository;
  let cache: CachedTodoRepository;
  let clock: FakeClock;

  beforeEach(() => {
    delegate = new InMemoryTodoRepository();
    counting = new CountingRepository(delegate);
    clock = new FakeClock(BASE);
    cache = new CachedTodoRepository(counting, TTL, clock);
  });

  it('serves findById from cache without re-delegating within the TTL', () => {
    const todo = makeTodo('a');
    delegate.insert(todo);

    expect(cache.findById('id-a')).toBe(todo);
    expect(cache.findById('id-a')).toBe(todo);
    expect(counting.findByIdCalls).toBe(1);
  });

  it('re-fetches findById once the TTL has elapsed', () => {
    const todo = makeTodo('a');
    delegate.insert(todo);

    expect(cache.findById('id-a')).toBe(todo);
    clock.set(new Date(BASE.getTime() + TTL));
    expect(cache.findById('id-a')).toBe(todo);
    expect(counting.findByIdCalls).toBe(2);
  });

  it('does not cache a miss, so each miss re-delegates', () => {
    expect(cache.findById('missing')).toBeUndefined();
    expect(cache.findById('missing')).toBeUndefined();
    expect(counting.findByIdCalls).toBe(2);
  });

  it('serves findAll from cache without re-delegating within the TTL', () => {
    delegate.insert(makeTodo('a'));
    delegate.insert(makeTodo('b'));

    const first = cache.findAll();
    const second = cache.findAll();
    expect(second).toHaveLength(2);
    expect(counting.findAllCalls).toBe(1);
    expect(first).not.toBe(second);
  });

  it('invalidates the cache on insert so findAll reflects the new todo', () => {
    cache.findAll();
    expect(counting.findAllCalls).toBe(1);

    cache.insert(makeTodo('a'));
    cache.findAll();
    expect(counting.findAllCalls).toBe(2);
    expect(cache.findAll().map((t) => t.title)).toEqual(['a']);
  });

  it('invalidates findById cache on update', () => {
    delegate.insert(makeTodo('a', { title: 'old' }));
    expect(cache.findById('id-a')?.title).toBe('old');

    cache.update(makeTodo('a', { title: 'new' }));
    expect(cache.findById('id-a')?.title).toBe('new');
    expect(counting.findByIdCalls).toBe(2);
  });

  it('invalidates the cache on delete', () => {
    delegate.insert(makeTodo('a'));
    expect(cache.findById('id-a')).toBeDefined();
    cache.findAll();

    cache.delete('id-a');
    expect(cache.findById('id-a')).toBeUndefined();
    expect(cache.findAll()).toHaveLength(0);
  });

  it('never expires when ttlMs is 0', () => {
    const never = new CachedTodoRepository(counting, 0, clock);
    delegate.insert(makeTodo('a'));

    expect(never.findById('id-a')).toBeDefined();
    clock.set(new Date(BASE.getTime() + 1_000_000));
    expect(never.findById('id-a')).toBeDefined();
    expect(counting.findByIdCalls).toBe(1);
  });
});