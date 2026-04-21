/**
 * Ebbinghaus forgetting curve logic.
 *
 * Relevance (0..100):       R(t) = 100 * exp(-k * days_since_last_access)
 * Tier boundaries (days):   Core (pinned), Active <=7, Warm <=21, Cold <=60, Archive >60
 *
 * All helpers are pure — no I/O, trivially unit-testable.
 */

import { MemoryTier } from '@prisma/client';

export interface DecayConfig {
  /** Decay constant. Default 0.015 → ~61% after 30 days, ~41% after 60 days. */
  decayRate: number;
  /** Minimum relevance floor (never goes below). */
  floor: number;
  tierBoundaries: {
    active: number;
    warm: number;
    cold: number;
  };
}

export const DEFAULT_DECAY_CONFIG: DecayConfig = {
  decayRate: 0.015,
  floor: 1.0,
  tierBoundaries: { active: 7, warm: 21, cold: 60 },
};

export function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const diff = Math.abs(a.getTime() - b.getTime());
  return Math.floor(diff / MS_PER_DAY);
}

export function computeDecayScore(
  lastAccessed: Date,
  now: Date,
  config: DecayConfig = DEFAULT_DECAY_CONFIG,
): number {
  const days = daysBetween(now, lastAccessed);
  const raw = 100 * Math.exp(-config.decayRate * days);
  return Math.max(config.floor, Number(raw.toFixed(3)));
}

export function computeTier(
  lastAccessed: Date,
  now: Date,
  currentTier: MemoryTier,
  config: DecayConfig = DEFAULT_DECAY_CONFIG,
): MemoryTier {
  // Core is pinned and does not auto-decay.
  if (currentTier === 'Core') return 'Core';

  const days = daysBetween(now, lastAccessed);
  if (days <= config.tierBoundaries.active) return 'Active';
  if (days <= config.tierBoundaries.warm) return 'Warm';
  if (days <= config.tierBoundaries.cold) return 'Cold';
  return 'Archive';
}
