import { reduce } from './reduce';
import type { ReduceRules } from './reduce';
import { createRng, rollDie } from './rng';
import type { Rng } from './rng';
import type { GameState } from '../model/state';
import type { BattleState } from '../model/battle';
import type { Combatant, CombatantId } from '../model/combatant';
import type { Deck } from '../model/deck';
import type { DieDef, DieId, DieKind, DieSides } from '../model/die';

const HAND_SIZE = 3;
const RULES: ReduceRules = { handSize: 3, dicePerTurn: 2, effectFromRoll: (roll) => roll, healBetweenStages: 0.25 };

function makeDie(id: string, kind: DieKind, sides: DieSides): DieDef {
  return { id: id as DieId, sides, kind, label: `D${sides}` };
}

function buildCatalog(): readonly DieDef[] {
  return [
    makeDie('a1', 'attack', 6),
    makeDie('a2', 'attack', 4),
    makeDie('a3', 'attack', 8),
    makeDie('h1', 'heal', 4),
    makeDie('s1', 'shield', 6),
  ];
}

function makeInitialDeck(dice: readonly DieDef[]): Deck {
  const catalog = Object.fromEntries(dice.map((d) => [d.id, d])) as Readonly<Record<DieId, DieDef>>;
  const ids = dice.map((d) => d.id);
  return { catalog, hand: ids.slice(0, HAND_SIZE), pool: ids.slice(HAND_SIZE), discard: [] };
}

function makePlayer(deck: Deck): Combatant {
  return {
    id: 'player' as CombatantId,
    name: 'Player',
    archetypeKey: 'player',
    kind: 'player',
    hp: 15,
    maxHp: 20,
    shield: 0,
    deck,
    dicePerTurn: RULES.dicePerTurn,
  };
}

function makeEnemy(id: string): Combatant {
  return {
    id: id as CombatantId,
    name: id,
    archetypeKey: 'enemy',
    kind: 'enemy',
    hp: 100_000,
    maxHp: 100_000,
    shield: 0,
    deck: { catalog: {}, pool: [], hand: [], discard: [] },
    dicePerTurn: 1,
  };
}

function makeInitialState(seed: string): GameState {
  const player = makePlayer(makeInitialDeck(buildCatalog()));
  const enemies = [makeEnemy('e0'), makeEnemy('e1')];
  const battle: BattleState = {
    round: 1,
    phase: 'player.selecting',
    activeCombatantId: player.id,
    player,
    enemies,
    selection: [],
    resolveQueue: [],
    staged: null,
  };

  return {
    schemaVersion: 1,
    seed,
    rngCursor: 0,
    screen: 'battle',
    run: {
      stageIndex: 0,
      stages: [],
      playerCatalog: player.deck.catalog,
      playerHp: player.hp,
      playerMaxHp: player.maxHp,
      pendingReward: null,
      outcome: 'ongoing',
    },
    battle,
    log: [],
  };
}

function deckTotal(deck: Deck): number {
  return deck.pool.length + deck.hand.length + deck.discard.length;
}

function assertInvariants(state: GameState, catalogSize: number): void {
  const battle = state.battle!;
  expect(deckTotal(battle.player.deck)).toBe(catalogSize);
  expect(battle.player.deck.hand.length).toBe(HAND_SIZE);
  expect(battle.player.hp).toBeGreaterThanOrEqual(0);
  expect(battle.player.hp).toBeLessThanOrEqual(battle.player.maxHp);
  for (const enemy of battle.enemies) {
    expect(enemy.hp).toBeGreaterThanOrEqual(0);
    expect(enemy.hp).toBeLessThanOrEqual(enemy.maxHp);
  }
}

/**
 * Drives one full player turn (selecting through drawing) using `driver` for every
 * random choice: which hand dice get picked, which living enemy gets targeted, and
 * the rolled value for each staged die. Ends by handing the turn back to
 * player.selecting, standing in for the enemy turn / round transition that is out
 * of scope for M1 (no enemy AI or run/stage actions exist yet).
 */
function playOneTurn(state: GameState, driver: Rng): GameState {
  let s = state;
  let battle = s.battle!;

  const handIds = [...battle.player.deck.hand];
  const chosen: DieId[] = [];
  while (chosen.length < RULES.dicePerTurn && handIds.length > 0) {
    const index = Math.floor(driver.next() * handIds.length);
    chosen.push(handIds.splice(index, 1)[0]);
  }

  for (const dieId of chosen) {
    s = reduce(s, { type: 'player/toggleDie', dieId }, RULES).state;
    battle = s.battle!;
    const def = battle.player.deck.catalog[dieId];
    if (def.kind === 'attack') {
      const targets = battle.enemies.filter((enemy) => enemy.hp > 0);
      const target = targets[Math.floor(driver.next() * targets.length)];
      s = reduce(s, { type: 'player/setTarget', dieId, targetId: target.id }, RULES).state;
    }
  }

  s = reduce(s, { type: 'player/confirm' }, RULES).state;
  battle = s.battle!;

  while (battle.phase !== 'player.drawing') {
    if (battle.phase === 'player.retargeting') {
      const head = battle.resolveQueue[0];
      const targets = battle.enemies.filter((enemy) => enemy.hp > 0);
      const target = targets[Math.floor(driver.next() * targets.length)];
      s = reduce(s, { type: 'player/setTarget', dieId: head.dieId, targetId: target.id }, RULES).state;
    } else if (battle.phase === 'player.rolling') {
      const value = rollDie(battle.staged!.sides, driver);
      s = reduce(s, { type: 'roll/reveal', value }, RULES).state;
    } else if (battle.phase === 'player.resolving') {
      s = reduce(s, { type: 'roll/apply' }, RULES).state;
    } else {
      throw new Error(`Unexpected phase while resolving a turn: ${battle.phase}`);
    }
    battle = s.battle!;
  }

  s = reduce(s, { type: 'hand/refill' }, RULES).state;
  s = reduce(s, { type: 'turn/endPlayer' }, RULES).state;

  return { ...s, battle: { ...s.battle!, phase: 'player.selecting', round: s.battle!.round + 1 } };
}

describe('reduce — deck and hp invariants under randomized play', () => {
  it('never violates deck mass conservation or hp bounds across 10 000 turns', () => {
    const catalogSize = buildCatalog().length;
    let state = makeInitialState('property-seed');
    const driver = createRng('property-driver');

    for (let turn = 0; turn < 10_000; turn++) {
      state = playOneTurn(state, driver);
      assertInvariants(state, catalogSize);
    }
  });
});

describe('reduce — determinism of the whole game state', () => {
  it('produces an identical final state for the same seed and the same action sequence', () => {
    const driverA = createRng('determinism-driver');
    const driverB = createRng('determinism-driver');

    let stateA = makeInitialState('determinism-seed');
    let stateB = makeInitialState('determinism-seed');

    for (let turn = 0; turn < 50; turn++) {
      stateA = playOneTurn(stateA, driverA);
      stateB = playOneTurn(stateB, driverB);
    }

    expect(stateA).toEqual(stateB);
    expect(stateA.rngCursor).toBeGreaterThan(0);
  });

  it('diverges when the seed differs', () => {
    const driverA = createRng('determinism-driver');
    const driverB = createRng('determinism-driver');

    let stateA = makeInitialState('seed-one');
    let stateB = makeInitialState('seed-two');

    for (let turn = 0; turn < 50; turn++) {
      stateA = playOneTurn(stateA, driverA);
      stateB = playOneTurn(stateB, driverB);
    }

    expect(stateA).not.toEqual(stateB);
  });
});
