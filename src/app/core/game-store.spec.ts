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

  describe('shared target for the attack dice', () => {
    async function enterTwoEnemyBattleWithTwoAttackDice(store: GameStore) {
      await enterFirstBattle(store);
      const battle = store.state().battle!;
      const dice = Object.values(battle.player.deck.catalog);
      const attacks = dice.filter((def) => def.kind === 'attack').slice(0, 2);
      const support = dice.find((def) => def.kind !== 'attack')!;
      const hand = [...attacks, support].map((def) => def.id);
      const enemy = battle.enemies[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (store as any)._state.set({
        ...store.state(),
        battle: {
          ...battle,
          player: { ...battle.player, deck: { ...battle.player.deck, hand } },
          enemies: [enemy, { ...enemy, id: 'e-extra' }],
        },
      });
      return { attacks, support, enemyIds: store.enemies().map((e) => e.id) };
    }

    it('cannot pick a target until an attack die is selected', async () => {
      const store = TestBed.inject(GameStore);
      const { attacks, support } = await enterTwoEnemyBattleWithTwoAttackDice(store);

      expect(store.canPickTarget()).toBe(false);

      store.selectDie(support.id);
      expect(store.canPickTarget()).toBe(false);

      store.selectDie(attacks[0].id);
      expect(store.canPickTarget()).toBe(true);
    });

    it('applies one picked target to every selected attack die', async () => {
      const store = TestBed.inject(GameStore);
      const { attacks, enemyIds } = await enterTwoEnemyBattleWithTwoAttackDice(store);

      store.selectDie(attacks[0].id);
      store.selectDie(attacks[1].id);
      store.pickTarget(enemyIds[1]);

      expect(store.state().battle!.selection.map((sel) => sel.targetId)).toEqual([enemyIds[1], enemyIds[1]]);
      expect(store.canConfirm()).toBe(true);
    });

    it('lets the player change the shared target before confirming', async () => {
      const store = TestBed.inject(GameStore);
      const { attacks, enemyIds } = await enterTwoEnemyBattleWithTwoAttackDice(store);

      store.selectDie(attacks[0].id);
      store.selectDie(attacks[1].id);
      store.pickTarget(enemyIds[0]);
      store.pickTarget(enemyIds[1]);

      expect(store.state().battle!.selection.map((sel) => sel.targetId)).toEqual([enemyIds[1], enemyIds[1]]);
    });

    it('gives an attack die selected later the target already chosen for the earlier one', async () => {
      const store = TestBed.inject(GameStore);
      const { attacks, enemyIds } = await enterTwoEnemyBattleWithTwoAttackDice(store);

      store.selectDie(attacks[0].id);
      store.pickTarget(enemyIds[1]);
      store.selectDie(attacks[1].id);

      expect(store.state().battle!.selection.map((sel) => sel.targetId)).toEqual([enemyIds[1], enemyIds[1]]);
    });

    it('retargets every remaining attack die at once when the shared target dies mid-resolution', async () => {
      const store = TestBed.inject(GameStore);
      const { attacks, enemyIds } = await enterTwoEnemyBattleWithTwoAttackDice(store);
      const battle = store.state().battle!;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (store as any)._state.set({
        ...store.state(),
        battle: {
          ...battle,
          phase: 'player.retargeting',
          enemies: [{ ...battle.enemies[0], hp: 0 }, battle.enemies[1]],
          resolveQueue: [
            { dieId: attacks[0].id, targetId: null },
            { dieId: attacks[1].id, targetId: enemyIds[0] },
          ],
          staged: null,
        },
      });

      store.pickTarget(enemyIds[1]);

      const next = store.state().battle!;
      expect(next.resolveQueue.map((sel) => sel.targetId)).toEqual([enemyIds[1], enemyIds[1]]);
      expect(next.phase).toBe('player.rolling');
    });

    it('exposes the picked enemies as targets, only enemies and without duplicates', async () => {
      const store = TestBed.inject(GameStore);
      const { attacks, support, enemyIds } = await enterTwoEnemyBattleWithTwoAttackDice(store);

      expect(store.pickedTargetIds()).toEqual([]);

      store.selectDie(support.id);
      expect(store.pickedTargetIds()).toEqual([]);

      store.selectDie(attacks[0].id);
      store.selectDie(attacks[1].id);
      store.pickTarget(enemyIds[1]);

      expect(store.pickedTargetIds()).toEqual([enemyIds[1]]);
    });

    it('guides the player through the turn with a message that follows the selection', async () => {
      const store = TestBed.inject(GameStore);
      const { attacks, enemyIds } = await enterTwoEnemyBattleWithTwoAttackDice(store);

      expect(store.turnMessage()?.text).toBe('Tura gracza: wybierz kości');

      store.selectDie(attacks[0].id);
      expect(store.turnMessage()?.text).toBe('Tura gracza: wybierz cel');

      store.pickTarget(enemyIds[0]);
      expect(store.turnMessage()?.text).toBe('Tura gracza: wybierz kości');

      store.selectDie(attacks[1].id);
      expect(store.turnMessage()?.text).toBe('Tura gracza: potwierdź wybór');
    });

    it('does not target the support die and ignores a pick when no attack die is selected', async () => {
      const store = TestBed.inject(GameStore);
      const { support, enemyIds } = await enterTwoEnemyBattleWithTwoAttackDice(store);

      store.selectDie(support.id);
      store.pickTarget(enemyIds[0]);

      expect(store.state().battle!.selection[0].targetId).toBe('player');
    });
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
