import { TestBed } from '@angular/core/testing';
import { DeckPanel } from './deck-panel';
import type { DeckViewEntry } from '../../domain/engine/deck';
import type { DieId } from '../../domain/model/die';

function makeEntries(): DeckViewEntry[] {
  return [
    { def: { id: 'a' as DieId, sides: 6, kind: 'attack', label: 'D6' }, status: 'pool' },
    { def: { id: 'b' as DieId, sides: 4, kind: 'heal', label: 'D4' }, status: 'hand' },
    { def: { id: 'c' as DieId, sides: 4, kind: 'shield', label: 'D4' }, status: 'discard' },
  ];
}

describe('DeckPanel', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('renders one Die per entry with its status', () => {
    const fixture = TestBed.createComponent(DeckPanel);
    fixture.componentRef.setInput('entries', makeEntries());
    fixture.detectChanges();

    const dice = fixture.nativeElement.querySelectorAll('.die') as NodeListOf<HTMLButtonElement>;
    expect(dice.length).toBe(3);
    expect(dice[1].classList.contains('die--hand')).toBe(true);
    expect(dice[2].classList.contains('die--discard')).toBe(true);
  });

  it('is not interactive in battle mode and never emits dieActivated', () => {
    const fixture = TestBed.createComponent(DeckPanel);
    fixture.componentRef.setInput('entries', makeEntries());
    fixture.componentRef.setInput('mode', 'battle');
    let activated: DieId | null = null;
    fixture.componentInstance.dieActivated.subscribe((id) => (activated = id));
    fixture.detectChanges();

    const dice = fixture.nativeElement.querySelectorAll('.die') as NodeListOf<HTMLButtonElement>;
    expect(dice[0].disabled).toBe(true);
    dice[0].click();
    expect(activated).toBeNull();
  });

  it('is interactive in reward mode and emits dieActivated with the clicked id', () => {
    const fixture = TestBed.createComponent(DeckPanel);
    fixture.componentRef.setInput('entries', makeEntries());
    fixture.componentRef.setInput('mode', 'reward');
    let activated: DieId | null = null;
    fixture.componentInstance.dieActivated.subscribe((id) => (activated = id));
    fixture.detectChanges();

    const dice = fixture.nativeElement.querySelectorAll('.die') as NodeListOf<HTMLButtonElement>;
    expect(dice[0].disabled).toBe(false);
    dice[0].click();
    expect(activated).toBe('a');
  });
});
