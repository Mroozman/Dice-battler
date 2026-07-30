import { expandDeckTemplate } from './deck-builder';
import type { DeckDieTemplate } from '../engine/rules';

describe('expandDeckTemplate', () => {
  it('expands a single template into count individual dice', () => {
    const templates: DeckDieTemplate[] = [{ sides: 6, kind: 'attack', count: 3 }];

    const dice = expandDeckTemplate(templates, 'player');

    expect(dice.length).toBe(3);
    expect(dice.every((d) => d.sides === 6 && d.kind === 'attack' && d.label === 'D6')).toBe(true);
  });

  it('combines multiple templates into one flat array, preserving each count', () => {
    const templates: DeckDieTemplate[] = [
      { sides: 6, kind: 'attack', count: 2 },
      { sides: 4, kind: 'heal', count: 1 },
    ];

    const dice = expandDeckTemplate(templates, 'e0');

    expect(dice.length).toBe(3);
    expect(dice.filter((d) => d.kind === 'attack').length).toBe(2);
    expect(dice.filter((d) => d.kind === 'heal').length).toBe(1);
  });

  it('generates unique ids for every expanded die', () => {
    const templates: DeckDieTemplate[] = [
      { sides: 6, kind: 'attack', count: 3 },
      { sides: 4, kind: 'shield', count: 2 },
    ];

    const ids = expandDeckTemplate(templates, 'boss').map((d) => d.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('scopes ids by the given prefix, so different owners never collide', () => {
    const templates: DeckDieTemplate[] = [{ sides: 6, kind: 'attack', count: 2 }];

    const playerIds = expandDeckTemplate(templates, 'player').map((d) => d.id);
    const enemyIds = expandDeckTemplate(templates, 'e0').map((d) => d.id);

    expect(new Set([...playerIds, ...enemyIds]).size).toBe(playerIds.length + enemyIds.length);
  });

  it('returns an empty array for an empty template list', () => {
    expect(expandDeckTemplate([], 'player')).toEqual([]);
  });
});
