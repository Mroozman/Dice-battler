import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BonusDie } from './bonus-die';
import { ReducedMotion } from '../../core/reduced-motion';
import { DIE_KIND_ICON } from '../../ui/die-kind-icon';
import type { DieKind } from '../../domain/model/die';

function createBonusDie(bonus: number | null, kind: DieKind | null, revealed = false) {
  const fixture = TestBed.createComponent(BonusDie);
  fixture.componentRef.setInput('bonus', bonus);
  fixture.componentRef.setInput('kind', kind);
  fixture.componentRef.setInput('revealed', revealed);
  fixture.detectChanges();
  return fixture;
}

describe('BonusDie', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the BONUS caption, the signed value and the stat icon', () => {
    const fixture = createBonusDie(2, 'attack');

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.bonus-die-caption')?.textContent).toBe('BONUS');
    expect(element.querySelector('.bonus-die-value')?.textContent).toBe('+2');
    expect(element.querySelector('.bonus-die-icon')?.textContent).toBe(DIE_KIND_ICON.attack);
  });

  it('describes the bonus to assistive tech and in the tooltip', () => {
    const fixture = createBonusDie(3, 'shield');

    const die = fixture.nativeElement.querySelector('.bonus-die') as HTMLElement;
    expect(die.getAttribute('aria-label')).toBe('Bonus obrony: +3 do tego rzutu');
    expect(die.getAttribute('data-tooltip')).toBe('Bonus obrony: +3 do tego rzutu');
    expect(die.tabIndex).toBe(0);
  });

  it('keeps its place but is hidden and unfocusable without a bonus', () => {
    const fixture = createBonusDie(null, null);

    const die = fixture.nativeElement.querySelector('.bonus-die') as HTMLElement;
    expect(die.classList.contains('bonus-die--hidden')).toBe(true);
    expect(die.getAttribute('aria-hidden')).toBe('true');
    expect(die.hasAttribute('data-tooltip')).toBe(false);
    expect(die.hasAttribute('tabindex')).toBe(false);
  });

  it('is hidden when the bonus is zero', () => {
    const fixture = createBonusDie(0, 'heal');

    const die = fixture.nativeElement.querySelector('.bonus-die') as HTMLElement;
    expect(die.classList.contains('bonus-die--hidden')).toBe(true);
    expect(die.getAttribute('aria-hidden')).toBe('true');
  });

  it('pulses when the roll is revealed and stops after the pulse', () => {
    vi.useFakeTimers();
    const fixture = createBonusDie(1, 'attack', false);

    fixture.componentRef.setInput('revealed', true);
    fixture.detectChanges();
    expect(fixture.componentInstance.isPulsing()).toBe(true);

    vi.advanceTimersByTime(400);
    expect(fixture.componentInstance.isPulsing()).toBe(false);
  });

  it('does not pulse under reduced motion', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: ReducedMotion, useValue: { enabled: signal(true) } }],
    });
    const fixture = createBonusDie(1, 'attack', true);

    expect(fixture.componentInstance.isPulsing()).toBe(false);
  });
});
