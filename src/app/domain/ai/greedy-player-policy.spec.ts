import { GreedyPlayerPolicy } from './greedy-player-policy';
import type { BattleState } from '../model/battle';
import type { Combatant, CombatantId } from '../model/combatant';
import type { Deck } from '../model/deck';
import type { DieDef, DieId } from '../model/die';

function makeDie(id: string, kind: DieDef['kind'], sides: DieDef['sides'] = 6): DieDef {
  return { id: id as DieId, sides, kind, label: `D${sides}` };
}

function makeDeckWithHand(dice: readonly DieDef[]): Deck {
  const catalog = Object.fromEntries(dice.map((d) => [d.id, d])) as Readonly<Record<DieId, DieDef>>;
  return { catalog, hand: dice.map((d) => d.id), pool: [], discard: [] };
}

function makeCombatant(overrides: Partial<Combatant> & { deck: Deck }): Combatant {
  return {
    id: 'player' as CombatantId,
    name: 'player',
    archetypeKey: 'test',
    kind: 'player',
    hp: 10,
    maxHp: 10,
    shield: 0,
    dicePerTurn: 1,
    ...overrides,
  };
}

function makeEnemy(id: string, hp: number): Combatant {
  return makeCombatant({ id: id as CombatantId, kind: 'enemy', hp, maxHp: hp, deck: makeDeckWithHand([]) });
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

describe('GreedyPlayerPolicy', () => {
  it('heals when below 40% hp and a heal die is available', () => {
    const heal = makeDie('h', 'heal');
    const attack = makeDie('a', 'attack', 8);
    const player = makeCombatant({ hp: 3, maxHp: 10, deck: makeDeckWithHand([attack, heal]) });

    const chosen = GreedyPlayerPolicy.chooseDice(makeBattle(player, [makeEnemy('e0', 10)]), 1);

    expect(chosen).toEqual([{ dieId: heal.id, targetId: player.id }]);
  });

  it('shields when shield is at zero and a shield die is available', () => {
    const shield = makeDie('s', 'shield');
    const attack = makeDie('a', 'attack', 8);
    const player = makeCombatant({ hp: 10, maxHp: 10, shield: 0, deck: makeDeckWithHand([attack, shield]) });

    const chosen = GreedyPlayerPolicy.chooseDice(makeBattle(player, [makeEnemy('e0', 10)]), 1);

    expect(chosen).toEqual([{ dieId: shield.id, targetId: player.id }]);
  });

  it('prioritizes healing over shielding when both apply', () => {
    const heal = makeDie('h', 'heal');
    const shield = makeDie('s', 'shield');
    const player = makeCombatant({ hp: 2, maxHp: 10, shield: 0, deck: makeDeckWithHand([shield, heal]) });

    const chosen = GreedyPlayerPolicy.chooseDice(makeBattle(player, [makeEnemy('e0', 10)]), 1);

    expect(chosen).toEqual([{ dieId: heal.id, targetId: player.id }]);
  });

  it('does not heal when already at or above 40% hp, even with a heal die available', () => {
    const heal = makeDie('h', 'heal');
    const attack = makeDie('a', 'attack', 8);
    const player = makeCombatant({ hp: 5, maxHp: 10, deck: makeDeckWithHand([heal, attack]) });
    const enemy = makeEnemy('e0', 10);

    const chosen = GreedyPlayerPolicy.chooseDice(makeBattle(player, [enemy]), 1);

    expect(chosen).toEqual([{ dieId: attack.id, targetId: enemy.id }]);
  });

  it('picks the attack die with the most sides otherwise', () => {
    const small = makeDie('small', 'attack', 4);
    const big = makeDie('big', 'attack', 12);
    const medium = makeDie('medium', 'attack', 8);
    const player = makeCombatant({ hp: 10, maxHp: 10, shield: 1, deck: makeDeckWithHand([small, big, medium]) });
    const enemy = makeEnemy('e0', 10);

    const chosen = GreedyPlayerPolicy.chooseDice(makeBattle(player, [enemy]), 1);

    expect(chosen).toEqual([{ dieId: big.id, targetId: enemy.id }]);
  });

  it('picks count dice in priority order without repeating an id, per player turn', () => {
    const shield = makeDie('s', 'shield');
    const small = makeDie('small', 'attack', 4);
    const big = makeDie('big', 'attack', 12);
    const player = makeCombatant({ hp: 10, maxHp: 10, shield: 0, deck: makeDeckWithHand([small, big, shield]) });
    const enemy = makeEnemy('e0', 10);

    const chosen = GreedyPlayerPolicy.chooseDice(makeBattle(player, [enemy]), 2);

    expect(chosen).toEqual([
      { dieId: shield.id, targetId: player.id },
      { dieId: big.id, targetId: enemy.id },
    ]);
  });

  it('returns fewer than count dice when the hand runs out, without throwing', () => {
    const only = makeDie('only', 'attack', 6);
    const player = makeCombatant({ hp: 10, maxHp: 10, deck: makeDeckWithHand([only]) });
    const enemy = makeEnemy('e0', 10);

    const chosen = GreedyPlayerPolicy.chooseDice(makeBattle(player, [enemy]), 2);

    expect(chosen).toEqual([{ dieId: only.id, targetId: enemy.id }]);
  });

  it('targets the enemy with the lowest current hp, ignoring dead ones', () => {
    const attack = makeDie('a', 'attack', 8);
    const player = makeCombatant({ hp: 10, maxHp: 10, deck: makeDeckWithHand([attack]) });
    const dead = makeEnemy('dead', 0);
    const weak = makeEnemy('weak', 2);
    const strong = makeEnemy('strong', 9);

    const chosen = GreedyPlayerPolicy.chooseDice(makeBattle(player, [dead, strong, weak]), 1);

    expect(chosen).toEqual([{ dieId: attack.id, targetId: weak.id }]);
  });

  it('targets null for an attack die when every enemy is dead', () => {
    const attack = makeDie('a', 'attack', 8);
    const player = makeCombatant({ hp: 10, maxHp: 10, deck: makeDeckWithHand([attack]) });

    const chosen = GreedyPlayerPolicy.chooseDice(makeBattle(player, [makeEnemy('dead', 0)]), 1);

    expect(chosen).toEqual([{ dieId: attack.id, targetId: null }]);
  });
});
