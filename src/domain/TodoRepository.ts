import type { Todo } from './todo.js';

export interface TodoRepository {
  findById(id: string): Todo | undefined;
  findAll(): Todo[];
  insert(todo: Todo): void;
  update(todo: Todo): void;
  delete(id: string): void;
}