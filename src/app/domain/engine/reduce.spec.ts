import { reduce } from './reduce';
import type { ReduceRules } from './reduce';
import type { GameState } from '../model/state';
import type { BattleState } from '../model/battle';
import type { Combatant, CombatantId } from '../model/combatant';
import type { Deck } from '../model/deck';
import type { DieDef, DieId, DieKind, DieSides } from '../model/die';
import type { EnemyBlueprint, RunState, StageDef } from '../model/run';

const RULES: ReduceRules = { handSize: 3, dicePerTurn: 2, effectFromRoll: (roll) => roll, healBetweenStages: 0.25 };

function makeDie(id: string, kind: DieKind, sides: DieSides = 6): DieDef {
  return { id: id as DieId, sides, kind, label: `D${sides}` };
}

function makeDeck(dice: readonly DieDef[], handCount: number): Deck {
  const catalog = Object.fromEntries(dice.map((d) => [d.id, d])) as Readonly<Record<DieId, DieDef>>;
  const ids = dice.map((d) => d.id);
  return { catalog, hand: ids.slice(0, handCount), pool: ids.slice(handCount), discard: [] };
}

function makePlayer(deck: Deck, overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: 'player' as CombatantId,
    name: 'Player',
    archetypeKey: 'player',
    kind: 'player',
    hp: 15,
    maxHp: 20,
    shield: 0,
    deck,
    dicePerTurn: 2,
    ...overrides,
  };
}

function makeEnemy(id: string, hp: number, overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: id as CombatantId,
    name: id,
    archetypeKey: 'enemy',
    kind: 'enemy',
    hp,
    maxHp: 10,
    shield: 0,
    deck: { catalog: {}, pool: [], hand: [], discard: [] },
    dicePerTurn: 1,
    ...overrides,
  };
}

function makeBattle(player: Combatant, enemies: readonly Combatant[], overrides: Partial<BattleState> = {}): BattleState {
  return {
    round: 1,
    phase: 'player.selecting',
    activeCombatantId: player.id,
    player,
    enemies,
    selection: [],
    resolveQueue: [],
    staged: null,
    ...overrides,
  };
}

function makeEnemyBlueprint(id: string, hp: number, dicePerTurn = 1): EnemyBlueprint {
  const dice = [makeDie(`${id}-a`, 'attack'), makeDie(`${id}-b`, 'attack')];
  const catalog = Object.fromEntries(dice.map((d) => [d.id, d])) as Readonly<Record<DieId, DieDef>>;
  return {
    id: id as CombatantId,
    archetypeKey: 'test',
    name: id,
    hp,
    maxHp: hp,
    shield: 0,
    dicePerTurn,
    deck: { catalog, pool: dice.map((d) => d.id), hand: [], discard: [] },
  };
}

function makeRunState(stages: readonly StageDef[], overrides: Partial<RunState> = {}): RunState {
  const playerDice = ['p1', 'p2', 'p3', 'p4', 'p5'].map((id) => makeDie(id, 'attack'));
  const playerCatalog = Object.fromEntries(playerDice.map((d) => [d.id, d])) as Readonly<Record<DieId, DieDef>>;
  return {
    stageIndex: 0,
    stages,
    playerCatalog,
    playerHp: 15,
    playerMaxHp: 20,
    pendingReward: null,
    outcome: 'ongoing',
    lastHealAmount: 0,
    ...overrides,
  };
}

function makeTitleState(overrides: Partial<GameState> = {}): GameState {
  return {
    schemaVersion: 1,
    seed: 'placeholder-seed',
    rngCursor: 0,
    screen: 'title',
    run: makeRunState([]),
    battle: null,
    log: [],
    ...overrides,
  };
}

function makeState(battle: BattleState, overrides: Partial<GameState> = {}): GameState {
  return {
    schemaVersion: 1,
    seed: 'test-seed',
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
      lastHealAmount: 0,
    },
    battle,
    log: [],
    ...overrides,
  };
}

describe('player/toggleDie', () => {
  it('selects an attack die from hand with no target yet', () => {
    const atk = makeDie('atk', 'attack');
    const deck = makeDeck([atk], 1);
    const state = makeState(makeBattle(makePlayer(deck), [makeEnemy('e0', 5)]));

    const { state: next } = reduce(state, { type: 'player/toggleDie', dieId: atk.id }, RULES);

    expect(next.battle!.selection).toEqual([{ dieId: atk.id, targetId: null }]);
  });

  it('auto-targets the player for a heal die', () => {
    const heal = makeDie('heal', 'heal');
    const deck = makeDeck([heal], 1);
    const player = makePlayer(deck);
    const state = makeState(makeBattle(player, [makeEnemy('e0', 5)]));

    const { state: next } = reduce(state, { type: 'player/toggleDie', dieId: heal.id }, RULES);

    expect(next.battle!.selection).toEqual([{ dieId: heal.id, targetId: player.id }]);
  });

  it('deselects an already-selected die', () => {
    const atk = makeDie('atk', 'attack');
    const deck = makeDeck([atk], 1);
    const battle = makeBattle(makePlayer(deck), [makeEnemy('e0', 5)], {
      selection: [{ dieId: atk.id, targetId: null }],
    });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'player/toggleDie', dieId: atk.id }, RULES);

    expect(next.battle!.selection).toEqual([]);
  });

  it('ignores selecting beyond dicePerTurn', () => {
    const [a, b, c] = [makeDie('a', 'attack'), makeDie('b', 'attack'), makeDie('c', 'attack')];
    const deck = makeDeck([a, b, c], 3);
    const battle = makeBattle(makePlayer(deck), [makeEnemy('e0', 5)], {
      selection: [
        { dieId: a.id, targetId: null },
        { dieId: b.id, targetId: null },
      ],
    });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'player/toggleDie', dieId: c.id }, RULES);

    expect(next.battle!.selection.length).toBe(2);
  });

  it('throws when the die is not in hand', () => {
    const deck = makeDeck([makeDie('pooled', 'attack')], 0);
    const state = makeState(makeBattle(makePlayer(deck), [makeEnemy('e0', 5)]));

    expect(() => reduce(state, { type: 'player/toggleDie', dieId: 'pooled' as DieId }, RULES)).toThrow();
  });

  it('throws outside the selecting phase', () => {
    const atk = makeDie('atk', 'attack');
    const deck = makeDeck([atk], 1);
    const battle = makeBattle(makePlayer(deck), [makeEnemy('e0', 5)], { phase: 'enemy.acting' });
    const state = makeState(battle);

    expect(() => reduce(state, { type: 'player/toggleDie', dieId: atk.id }, RULES)).toThrow();
  });
});

describe('player/setTarget', () => {
  it('assigns a target during selection', () => {
    const atk = makeDie('atk', 'attack');
    const deck = makeDeck([atk], 1);
    const enemy = makeEnemy('e0', 5);
    const battle = makeBattle(makePlayer(deck), [enemy], { selection: [{ dieId: atk.id, targetId: null }] });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'player/setTarget', dieId: atk.id, targetId: enemy.id }, RULES);

    expect(next.battle!.selection).toEqual([{ dieId: atk.id, targetId: enemy.id }]);
  });

  it('throws for a target that is not alive', () => {
    const atk = makeDie('atk', 'attack');
    const deck = makeDeck([atk], 1);
    const deadEnemy = makeEnemy('e0', 0);
    const battle = makeBattle(makePlayer(deck), [deadEnemy], { selection: [{ dieId: atk.id, targetId: null }] });
    const state = makeState(battle);

    expect(() =>
      reduce(state, { type: 'player/setTarget', dieId: atk.id, targetId: deadEnemy.id }, RULES),
    ).toThrow();
  });

  it('throws when the die is not awaiting a target', () => {
    const atk = makeDie('atk', 'attack');
    const deck = makeDeck([atk], 1);
    const enemy = makeEnemy('e0', 5);
    const state = makeState(makeBattle(makePlayer(deck), [enemy]));

    expect(() =>
      reduce(state, { type: 'player/setTarget', dieId: atk.id, targetId: enemy.id }, RULES),
    ).toThrow();
  });

  it('resolves retargeting back to player.rolling', () => {
    const atk = makeDie('atk', 'attack');
    const deck = makeDeck([atk], 1);
    const aliveEnemy = makeEnemy('e1', 5);
    const battle = makeBattle(makePlayer(deck), [makeEnemy('e0', 0), aliveEnemy], {
      phase: 'player.retargeting',
      resolveQueue: [{ dieId: atk.id, targetId: null }],
      staged: { dieId: atk.id, sides: 6, kind: 'attack', ownerId: 'player' as CombatantId, value: null },
    });
    const state = makeState(battle);

    const { state: next } = reduce(
      state,
      { type: 'player/setTarget', dieId: atk.id, targetId: aliveEnemy.id },
      RULES,
    );

    expect(next.battle!.phase).toBe('player.rolling');
    expect(next.battle!.resolveQueue).toEqual([{ dieId: atk.id, targetId: aliveEnemy.id }]);
    expect(next.battle!.staged).toEqual({
      dieId: atk.id,
      sides: 6,
      kind: 'attack',
      ownerId: 'player',
      value: null,
    });
  });
});

describe('player/confirm', () => {
  it('discards the confirmed dice, builds the resolve queue and stages the first roll', () => {
    const [atk, heal, spare] = [makeDie('atk', 'attack'), makeDie('heal', 'heal'), makeDie('spare', 'attack')];
    const deck = makeDeck([atk, heal, spare], 3);
    const enemy = makeEnemy('e0', 5);
    const battle = makeBattle(makePlayer(deck), [enemy], {
      selection: [
        { dieId: atk.id, targetId: enemy.id },
        { dieId: heal.id, targetId: 'player' as CombatantId },
      ],
    });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'player/confirm' }, RULES);
    const battleAfter = next.battle!;

    expect(battleAfter.selection).toEqual([]);
    expect(battleAfter.resolveQueue.map((s) => s.dieId)).toEqual([atk.id, heal.id]);
    expect(battleAfter.phase).toBe('player.rolling');
    expect(battleAfter.staged).toEqual({ dieId: atk.id, sides: 6, kind: 'attack', ownerId: 'player', value: null });
    expect(battleAfter.player.deck.discard).toEqual([atk.id, heal.id]);
    expect(battleAfter.player.deck.hand).toEqual([spare.id]);
  });

  it('throws when selection is incomplete', () => {
    const atk = makeDie('atk', 'attack');
    const deck = makeDeck([atk], 1);
    const state = makeState(makeBattle(makePlayer(deck), [makeEnemy('e0', 5)]));

    expect(() => reduce(state, { type: 'player/confirm' }, RULES)).toThrow();
  });

  it('throws when an attack die still has no target', () => {
    const [atk, heal] = [makeDie('atk', 'attack'), makeDie('heal', 'heal')];
    const deck = makeDeck([atk, heal], 2);
    const battle = makeBattle(makePlayer(deck), [makeEnemy('e0', 5)], {
      selection: [
        { dieId: atk.id, targetId: null },
        { dieId: heal.id, targetId: 'player' as CombatantId },
      ],
    });
    const state = makeState(battle);

    expect(() => reduce(state, { type: 'player/confirm' }, RULES)).toThrow();
  });
});

describe('roll/reveal', () => {
  it('reveals the value and moves to player.resolving', () => {
    const atk = makeDie('atk', 'attack');
    const deck = makeDeck([atk], 1);
    const enemy = makeEnemy('e0', 5);
    const battle = makeBattle(makePlayer(deck), [enemy], {
      phase: 'player.rolling',
      resolveQueue: [{ dieId: atk.id, targetId: enemy.id }],
      staged: { dieId: atk.id, sides: 6, kind: 'attack', ownerId: 'player' as CombatantId, value: null },
    });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'roll/reveal', value: 4 }, RULES);

    expect(next.battle!.phase).toBe('player.resolving');
    expect(next.battle!.staged!.value).toBe(4);
  });

  it('throws when there is no pending staged roll', () => {
    const atk = makeDie('atk', 'attack');
    const deck = makeDeck([atk], 1);
    const state = makeState(makeBattle(makePlayer(deck), [makeEnemy('e0', 5)]));

    expect(() => reduce(state, { type: 'roll/reveal', value: 4 }, RULES)).toThrow();
  });
});

describe('roll/apply', () => {
  it('applies attack damage to the target and advances to the next queued die', () => {
    const [atk, heal] = [makeDie('atk', 'attack'), makeDie('heal', 'heal')];
    const deck = makeDeck([atk, heal], 2);
    const enemy = makeEnemy('e0', 5);
    const battle = makeBattle(makePlayer(deck), [enemy], {
      phase: 'player.resolving',
      resolveQueue: [
        { dieId: atk.id, targetId: enemy.id },
        { dieId: heal.id, targetId: 'player' as CombatantId },
      ],
      staged: { dieId: atk.id, sides: 6, kind: 'attack', ownerId: 'player' as CombatantId, value: 3 },
    });
    const state = makeState(battle);

    const { state: next, effects } = reduce(state, { type: 'roll/apply' }, RULES);
    const battleAfter = next.battle!;

    expect(battleAfter.enemies[0].hp).toBe(2);
    expect(battleAfter.phase).toBe('player.rolling');
    expect(battleAfter.resolveQueue.map((s) => s.dieId)).toEqual([heal.id]);
    expect(battleAfter.staged).toEqual({ dieId: heal.id, sides: 6, kind: 'heal', ownerId: 'player', value: null });
    expect(effects).toEqual([]);
  });

  it('applies heal to the player', () => {
    const heal = makeDie('heal', 'heal');
    const deck = makeDeck([heal], 1);
    const player = makePlayer(deck, { hp: 10, maxHp: 20 });
    const battle = makeBattle(player, [makeEnemy('e0', 5)], {
      phase: 'player.resolving',
      resolveQueue: [{ dieId: heal.id, targetId: player.id }],
      staged: { dieId: heal.id, sides: 6, kind: 'heal', ownerId: player.id, value: 6 },
    });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'roll/apply' }, RULES);

    expect(next.battle!.player.hp).toBe(16);
  });

  it('applies shield to the player', () => {
    const shield = makeDie('shield', 'shield');
    const deck = makeDeck([shield], 1);
    const player = makePlayer(deck, { shield: 1 });
    const battle = makeBattle(player, [makeEnemy('e0', 5)], {
      phase: 'player.resolving',
      resolveQueue: [{ dieId: shield.id, targetId: player.id }],
      staged: { dieId: shield.id, sides: 6, kind: 'shield', ownerId: player.id, value: 4 },
    });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'roll/apply' }, RULES);

    expect(next.battle!.player.shield).toBe(5);
  });

  it('emits combatant/died when the attack kills the target', () => {
    const atk = makeDie('atk', 'attack');
    const deck = makeDeck([atk], 1);
    const enemy = makeEnemy('e0', 3);
    const battle = makeBattle(makePlayer(deck), [enemy], {
      phase: 'player.resolving',
      resolveQueue: [{ dieId: atk.id, targetId: enemy.id }],
      staged: { dieId: atk.id, sides: 6, kind: 'attack', ownerId: 'player' as CombatantId, value: 5 },
    });
    const state = makeState(battle);

    const { state: next, effects } = reduce(state, { type: 'roll/apply' }, RULES);

    expect(next.battle!.enemies[0].hp).toBe(0);
    expect(effects).toEqual([{ type: 'combatant/died', combatantId: enemy.id }]);
  });

  it('moves to player.drawing with no staged roll once the queue is empty', () => {
    const atk = makeDie('atk', 'attack');
    const deck = makeDeck([atk], 1);
    const enemy = makeEnemy('e0', 5);
    const battle = makeBattle(makePlayer(deck), [enemy], {
      phase: 'player.resolving',
      resolveQueue: [{ dieId: atk.id, targetId: enemy.id }],
      staged: { dieId: atk.id, sides: 6, kind: 'attack', ownerId: 'player' as CombatantId, value: 2 },
    });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'roll/apply' }, RULES);

    expect(next.battle!.resolveQueue).toEqual([]);
    expect(next.battle!.phase).toBe('player.drawing');
    expect(next.battle!.staged).toBeNull();
  });

  it('enters player.retargeting when the next queued target already died', () => {
    const [atk1, atk2] = [makeDie('atk1', 'attack'), makeDie('atk2', 'attack')];
    const deck = makeDeck([atk1, atk2], 2);
    const victim = makeEnemy('e0', 3);
    const survivor = makeEnemy('e1', 5);
    const battle = makeBattle(makePlayer(deck), [victim, survivor], {
      phase: 'player.resolving',
      resolveQueue: [
        { dieId: atk1.id, targetId: victim.id },
        { dieId: atk2.id, targetId: victim.id },
      ],
      staged: { dieId: atk1.id, sides: 6, kind: 'attack', ownerId: 'player' as CombatantId, value: 5 },
    });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'roll/apply' }, RULES);
    const battleAfter = next.battle!;

    expect(battleAfter.phase).toBe('player.retargeting');
    expect(battleAfter.resolveQueue).toEqual([{ dieId: atk2.id, targetId: null }]);
    expect(battleAfter.staged).toEqual({ dieId: atk2.id, sides: 6, kind: 'attack', ownerId: 'player', value: null });
  });

  it('drops a queued attack die and goes straight to drawing when no enemies survive', () => {
    const [atk1, atk2] = [makeDie('atk1', 'attack'), makeDie('atk2', 'attack')];
    const deck = makeDeck([atk1, atk2], 2);
    const onlyEnemy = makeEnemy('e0', 3);
    const battle = makeBattle(makePlayer(deck), [onlyEnemy], {
      phase: 'player.resolving',
      resolveQueue: [
        { dieId: atk1.id, targetId: onlyEnemy.id },
        { dieId: atk2.id, targetId: onlyEnemy.id },
      ],
      staged: { dieId: atk1.id, sides: 6, kind: 'attack', ownerId: 'player' as CombatantId, value: 5 },
    });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'roll/apply' }, RULES);
    const battleAfter = next.battle!;

    expect(battleAfter.resolveQueue).toEqual([]);
    expect(battleAfter.phase).toBe('player.drawing');
    expect(battleAfter.staged).toBeNull();
  });
});

describe('hand/refill', () => {
  it('draws dicePerTurn dice back into the hand without consuming rng when the pool is sufficient', () => {
    const dice = ['a', 'b', 'c', 'd', 'e'].map((id) => makeDie(id, 'attack'));
    const deck = makeDeck(dice, 1); // hand=[a], pool=[b,c,d,e], discard=[]
    const player = makePlayer(deck);
    const battle = makeBattle(player, [makeEnemy('e0', 5)], { phase: 'player.drawing' });
    const state = makeState(battle, { rngCursor: 0 });

    const { state: next } = reduce(state, { type: 'hand/refill' }, RULES);

    expect(next.battle!.player.deck.hand.length).toBe(3);
    expect(next.rngCursor).toBe(0);
  });

  it('emits deck/reshuffled and advances rngCursor when the pool runs out and discard must be reshuffled', () => {
    const dice = ['a', 'b', 'c'].map((id) => makeDie(id, 'attack'));
    const deck: Deck = { catalog: Object.fromEntries(dice.map((d) => [d.id, d])), hand: [], pool: [], discard: dice.map((d) => d.id) };
    const player = makePlayer(deck);
    const battle = makeBattle(player, [makeEnemy('e0', 5)], { phase: 'player.drawing' });
    const state = makeState(battle, { rngCursor: 0 });

    const { state: next, effects } = reduce(state, { type: 'hand/refill' }, RULES);

    expect(effects).toEqual([{ type: 'deck/reshuffled' }]);
    expect(next.rngCursor).toBeGreaterThan(0);
  });

  it('throws outside player.drawing', () => {
    const deck = makeDeck([makeDie('a', 'attack')], 1);
    const state = makeState(makeBattle(makePlayer(deck), [makeEnemy('e0', 5)]));

    expect(() => reduce(state, { type: 'hand/refill' }, RULES)).toThrow();
  });
});

describe('turn/endPlayer', () => {
  it('moves to enemy.acting', () => {
    const deck = makeDeck([makeDie('a', 'attack')], 1);
    const battle = makeBattle(makePlayer(deck), [makeEnemy('e0', 5)], { phase: 'player.drawing' });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'turn/endPlayer' }, RULES);

    expect(next.battle!.phase).toBe('enemy.acting');
  });

  it('throws outside player.drawing', () => {
    const deck = makeDeck([makeDie('a', 'attack')], 1);
    const state = makeState(makeBattle(makePlayer(deck), [makeEnemy('e0', 5)]));

    expect(() => reduce(state, { type: 'turn/endPlayer' }, RULES)).toThrow();
  });
});

describe('roll/apply — generalized to any actor (M3 point 4)', () => {
  it('applies an enemy attack die to the player, not another enemy', () => {
    const atk = makeDie('atk', 'attack');
    const enemy = makeEnemy('e0', 8, { deck: makeDeck([atk], 1) });
    const player = makePlayer(makeDeck([], 0), { hp: 10, maxHp: 20 });
    const battle = makeBattle(player, [enemy], {
      phase: 'player.resolving',
      activeCombatantId: enemy.id,
      resolveQueue: [{ dieId: atk.id, targetId: player.id }],
      staged: { dieId: atk.id, sides: 6, kind: 'attack', ownerId: enemy.id, value: 4 },
    });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'roll/apply' }, RULES);

    expect(next.battle!.player.hp).toBe(6);
    expect(next.battle!.enemies[0].hp).toBe(8);
  });

  it('applies an enemy heal die to that enemy itself, never the player', () => {
    const heal = makeDie('heal', 'heal');
    const enemy = makeEnemy('e0', 3, { maxHp: 10, deck: makeDeck([heal], 1) });
    const player = makePlayer(makeDeck([], 0), { hp: 15 });
    const battle = makeBattle(player, [enemy], {
      phase: 'player.resolving',
      activeCombatantId: enemy.id,
      resolveQueue: [{ dieId: heal.id, targetId: enemy.id }],
      staged: { dieId: heal.id, sides: 6, kind: 'heal', ownerId: enemy.id, value: 5 },
    });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'roll/apply' }, RULES);

    expect(next.battle!.enemies[0].hp).toBe(8);
    expect(next.battle!.player.hp).toBe(15);
  });

  it('applies an enemy shield die to that enemy itself', () => {
    const shield = makeDie('shield', 'shield');
    const enemy = makeEnemy('e0', 8, { shield: 1, deck: makeDeck([shield], 1) });
    const battle = makeBattle(makePlayer(makeDeck([], 0)), [enemy], {
      phase: 'player.resolving',
      activeCombatantId: enemy.id,
      resolveQueue: [{ dieId: shield.id, targetId: enemy.id }],
      staged: { dieId: shield.id, sides: 6, kind: 'shield', ownerId: enemy.id, value: 4 },
    });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'roll/apply' }, RULES);

    expect(next.battle!.enemies[0].shield).toBe(5);
  });

  it('emits combatant/died when an enemy attack drops the player to 0 hp', () => {
    const atk = makeDie('atk', 'attack');
    const enemy = makeEnemy('e0', 8, { deck: makeDeck([atk], 1) });
    const player = makePlayer(makeDeck([], 0), { hp: 3 });
    const battle = makeBattle(player, [enemy], {
      phase: 'player.resolving',
      activeCombatantId: enemy.id,
      resolveQueue: [{ dieId: atk.id, targetId: player.id }],
      staged: { dieId: atk.id, sides: 6, kind: 'attack', ownerId: enemy.id, value: 5 },
    });
    const state = makeState(battle);

    const { state: next, effects } = reduce(state, { type: 'roll/apply' }, RULES);

    expect(next.battle!.player.hp).toBe(0);
    expect(effects).toEqual([{ type: 'combatant/died', combatantId: player.id }]);
  });

  it('advances through a boss turn (two enemy dice) without misfiring the player-only retargeting check', () => {
    const [atk1, atk2] = [makeDie('atk1', 'attack'), makeDie('atk2', 'attack')];
    const enemy = makeEnemy('e0', 8, { deck: makeDeck([atk1, atk2], 2), dicePerTurn: 2 });
    const player = makePlayer(makeDeck([], 0), { hp: 20, maxHp: 20 });
    const battle = makeBattle(player, [enemy], {
      phase: 'player.resolving',
      activeCombatantId: enemy.id,
      resolveQueue: [
        { dieId: atk1.id, targetId: player.id },
        { dieId: atk2.id, targetId: player.id },
      ],
      staged: { dieId: atk1.id, sides: 6, kind: 'attack', ownerId: enemy.id, value: 3 },
    });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'roll/apply' }, RULES);
    const battleAfter = next.battle!;

    // Phase name is reused from the player's flow (see model comment); activeCombatantId still
    // tracks the enemy. targetableFor only lists enemies, so if the retargeting check ran
    // unconditionally here it would wrongly conclude the player-target is invalid — it must not.
    expect(battleAfter.phase).toBe('player.rolling');
    expect(battleAfter.resolveQueue).toEqual([{ dieId: atk2.id, targetId: player.id }]);
    expect(battleAfter.staged).toEqual({
      dieId: atk2.id,
      sides: 6,
      kind: 'attack',
      ownerId: enemy.id,
      value: null,
    });
    expect(battleAfter.player.hp).toBe(17);
  });

  it('returns to enemy.acting (not player.drawing) once an enemy queue is exhausted', () => {
    const atk = makeDie('atk', 'attack');
    const enemy = makeEnemy('e0', 8, { deck: makeDeck([atk], 1) });
    const player = makePlayer(makeDeck([], 0));
    const battle = makeBattle(player, [enemy], {
      phase: 'player.resolving',
      activeCombatantId: enemy.id,
      resolveQueue: [{ dieId: atk.id, targetId: player.id }],
      staged: { dieId: atk.id, sides: 6, kind: 'attack', ownerId: enemy.id, value: 2 },
    });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'roll/apply' }, RULES);
    const battleAfter = next.battle!;

    expect(battleAfter.resolveQueue).toEqual([]);
    expect(battleAfter.phase).toBe('enemy.acting');
    expect(battleAfter.staged).toBeNull();
  });
});

describe('enemy/act', () => {
  it('draws dicePerTurn dice, picks via policy, discards immediately, and stages the first roll', () => {
    const atk = makeDie('atk', 'attack', 8);
    const enemy = makeEnemy('e0', 8, { deck: makeDeck([atk], 0), dicePerTurn: 1 });
    const player = makePlayer(makeDeck([], 0));
    const battle = makeBattle(player, [enemy], { phase: 'enemy.acting' });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'enemy/act', enemyId: enemy.id }, RULES);
    const battleAfter = next.battle!;
    const enemyAfter = battleAfter.enemies[0];

    expect(enemyAfter.deck.hand).toEqual([]);
    expect(enemyAfter.deck.discard).toEqual([atk.id]);
    expect(battleAfter.resolveQueue).toEqual([{ dieId: atk.id, targetId: player.id }]);
    expect(battleAfter.activeCombatantId).toBe(enemy.id);
    expect(battleAfter.phase).toBe('player.rolling');
    expect(battleAfter.staged).toEqual({ dieId: atk.id, sides: 8, kind: 'attack', ownerId: enemy.id, value: null });
  });

  it('targets heal/shield dice at the acting enemy itself, never the player', () => {
    const heal = makeDie('heal', 'heal', 4);
    const enemy = makeEnemy('e0', 3, { maxHp: 10, deck: makeDeck([heal], 0), dicePerTurn: 1 });
    const battle = makeBattle(makePlayer(makeDeck([], 0)), [enemy], { phase: 'enemy.acting' });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'enemy/act', enemyId: enemy.id }, RULES);

    expect(next.battle!.resolveQueue).toEqual([{ dieId: heal.id, targetId: enemy.id }]);
  });

  it('handles a boss with dicePerTurn 2, choosing and queuing both dice via GreedyPolicy', () => {
    const heal = makeDie('heal', 'heal');
    const atk = makeDie('atk', 'attack', 12);
    const boss = makeEnemy('boss', 3, { maxHp: 30, deck: makeDeck([atk, heal], 0), dicePerTurn: 2 });
    const player = makePlayer(makeDeck([], 0));
    const battle = makeBattle(player, [boss], { phase: 'enemy.acting' });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'enemy/act', enemyId: boss.id }, RULES);
    const battleAfter = next.battle!;

    expect(battleAfter.resolveQueue).toEqual([
      { dieId: heal.id, targetId: boss.id },
      { dieId: atk.id, targetId: player.id },
    ]);
    expect(battleAfter.enemies[0].deck.hand).toEqual([]);
  });

  it('emits deck/reshuffled when the enemy pool must be reshuffled from discard', () => {
    const dice = [makeDie('a', 'attack'), makeDie('b', 'attack')];
    const deck: Deck = {
      catalog: Object.fromEntries(dice.map((d) => [d.id, d])),
      hand: [],
      pool: [],
      discard: dice.map((d) => d.id),
    };
    const enemy = makeEnemy('e0', 8, { deck, dicePerTurn: 1 });
    const battle = makeBattle(makePlayer(makeDeck([], 0)), [enemy], { phase: 'enemy.acting' });
    const state = makeState(battle);

    const { effects } = reduce(state, { type: 'enemy/act', enemyId: enemy.id }, RULES);

    expect(effects).toEqual([{ type: 'deck/reshuffled' }]);
  });

  it('advances rngCursor deterministically so replay reproduces the same draw', () => {
    const dice = ['a', 'b', 'c', 'd', 'e'].map((id) => makeDie(id, 'attack'));
    const enemy = makeEnemy('e0', 8, { deck: makeDeck(dice, 0), dicePerTurn: 1 });
    const battle = makeBattle(makePlayer(makeDeck([], 0)), [enemy], { phase: 'enemy.acting' });
    const state = makeState(battle, { seed: 'replay-seed', rngCursor: 0 });

    const { state: first } = reduce(state, { type: 'enemy/act', enemyId: enemy.id }, RULES);
    const { state: second } = reduce(state, { type: 'enemy/act', enemyId: enemy.id }, RULES);

    expect(first.battle!.resolveQueue).toEqual(second.battle!.resolveQueue);
    expect(first.rngCursor).toBe(second.rngCursor);
  });

  it('throws outside enemy.acting', () => {
    const enemy = makeEnemy('e0', 8, { deck: makeDeck([makeDie('a', 'attack')], 0) });
    const state = makeState(makeBattle(makePlayer(makeDeck([], 0)), [enemy]));

    expect(() => reduce(state, { type: 'enemy/act', enemyId: enemy.id }, RULES)).toThrow();
  });

  it('throws for a dead enemy', () => {
    const enemy = makeEnemy('e0', 0, { deck: makeDeck([makeDie('a', 'attack')], 0) });
    const battle = makeBattle(makePlayer(makeDeck([], 0)), [enemy], { phase: 'enemy.acting' });
    const state = makeState(battle);

    expect(() => reduce(state, { type: 'enemy/act', enemyId: enemy.id }, RULES)).toThrow();
  });

  it('throws when the id does not refer to an enemy', () => {
    const player = makePlayer(makeDeck([], 0));
    const enemy = makeEnemy('e0', 8, { deck: makeDeck([makeDie('a', 'attack')], 0) });
    const battle = makeBattle(player, [enemy], { phase: 'enemy.acting' });
    const state = makeState(battle);

    expect(() => reduce(state, { type: 'enemy/act', enemyId: player.id }, RULES)).toThrow();
  });
});

describe('turn/endRound', () => {
  it('increments the round and returns control to the player', () => {
    const enemy = makeEnemy('e0', 8, { deck: makeDeck([], 0) });
    const battle = makeBattle(makePlayer(makeDeck([], 0)), [enemy], {
      phase: 'enemy.acting',
      round: 1,
      activeCombatantId: enemy.id,
    });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'turn/endRound' }, RULES);

    expect(next.battle!.round).toBe(2);
    expect(next.battle!.phase).toBe('player.selecting');
    expect(next.battle!.activeCombatantId).toBe(battle.player.id);
  });

  it('throws outside enemy.acting', () => {
    const enemy = makeEnemy('e0', 8, { deck: makeDeck([], 0) });
    const state = makeState(makeBattle(makePlayer(makeDeck([], 0)), [enemy]));

    expect(() => reduce(state, { type: 'turn/endRound' }, RULES)).toThrow();
  });
});

describe('battle ends: nothing further executes (M3 point 6)', () => {
  it('stops resolving further queued dice the instant the last enemy dies, even mid multi-die turn', () => {
    const [atk1, atk2] = [makeDie('atk1', 'attack'), makeDie('atk2', 'attack')];
    const deck = makeDeck([atk1, atk2], 2);
    const enemy = makeEnemy('e0', 3, { hp: 3 });
    const battle = makeBattle(makePlayer(deck), [enemy], {
      phase: 'player.resolving',
      resolveQueue: [
        { dieId: atk1.id, targetId: enemy.id },
        { dieId: atk2.id, targetId: enemy.id },
      ],
      staged: { dieId: atk1.id, sides: 6, kind: 'attack', ownerId: 'player' as CombatantId, value: 5 },
    });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'roll/apply' }, RULES);
    const battleAfter = next.battle!;

    expect(battleAfter.resolveQueue).toEqual([]);
    expect(battleAfter.staged).toBeNull();

    // M6: victory does not touch run-level state — that's for TurnEngine.finishStage() to decide
    // (reward vs. straight to stage/advance, depending on whether this was the boss stage).
    expect(next.screen).toBe('battle');
    expect(next.run.outcome).toBe('ongoing');
  });

  it('stops resolving further queued dice the instant the player dies, even mid boss turn', () => {
    const [atk1, atk2] = [makeDie('atk1', 'attack'), makeDie('atk2', 'attack')];
    const boss = makeEnemy('boss', 20, { deck: makeDeck([atk1, atk2], 2), dicePerTurn: 2 });
    const player = makePlayer(makeDeck([], 0), { hp: 3 });
    const battle = makeBattle(player, [boss], {
      phase: 'player.resolving',
      activeCombatantId: boss.id,
      resolveQueue: [
        { dieId: atk1.id, targetId: player.id },
        { dieId: atk2.id, targetId: player.id },
      ],
      staged: { dieId: atk1.id, sides: 6, kind: 'attack', ownerId: boss.id, value: 5 },
    });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'roll/apply' }, RULES);
    const battleAfter = next.battle!;

    expect(battleAfter.player.hp).toBe(0);
    expect(battleAfter.resolveQueue).toEqual([]);
    expect(battleAfter.staged).toBeNull();

    // M6: defeat immediately ends the whole run — no orchestration needed, unlike victory.
    expect(next.screen).toBe('runOver');
    expect(next.run.outcome).toBe('defeat');
  });

  it('rejects any further action once the battle has ended', () => {
    const atk = makeDie('atk', 'attack');
    const deck = makeDeck([atk], 1);
    const deadEnemy = makeEnemy('e0', 0);
    const battle = makeBattle(makePlayer(deck), [deadEnemy]);
    const state = makeState(battle);

    expect(() => reduce(state, { type: 'player/toggleDie', dieId: atk.id }, RULES)).toThrow();
  });

  it('rejects further action once the player has died', () => {
    const deck = makeDeck([makeDie('atk', 'attack')], 1);
    const player = makePlayer(deck, { hp: 0 });
    const battle = makeBattle(player, [makeEnemy('e0', 5)], { phase: 'enemy.acting' });
    const state = makeState(battle);

    expect(() => reduce(state, { type: 'turn/endRound' }, RULES)).toThrow();
  });
});

describe('reduce populates the battle log (M4 point 2)', () => {
  it('logs an attack roll with the correct tone and text', () => {
    const atk = makeDie('atk', 'attack', 6);
    const enemy = makeEnemy('e0', 5);
    const battle = makeBattle(makePlayer(makeDeck([atk], 1)), [enemy], {
      phase: 'player.resolving',
      resolveQueue: [{ dieId: atk.id, targetId: enemy.id }],
      staged: { dieId: atk.id, sides: 6, kind: 'attack', ownerId: 'player' as CombatantId, value: 4 },
    });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'roll/apply' }, RULES);

    expect(next.log.length).toBe(1);
    expect(next.log[0].tone).toBe('attack');
    expect(next.log[0].text).toBe('Player rzuca D6 → 4 obrażeń w e0');
    expect(next.log[0].amount).toBe(4);
  });

  it('logs the actually healed amount, capped at maxHp, not the raw roll', () => {
    const heal = makeDie('heal', 'heal', 4);
    const player = makePlayer(makeDeck([heal], 1), { hp: 18, maxHp: 20 });
    const battle = makeBattle(player, [makeEnemy('e0', 5)], {
      phase: 'player.resolving',
      resolveQueue: [{ dieId: heal.id, targetId: player.id }],
      staged: { dieId: heal.id, sides: 4, kind: 'heal', ownerId: player.id, value: 4 },
    });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'roll/apply' }, RULES);

    expect(next.log[0].tone).toBe('heal');
    expect(next.log[0].amount).toBe(2);
    expect(next.log[0].text).toContain('leczy się o 2');
  });

  it('logs a death entry right after the attack entry when the hit is lethal', () => {
    const atk = makeDie('atk', 'attack', 6);
    const enemy = makeEnemy('e0', 3);
    const battle = makeBattle(makePlayer(makeDeck([atk], 1)), [enemy], {
      phase: 'player.resolving',
      resolveQueue: [{ dieId: atk.id, targetId: enemy.id }],
      staged: { dieId: atk.id, sides: 6, kind: 'attack', ownerId: 'player' as CombatantId, value: 5 },
    });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'roll/apply' }, RULES);

    expect(next.log.map((e) => e.tone)).toEqual(['attack', 'death']);
    expect(next.log[1].text).toBe('e0 zostaje pokonany');
    expect(next.log[0].id).not.toBe(next.log[1].id);
  });

  it('logs a reshuffle entry when hand/refill must reshuffle the discard pile', () => {
    const dice = [makeDie('a', 'attack'), makeDie('b', 'attack')];
    const deck: Deck = {
      catalog: Object.fromEntries(dice.map((d) => [d.id, d])),
      hand: [],
      pool: [],
      discard: dice.map((d) => d.id),
    };
    const battle = makeBattle(makePlayer(deck), [makeEnemy('e0', 5)], { phase: 'player.drawing' });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'hand/refill' }, RULES);

    expect(next.log.length).toBe(1);
    expect(next.log[0].tone).toBe('system');
    expect(next.log[0].text).toBe('Odrzucone kości wracają do puli');
  });

  it('logs a reshuffle entry when an enemy must reshuffle its own discard pile', () => {
    const dice = [makeDie('a', 'attack'), makeDie('b', 'attack')];
    const deck: Deck = {
      catalog: Object.fromEntries(dice.map((d) => [d.id, d])),
      hand: [],
      pool: [],
      discard: dice.map((d) => d.id),
    };
    const enemy = makeEnemy('e0', 8, { deck, dicePerTurn: 1 });
    const battle = makeBattle(makePlayer(makeDeck([], 0)), [enemy], { phase: 'enemy.acting' });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'enemy/act', enemyId: enemy.id }, RULES);

    expect(next.log.length).toBe(1);
    expect(next.log[0].tone).toBe('system');
  });

  it('logs the new round number when turn/endRound fires', () => {
    const enemy = makeEnemy('e0', 8, { deck: makeDeck([], 0) });
    const battle = makeBattle(makePlayer(makeDeck([], 0)), [enemy], { phase: 'enemy.acting', round: 1 });
    const state = makeState(battle);

    const { state: next } = reduce(state, { type: 'turn/endRound' }, RULES);

    expect(next.log.length).toBe(1);
    expect(next.log[0].tone).toBe('turn');
    expect(next.log[0].text).toBe('Runda 2 rozpoczęta');
    expect(next.log[0].round).toBe(2);
  });

  it('keeps ids sequential and preserves prior entries across multiple actions', () => {
    const [atk, spare1, spare2] = ['atk', 'spare1', 'spare2'].map((id) => makeDie(id, 'attack', 6));
    const enemy = makeEnemy('e0', 20);
    const battle = makeBattle(makePlayer(makeDeck([atk, spare1, spare2], 1)), [enemy], {
      phase: 'player.resolving',
      resolveQueue: [{ dieId: atk.id, targetId: enemy.id }],
      staged: { dieId: atk.id, sides: 6, kind: 'attack', ownerId: 'player' as CombatantId, value: 3 },
    });
    let state = makeState(battle);

    state = reduce(state, { type: 'roll/apply' }, RULES).state;
    expect(state.log.length).toBe(1);
    expect(state.battle!.phase).toBe('player.drawing');

    state = reduce(state, { type: 'hand/refill' }, RULES).state;

    const ids = state.log.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('run/start', () => {
  it('initializes a fresh GameState from the given run and seed', () => {
    const run = makeRunState([]);
    const state = makeTitleState();

    const { state: next } = reduce(state, { type: 'run/start', run, seed: 'new-seed' }, RULES);

    expect(next.screen).toBe('stageIntro');
    expect(next.seed).toBe('new-seed');
    expect(next.rngCursor).toBe(0);
    expect(next.battle).toBeNull();
    expect(next.run).toBe(run);
    expect(next.log).toEqual([]);
  });

  it('throws when dispatched outside the title screen', () => {
    const run = makeRunState([]);
    const state = makeTitleState({ screen: 'battle' });

    expect(() => reduce(state, { type: 'run/start', run, seed: 'new-seed' }, RULES)).toThrow();
  });
});

describe('stage/enter', () => {
  it('builds a fresh battle from the current stage', () => {
    const enemy = makeEnemyBlueprint('e0', 6);
    const stage: StageDef = { index: 0, kind: 'group', tier: 1, enemies: [enemy] };
    const run = makeRunState([stage], { playerHp: 14, playerMaxHp: 20 });
    const state = makeTitleState({ screen: 'stageIntro', run });

    const { state: next } = reduce(state, { type: 'stage/enter' }, RULES);
    const battle = next.battle!;

    expect(next.screen).toBe('battle');
    expect(battle.round).toBe(1);
    expect(battle.phase).toBe('player.selecting');
    expect(battle.player.hp).toBe(14);
    expect(battle.player.maxHp).toBe(20);
    expect(battle.player.deck.hand.length).toBe(RULES.handSize);
    expect(battle.enemies.length).toBe(1);
    expect(battle.enemies[0].hp).toBe(6);
    expect(battle.enemies[0].deck.hand).toEqual([]);
    expect(battle.enemies[0].deck.pool.length).toBe(2);
  });

  it('advances rngCursor while shuffling the fresh battle decks', () => {
    const stage: StageDef = { index: 0, kind: 'group', tier: 1, enemies: [makeEnemyBlueprint('e0', 6)] };
    const state = makeTitleState({ screen: 'stageIntro', run: makeRunState([stage]), rngCursor: 0 });

    const { state: next } = reduce(state, { type: 'stage/enter' }, RULES);

    expect(next.rngCursor).toBeGreaterThan(0);
  });

  it('builds a battle deck for every enemy blueprint in the stage', () => {
    const stage: StageDef = {
      index: 0,
      kind: 'group',
      tier: 1,
      enemies: [makeEnemyBlueprint('e0', 6), makeEnemyBlueprint('e1', 8, 2)],
    };
    const state = makeTitleState({ screen: 'stageIntro', run: makeRunState([stage]) });

    const { state: next } = reduce(state, { type: 'stage/enter' }, RULES);
    const [first, second] = next.battle!.enemies;

    expect(first.dicePerTurn).toBe(1);
    expect(second.dicePerTurn).toBe(2);
    expect(second.hp).toBe(8);
  });

  it('throws when dispatched outside stageIntro', () => {
    const stage: StageDef = { index: 0, kind: 'group', tier: 1, enemies: [makeEnemyBlueprint('e0', 6)] };
    const state = makeTitleState({ screen: 'battle', run: makeRunState([stage]) });

    expect(() => reduce(state, { type: 'stage/enter' }, RULES)).toThrow();
  });

  it('throws when stageIndex points past the end of the stage list', () => {
    const state = makeTitleState({ screen: 'stageIntro', run: makeRunState([]) });

    expect(() => reduce(state, { type: 'stage/enter' }, RULES)).toThrow();
  });
});

function makeVictoryState(): GameState {
  const p1 = makeDie('p1', 'attack');
  const p2 = makeDie('p2', 'heal');
  const catalog = Object.fromEntries([p1, p2].map((d) => [d.id, d])) as Readonly<Record<DieId, DieDef>>;
  const deck: Deck = { catalog, hand: [p1.id, p2.id], pool: [], discard: [] };
  const player = makePlayer(deck, { hp: 18 });
  const battle = makeBattle(player, [makeEnemy('e0', 0)]);

  return {
    schemaVersion: 1,
    seed: 'reward-seed',
    rngCursor: 0,
    screen: 'battle',
    run: makeRunState([], { playerCatalog: catalog }),
    battle,
    log: [],
  };
}

describe('reward/offer', () => {
  it('offers the reward and moves to the reward screen after a won battle', () => {
    const die = makeDie('reward-0', 'attack', 8);
    const state = makeVictoryState();

    const { state: next } = reduce(state, { type: 'reward/offer', die }, RULES);

    expect(next.screen).toBe('reward');
    expect(next.run.pendingReward).toEqual(die);
  });

  it('throws outside the battle screen', () => {
    const die = makeDie('reward-0', 'attack');
    const state: GameState = { ...makeVictoryState(), screen: 'reward' };

    expect(() => reduce(state, { type: 'reward/offer', die }, RULES)).toThrow();
  });

  it('throws when the battle has not actually been won', () => {
    const die = makeDie('reward-0', 'attack');
    const state = makeVictoryState();
    const ongoingBattle = { ...state.battle!, enemies: [makeEnemy('e0', 5)] };

    expect(() => reduce({ ...state, battle: ongoingBattle }, { type: 'reward/offer', die }, RULES)).toThrow();
  });

  it('throws when a reward is already pending', () => {
    const die = makeDie('reward-0', 'attack');
    const state = makeVictoryState();
    const withPending: GameState = { ...state, run: { ...state.run, pendingReward: die } };

    expect(() => reduce(withPending, { type: 'reward/offer', die }, RULES)).toThrow();
  });
});

describe('reward/swap', () => {
  it('replaces the chosen catalog die with the pending reward, keeping catalog size the same', () => {
    const state = makeVictoryState();
    const reward = makeDie('reward-0', 'shield', 10);
    const offered = reduce(state, { type: 'reward/offer', die: reward }, RULES).state;

    const { state: next } = reduce(offered, { type: 'reward/swap', replacedId: 'p1' as DieId }, RULES);

    expect(Object.keys(next.run.playerCatalog).length).toBe(2);
    expect(next.run.playerCatalog['p1' as DieId]).toBeUndefined();
    expect(next.run.playerCatalog[reward.id]).toEqual(reward);
    expect(next.run.pendingReward).toBeNull();
  });

  it('throws when there is no pending reward', () => {
    const state = makeVictoryState();

    expect(() => reduce(state, { type: 'reward/swap', replacedId: 'p1' as DieId }, RULES)).toThrow();
  });

  it('throws when replacing a die that does not exist in the catalog', () => {
    const state = makeVictoryState();
    const reward = makeDie('reward-0', 'shield');
    const offered = reduce(state, { type: 'reward/offer', die: reward }, RULES).state;

    expect(() => reduce(offered, { type: 'reward/swap', replacedId: 'ghost' as DieId }, RULES)).toThrow();
  });
});

describe('reward/skip', () => {
  it('clears the pending reward without touching the catalog', () => {
    const state = makeVictoryState();
    const reward = makeDie('reward-0', 'shield');
    const offered = reduce(state, { type: 'reward/offer', die: reward }, RULES).state;

    const { state: next } = reduce(offered, { type: 'reward/skip' }, RULES);

    expect(next.run.pendingReward).toBeNull();
    expect(next.run.playerCatalog).toEqual(offered.run.playerCatalog);
  });

  it('throws when there is no pending reward', () => {
    const state = makeVictoryState();

    expect(() => reduce(state, { type: 'reward/skip' }, RULES)).toThrow();
  });
});

function makeStageDef(index: number, kind: 'group' | 'boss' = 'group'): StageDef {
  return {
    index,
    kind,
    tier: kind === 'boss' ? 'boss' : 1,
    enemies: [makeEnemyBlueprint(`stage${index}-e0`, 5)],
  };
}

describe('stage/advance', () => {
  it('regenerates HP (capped at maxHp), logs it, and moves to stageIntro for the next stage', () => {
    const state = makeVictoryState(); // player hp: 18, maxHp: 20
    const withStages: GameState = {
      ...state,
      run: { ...state.run, stages: [makeStageDef(0), makeStageDef(1)], stageIndex: 0 },
    };
    const offered = reduce(withStages, { type: 'reward/offer', die: makeDie('reward-0', 'shield') }, RULES).state;
    const afterSkip = reduce(offered, { type: 'reward/skip' }, RULES).state;

    const { state: next } = reduce(afterSkip, { type: 'stage/advance' }, RULES);

    expect(next.screen).toBe('stageIntro');
    expect(next.battle).toBeNull();
    expect(next.run.stageIndex).toBe(1);
    expect(next.run.playerHp).toBe(20); // capped: only 2 hp were missing, not the full 0.25 * 20 = 5
    expect(next.log.some((e) => e.tone === 'heal' && e.text.includes('regeneruje 2'))).toBe(true);
    // M6 point 8: StageIntro reads this back to show "you regenerated N HP".
    expect(next.run.lastHealAmount).toBe(2);
  });

  it('regenerates the full healBetweenStages amount when far below maxHp', () => {
    const state = makeVictoryState();
    const lowHpBattle: BattleState = { ...state.battle!, player: { ...state.battle!.player, hp: 5 } };
    const withStages: GameState = {
      ...state,
      battle: lowHpBattle,
      run: { ...state.run, stages: [makeStageDef(0), makeStageDef(1)], stageIndex: 0 },
    };
    const offered = reduce(withStages, { type: 'reward/offer', die: makeDie('reward-0', 'shield') }, RULES).state;
    const afterSkip = reduce(offered, { type: 'reward/skip' }, RULES).state;

    const { state: next } = reduce(afterSkip, { type: 'stage/advance' }, RULES);

    expect(next.run.playerHp).toBe(10); // 5 + round(0.25 * 20) = 10
  });

  it('ends the run in victory after the boss stage, with no regen and no reward', () => {
    const state = makeVictoryState();
    const withBossStage: GameState = {
      ...state,
      run: { ...state.run, stages: [makeStageDef(0, 'boss')], stageIndex: 0 },
    };

    const { state: next } = reduce(withBossStage, { type: 'stage/advance' }, RULES);

    expect(next.screen).toBe('runOver');
    expect(next.run.outcome).toBe('victory');
    expect(next.battle).toBeNull();
    expect(next.run.playerHp).toBe(18);
    expect(next.log.length).toBe(0);
  });

  it('throws without a finished battle', () => {
    const state: GameState = { ...makeVictoryState(), battle: null };

    expect(() => reduce(state, { type: 'stage/advance' }, RULES)).toThrow();
  });

  it('throws when the battle was won but the reward has not been offered/resolved yet', () => {
    const state = makeVictoryState();
    const withStages: GameState = {
      ...state,
      run: { ...state.run, stages: [makeStageDef(0), makeStageDef(1)], stageIndex: 0 },
    };

    expect(() => reduce(withStages, { type: 'stage/advance' }, RULES)).toThrow();
  });

  it('throws while still on the reward screen with a pending reward', () => {
    const state = makeVictoryState();
    const withStages: GameState = {
      ...state,
      run: { ...state.run, stages: [makeStageDef(0), makeStageDef(1)], stageIndex: 0 },
    };
    const offered = reduce(withStages, { type: 'reward/offer', die: makeDie('reward-0', 'attack') }, RULES).state;

    expect(() => reduce(offered, { type: 'stage/advance' }, RULES)).toThrow();
  });
});
