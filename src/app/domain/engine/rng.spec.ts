import { createRng, rollDie } from './rng';
import type { DieSides } from '../model/die';

function rollMany(seed: string, cursor: number, count: number, sides: DieSides): number[] {
  const rng = createRng(seed, cursor);
  return Array.from({ length: count }, () => rollDie(sides, rng));
}

describe('createRng', () => {
  it('produces the same sequence for the same seed', () => {
    expect(rollMany('seed-a', 0, 20, 6)).toEqual(rollMany('seed-a', 0, 20, 6));
  });

  it('produces different sequences for different seeds', () => {
    expect(rollMany('seed-a', 0, 20, 20)).not.toEqual(rollMany('seed-b', 0, 20, 20));
  });

  it('resuming from a cursor continues the same sequence as a fresh run', () => {
    const fresh = createRng('resume-seed', 0);
    const first = Array.from({ length: 5 }, () => fresh.next());
    const rest = Array.from({ length: 5 }, () => fresh.next());

    const resumed = createRng('resume-seed', 5);
    const resumedRest = Array.from({ length: 5 }, () => resumed.next());

    expect(resumedRest).toEqual(rest);
    expect(first).not.toEqual(rest);
  });

  it('tracks cursor as the count of numbers drawn', () => {
    const rng = createRng('cursor-seed', 3);
    expect(rng.cursor).toBe(3);
    rng.next();
    rng.next();
    expect(rng.cursor).toBe(5);
  });
});

describe('rollDie', () => {
  it('always returns a value between 1 and sides, inclusive', () => {
    const rng = createRng('range-seed');
    const sides: DieSides = 8;
    for (let i = 0; i < 1000; i++) {
      const value = rollDie(sides, rng);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(sides);
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});
