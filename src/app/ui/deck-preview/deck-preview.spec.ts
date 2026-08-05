import { TestBed } from '@angular/core/testing';
import { DeckPreview } from './deck-preview';
import type { DeckViewEntry } from '../../domain/engine/deck';
import type { DieId } from '../../domain/model/die';

function makeEntries(): DeckViewEntry[] {
  return [
    { def: { id: 'a' as DieId, sides: 6, kind: 'attack', label: 'D6' }, status: 'pool' },
    { def: { id: 'b' as DieId, sides: 4, kind: 'heal', label: 'D4' }, status: 'discard' },
  ];
}

describe('DeckPreview', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('renders one compact entry per die, with a tone class', () => {
    const fixture = TestBed.createComponent(DeckPreview);
    fixture.componentRef.setInput('entries', makeEntries());
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.deck-preview-item');
    expect(items.length).toBe(2);
    expect(items[0].textContent.trim()).toBe('D6');
    expect(items[0].classList.contains('deck-preview-item--attack')).toBe(true);
    expect(items[1].classList.contains('deck-preview-item--heal')).toBe(true);
  });

  it('is exposed as a tooltip role for assistive tech', () => {
    const fixture = TestBed.createComponent(DeckPreview);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="tooltip"]')).toBeTruthy();
  });

  it('renders nothing when the deck has no entries', () => {
    const fixture = TestBed.createComponent(DeckPreview);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.deck-preview-item').length).toBe(0);
  });
});
