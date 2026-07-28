import type { BattleState } from '../model/battle';

export type BattleOutcome = 'ongoing' | 'victory' | 'defeat';

export function battleOutcome(battle: BattleState): BattleOutcome {
  if (battle.player.hp <= 0) {
    return 'defeat';
  }
  if (battle.enemies.every((enemy) => enemy.hp <= 0)) {
    return 'victory';
  }
  return 'ongoing';
}
