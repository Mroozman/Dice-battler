import type { DieKind } from '../model/die';
import type { PlayerStats, StatKind } from '../model/stats';

export const STAT_BY_DIE_KIND: Readonly<Record<DieKind, StatKind>> = {
  attack: 'strength',
  heal: 'vitality',
  shield: 'defense',
};

export function increaseStat(stats: PlayerStats, stat: StatKind): PlayerStats {
  return { ...stats, [stat]: stats[stat] + 1 };
}

export function rollBonus(stats: PlayerStats, kind: DieKind): number {
  return stats[STAT_BY_DIE_KIND[kind]];
}
