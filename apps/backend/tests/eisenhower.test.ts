import { describe, it, expect } from 'vitest';
import { quadrantOf, heuristicClassify } from '../src/services/eisenhower.js';

describe('eisenhower', () => {
  it('maps all four quadrants', () => {
    expect(quadrantOf(true, true)).toBe('DO');
    expect(quadrantOf(false, true)).toBe('SCHEDULE');
    expect(quadrantOf(true, false)).toBe('DELEGATE');
    expect(quadrantOf(false, false)).toBe('ELIMINATE');
  });

  it('heuristic detects urgent and important markers', () => {
    expect(heuristicClassify('срочно ответить клиенту').isUrgent).toBe(true);
    expect(heuristicClassify('plan quarterly goal').isImportant).toBe(true);
    expect(heuristicClassify('casual thought').isUrgent).toBe(false);
    expect(heuristicClassify('casual thought').isImportant).toBe(false);
  });
});
