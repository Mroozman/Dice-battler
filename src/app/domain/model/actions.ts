import type { DieId } from './die';
import type { CombatantId } from './combatant';

export type GameAction =
  | { type: 'player/toggleDie'; dieId: DieId }
  | { type: 'player/setTarget'; dieId: DieId; targetId: CombatantId }
  | { type: 'player/confirm' }
  | { type: 'roll/reveal'; value: number }
  | { type: 'roll/apply' }
  | { type: 'hand/refill' }
  | { type: 'turn/endPlayer' };
