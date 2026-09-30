import type Database from 'better-sqlite3';
import { TodoService } from './application/TodoService.js';
import { SystemClock } from './infrastructure/SystemClock.js';
import { SqliteTodoRepository } from './repository/SqliteTodoRepository.js';

export interface Container {
  todoService: TodoService;
}

export function buildContainer(db: Database.Database): Container {
  const repository = new SqliteTodoRepository(db);
  return {
    todoService: new TodoService(repository, new SystemClock()),
  };
}