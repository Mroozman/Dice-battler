import type { RunState } from './run';
import type { BattleState } from './battle';
import type { LogEntry } from './log';

export type Screen = 'title' | 'stageIntro' | 'battle' | 'reward' | 'runOver';

export interface GameState {
  readonly schemaVersion: 1;
  readonly seed: string;
  readonly rngCursor: number;
  readonly screen: Screen;
  readonly run: RunState;
  readonly battle: BattleState | null;
  readonly log: readonly LogEntry[];
}
