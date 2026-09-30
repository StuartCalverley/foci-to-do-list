import type { TodoRepository } from '../../src/repository/TodoRepository.js';
import type { Todo } from '../../src/model/todo.js';

export class InMemoryTodoRepository implements TodoRepository {
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