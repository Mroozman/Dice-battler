import type { DieDef, DieKind } from '../model/die';
import type { CombatantId } from '../model/combatant';
import type { BattleState } from '../model/battle';

export function needsTarget(kind: DieKind): boolean {
  return kind === 'attack';
}

export function resolveEnemyTarget(die: DieDef, actorId: CombatantId, playerId: CombatantId): CombatantId {
  return die.kind === 'attack' ? playerId : actorId;
}

export function targetableFor(battle: BattleState | null): readonly CombatantId[] {
  if (!battle) {
    return [];
  }
  return battle.enemies.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.id);
}
