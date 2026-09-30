import { randomUUID } from "node:crypto";
import { ValidationError } from "../application/errors.js";

export interface Todo {
  id: string;
  title: string;
  description?: string;
  /** YYYY-MM-DD. Format is validated at the API boundary. */
  dueDate?: string;
  isCompleted: boolean;
  /** ISO-8601 timestamp. */
  createdAt: string;
}

export interface CreateTodoInput {
  title: string;
  description?: string;
  dueDate?: string;
}

export function normalizeTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length <= 0) {
    throw new ValidationError("title must be a non-empty string");
  }
  return trimmed;
}

export function createTodo(input: CreateTodoInput, now: Date): Todo {
  const title = normalizeTitle(input.title);

  return {
    id: randomUUID(),
    title,
    ...(input.description !== undefined
      ? { description: input.description }
      : {}),
    ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
    isCompleted: false,
    createdAt: now.toISOString(),
  };
}
