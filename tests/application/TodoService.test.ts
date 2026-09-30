import { describe, it, expect, beforeEach } from 'vitest';
import type { TodoRepository } from '../../src/domain/TodoRepository.js';
import type { Clock } from '../../src/domain/Clock.js';
import type { Todo } from '../../src/domain/todo.js';
import { TodoService } from '../../src/application/TodoService.js';
import { NotFoundError } from '../../src/domain/errors.js';

class InMemoryTodoRepository implements TodoRepository {
  private items = new Map<string, Todo>();

  findById(id: string): Todo | undefined {
    return this.items.get(id);
  }

  findAll(): Todo[] {
    return [...this.items.values()];
  }

  insert(todo: Todo): void {
    this.items.set(todo.id, todo);
  }

  update(todo: Todo): void {
    this.items.set(todo.id, todo);
  }

  delete(id: string): void {
    this.items.delete(id);
  }
}

class FakeClock implements Clock {
  private value: Date;

  constructor(value: Date) {
    this.value = value;
  }

  set(value: Date): void {
    this.value = value;
  }

  now(): Date {
    return this.value;
  }
}

const TODAY = '2026-05-10T00:00:00.000Z';

describe('TodoService', () => {
  let repo: InMemoryTodoRepository;
  let service: TodoService;
  let clock: FakeClock;

  beforeEach(() => {
    repo = new InMemoryTodoRepository();
    clock = new FakeClock(new Date(TODAY));
    service = new TodoService(repo, clock);
  });

  describe('add', () => {
    it('creates and stores a todo', () => {
      const todo = service.add({ title: 'Write tests' });
      expect(todo.title).toBe('Write tests');
      expect(todo.isCompleted).toBe(false);
      expect(repo.findById(todo.id)).toEqual(todo);
    });

    it('throws ValidationError for an empty title', () => {
      expect(() => service.add({ title: '  ' })).toThrow(/title/);
    });
  });

  describe('findById', () => {
    it('returns an existing todo', () => {
      const created = service.add({ title: 'x' });
      expect(service.findById(created.id)).toEqual(created);
    });

    it('throws NotFoundError for a missing id', () => {
      expect(() => service.findById('nope')).toThrow(NotFoundError);
    });
  });

  describe('list', () => {
    it('returns all todos in creation order by default', () => {
      const a = service.add({ title: 'a' });
      const b = service.add({ title: 'b' });
      expect(service.list().map((t) => t.id)).toEqual([a.id, b.id]);
    });

    it('filters by status', () => {
      const active = service.add({ title: 'active' });
      const done = service.add({ title: 'done' });
      service.complete(done.id);

      expect(service.list({ status: 'active' }).map((t) => t.id)).toEqual([
        active.id,
      ]);
      expect(service.list({ status: 'completed' }).map((t) => t.id)).toEqual([
        done.id,
      ]);
    });

    it('treats overdue as incomplete todos with dueDate strictly before today', () => {
      const past = service.add({ title: 'past', dueDate: '2026-05-09' });
      const today = service.add({ title: 'today', dueDate: '2026-05-10' });
      const future = service.add({ title: 'future', dueDate: '2026-05-11' });
      const donePast = service.add({ title: 'done past', dueDate: '2026-05-01' });
      service.complete(donePast.id);

      expect(service.list({ status: 'overdue' }).map((t) => t.id)).toEqual([
        past.id,
      ]);
      expect(
        service.list({ status: 'overdue' }).map((t) => t.id),
      ).not.toContain(today.id);
      expect(
        service.list({ status: 'overdue' }).map((t) => t.id),
      ).not.toContain(future.id);
      expect(
        service.list({ status: 'overdue' }).map((t) => t.id),
      ).not.toContain(donePast.id);
    });

    it('sorts by createdAt asc and desc', () => {
      const a = service.add({ title: 'a' });
      clock.set(new Date('2026-05-10T00:00:01.000Z'));
      const b = service.add({ title: 'b' });
      expect(service.list({ sort: 'createdAt' }).map((t) => t.id)).toEqual([
        a.id,
        b.id,
      ]);
      expect(
        service.list({ sort: 'createdAt', direction: 'desc' }).map((t) => t.id),
      ).toEqual([b.id, a.id]);
    });

    it('sorts by title', () => {
      service.add({ title: 'zebra' });
      service.add({ title: 'apple' });
      expect(service.list({ sort: 'title' }).map((t) => t.title)).toEqual([
        'apple',
        'zebra',
      ]);
    });

    it('sorts by dueDate with undated items last', () => {
      const undated = service.add({ title: 'undated' });
      const early = service.add({ title: 'early', dueDate: '2026-01-01' });
      const late = service.add({ title: 'late', dueDate: '2026-12-31' });

      expect(service.list({ sort: 'dueDate' }).map((t) => t.id)).toEqual([
        early.id,
        late.id,
        undated.id,
      ]);
      expect(
        service.list({ sort: 'dueDate', direction: 'desc' }).map((t) => t.id),
      ).toEqual([undated.id, late.id, early.id]);
    });
  });

  describe('update', () => {
    it('merges provided fields and leaves others intact', () => {
      const todo = service.add({
        title: 'orig',
        description: 'desc',
        dueDate: '2026-01-01',
      });
      const updated = service.update(todo.id, { title: '  new title  ' });

      expect(updated.title).toBe('new title');
      expect(updated.description).toBe('desc');
      expect(updated.dueDate).toBe('2026-01-01');
      expect(repo.findById(todo.id)?.title).toBe('new title');
    });

    it('updates the due date independently', () => {
      const todo = service.add({ title: 'x' });
      const updated = service.update(todo.id, { dueDate: '2027-02-02' });
      expect(updated.dueDate).toBe('2027-02-02');
    });

    it('throws NotFoundError for a missing id', () => {
      expect(() => service.update('nope', { title: 'x' })).toThrow(
        NotFoundError,
      );
    });
  });

  describe('complete / incomplete', () => {
    it('marks a todo complete then incomplete', () => {
      const todo = service.add({ title: 'x' });
      expect(service.complete(todo.id).isCompleted).toBe(true);
      expect(service.incomplete(todo.id).isCompleted).toBe(false);
    });

    it('is idempotent', () => {
      const todo = service.add({ title: 'x' });
      service.complete(todo.id);
      expect(service.complete(todo.id).isCompleted).toBe(true);
    });

    it('throws NotFoundError for a missing id', () => {
      expect(() => service.complete('nope')).toThrow(NotFoundError);
    });
  });

  describe('remove', () => {
    it('deletes an existing todo', () => {
      const todo = service.add({ title: 'x' });
      service.remove(todo.id);
      expect(repo.findById(todo.id)).toBeUndefined();
    });

    it('throws NotFoundError for a missing id', () => {
      expect(() => service.remove('nope')).toThrow(NotFoundError);
    });
  });
});