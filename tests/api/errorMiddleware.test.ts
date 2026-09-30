import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorMiddleware } from '../../src/api/errorMiddleware.js';
import {
  DomainError,
  NotFoundError,
  ValidationError,
} from '../../src/application/errors.js';

class GenericDomainError extends DomainError {
  readonly code = 'VALIDATION' as const;
}

function appWithThrowingRoute(thrown: unknown) {
  const app = express();
  app.get('/boom', () => {
    throw thrown;
  });
  app.use(errorMiddleware);
  return app;
}

describe('errorMiddleware', () => {
  it('maps NotFoundError to 404', async () => {
    const res = await request(appWithThrowingRoute(new NotFoundError('gone')))
      .get('/boom')
      .expect(404);
    expect(res.body).toMatchObject({
      type: 'https://todo-api/errors/not-found',
      status: 404,
      detail: 'gone',
    });
  });

  it('maps ValidationError to 400 with a field-level errors array', async () => {
    const err = new ValidationError('bad input', [
      { field: 'title', message: 'must be non-empty' },
    ]);
    const res = await request(appWithThrowingRoute(err)).get('/boom').expect(400);
    expect(res.body.type).toBe('https://todo-api/errors/validation');
    expect(res.body.errors).toEqual([
      { field: 'title', message: 'must be non-empty' },
    ]);
  });

  it('omits the errors array when a ValidationError has no issues', async () => {
    const res = await request(appWithThrowingRoute(new ValidationError('nope')))
      .get('/boom')
      .expect(400);
    expect(res.body).not.toHaveProperty('errors');
  });

  it('maps malformed JSON (SyntaxError with status 400) to 400', async () => {
    const syntax = Object.assign(new SyntaxError('Unexpected token'), {
      status: 400,
    });
    const res = await request(appWithThrowingRoute(syntax))
      .get('/boom')
      .expect(400);
    expect(res.body).toMatchObject({
      type: 'https://todo-api/errors/validation',
      title: 'Malformed JSON',
      status: 400,
    });
  });

  it('maps any other DomainError to 500', async () => {
    const res = await request(
      appWithThrowingRoute(new GenericDomainError('wrapped')),
    )
      .get('/boom')
      .expect(500);
    expect(res.body).toMatchObject({
      type: 'https://todo-api/errors/internal',
      status: 500,
      detail: 'wrapped',
    });
  });

  it('maps an unexpected non-domain error to 500 with a generic message', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const res = await request(appWithThrowingRoute(new Error('boom')))
        .get('/boom')
        .expect(500);
      expect(res.body).toMatchObject({
        type: 'https://todo-api/errors/internal',
        detail: 'an unexpected error occurred',
      });
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});