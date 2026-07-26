import type { DieKind } from './die';
import type { CombatantId } from './combatant';

export type LogTone = DieKind | 'system' | 'death' | 'turn' | 'reward';

export interface LogEntry {
  readonly id: string;
  readonly stageIndex: number;
  readonly round: number;
  readonly tone: LogTone;
  readonly text: string;
  readonly actorId: CombatantId;
  readonly targetId?: CombatantId;
  readonly amount?: number;
}
