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

/** Fires whatever single setTimeout the engine currently has pending and lets its effect react. */
function advance(): void {
  vi.advanceTimersByTime(1000);
  TestBed.tick();
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

    for (let i = 0; i < 50 && store.battle()!.phase !== 'enemy.acting'; i++) {
      const battle = store.battle()!;
      if (battle.phase === 'player.retargeting') {
        const head = battle.resolveQueue[0];
        store.dispatch({ type: 'player/setTarget', dieId: head.dieId, targetId: store.targetableIds()[0] });
        TestBed.tick();
        continue;
      }
      advance();
    }

    expect(store.battle()!.phase).toBe('enemy.acting');
  });

  it('does not roll again once the turn has ended (stays idle in enemy.acting)', () => {
    const store = TestBed.inject(GameStore);
    TestBed.inject(TurnEngine);
    TestBed.tick();

    selectFullHand(store);
    store.dispatch({ type: 'player/confirm' });
    TestBed.tick();

    for (let i = 0; i < 50 && store.battle()!.phase !== 'enemy.acting'; i++) {
      const battle = store.battle()!;
      if (battle.phase === 'player.retargeting') {
        const head = battle.resolveQueue[0];
        store.dispatch({ type: 'player/setTarget', dieId: head.dieId, targetId: store.targetableIds()[0] });
        TestBed.tick();
        continue;
      }
      advance();
    }

    const stateAfterTurn = store.state();
    advance();
    advance();

    expect(store.state()).toEqual(stateAfterTurn);
  });

  it('refills the hand back to its original size by the end of the turn', () => {
    const store = TestBed.inject(GameStore);
    TestBed.inject(TurnEngine);
    TestBed.tick();

    const handSizeBefore = store.hand().length;
    selectFullHand(store);
    store.dispatch({ type: 'player/confirm' });
    TestBed.tick();

    for (let i = 0; i < 50 && store.battle()!.phase !== 'enemy.acting'; i++) {
      const battle = store.battle()!;
      if (battle.phase === 'player.retargeting') {
        const head = battle.resolveQueue[0];
        store.dispatch({ type: 'player/setTarget', dieId: head.dieId, targetId: store.targetableIds()[0] });
        TestBed.tick();
        continue;
      }
      advance();
    }

    expect(store.hand().length).toBe(handSizeBefore);
  });
});
