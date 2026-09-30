import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type Database from 'better-sqlite3';
import { createApp } from '../../src/app.js';
import { openDatabase } from '../../src/infrastructure/db.js';
import { buildContainer } from '../../src/container.js';
import { SqliteTodoRepository } from '../../src/repository/SqliteTodoRepository.js';
import { TodoService } from '../../src/application/TodoService.js';
import { SystemClock } from '../../src/infrastructure/SystemClock.js';
import { InMemoryTodoRepository } from '../support/InMemoryTodoRepository.js';

function makeApp(service: TodoService): ReturnType<typeof createApp> {
  return createApp({ todoService: service });
}

describe('todos API', () => {
  describe('with a real SQLite database', () => {
    let db: Database.Database;
    let app: ReturnType<typeof createApp>;

    beforeEach(() => {
      db = openDatabase(':memory:');
      app = makeApp(buildContainer(db).todoService);
    });

    it('creates, lists, views, updates, completes and deletes', async () => {
      const created = await request(app)
        .post('/todos')
        .send({ title: 'Write README' })
        .expect(201);
      expect(created.body).toMatchObject({
        title: 'Write README',
        isCompleted: false,
      });
      const id = created.body.id as string;

      const listed = await request(app).get('/todos').expect(200);
      expect(listed.body).toHaveLength(1);
      expect(listed.body[0].title).toBe('Write README');

      const viewed = await request(app).get(`/todos/${id}`).expect(200);
      expect(viewed.body.id).toBe(id);

      const updated = await request(app)
        .put(`/todos/${id}`)
        .send({ description: 'explain design choices' })
        .expect(200);
      expect(updated.body.description).toBe('explain design choices');
      expect(updated.body.title).toBe('Write README');

      const completed = await request(app)
        .patch(`/todos/${id}/complete`)
        .expect(200);
      expect(completed.body.isCompleted).toBe(true);

      const incompleted = await request(app)
        .patch(`/todos/${id}/incomplete`)
        .expect(200);
      expect(incompleted.body.isCompleted).toBe(false);

      await request(app).delete(`/todos/${id}`).expect(204);
      const gone = await request(app).get(`/todos/${id}`).expect(404);
      expect(gone.body.status).toBe(404);
    });
  });

  describe('validation', () => {
    let app: ReturnType<typeof createApp>;

    beforeEach(() => {
      const repo = new SqliteTodoRepository(openDatabase(':memory:'));
      app = makeApp(new TodoService(repo, new SystemClock()));
    });

    it('rejects an empty title on create', async () => {
      const res = await request(app).post('/todos').send({ title: '   ' }).expect(400);
      expect(res.body).toMatchObject({ status: 400, type: expect.stringContaining('validation') });
      expect(res.body.errors).toBeDefined();
    });

    it('rejects a malformed dueDate', async () => {
      await request(app)
        .post('/todos')
        .send({ title: 'x', dueDate: '2026-13-01' })
        .expect(400);
    });

    it('rejects an isCompleted field on create', async () => {
      await request(app)
        .post('/todos')
        .send({ title: 'x', isCompleted: true })
        .expect(400);
    });

    it('rejects an empty PUT body', async () => {
      const created = await request(app)
        .post('/todos')
        .send({ title: 'x' })
        .expect(201);
      await request(app).put(`/todos/${created.body.id}`).send({}).expect(400);
    });

    it('rejects isCompleted via PUT', async () => {
      const created = await request(app)
        .post('/todos')
        .send({ title: 'x' })
        .expect(201);
      await request(app)
        .put(`/todos/${created.body.id}`)
        .send({ isCompleted: true })
        .expect(400);
    });

    it('rejects invalid query params', async () => {
      await request(app).get('/todos?status=bogus').expect(400);
    });

    it('rejects a malformed id with 400', async () => {
      await request(app).get('/todos/not-a-uuid').expect(400);
      await request(app).put('/todos/not-a-uuid').send({ title: 'x' }).expect(400);
      await request(app)
        .patch('/todos/not-a-uuid/complete')
        .expect(400);
      await request(app).delete('/todos/not-a-uuid').expect(400);
    });
  });

  describe('using a fake repository', () => {
    let app: ReturnType<typeof createApp>;

    beforeEach(() => {
      app = makeApp(new TodoService(new InMemoryTodoRepository(), new SystemClock()));
    });

    it('filters and sorts via the list endpoint', async () => {
      await request(app).post('/todos').send({ title: 'beta' }).expect(201);
      await request(app).post('/todos').send({ title: 'alpha' }).expect(201);
      await request(app).post('/todos').send({ title: 'done' }).expect(201);
      const done = await request(app).get('/todos').expect(200);
      const doneId = done.body.find((t: { title: string }) => t.title === 'done')
        .id as string;
      await request(app).patch(`/todos/${doneId}/complete`).expect(200);

      const completed = await request(app)
        .get('/todos?status=completed')
        .expect(200);
      expect(completed.body).toHaveLength(1);
      expect(completed.body[0].title).toBe('done');

      const sorted = await request(app).get('/todos?sort=title').expect(200);
      expect(sorted.body.map((t: { title: string }) => t.title)).toEqual([
        'alpha',
        'beta',
        'done',
      ]);
    });
  });
});