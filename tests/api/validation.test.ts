import { describe, it, expect } from 'vitest';
import { isValidDateOnly } from '../../src/api/validation.js';

describe('isValidDateOnly', () => {
  it('accepts a valid calendar date', () => {
    expect(isValidDateOnly('2026-05-10')).toBe(true);
    expect(isValidDateOnly('2024-02-29')).toBe(true); // leap year
  });

  it('rejects a value that is not YYYY-MM-DD', () => {
    expect(isValidDateOnly('abc')).toBe(false);
    expect(isValidDateOnly('2026/05/10')).toBe(false);
    expect(isValidDateOnly('2026-05')).toBe(false);
  });

  it('rejects dates outside the real calendar', () => {
    expect(isValidDateOnly('2026-13-01')).toBe(false);
    expect(isValidDateOnly('2026-02-31')).toBe(false);
    expect(isValidDateOnly('2026-02-29')).toBe(false); // not a leap year
    expect(isValidDateOnly('0000-00-00')).toBe(false);
  });
});