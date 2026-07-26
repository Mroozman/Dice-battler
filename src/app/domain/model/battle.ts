import type { DieId, DieSides, DieKind } from './die';
import type { CombatantId, Combatant } from './combatant';

export type BattlePhase =
  | 'player.selecting'
  | 'player.rolling'
  | 'player.resolving'
  | 'player.retargeting'
  | 'player.drawing'
  | 'enemy.acting';

export interface SelectedDie {
  readonly dieId: DieId;
  readonly targetId: CombatantId | null;
}

export interface StagedRoll {
  readonly dieId: DieId;
  readonly sides: DieSides;
  readonly kind: DieKind;
  readonly ownerId: CombatantId;
  readonly value: number | null;
}

export interface BattleState {
  readonly round: number;
  readonly phase: BattlePhase;
  readonly activeCombatantId: CombatantId;
  readonly player: Combatant;
  readonly enemies: readonly Combatant[];
  readonly selection: readonly SelectedDie[];
  readonly resolveQueue: readonly SelectedDie[];
  readonly staged: StagedRoll | null;
}
