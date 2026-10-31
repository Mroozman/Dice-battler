import { TestBed } from '@angular/core/testing';
import { GameStore } from './game-store';

async function enterFirstBattle(store: GameStore): Promise<void> {
  await store.startNewRun();
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

describe('GameStore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('bootstraps a real, faker-generated run and shows the stage intro first', async () => {
    const store = TestBed.inject(GameStore);

    await store.startNewRun();

    expect(store.screen()).toBe('stageIntro');
    expect(store.run().stages.length).toBe(4);
    expect(store.run().stageIndex).toBe(0);
  });

  it('builds a playable battle once the stage is entered', async () => {
    const store = TestBed.inject(GameStore);
    await enterFirstBattle(store);

    expect(store.screen()).toBe('battle');
    expect(store.enemies().length).toBeGreaterThanOrEqual(1);
    expect(store.enemies().length).toBeLessThanOrEqual(3);
    expect(store.hand().length).toBe(3);
    expect(store.canConfirm()).toBe(false);
  });

  it('lists every living enemy as targetable', async () => {
    const store = TestBed.inject(GameStore);
    await enterFirstBattle(store);

    expect(store.targetableIds().length).toBe(store.enemies().length);
  });

  it('exposes the full starter catalog through deckView', async () => {
    const store = TestBed.inject(GameStore);
    await enterFirstBattle(store);

    expect(store.deckView().length).toBe(6);
    expect(store.deckView().every((entry) => entry.status === 'pool' || entry.status === 'hand')).toBe(true);
  });

  it('becomes confirmable once dicePerTurn dice are selected and targeted', async () => {
    const store = TestBed.inject(GameStore);
    await enterFirstBattle(store);

    selectFullHand(store);

    expect(store.canConfirm()).toBe(true);
  });

  it('moves confirmed dice to discard once player/confirm is dispatched', async () => {
    const store = TestBed.inject(GameStore);
    await enterFirstBattle(store);

    selectFullHand(store);
    store.dispatch({ type: 'player/confirm' });

    const discarded = store.deckView().filter((entry) => entry.status === 'discard');
    expect(discarded.length).toBe(2);
    expect(store.state().battle!.phase).toBe('player.rolling');
  });

  it('reports the battle as ongoing for a freshly entered fight', async () => {
    const store = TestBed.inject(GameStore);
    await enterFirstBattle(store);

    expect(store.battleOutcome()).toBe('ongoing');
  });

  it('starts with an empty log for a freshly entered fight', async () => {
    const store = TestBed.inject(GameStore);
    await enterFirstBattle(store);

    expect(store.log()).toEqual([]);
  });

  it('grows the log once a roll is revealed and applied', async () => {
    const store = TestBed.inject(GameStore);
    await enterFirstBattle(store);

    selectFullHand(store);
    store.dispatch({ type: 'player/confirm' });
    store.dispatch({ type: 'roll/reveal', value: 4 });
    store.dispatch({ type: 'roll/apply' });

    expect(store.log().length).toBe(1);
    expect(['attack', 'heal', 'shield']).toContain(store.log()[0].tone);
    expect(store.log()[0].text.length).toBeGreaterThan(0);
  });

  it('hides the enemy deck preview before revealEnemyDeckFromStage', async () => {
    const store = TestBed.inject(GameStore);
    await enterFirstBattle(store);

    expect(store.run().stageIndex).toBe(0);
    expect(store.enemyDeckVisible()).toBe(false);
  });
});
