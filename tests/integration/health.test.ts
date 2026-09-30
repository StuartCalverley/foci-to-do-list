import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';
import { buildContainer } from '../../src/container.js';
import { openDatabase } from '../../src/infrastructure/db.js';

describe('GET /health', () => {
  it('reports the service as available', async () => {
    const app = createApp(buildContainer(openDatabase(':memory:')));
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('static client', () => {
  it('serves the index page at /', async () => {
    const app = createApp(buildContainer(openDatabase(':memory:')));
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.type).toBe('text/html');
    expect(response.text).toContain('Todo API');
  });

  it('serves the client bundle', async () => {
    const app = createApp(buildContainer(openDatabase(':memory:')));
    const response = await request(app).get('/app.js');

    expect(response.status).toBe(200);
    expect(response.type).toContain('javascript');
  });
});