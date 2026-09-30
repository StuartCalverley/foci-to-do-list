import type { Clock } from '../infrastructure/Clock.js';
import type { Todo } from '../model/todo.js';
import type { TodoRepository } from './TodoRepository.js';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * In-memory read cache that decorates a {@link TodoRepository}.
 *
 * All mutating operations invalidate the entire cache before delegating, so
 * a single-process app stays correct even with a long TTL. The TTL is the
 * safety net for any external writer and guards against invalidation bugs.
 *
 * A TTL of 0 disables expiry entirely (cache lives until the next mutation).
 */
export class CachedTodoRepository implements TodoRepository {
  private readonly byId = new Map<string, CacheEntry<Todo>>();
  private all: CacheEntry<Todo[]> | undefined;

  constructor(
    private readonly delegate: TodoRepository,
    private readonly ttlMs: number,
    private readonly clock: Clock,
  ) {}

  findById(id: string): Todo | undefined {
    const entry = this.byId.get(id);
    if (entry && !this.isExpired(entry.expiresAt)) {
      return entry.value;
    }
    const value = this.delegate.findById(id);
    if (value !== undefined) {
      this.byId.set(id, { value, expiresAt: this.expiryTime() });
    } else {
      this.byId.delete(id);
    }
    return value;
  }

  findAll(): Todo[] {
    if (this.all && !this.isExpired(this.all.expiresAt)) {
      return [...this.all.value];
    }
    const value = this.delegate.findAll();
    this.all = { value, expiresAt: this.expiryTime() };
    return [...value];
  }

  insert(todo: Todo): void {
    this.invalidate();
    this.delegate.insert(todo);
  }

  update(todo: Todo): void {
    this.invalidate();
    this.delegate.update(todo);
  }

  delete(id: string): void {
    this.invalidate();
    this.delegate.delete(id);
  }

  private invalidate(): void {
    this.byId.clear();
    this.all = undefined;
  }

  private expiryTime(): number {
    if (this.ttlMs === 0) {
      return Number.POSITIVE_INFINITY;
    }
    return this.clock.now().getTime() + this.ttlMs;
  }

  private isExpired(expiresAt: number): boolean {
    return expiresAt !== Number.POSITIVE_INFINITY && this.clock.now().getTime() >= expiresAt;
  }
}