import { battleOutcome } from './outcome';
import type { BattleState } from '../model/battle';
import type { Combatant, CombatantId } from '../model/combatant';

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

function makeBattle(player: Combatant, enemies: readonly Combatant[]): BattleState {
  return {
    round: 1,
    phase: 'player.selecting',
    activeCombatantId: player.id,
    player,
    enemies,
    selection: [],
    resolveQueue: [],
    staged: null,
  };
}

describe('battleOutcome', () => {
  it('is ongoing while the player and at least one enemy are alive', () => {
    const player = makeCombatant('player', 10, { kind: 'player', maxHp: 20 });
    const battle = makeBattle(player, [makeCombatant('e0', 5), makeCombatant('e1', 0)]);

    expect(battleOutcome(battle)).toBe('ongoing');
  });

  it('is victory once every enemy is dead, regardless of how many there were', () => {
    const player = makeCombatant('player', 10, { kind: 'player', maxHp: 20 });
    const battle = makeBattle(player, [makeCombatant('e0', 0), makeCombatant('e1', 0)]);

    expect(battleOutcome(battle)).toBe('victory');
  });

  it('is defeat once the player has 0 hp, even if enemies are still alive', () => {
    const player = makeCombatant('player', 0, { kind: 'player', maxHp: 20 });
    const battle = makeBattle(player, [makeCombatant('e0', 5)]);

    expect(battleOutcome(battle)).toBe('defeat');
  });

  it('prioritizes defeat over victory if both conditions somehow hold at once', () => {
    const player = makeCombatant('player', 0, { kind: 'player', maxHp: 20 });
    const battle = makeBattle(player, [makeCombatant('e0', 0)]);

    expect(battleOutcome(battle)).toBe('defeat');
  });
});
