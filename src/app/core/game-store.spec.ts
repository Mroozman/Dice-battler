import { TestBed } from '@angular/core/testing';
import { GameStore } from './game-store';

function selectFullHand(store: GameStore): void {
  const battle = store.state().battle!;
  const chosen = store.hand().slice(0, battle.player.dicePerTurn);

  for (const dieId of chosen) {
    store.dispatch({ type: 'player/toggleDie', dieId });
    const kind = battle.player.deck.catalog[dieId].kind;
    if (kind === 'attack') {
      store.dispatch({ type: 'player/setTarget', dieId, targetId: store.targetableIds()[0] });
    }
  }
}

describe('GameStore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('bootstraps a playable battle', () => {
    const store = TestBed.inject(GameStore);

    expect(store.screen()).toBe('battle');
    expect(store.enemies().length).toBe(2);
    expect(store.hand().length).toBe(3);
    expect(store.canConfirm()).toBe(false);
  });

  it('lists only living enemies as targetable', () => {
    const store = TestBed.inject(GameStore);

    expect(store.targetableIds().length).toBe(2);
  });

  it('exposes the full starter catalog through deckView', () => {
    const store = TestBed.inject(GameStore);

    expect(store.deckView().length).toBe(6);
    expect(store.deckView().every((entry) => entry.status === 'pool' || entry.status === 'hand')).toBe(true);
  });

  it('becomes confirmable once dicePerTurn dice are selected and targeted', () => {
    const store = TestBed.inject(GameStore);

    selectFullHand(store);

    expect(store.canConfirm()).toBe(true);
  });

  it('moves confirmed dice to discard once player/confirm is dispatched', () => {
    const store = TestBed.inject(GameStore);

    selectFullHand(store);
    store.dispatch({ type: 'player/confirm' });

    const discarded = store.deckView().filter((entry) => entry.status === 'discard');
    expect(discarded.length).toBe(2);
    expect(store.state().battle!.phase).toBe('player.rolling');
  });
});
