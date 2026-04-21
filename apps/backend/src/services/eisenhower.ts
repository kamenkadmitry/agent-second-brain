/**
 * Eisenhower matrix classifier.
 * Pure helpers — easy to unit-test.
 */

export type EisenhowerQuadrant = 'DO' | 'SCHEDULE' | 'DELEGATE' | 'ELIMINATE';

export function quadrantOf(isUrgent: boolean, isImportant: boolean): EisenhowerQuadrant {
  if (isUrgent && isImportant) return 'DO';
  if (!isUrgent && isImportant) return 'SCHEDULE';
  if (isUrgent && !isImportant) return 'DELEGATE';
  return 'ELIMINATE';
}

/** Very conservative heuristic used as a fallback when LLM classifier is disabled. */
export function heuristicClassify(text: string): { isUrgent: boolean; isImportant: boolean } {
  const lowered = text.toLowerCase();
  const urgentMarkers = ['today', 'asap', 'сейчас', 'срочно', 'deadline', 'дедлайн', 'немедленно'];
  const importantMarkers = ['goal', 'цель', 'priority', 'важно', 'must', 'launch', 'client'];
  return {
    isUrgent: urgentMarkers.some((m) => lowered.includes(m)),
    isImportant: importantMarkers.some((m) => lowered.includes(m)),
  };
}
