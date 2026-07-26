import type { Deck } from './deck';

export type CombatantId = string & { readonly __brand: 'CombatantId' };

export interface Combatant {
  readonly id: CombatantId;
  readonly name: string;
  readonly archetypeKey: string;
  readonly kind: 'player' | 'enemy';
  readonly hp: number;
  readonly maxHp: number;
  readonly shield: number;
  readonly deck: Deck;
  readonly dicePerTurn: number;
}
