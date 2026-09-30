import type Database from "better-sqlite3";
import { TodoService } from "./application/TodoService.js";
import { SystemClock } from "./infrastructure/SystemClock.js";
import { CachedTodoRepository } from "./repository/CachedTodoRepository.js";
import { SqliteTodoRepository } from "./repository/SqliteTodoRepository.js";

export interface Container {
  todoService: TodoService;
}

export const DEFAULT_CACHE_TTL_MS = 30000;

function parseCacheTtl(value: string | undefined): number {
  if (value === undefined || value.trim() === "") {
    return DEFAULT_CACHE_TTL_MS;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_CACHE_TTL_MS;
}

export function buildContainer(
  db: Database.Database,
  env: NodeJS.ProcessEnv = process.env,
): Container {
  const clock = new SystemClock();
  const cacheTtlMs = parseCacheTtl(env.CACHE_TTL_MS);
  const repository = new CachedTodoRepository(
    new SqliteTodoRepository(db),
    cacheTtlMs,
    clock,
  );
  return {
    todoService: new TodoService(repository, clock),
  };
}
