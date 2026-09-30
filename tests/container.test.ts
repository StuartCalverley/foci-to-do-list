import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CACHE_TTL_MS,
  parseCacheTtl,
} from '../src/container.js';

describe('parseCacheTtl', () => {
  it('uses the default when the value is undefined or blank', () => {
    expect(parseCacheTtl(undefined)).toBe(DEFAULT_CACHE_TTL_MS);
    expect(parseCacheTtl('')).toBe(DEFAULT_CACHE_TTL_MS);
    expect(parseCacheTtl('   ')).toBe(DEFAULT_CACHE_TTL_MS);
  });

  it('returns the parsed value for a valid non-negative number', () => {
    expect(parseCacheTtl('0')).toBe(0);
    expect(parseCacheTtl('15000')).toBe(15000);
  });

  it('falls back to the default for non-numeric or negative input', () => {
    expect(parseCacheTtl('abc')).toBe(DEFAULT_CACHE_TTL_MS);
    expect(parseCacheTtl('-5')).toBe(DEFAULT_CACHE_TTL_MS);
  });
});