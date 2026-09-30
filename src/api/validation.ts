import { z } from 'zod';
import { ValidationError } from '../domain/errors.js';
import type { CreateTodoInput } from '../model/todo.js';
import type { ListOptions } from '../application/TodoService.js';

const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateOnly(value: string): boolean {
  if (!dateOnlyRegex.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    return false;
  }
  if (!year || !month || !day) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const dueDateSchema = z
  .string()
  .refine(isValidDateOnly, { message: 'must be a valid YYYY-MM-DD date' });

const createTodoSchema = z
  .object({
    title: z.string().refine((value) => value.trim().length > 0, {
      message: 'must be a non-empty string',
    }),
    description: z.string().optional(),
    dueDate: dueDateSchema.optional(),
  })
  .strict();

const updateTodoSchema = z
  .object({
    title: z
      .string()
      .refine((value) => value.trim().length > 0, {
        message: 'must be a non-empty string',
      })
      .optional(),
    description: z.string().optional(),
    dueDate: dueDateSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'at least one field is required',
  });

const listQuerySchema = z.object({
  status: z.enum(['active', 'completed', 'overdue', 'all']).optional(),
  sort: z.enum(['dueDate', 'createdAt', 'title']).optional(),
  direction: z.enum(['asc', 'desc']).optional(),
});

function toValidationError(
  error: z.ZodError,
  detail: string,
): ValidationError {
  return new ValidationError(
    detail,
    error.issues.map((issue) => ({
      field: issue.path.join('.') || 'body',
      message: issue.message,
    })),
  );
}

export function parseCreateBody(body: unknown): CreateTodoInput {
  const result = createTodoSchema.safeParse(body);
  if (!result.success) {
    throw toValidationError(result.error, 'invalid request body');
  }
  return result.data as CreateTodoInput;
}

export function parseUpdateBody(body: unknown): {
  title?: string;
  description?: string;
  dueDate?: string;
} {
  const result = updateTodoSchema.safeParse(body);
  if (!result.success) {
    throw toValidationError(result.error, 'invalid request body');
  }
  return result.data as { title?: string; description?: string; dueDate?: string };
}

export function parseListQuery(query: unknown): ListOptions {
  const result = listQuerySchema.safeParse(query);
  if (!result.success) {
    throw toValidationError(result.error, 'invalid query parameters');
  }
  return result.data as ListOptions;
}

export function parseId(id: string): string {
  const result = z.string().uuid().safeParse(id);
  if (!result.success) {
    throw new ValidationError('invalid todo id', [
      { field: 'id', message: 'must be a valid UUID' },
    ]);
  }
  return result.data;
}