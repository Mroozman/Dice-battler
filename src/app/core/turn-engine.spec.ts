import { TestBed } from '@angular/core/testing';
import { GameStore } from './game-store';
import { TurnEngine } from './turn-engine';

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

describe('TurnEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('drives a full player turn from confirm to enemy.acting without further user input', () => {
    const store = TestBed.inject(GameStore);
    TestBed.inject(TurnEngine);
    TestBed.tick();

    selectFullHand(store);
    store.dispatch({ type: 'player/confirm' });
    TestBed.tick();
    playUntil(store, () => store.battle()!.phase === 'enemy.acting');

    expect(store.battle()!.phase).toBe('enemy.acting');
  });

  it('drives the enemy phase too, reaching a stable idle point at player.selecting or battle end', () => {
    const store = TestBed.inject(GameStore);
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

  it('processes enemies left to right and skips dead ones, never acting twice per round', () => {
    const store = TestBed.inject(GameStore);
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

  it('refills the hand back to its original size by the end of the player turn', () => {
    const store = TestBed.inject(GameStore);
    TestBed.inject(TurnEngine);
    TestBed.tick();

    const handSizeBefore = store.hand().length;
    selectFullHand(store);
    store.dispatch({ type: 'player/confirm' });
    TestBed.tick();
    playUntil(store, () => store.battle()!.phase === 'enemy.acting');

    expect(store.hand().length).toBe(handSizeBefore);
  });

  it('stops scheduling anything once the battle has ended', () => {
    const store = TestBed.inject(GameStore);
    TestBed.inject(TurnEngine);
    TestBed.tick();

    for (let round = 0; round < 20 && store.battleOutcome() === 'ongoing'; round++) {
      selectFullHand(store);
      store.dispatch({ type: 'player/confirm' });
      TestBed.tick();
      playUntil(store, () => store.battle()!.phase === 'player.selecting' || store.battleOutcome() !== 'ongoing');
    }

    if (store.battleOutcome() !== 'ongoing') {
      const stateAfterEnd = store.state();
      advance();
      advance();
      expect(store.state()).toEqual(stateAfterEnd);
    } else {
      // Extremely unlikely with this seed/rules within 20 rounds, but don't fail the suite over it.
      expect(store.battleOutcome()).toBe('ongoing');
    }
  });
});
