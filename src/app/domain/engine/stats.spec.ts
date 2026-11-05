import { rollBonus, STAT_BY_DIE_KIND } from './stats';
import { ZERO_STATS, type PlayerStats } from '../model/stats';

describe('rollBonus', () => {
  const stats: PlayerStats = { strength: 3, vitality: 2, defense: 1 };

  it.each([
    ['attack', 3],
    ['heal', 2],
    ['shield', 1],
  ] as const)('maps %s dice to their own stat (%i)', (kind, expected) => {
    expect(rollBonus(stats, kind)).toBe(expected);
  });

  it('is zero for every die kind with no stat points', () => {
    expect(rollBonus(ZERO_STATS, 'attack')).toBe(0);
    expect(rollBonus(ZERO_STATS, 'heal')).toBe(0);
    expect(rollBonus(ZERO_STATS, 'shield')).toBe(0);
  });

  it('maps every die kind to a distinct stat', () => {
    expect(new Set(Object.values(STAT_BY_DIE_KIND)).size).toBe(3);
  });
});
