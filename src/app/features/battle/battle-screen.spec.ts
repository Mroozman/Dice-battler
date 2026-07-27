import { TestBed } from '@angular/core/testing';
import { BattleScreen } from './battle-screen';
import { GameStore } from '../../core/game-store';
import { TurnEngine } from '../../core/turn-engine';

function advance(): void {
  vi.advanceTimersByTime(1000);
  TestBed.tick();
}

describe('BattleScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the deck panel, battlefield and hand for the dev battle', () => {
    const fixture = TestBed.createComponent(BattleScreen);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('app-deck-panel')).toBeTruthy();
    expect(root.querySelectorAll('.battlefield .combatant-card').length).toBe(3); // 2 enemies + player
    expect(root.querySelectorAll('.hand-bar .die').length).toBe(3);
  });

  it('plays a full turn end to end through DOM clicks alone', () => {
    const fixture = TestBed.createComponent(BattleScreen);
    fixture.detectChanges();
    const store = TestBed.inject(GameStore);
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
  });
});
