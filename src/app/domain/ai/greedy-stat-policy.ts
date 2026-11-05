import type { StatKind } from '../model/stats';

const LOW_HP_THRESHOLD = 0.5;

export function chooseStatIncrease(playerHp: number, playerMaxHp: number): StatKind {
  return playerHp / playerMaxHp < LOW_HP_THRESHOLD ? 'vitality' : 'strength';
}
