import { describe, it, expect } from 'vitest';
import { slotDocId, nextWorkingDays, TIME_SLOTS, SERVICE_CONFIG } from '@/types/appointments';

describe('slotDocId', () => {
  it('is deterministic: same slot always maps to the same doc ID', () => {
    expect(slotDocId('taxe', '2026-07-10', '09:30')).toBe('taxe_2026-07-10_0930');
    expect(slotDocId('taxe', '2026-07-10', '09:30')).toBe(slotDocId('taxe', '2026-07-10', '09:30'));
  });

  it('different slots never collide', () => {
    const ids = new Set<string>();
    for (const service of Object.keys(SERVICE_CONFIG)) {
      for (const time of TIME_SLOTS) {
        ids.add(slotDocId(service, '2026-07-10', time));
      }
    }
    expect(ids.size).toBe(Object.keys(SERVICE_CONFIG).length * TIME_SLOTS.length);
  });
});

describe('nextWorkingDays', () => {
  it('returns the requested number of days', () => {
    expect(nextWorkingDays(10)).toHaveLength(10);
  });

  it('never includes weekends', () => {
    for (const iso of nextWorkingDays(20)) {
      const dow = new Date(`${iso}T00:00:00`).getDay();
      expect(dow).not.toBe(0);
      expect(dow).not.toBe(6);
    }
  });

  it('starts strictly after today', () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const iso of nextWorkingDays(5)) {
      expect(iso > today).toBe(true);
    }
  });

  it('returns sorted, unique days in ISO format', () => {
    const days = nextWorkingDays(15);
    const sorted = [...days].sort();
    expect(days).toEqual(sorted);
    expect(new Set(days).size).toBe(days.length);
    days.forEach((d) => expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/));
  });
});
