import type { DieKind, DieSides } from '../model/die';

export interface DeckDieTemplate {
  readonly sides: DieSides;
  readonly kind: DieKind;
  readonly count: number;
}

export interface TimingRules {
  readonly rollMs: number;
  readonly impactMs: number;
  readonly drawMs: number;
  readonly enemyActMs: number;
}

export interface GameRules {
  readonly playerMaxHp: number;
  readonly handSize: number;
  readonly dicePerTurn: number;
  readonly starterDeck: readonly DeckDieTemplate[];
  readonly effectFromRoll: (roll: number) => number;
  readonly timing: TimingRules;
  readonly healBetweenStages: number;
  readonly revealEnemyDeckFromStage: number;
  readonly rewardAfterBoss: boolean;
}

export const RULES: GameRules = {
  playerMaxHp: 20,
  handSize: 3,
  dicePerTurn: 2,
  starterDeck: [
    { sides: 6, kind: 'attack', count: 2 },
    { sides: 4, kind: 'attack', count: 2 },
    { sides: 4, kind: 'heal', count: 1 },
    { sides: 4, kind: 'shield', count: 1 },
  ],
  effectFromRoll: (roll) => roll,
  timing: { rollMs: 600, impactMs: 350, drawMs: 250, enemyActMs: 700 },
  healBetweenStages: 0.4,
  revealEnemyDeckFromStage: 1,
  rewardAfterBoss: false,
};

export const REDUCED_TIMING: TimingRules = { rollMs: 1, impactMs: 1, drawMs: 1, enemyActMs: 1 };
