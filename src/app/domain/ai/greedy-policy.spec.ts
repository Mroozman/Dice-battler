import { GreedyPolicy } from './greedy-policy';
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

function makeEnemy(overrides: Partial<Combatant> & { deck: Deck }): Combatant {
  return {
    id: 'e0' as CombatantId,
    name: 'e0',
    archetypeKey: 'test',
    kind: 'enemy',
    hp: 10,
    maxHp: 10,
    shield: 0,
    dicePerTurn: 1,
    ...overrides,
  };
}

function makeBattle(enemy: Combatant): BattleState {
  return {
    round: 1,
    phase: 'enemy.acting',
    activeCombatantId: enemy.id,
    player: makeEnemy({ id: 'player' as CombatantId, kind: 'player', deck: makeDeckWithHand([]) }),
    enemies: [enemy],
    selection: [],
    resolveQueue: [],
    staged: null,
  };
}

describe('GreedyPolicy', () => {
  it('heals when below 40% hp and a heal die is available', () => {
    const heal = makeDie('h', 'heal');
    const attack = makeDie('a', 'attack', 8);
    const enemy = makeEnemy({ hp: 3, maxHp: 10, deck: makeDeckWithHand([attack, heal]) });

    const chosen = GreedyPolicy.chooseDice(makeBattle(enemy), enemy.id, 1);

    expect(chosen).toEqual([heal.id]);
  });

  it('shields when shield is at zero and a shield die is available', () => {
    const shield = makeDie('s', 'shield');
    const attack = makeDie('a', 'attack', 8);
    const enemy = makeEnemy({ hp: 10, maxHp: 10, shield: 0, deck: makeDeckWithHand([attack, shield]) });

    const chosen = GreedyPolicy.chooseDice(makeBattle(enemy), enemy.id, 1);

    expect(chosen).toEqual([shield.id]);
  });

  it('prioritizes healing over shielding when both apply', () => {
    const heal = makeDie('h', 'heal');
    const shield = makeDie('s', 'shield');
    const enemy = makeEnemy({ hp: 2, maxHp: 10, shield: 0, deck: makeDeckWithHand([shield, heal]) });

    const chosen = GreedyPolicy.chooseDice(makeBattle(enemy), enemy.id, 1);

    expect(chosen).toEqual([heal.id]);
  });

  it('does not heal when already at or above 40% hp, even with a heal die available', () => {
    const heal = makeDie('h', 'heal');
    const attack = makeDie('a', 'attack', 8);
    const enemy = makeEnemy({ hp: 5, maxHp: 10, deck: makeDeckWithHand([heal, attack]) });

    const chosen = GreedyPolicy.chooseDice(makeBattle(enemy), enemy.id, 1);

    expect(chosen).toEqual([attack.id]);
  });

  it('picks the attack die with the most sides otherwise', () => {
    const small = makeDie('small', 'attack', 4);
    const big = makeDie('big', 'attack', 12);
    const medium = makeDie('medium', 'attack', 8);
    const enemy = makeEnemy({ hp: 10, maxHp: 10, shield: 1, deck: makeDeckWithHand([small, big, medium]) });

    const chosen = GreedyPolicy.chooseDice(makeBattle(enemy), enemy.id, 1);

    expect(chosen).toEqual([big.id]);
  });

  it('picks count dice in priority order without repeating an id, per boss turn', () => {
    const shield = makeDie('s', 'shield');
    const small = makeDie('small', 'attack', 4);
    const big = makeDie('big', 'attack', 12);
    const enemy = makeEnemy({ hp: 10, maxHp: 10, shield: 0, deck: makeDeckWithHand([small, big, shield]) });

    const chosen = GreedyPolicy.chooseDice(makeBattle(enemy), enemy.id, 2);

    expect(chosen).toEqual([shield.id, big.id]);
  });

  it('returns fewer than count dice when the hand runs out, without throwing', () => {
    const only = makeDie('only', 'attack', 6);
    const enemy = makeEnemy({ hp: 10, maxHp: 10, deck: makeDeckWithHand([only]) });

    const chosen = GreedyPolicy.chooseDice(makeBattle(enemy), enemy.id, 2);

    expect(chosen).toEqual([only.id]);
  });

  it('throws for an unknown enemy id', () => {
    const enemy = makeEnemy({ deck: makeDeckWithHand([makeDie('a', 'attack')]) });

    expect(() => GreedyPolicy.chooseDice(makeBattle(enemy), 'ghost' as CombatantId, 1)).toThrow();
  });
});
