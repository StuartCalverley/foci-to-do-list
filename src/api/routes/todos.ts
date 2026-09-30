import { Router } from 'express';
import type { TodoService } from '../../application/TodoService.js';
import {
  parseCreateBody,
  parseId,
  parseListQuery,
  parseUpdateBody,
} from '../validation.js';

export function todosRouter(service: TodoService): Router {
  const router = Router();

  router.post('/', (req, res) => {
    const input = parseCreateBody(req.body);
    const todo = service.add(input);
    res.status(201).json(todo);
  });

  router.get('/', (req, res) => {
    const options = parseListQuery(req.query);
    res.json(service.list(options));
  });

  router.get('/:id', (req, res) => {
    res.json(service.findById(parseId(req.params.id)));
  });

  router.put('/:id', (req, res) => {
    const input = parseUpdateBody(req.body);
    res.json(service.update(parseId(req.params.id), input));
  });

  router.patch('/:id/complete', (req, res) => {
    res.json(service.complete(parseId(req.params.id)));
  });

  router.patch('/:id/incomplete', (req, res) => {
    res.json(service.incomplete(parseId(req.params.id)));
  });

  router.delete('/:id', (req, res) => {
    service.remove(parseId(req.params.id));
    res.status(204).send();
  });

  return router;
}