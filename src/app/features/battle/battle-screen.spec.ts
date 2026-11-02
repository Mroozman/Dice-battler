import { TestBed } from '@angular/core/testing';
import { BattleScreen } from './battle-screen';
import { GameStore } from '../../core/game-store';
import { TurnEngine } from '../../core/turn-engine';
import { NEW_RUN_SEED } from '../../core/tokens';

const FIXED_RUN_SEED = 'battle-screen-spec-seed';

async function enterFirstBattle(store: GameStore): Promise<void> {
  await store.startNewRun();
  store.dispatch({ type: 'stage/enter' });
}

function advance(): void {
  vi.advanceTimersByTime(1000);
  TestBed.tick();
}

describe('BattleScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [{ provide: NEW_RUN_SEED, useValue: () => FIXED_RUN_SEED }],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the deck panel, battlefield and hand for the current stage', async () => {
    const store = TestBed.inject(GameStore);
    await enterFirstBattle(store);
    const fixture = TestBed.createComponent(BattleScreen);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('app-deck-panel')).toBeTruthy();
    expect(root.querySelectorAll('.battlefield .combatant-card').length).toBe(store.enemies().length + 1);
    expect(root.querySelectorAll('.hand-bar .die').length).toBe(3);
  });

  it('darkens the background per stage and shows boss styling only on the boss stage', async () => {
    const store = TestBed.inject(GameStore);
    await enterFirstBattle(store);
    const fixture = TestBed.createComponent(BattleScreen);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.battle-screen')?.classList.contains('stage-shade--0')).toBe(true);
    expect(root.querySelector('.combatant-card--boss')).toBeNull();

    const bossIndex = store.run().stages.length - 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (store as any)._state.set({
      ...store.state(),
      run: { ...store.run(), stageIndex: bossIndex },
    });
    fixture.detectChanges();

    expect(root.querySelector('.battle-screen')?.classList.contains('stage-shade--boss')).toBe(true);
    expect(root.querySelector('.combatant-card--boss')).toBeTruthy();
  });

  it('plays a full turn end to end through DOM clicks alone', async () => {
    const store = TestBed.inject(GameStore);
    await enterFirstBattle(store);
    const fixture = TestBed.createComponent(BattleScreen);
    fixture.detectChanges();
    TestBed.inject(TurnEngine);
    TestBed.tick();

    const dicePerTurn = store.state().battle!.player.dicePerTurn;
    const chosen = store.hand().slice(0, dicePerTurn);
    const handButtons = fixture.nativeElement.querySelectorAll('.hand-bar .die') as NodeListOf<HTMLButtonElement>;

    for (let i = 0; i < chosen.length; i++) {
      handButtons[i].click();
      fixture.detectChanges();
      TestBed.tick();

      if (chosen[i].kind === 'attack') {
        const enemyButtons = fixture.nativeElement.querySelectorAll(
          '.battlefield .combatant-card',
        ) as NodeListOf<HTMLButtonElement>;
        const targetable = Array.from(enemyButtons).find((btn) => !btn.disabled);
        expect(targetable).toBeTruthy();
        targetable!.click();
        fixture.detectChanges();
        TestBed.tick();
      }
    }

    const confirmButton = fixture.nativeElement.querySelector('.hand-bar-confirm') as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(false);
    confirmButton.click();
    fixture.detectChanges();
    TestBed.tick();

    for (let i = 0; i < 50 && store.battle()!.phase !== 'enemy.acting'; i++) {
      const battle = store.battle()!;
      if (battle.phase === 'player.retargeting') {
        const head = battle.resolveQueue[0];
        store.dispatch({ type: 'player/setTarget', dieId: head.dieId, targetId: store.targetableIds()[0] });
        TestBed.tick();
      } else {
        advance();
      }
      fixture.detectChanges();
    }

    expect(store.battle()!.phase).toBe('enemy.acting');
    expect(store.hand().length).toBe(3);

    // M4: the log grew alongside the turn and is actually rendered, not just tracked in state.
    fixture.detectChanges();
    expect(store.log().length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelectorAll('.battle-log-entry').length).toBe(store.log().length);
  });

  it('toggles the log drawer open/closed via the log-toggle button, for the narrow layout', async () => {
    const store = TestBed.inject(GameStore);
    await enterFirstBattle(store);
    const fixture = TestBed.createComponent(BattleScreen);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const toggle = root.querySelector('.log-toggle') as HTMLButtonElement;
    const logPanel = root.querySelector('#battle-log-panel') as HTMLElement;
    expect(toggle.getAttribute('aria-controls')).toBe('battle-log-panel');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(logPanel.classList.contains('zone--open')).toBe(false);

    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(logPanel.classList.contains('zone--open')).toBe(true);

    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(logPanel.classList.contains('zone--open')).toBe(false);
  });

  it('shows a victory/defeat placeholder instead of the board once the battle ends', async () => {
    const store = TestBed.inject(GameStore);
    await enterFirstBattle(store);
    const fixture = TestBed.createComponent(BattleScreen);
    fixture.detectChanges();
    TestBed.inject(TurnEngine);
    TestBed.tick();

    for (let round = 0; round < 30 && store.battleOutcome() === 'ongoing'; round++) {
      const dicePerTurn = store.state().battle!.player.dicePerTurn;
      const chosen = store.hand().slice(0, dicePerTurn);
      for (const def of chosen) {
        store.dispatch({ type: 'player/toggleDie', dieId: def.id });
        if (def.kind === 'attack') {
          store.dispatch({ type: 'player/setTarget', dieId: def.id, targetId: store.targetableIds()[0] });
        }
      }
      store.dispatch({ type: 'player/confirm' });
      TestBed.tick();

      for (
        let i = 0;
        i < 100 && store.battle()!.phase !== 'player.selecting' && store.battleOutcome() === 'ongoing';
        i++
      ) {
        const battle = store.battle()!;
        if (battle.phase === 'player.retargeting') {
          const head = battle.resolveQueue[0];
          store.dispatch({ type: 'player/setTarget', dieId: head.dieId, targetId: store.targetableIds()[0] });
          TestBed.tick();
        } else {
          vi.advanceTimersByTime(1000);
          TestBed.tick();
        }
      }
    }

    expect(store.battleOutcome()).not.toBe('ongoing');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.battle-outcome')).toBeTruthy();
    expect(root.querySelector('.battle-screen')).toBeNull();
    expect(root.querySelector('h1')?.textContent).toBe(
      store.battleOutcome() === 'victory' ? 'Zwycięstwo!' : 'Porażka',
    );
  });
});
