import express from 'express';
import type { Express } from 'express';
import { todosRouter } from './api/routes/todos.js';
import { errorMiddleware } from './api/errorMiddleware.js';
import type { TodoService } from './application/TodoService.js';

export interface AppDeps {
  todoService: TodoService;
}

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

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/todos', todosRouter(todoService));
  app.use(errorMiddleware);

  return app;
}