import { describe, it, expect } from 'vitest';
import { isAlertLive } from '@/types/alerts';

// Minimal Timestamp stand-in: isAlertLive only calls toMillis()
const ts = (millis: number) => ({ toMillis: () => millis } as any);

describe('isAlertLive', () => {
  it('inactive alerts are never live', () => {
    expect(isAlertLive({ active: false, expiresAt: null })).toBe(false);
    expect(isAlertLive({ active: false, expiresAt: ts(Date.now() + 10_000) })).toBe(false);
  });

  it('active alerts without expiry stay live until closed manually', () => {
    expect(isAlertLive({ active: true, expiresAt: null })).toBe(true);
    expect(isAlertLive({ active: true, expiresAt: undefined })).toBe(true);
  });

  it('active alerts expire automatically', () => {
    expect(isAlertLive({ active: true, expiresAt: ts(Date.now() - 1000) })).toBe(false);
    expect(isAlertLive({ active: true, expiresAt: ts(Date.now() + 60_000) })).toBe(true);
  });
});
