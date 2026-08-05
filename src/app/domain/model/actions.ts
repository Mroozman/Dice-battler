import type { DieDef, DieId } from './die';
import type { CombatantId } from './combatant';
import type { RunState } from './run';

export type GameAction =
  | { type: 'player/toggleDie'; dieId: DieId }
  | { type: 'player/setTarget'; dieId: DieId; targetId: CombatantId }
  | { type: 'player/confirm' }
  | { type: 'roll/reveal'; value: number }
  | { type: 'roll/apply' }
  | { type: 'hand/refill' }
  | { type: 'turn/endPlayer' }
  | { type: 'enemy/act'; enemyId: CombatantId }
  | { type: 'turn/endRound' }
  | { type: 'run/start'; run: RunState }
  | { type: 'stage/enter' }
  | { type: 'reward/offer'; die: DieDef }
  | { type: 'reward/swap'; replacedId: DieId }
  | { type: 'reward/skip' }
  | { type: 'stage/advance' };
