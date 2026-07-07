import { describe, it, expect } from 'vitest';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

describe('rateLimit', () => {
  it('allows requests under the limit and blocks past it', () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5, 60_000).allowed).toBe(true);
    }
    const blocked = rateLimit(key, 5, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('tracks keys independently', () => {
    const a = `test-a-${Math.random()}`;
    const b = `test-b-${Math.random()}`;
    rateLimit(a, 1, 60_000);
    expect(rateLimit(a, 1, 60_000).allowed).toBe(false);
    expect(rateLimit(b, 1, 60_000).allowed).toBe(true);
  });

  it('reports remaining budget', () => {
    const key = `test-rem-${Math.random()}`;
    expect(rateLimit(key, 3, 60_000).remaining).toBe(2);
    expect(rateLimit(key, 3, 60_000).remaining).toBe(1);
    expect(rateLimit(key, 3, 60_000).remaining).toBe(0);
  });
});

describe('getClientIp', () => {
  it('takes the first address from x-forwarded-for', () => {
    const req = new Request('http://x', {
      headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' },
    });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('falls back to unknown without headers', () => {
    expect(getClientIp(new Request('http://x'))).toBe('unknown');
  });
});
