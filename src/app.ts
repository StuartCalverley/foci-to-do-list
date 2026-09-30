import express from 'express';
import type { Express } from 'express';

/**
 * Builds the Express application.
 *
 * Kept separate from the listener in `index.ts` so tests can mount the app
 * with supertest without binding a port.
 */
export function createApp(): Express {
  const app = express();

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  return app;
}