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
}

export interface GameRules {
  readonly playerMaxHp: number;
  readonly handSize: number;
  readonly dicePerTurn: number;
  readonly starterDeck: readonly DeckDieTemplate[];
  readonly effectFromRoll: (roll: number) => number;
  readonly timing: TimingRules;
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
  timing: { rollMs: 600, impactMs: 350, drawMs: 250 },
};
