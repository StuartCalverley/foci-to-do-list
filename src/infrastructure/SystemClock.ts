import type { Clock } from '../infrastructure/Clock.js';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}