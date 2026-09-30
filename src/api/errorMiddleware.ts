import type { Request, Response, NextFunction } from 'express';
import {
  DomainError,
  NotFoundError,
  ValidationError,
} from '../domain/errors.js';
import { problemDetails } from './problemDetails.js';

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof NotFoundError) {
    res.status(404).json(
      problemDetails({
        type: 'https://todo-api/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: err.message,
      }),
    );
    return;
  }

  if (err instanceof ValidationError) {
    const body = problemDetails({
      type: 'https://todo-api/errors/validation',
      title: 'Validation Error',
      status: 400,
      detail: err.message,
    });
    if (err.issues.length > 0) {
      body.errors = err.issues;
    }
    res.status(400).json(body);
    return;
  }

  if (
    err instanceof SyntaxError &&
    (err as { status?: unknown }).status === 400
  ) {
    res.status(400).json(
      problemDetails({
        type: 'https://todo-api/errors/validation',
        title: 'Malformed JSON',
        status: 400,
        detail: 'request body contains invalid JSON',
      }),
    );
    return;
  }

  if (err instanceof DomainError) {
    res.status(500).json(
      problemDetails({
        type: 'https://todo-api/errors/internal',
        title: 'Internal Server Error',
        status: 500,
        detail: err.message,
      }),
    );
    return;
  }

  console.error(err);
  res.status(500).json(
    problemDetails({
      type: 'https://todo-api/errors/internal',
      title: 'Internal Server Error',
      status: 500,
      detail: 'an unexpected error occurred',
    }),
  );
}