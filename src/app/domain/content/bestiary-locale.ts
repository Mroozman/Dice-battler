import type { LocaleDefinition } from '@faker-js/faker';
import type { DeckDieTemplate } from '../engine/rules';

export interface ArchetypeDef {
  readonly key: string;
  readonly title: string;
  readonly tier: 1 | 2 | 3 | 'boss';
  readonly hp: readonly [number, number];
  readonly dicePerTurn: number;
  readonly deck: readonly DeckDieTemplate[];
}

export const bestiaryLocale = {
  bestiary: {
    archetype: [
      {
        key: 'scavenger',
        title: 'Padlinożerca',
        tier: 1,
        hp: [5, 7],
        dicePerTurn: 1,
        deck: [
          { sides: 4, kind: 'attack', count: 3 },
          { sides: 4, kind: 'shield', count: 1 },
        ],
      },
      {
        key: 'brute',
        title: 'Zbir',
        tier: 1,
        hp: [7, 10],
        dicePerTurn: 1,
        deck: [
          { sides: 6, kind: 'attack', count: 3 },
          { sides: 4, kind: 'heal', count: 1 },
        ],
      },
      {
        key: 'zealot',
        title: 'Fanatyk',
        tier: 2,
        hp: [8, 12],
        dicePerTurn: 1,
        deck: [
          { sides: 6, kind: 'attack', count: 2 },
          { sides: 6, kind: 'heal', count: 2 },
        ],
      },
      {
        key: 'bulwark',
        title: 'Strażnik',
        tier: 2,
        hp: [10, 14],
        dicePerTurn: 1,
        deck: [
          { sides: 4, kind: 'attack', count: 2 },
          { sides: 8, kind: 'shield', count: 3 },
        ],
      },
      {
        key: 'ravager',
        title: 'Oprawca',
        tier: 3,
        hp: [12, 16],
        dicePerTurn: 1,
        deck: [
          { sides: 8, kind: 'attack', count: 4 },
          { sides: 6, kind: 'shield', count: 1 },
        ],
      },
      {
        key: 'warden',
        title: 'Nadzorca',
        tier: 3,
        hp: [14, 18],
        dicePerTurn: 1,
        deck: [
          { sides: 8, kind: 'attack', count: 2 },
          { sides: 8, kind: 'heal', count: 2 },
          { sides: 6, kind: 'shield', count: 1 },
        ],
      },
      {
        key: 'devourer',
        title: 'Pożeracz',
        tier: 'boss',
        hp: [30, 36],
        dicePerTurn: 2,
        deck: [
          { sides: 12, kind: 'attack', count: 4 },
          { sides: 8, kind: 'heal', count: 2 },
          { sides: 10, kind: 'shield', count: 2 },
        ],
      },
    ] satisfies readonly ArchetypeDef[],

    epithet: ['Rdzawy', 'Zgniły', 'Blady', 'Wściekły', 'Głodny', 'Cichy', 'Poparzony'],
  },
} satisfies LocaleDefinition;
