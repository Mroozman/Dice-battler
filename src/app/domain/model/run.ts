import type { DieDef, DieId } from './die';
import type { Deck } from './deck';
import type { CombatantId } from './combatant';

export type StageKind = 'group' | 'boss';

export interface EnemyBlueprint {
  readonly id: CombatantId;
  readonly archetypeKey: string;
  readonly name: string;
  readonly hp: number;
  readonly maxHp: number;
  readonly shield: number;
  readonly deck: Deck;
  readonly dicePerTurn: number;
}

export interface StageDef {
  readonly index: number;
  readonly kind: StageKind;
  readonly tier: 1 | 2 | 3 | 'boss';
  readonly enemies: readonly EnemyBlueprint[];
}

export interface RunState {
  readonly stageIndex: number;
  readonly stages: readonly StageDef[];
  readonly playerCatalog: Readonly<Record<DieId, DieDef>>;
  readonly playerHp: number;
  readonly playerMaxHp: number;
  readonly pendingReward: DieDef | null;
  readonly outcome: 'ongoing' | 'victory' | 'defeat';
}
