import type { Clock } from '../../src/domain/Clock.js';

export class FakeClock implements Clock {
  private value: Date;

  constructor(value: Date) {
    this.value = value;
  }

  set(value: Date): void {
    this.value = value;
  }

  now(): Date {
    return this.value;
  }
}