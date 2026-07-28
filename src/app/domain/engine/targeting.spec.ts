import { needsTarget, resolveEnemyTarget, targetableFor } from './targeting';
import type { Combatant, CombatantId } from '../model/combatant';
import type { BattleState } from '../model/battle';
import type { DieDef, DieId } from '../model/die';

function makeCombatant(id: string, hp: number, overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: id as CombatantId,
    name: id,
    archetypeKey: 'test',
    kind: 'enemy',
    hp,
    maxHp: 10,
    shield: 0,
    deck: { catalog: {}, pool: [], hand: [], discard: [] },
    dicePerTurn: 1,
    ...overrides,
  };
}

function makeBattle(enemies: readonly Combatant[]): BattleState {
  return {
    round: 1,
    phase: 'player.selecting',
    activeCombatantId: 'player' as CombatantId,
    player: makeCombatant('player', 20, { kind: 'player', maxHp: 20 }),
    enemies,
    selection: [],
    resolveQueue: [],
    staged: null,
  };
}

describe('needsTarget', () => {
  it('requires an explicit target only for attack dice', () => {
    expect(needsTarget('attack')).toBe(true);
    expect(needsTarget('heal')).toBe(false);
    expect(needsTarget('shield')).toBe(false);
  });
});

describe('targetableFor', () => {
  it('returns the ids of enemies still alive', () => {
    const battle = makeBattle([makeCombatant('e0', 5), makeCombatant('e1', 0), makeCombatant('e2', 3)]);

    expect(targetableFor(battle)).toEqual(['e0', 'e2']);
  });

  it('returns an empty array when there is no battle in progress', () => {
    expect(targetableFor(null)).toEqual([]);
  });

  it('returns an empty array when all enemies are dead', () => {
    const battle = makeBattle([makeCombatant('e0', 0), makeCombatant('e1', 0)]);

    expect(targetableFor(battle)).toEqual([]);
  });
});

describe('resolveEnemyTarget', () => {
  const playerId = 'player' as CombatantId;
  const actorId = 'e0' as CombatantId;

  function makeDie(kind: DieDef['kind']): DieDef {
    return { id: 'd1' as DieId, sides: 6, kind, label: 'D6' };
  }

  it('sends attack dice at the player', () => {
    expect(resolveEnemyTarget(makeDie('attack'), actorId, playerId)).toBe(playerId);
  });

  it.each(['heal', 'shield'] as const)('sends %s dice at the rolling enemy itself, never an ally', (kind) => {
    expect(resolveEnemyTarget(makeDie(kind), actorId, playerId)).toBe(actorId);
  });
});
