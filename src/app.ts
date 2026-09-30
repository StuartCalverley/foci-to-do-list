import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Express } from 'express';
import { todosRouter } from './api/routes/todos.js';
import { errorMiddleware } from './api/errorMiddleware.js';
import type { TodoService } from './application/TodoService.js';

export interface AppDeps {
  todoService: TodoService;
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Builds the Express application.
 *
 * Kept separate from the listener in `index.ts` so tests can mount the app
 * with supertest without binding a port. Takes only the dependencies routes
 * need, so tests can inject a service backed by a fake repository.
 */
export function createApp({ todoService }: AppDeps): Express {
  const app = express();

  app.use(express.json());

  // Static client. `../public` resolves correctly whether running from src/
  // (tsx) or dist/ (compiled), since both mirror the repo layout.
  app.use(express.static(path.resolve(currentDir, '../public')));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/todos', todosRouter(todoService));
  app.use(errorMiddleware);

  return app;
}