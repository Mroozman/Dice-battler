import type { BattleState } from '../model/battle';
import type { CombatantId } from '../model/combatant';
import type { DieId } from '../model/die';

export interface EnemyPolicy {
  chooseDice(state: BattleState, enemyId: CombatantId, count: number): readonly DieId[];
}
