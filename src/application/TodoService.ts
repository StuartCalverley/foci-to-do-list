import type { Clock } from '../infrastructure/Clock.js';
import type { TodoRepository } from '../repository/TodoRepository.js';
import {
  createTodo,
  normalizeTitle,
  type CreateTodoInput,
  type Todo,
} from '../model/todo.js';
import { NotFoundError } from '../application/errors.js';

export type TodoStatus = 'active' | 'completed' | 'overdue' | 'all';
export type TodoSort = 'dueDate' | 'createdAt' | 'title';
export type SortDirection = 'asc' | 'desc';

export interface ListOptions {
  status?: TodoStatus;
  sort?: TodoSort;
  direction?: SortDirection;
}

export interface UpdateTodoInput {
  title?: string;
  description?: string;
  dueDate?: string;
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isOverdue(todo: Todo, now: Date): boolean {
  if (todo.isCompleted || todo.dueDate === undefined) {
    return false;
  }
  return todo.dueDate < toDateOnly(now);
}

function compareTodos(a: Todo, b: Todo, sort: TodoSort): number {
  switch (sort) {
    case 'title':
      return a.title.localeCompare(b.title);
    case 'createdAt':
      return a.createdAt.localeCompare(b.createdAt);
    case 'dueDate':
      // Items without a due date sort to the end.
      return (a.dueDate ?? '\uffff').localeCompare(b.dueDate ?? '\uffff');
  }
}

export class TodoService {
  constructor(
    private readonly repo: TodoRepository,
    private readonly clock: Clock,
  ) {}

  add(input: CreateTodoInput): Todo {
    const todo = createTodo(input, this.clock.now());
    this.repo.insert(todo);
    return todo;
  }

  findById(id: string): Todo {
    const todo = this.repo.findById(id);
    if (todo === undefined) {
      throw new NotFoundError(`todo ${id} not found`);
    }
    return todo;
  }

  list(options: ListOptions = {}): Todo[] {
    const now = this.clock.now();
    const status = options.status ?? 'all';
    const sort = options.sort ?? 'createdAt';
    const direction = options.direction ?? 'asc';

    let todos = this.repo.findAll();

    if (status === 'active') {
      todos = todos.filter((t) => !t.isCompleted);
    } else if (status === 'completed') {
      todos = todos.filter((t) => t.isCompleted);
    } else if (status === 'overdue') {
      todos = todos.filter((t) => isOverdue(t, now));
    }

    const factor = direction === 'desc' ? -1 : 1;
    return todos.sort((a, b) => factor * compareTodos(a, b, sort));
  }

  update(id: string, input: UpdateTodoInput): Todo {
    const todo = this.findById(id);
    const updated: Todo = {
      ...todo,
      ...(input.title !== undefined ? { title: normalizeTitle(input.title) } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
    };
    this.repo.update(updated);
    return updated;
  }

  complete(id: string): Todo {
    const todo = this.findById(id);
    if (todo.isCompleted) {
      return todo;
    }
    const updated = { ...todo, isCompleted: true };
    this.repo.update(updated);
    return updated;
  }

  incomplete(id: string): Todo {
    const todo = this.findById(id);
    if (!todo.isCompleted) {
      return todo;
    }
    const updated = { ...todo, isCompleted: false };
    this.repo.update(updated);
    return updated;
  }

  remove(id: string): void {
    this.findById(id);
    this.repo.delete(id);
  }
}