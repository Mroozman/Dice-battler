import { TestBed } from '@angular/core/testing';
import { RewardScreen } from './reward-screen';
import type { DeckViewEntry } from '../../domain/engine/deck';
import type { DieDef, DieId } from '../../domain/model/die';

function makeEntries(): DeckViewEntry[] {
  return [
    { def: { id: 'a' as DieId, sides: 6, kind: 'attack', label: 'D6' }, status: 'pool' },
    { def: { id: 'b' as DieId, sides: 4, kind: 'heal', label: 'D4' }, status: 'hand' },
  ];
}

describe('RewardScreen', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('shows the offered die and the current player hp', () => {
    const reward: DieDef = { id: 'reward-0' as DieId, sides: 12, kind: 'shield', label: 'D12' };
    const fixture = TestBed.createComponent(RewardScreen);
    fixture.componentRef.setInput('reward', reward);
    fixture.componentRef.setInput('playerHp', 14);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('D12');
    expect(fixture.nativeElement.textContent).toContain('14');
  });

  it('renders the whole catalog in reward mode, clickable to swap', () => {
    const reward: DieDef = { id: 'reward-0' as DieId, sides: 12, kind: 'shield', label: 'D12' };
    const fixture = TestBed.createComponent(RewardScreen);
    fixture.componentRef.setInput('reward', reward);
    fixture.componentRef.setInput('catalog', makeEntries());
    let swappedId: DieId | null = null;
    fixture.componentInstance.swap.subscribe((id) => (swappedId = id));
    fixture.detectChanges();

    const dice = fixture.nativeElement.querySelectorAll('app-deck-panel .die') as NodeListOf<HTMLButtonElement>;
    expect(dice.length).toBe(2);
    expect(dice[0].disabled).toBe(false);
    dice[0].click();

    expect(swappedId).toBe('a');
  });

  it('emits skip when the player leaves the deck unchanged', () => {
    const reward: DieDef = { id: 'reward-0' as DieId, sides: 12, kind: 'shield', label: 'D12' };
    const fixture = TestBed.createComponent(RewardScreen);
    fixture.componentRef.setInput('reward', reward);
    let skipped = false;
    fixture.componentInstance.skip.subscribe(() => (skipped = true));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.reward-screen-skip') as HTMLButtonElement).click();

    expect(skipped).toBe(true);
  });
});
