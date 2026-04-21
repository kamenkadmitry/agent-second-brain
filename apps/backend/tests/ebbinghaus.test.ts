import { describe, it, expect } from 'vitest';
import { computeDecayScore, computeTier, daysBetween, planDecay, DEFAULT_DECAY_CONFIG } from '../src/services/ebbinghaus.js';

describe('ebbinghaus', () => {
  it('daysBetween is symmetric and integer', () => {
    const a = new Date('2026-01-10T00:00:00Z');
    const b = new Date('2026-01-15T12:00:00Z');
    expect(daysBetween(a, b)).toBe(5);
    expect(daysBetween(b, a)).toBe(5);
  });

  it('computeDecayScore is 100 at day 0 and decays monotonically', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const d0 = computeDecayScore(now, now);
    const d7 = computeDecayScore(new Date('2025-12-25T00:00:00Z'), now);
    const d30 = computeDecayScore(new Date('2025-12-02T00:00:00Z'), now);
    expect(d0).toBe(100);
    expect(d7).toBeLessThan(d0);
    expect(d30).toBeLessThan(d7);
    expect(d30).toBeGreaterThanOrEqual(DEFAULT_DECAY_CONFIG.floor);
  });

  it('Core tier is pinned and never demoted', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const veryOld = new Date('2020-01-01T00:00:00Z');
    expect(computeTier(veryOld, now, 'Core')).toBe('Core');
  });

  it('planDecay never updates a Core-tier memory, even when very stale', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const veryOld = new Date('2020-01-01T00:00:00Z');
    // A freshly-created Core memory with score 100 and a Core memory whose
    // score somehow drifted to 42 must both be left untouched.
    expect(planDecay({ tier: 'Core', lastAccessed: veryOld, decayScore: 100 }, now)).toBeNull();
    expect(planDecay({ tier: 'Core', lastAccessed: veryOld, decayScore: 42 }, now)).toBeNull();
  });

  it('planDecay emits an update for a stale non-Core memory', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const result = planDecay({ tier: 'Active', lastAccessed: ninetyDaysAgo, decayScore: 100 }, now);
    expect(result).not.toBeNull();
    expect(result!.tier).toBe('Archive');
    expect(result!.decayScore).toBeLessThan(100);
  });

  it('planDecay is a no-op when score and tier are already current', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const today = new Date('2026-01-01T00:00:00Z');
    expect(planDecay({ tier: 'Active', lastAccessed: today, decayScore: 100 }, now)).toBeNull();
  });

  it('Tier boundaries map correctly', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const day = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
    expect(computeTier(day(0), now, 'Active')).toBe('Active');
    expect(computeTier(day(7), now, 'Active')).toBe('Active');
    expect(computeTier(day(8), now, 'Active')).toBe('Warm');
    expect(computeTier(day(21), now, 'Active')).toBe('Warm');
    expect(computeTier(day(22), now, 'Active')).toBe('Cold');
    expect(computeTier(day(60), now, 'Active')).toBe('Cold');
    expect(computeTier(day(61), now, 'Active')).toBe('Archive');
  });
});
