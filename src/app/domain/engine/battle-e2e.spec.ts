import { reduce } from './reduce';
import type { ReduceRules } from './reduce';
import { battleOutcome } from './outcome';
import type { GameState } from '../model/state';
import type { BattleState } from '../model/battle';
import type { Combatant, CombatantId } from '../model/combatant';
import type { Deck } from '../model/deck';
import type { DieDef, DieId } from '../model/die';

const RULES: ReduceRules = { dicePerTurn: 2, effectFromRoll: (roll) => roll };

function makeDie(id: string): DieDef {
  return { id: id as DieId, sides: 8, kind: 'attack', label: 'D8' };
}

function makeDeck(catalogDice: readonly DieDef[], hand: readonly DieId[], pool: readonly DieId[]): Deck {
  return {
    catalog: Object.fromEntries(catalogDice.map((d) => [d.id, d])) as Readonly<Record<DieId, DieDef>>,
    hand,
    pool,
    discard: [],
  };
}

function makePlayer(deck: Deck, hp: number): Combatant {
  return {
    id: 'player' as CombatantId,
    name: 'Player',
    archetypeKey: 'player',
    kind: 'player',
    hp,
    maxHp: 20,
    shield: 0,
    deck,
    dicePerTurn: 2,
  };
}

function makeEnemy(deck: Deck, hp: number, maxHp: number): Combatant {
  return {
    id: 'e0' as CombatantId,
    name: 'e0',
    archetypeKey: 'enemy',
    kind: 'enemy',
    hp,
    maxHp,
    shield: 0,
    deck,
    dicePerTurn: 1,
  };
}

function makeBattle(player: Combatant, enemy: Combatant): BattleState {
  return {
    round: 1,
    phase: 'player.selecting',
    activeCombatantId: player.id,
    player,
    enemies: [enemy],
    selection: [],
    resolveQueue: [],
    staged: null,
  };
}

function makeState(battle: BattleState): GameState {
  return {
    schemaVersion: 1,
    seed: 'e2e-seed',
    rngCursor: 0,
    screen: 'battle',
    run: {
      stageIndex: 0,
      stages: [],
      playerCatalog: battle.player.deck.catalog,
      playerHp: battle.player.hp,
      playerMaxHp: battle.player.maxHp,
      pendingReward: null,
      outcome: 'ongoing',
    },
    battle,
    log: [],
  };
}

/**
 * Every die used in these scenarios is an identical D8 attack die, so which
 * particular id a shuffle happens to draw never matters — only the explicit
 * roll values dispatched via roll/reveal decide the outcome. This makes the
 * whole scenario deterministic without depending on the RNG sequence at all.
 */
describe('a full battle, scripted end to end (M3 point 9)', () => {
  it('ends in victory when the player finishes off the only enemy in their own turn', () => {
    const [p1, p2, p3] = ['p1', 'p2', 'p3'].map(makeDie);
    const playerDeck = makeDeck([p1, p2, p3], [p1.id, p2.id], [p3.id]);
    const [e1, e2] = ['e1', 'e2'].map(makeDie);
    const enemyDeck = makeDeck([e1, e2], [], [e1.id, e2.id]);

    const player = makePlayer(playerDeck, 20);
    const enemy = makeEnemy(enemyDeck, 8, 8);
    let state = makeState(makeBattle(player, enemy));

    const dispatch = (action: Parameters<typeof reduce>[1]) => {
      state = reduce(state, action, RULES).state;
    };

    dispatch({ type: 'player/toggleDie', dieId: p1.id });
    dispatch({ type: 'player/setTarget', dieId: p1.id, targetId: enemy.id });
    dispatch({ type: 'player/toggleDie', dieId: p2.id });
    dispatch({ type: 'player/setTarget', dieId: p2.id, targetId: enemy.id });
    dispatch({ type: 'player/confirm' });

    expect(state.battle!.phase).toBe('player.rolling');

    dispatch({ type: 'roll/reveal', value: 6 });
    dispatch({ type: 'roll/apply' });

    expect(state.battle!.enemies[0].hp).toBe(2);
    expect(battleOutcome(state.battle!)).toBe('ongoing');
    expect(state.battle!.phase).toBe('player.rolling');
    expect(state.battle!.staged!.dieId).toBe(p2.id);

    dispatch({ type: 'roll/reveal', value: 6 });
    dispatch({ type: 'roll/apply' });

    expect(state.battle!.enemies[0].hp).toBe(0);
    expect(battleOutcome(state.battle!)).toBe('victory');
    expect(state.battle!.resolveQueue).toEqual([]);
    expect(state.battle!.staged).toBeNull();

    expect(() => dispatch({ type: 'hand/refill' })).toThrow();
  });

  it('ends in defeat when the enemy finishes off the player during the enemy phase', () => {
    const [p1, p2] = ['p1', 'p2'].map(makeDie);
    const playerDeck = makeDeck([p1, p2], [p1.id, p2.id], []);
    const [e1, e2] = ['e1', 'e2'].map(makeDie);
    const enemyDeck = makeDeck([e1, e2], [], [e1.id, e2.id]);

    const player = makePlayer(playerDeck, 5);
    const enemy = makeEnemy(enemyDeck, 10, 10);
    let state = makeState(makeBattle(player, enemy));

    const dispatch = (action: Parameters<typeof reduce>[1]) => {
      state = reduce(state, action, RULES).state;
    };

    // Player's turn: two non-lethal hits, then hand refill (exercising an
    // actual pool/discard reshuffle, since the pool starts empty) and end of turn.
    dispatch({ type: 'player/toggleDie', dieId: p1.id });
    dispatch({ type: 'player/setTarget', dieId: p1.id, targetId: enemy.id });
    dispatch({ type: 'player/toggleDie', dieId: p2.id });
    dispatch({ type: 'player/setTarget', dieId: p2.id, targetId: enemy.id });
    dispatch({ type: 'player/confirm' });
    dispatch({ type: 'roll/reveal', value: 3 });
    dispatch({ type: 'roll/apply' });
    dispatch({ type: 'roll/reveal', value: 2 });
    dispatch({ type: 'roll/apply' });

    expect(state.battle!.enemies[0].hp).toBe(5);
    expect(state.battle!.phase).toBe('player.drawing');

    dispatch({ type: 'hand/refill' });
    expect(state.battle!.player.deck.hand.length).toBe(2);

    dispatch({ type: 'turn/endPlayer' });
    expect(state.battle!.phase).toBe('enemy.acting');

    // Enemy's turn: a single, lethal hit against the player.
    dispatch({ type: 'enemy/act', enemyId: enemy.id });
    expect(state.battle!.phase).toBe('player.rolling');
    expect(state.battle!.staged!.ownerId).toBe(enemy.id);

    dispatch({ type: 'roll/reveal', value: 8 });
    dispatch({ type: 'roll/apply' });

    expect(state.battle!.player.hp).toBe(0);
    expect(battleOutcome(state.battle!)).toBe('defeat');
    expect(state.battle!.resolveQueue).toEqual([]);
    expect(state.battle!.staged).toBeNull();

    expect(() => dispatch({ type: 'turn/endRound' })).toThrow();
  });
});
