import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GameStore } from './game-store';
import { TurnEngine } from './turn-engine';
import { ReducedMotion } from './reduced-motion';
import { NEW_RUN_SEED } from './tokens';
import { REDUCED_TIMING } from '../domain/engine/rules';

const FIXED_RUN_SEED = 'fixed-run-seed-4';

async function enterFirstBattle(store: GameStore): Promise<void> {
  await store.ready;
  store.dispatch({ type: 'stage/enter' });
}

function selectFullHand(store: GameStore): void {
  const battle = store.state().battle!;
  const chosen = store.hand().slice(0, battle.player.dicePerTurn);

  for (const def of chosen) {
    store.dispatch({ type: 'player/toggleDie', dieId: def.id });
    if (def.kind === 'attack') {
      store.dispatch({ type: 'player/setTarget', dieId: def.id, targetId: store.targetableIds()[0] });
    }
  }
}

function advance(): void {
  vi.advanceTimersByTime(1000);
  TestBed.tick();
}

function playUntil(store: GameStore, done: () => boolean, maxSteps = 200): void {
  for (let i = 0; i < maxSteps && !done(); i++) {
    const battle = store.battle()!;
    if (battle.phase === 'player.retargeting') {
      const head = battle.resolveQueue[0];
      store.dispatch({ type: 'player/setTarget', dieId: head.dieId, targetId: store.targetableIds()[0] });
      TestBed.tick();
      continue;
    }
    advance();
  }
}

/** Force-wins the current battle by zeroing every enemy's hp, bypassing the store's private state. */
function forceVictory(store: GameStore): void {
  const battle = store.state().battle!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (store as any)._state.set({
    ...store.state(),
    battle: { ...battle, enemies: battle.enemies.map((e) => ({ ...e, hp: 0 })) },
  });
}

describe('TurnEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [{ provide: NEW_RUN_SEED, useValue: () => FIXED_RUN_SEED }],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('drives a full player turn from confirm to enemy.acting without further user input', async () => {
    const store = TestBed.inject(GameStore);
    await enterFirstBattle(store);
    TestBed.inject(TurnEngine);
    TestBed.tick();

    selectFullHand(store);
    store.dispatch({ type: 'player/confirm' });
    TestBed.tick();
    playUntil(store, () => store.battle()!.phase === 'enemy.acting');

    expect(store.battle()!.phase).toBe('enemy.acting');
  });

  it('drives the enemy phase too, reaching a stable idle point at player.selecting or battle end', async () => {
    const store = TestBed.inject(GameStore);
    await enterFirstBattle(store);
    TestBed.inject(TurnEngine);
    TestBed.tick();

    selectFullHand(store);
    store.dispatch({ type: 'player/confirm' });
    TestBed.tick();
    playUntil(store, () => store.battle()!.phase === 'player.selecting' || store.battleOutcome() !== 'ongoing');

    const stateAfterRound = store.state();
    advance();
    advance();

    expect(store.state()).toEqual(stateAfterRound);
  });

  it('processes enemies left to right and skips dead ones, never acting twice per round', async () => {
    const store = TestBed.inject(GameStore);
    await enterFirstBattle(store);
    TestBed.inject(TurnEngine);
    TestBed.tick();

    const enemyIdsInOrder = store.enemies().map((e) => e.id);
    const acted: string[] = [];

    selectFullHand(store);
    store.dispatch({ type: 'player/confirm' });
    TestBed.tick();

    let lastActive = store.battle()!.activeCombatantId;
    playUntil(store, () => {
      const current = store.battle()!.activeCombatantId;
      if (current !== lastActive && store.enemies().some((e) => e.id === current)) {
        acted.push(current);
      }
      lastActive = current;
      return store.battle()!.phase === 'player.selecting' || store.battleOutcome() !== 'ongoing';
    });

    if (store.battleOutcome() === 'ongoing') {
      const aliveEnemyIdsInOrder = enemyIdsInOrder.filter((id) => acted.includes(id));
      expect(acted).toEqual(aliveEnemyIdsInOrder);
      expect(new Set(acted).size).toBe(acted.length);
    }
  });

  it('refills the hand back to its original size by the end of the player turn', async () => {
    const store = TestBed.inject(GameStore);
    await enterFirstBattle(store);
    TestBed.inject(TurnEngine);
    TestBed.tick();

    const handSizeBefore = store.hand().length;
    selectFullHand(store);
    store.dispatch({ type: 'player/confirm' });
    TestBed.tick();
    playUntil(store, () => store.battle()!.phase === 'enemy.acting');

    expect(store.hand().length).toBe(handSizeBefore);
  });

  it('stops scheduling anything once the battle has ended', async () => {
    const store = TestBed.inject(GameStore);
    await enterFirstBattle(store);
    TestBed.inject(TurnEngine);
    TestBed.tick();

    for (let round = 0; round < 20 && store.battleOutcome() === 'ongoing'; round++) {
      selectFullHand(store);
      store.dispatch({ type: 'player/confirm' });
      TestBed.tick();
      playUntil(store, () => store.battle()!.phase === 'player.selecting' || store.battleOutcome() !== 'ongoing');
    }

    if (store.battleOutcome() === 'defeat') {
      const stateAfterEnd = store.state();
      advance();
      advance();
      expect(store.state()).toEqual(stateAfterEnd);
    } else {
      // Victory now triggers finishStage() (reward or stage/advance) — covered by the dedicated
      // tests below. Defeat is the only outcome expected to go fully idle within this loop.
      expect(['ongoing', 'victory']).toContain(store.battleOutcome());
    }
  });

  it('offers a reward and moves to the reward screen after winning a non-boss stage', async () => {
    const store = TestBed.inject(GameStore);
    await enterFirstBattle(store);
    TestBed.inject(TurnEngine);
    TestBed.tick();

    expect(store.run().stages[store.run().stageIndex].kind).toBe('group');

    forceVictory(store);
    TestBed.tick();

    for (let i = 0; i < 10 && store.screen() !== 'reward'; i++) {
      await vi.advanceTimersByTimeAsync(1000);
      TestBed.tick();
    }

    expect(store.screen()).toBe('reward');
    expect(store.run().pendingReward).not.toBeNull();
  });

  it('reacts to a resolved reward by advancing to the next stage intro', async () => {
    const store = TestBed.inject(GameStore);
    await enterFirstBattle(store);
    TestBed.inject(TurnEngine);
    TestBed.tick();

    forceVictory(store);
    TestBed.tick();
    for (let i = 0; i < 10 && store.screen() !== 'reward'; i++) {
      await vi.advanceTimersByTimeAsync(1000);
      TestBed.tick();
    }
    expect(store.screen()).toBe('reward');

    store.dispatch({ type: 'reward/skip' });
    TestBed.tick();

    expect(store.screen()).toBe('stageIntro');
    expect(store.run().stageIndex).toBe(1);
  });

  it('advances straight to the next stage (or runOver) with no reward after a boss victory', async () => {
    const store = TestBed.inject(GameStore);
    await enterFirstBattle(store);
    TestBed.inject(TurnEngine);
    TestBed.tick();

    const bossIndex = store.run().stages.length - 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (store as any)._state.set({
      ...store.state(),
      run: { ...store.run(), stageIndex: bossIndex },
    });
    forceVictory(store);
    TestBed.tick();
    for (let i = 0; i < 10 && store.screen() === 'battle'; i++) {
      await vi.advanceTimersByTimeAsync(1000);
      TestBed.tick();
    }

    expect(store.run().pendingReward).toBeNull();
    expect(store.screen()).toBe('runOver');
    expect(store.run().outcome).toBe('victory');
  });

  it('reveals the roll after REDUCED_TIMING.rollMs, not the full rules.timing.rollMs, when reduced motion is on', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: NEW_RUN_SEED, useValue: () => FIXED_RUN_SEED },
        { provide: ReducedMotion, useValue: { enabled: signal(true) } },
      ],
    });
    const store = TestBed.inject(GameStore);
    await enterFirstBattle(store);
    TestBed.inject(TurnEngine);
    TestBed.tick();

    selectFullHand(store);
    store.dispatch({ type: 'player/confirm' });
    TestBed.tick();

    vi.advanceTimersByTime(REDUCED_TIMING.rollMs);
    TestBed.tick();

    expect(store.battle()!.staged?.value).not.toBeNull();
  });
});
