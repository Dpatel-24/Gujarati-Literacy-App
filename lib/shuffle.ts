/**
 * Fisher-Yates shuffle. Returns a new array -- does not mutate the
 * input. Not Array.prototype.sort with a random comparator, which is
 * neither guaranteed uniform nor guaranteed stable across engines.
 */
export function shuffle<T>(arr: readonly T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
