import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DieStage } from './die-stage';
import { ReducedMotion } from '../../core/reduced-motion';
import type { StagedRoll } from '../../domain/model/battle';
import type { CombatantId } from '../../domain/model/combatant';
import type { DieId } from '../../domain/model/die';

function makeStaged(overrides: Partial<StagedRoll> = {}): StagedRoll {
  return {
    dieId: 'atk' as DieId,
    sides: 8,
    kind: 'attack',
    ownerId: 'player' as CombatantId,
    value: null,
    ...overrides,
  };
}

describe('DieStage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('shows a placeholder when nothing is staged', () => {
    const fixture = TestBed.createComponent(DieStage);
    fixture.detectChanges();

    const value = fixture.nativeElement.querySelector('.die-stage-value') as HTMLElement;
    expect(value.textContent?.trim()).toBe('—');
  });

  it('immediately scrambles to a random face within the die range while rolling', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const fixture = TestBed.createComponent(DieStage);
    fixture.componentRef.setInput('staged', makeStaged({ value: null }));
    fixture.detectChanges();

    const value = fixture.nativeElement.querySelector('.die-stage-value') as HTMLElement;
    const el = fixture.nativeElement.querySelector('.die-stage') as HTMLElement;
    expect(value.textContent?.trim()).toBe('8');
    expect(el.classList.contains('die-stage--rolling')).toBe(true);
    expect(el.classList.contains('die-stage--attack')).toBe(true);
  });

  it('keeps cycling to new random faces every tick while rolling', () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(Math, 'random');
    spy.mockReturnValueOnce(0.99).mockReturnValueOnce(0).mockReturnValue(0.5);

    const fixture = TestBed.createComponent(DieStage);
    fixture.componentRef.setInput('staged', makeStaged({ value: null }));
    fixture.detectChanges();

    const value = fixture.nativeElement.querySelector('.die-stage-value') as HTMLElement;
    expect(value.textContent?.trim()).toBe('8');

    vi.advanceTimersByTime(60);
    fixture.detectChanges();
    expect(value.textContent?.trim()).toBe('1');
  });

  it('shows the revealed value, drops rolling, and stops scrambling for good', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(DieStage);
    fixture.componentRef.setInput('staged', makeStaged({ kind: 'heal', value: null }));
    fixture.detectChanges();

    fixture.componentRef.setInput('staged', makeStaged({ kind: 'heal', value: 4 }));
    fixture.detectChanges();

    const value = fixture.nativeElement.querySelector('.die-stage-value') as HTMLElement;
    const el = fixture.nativeElement.querySelector('.die-stage') as HTMLElement;
    expect(value.textContent?.trim()).toBe('4');
    expect(el.classList.contains('die-stage--rolling')).toBe(false);
    expect(el.classList.contains('die-stage--heal')).toBe(true);

    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(value.textContent?.trim()).toBe('4');
  });

  it('pulses briefly right when the value is revealed, then stops', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(DieStage);
    fixture.componentRef.setInput('staged', makeStaged({ value: null }));
    fixture.detectChanges();

    fixture.componentRef.setInput('staged', makeStaged({ value: 3 }));
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector('.die-stage') as HTMLElement;
    expect(el.classList.contains('die-stage--pulse')).toBe(true);

    vi.advanceTimersByTime(300);
    fixture.detectChanges();
    expect(el.classList.contains('die-stage--pulse')).toBe(false);
  });

  it('does not pulse while still rolling', () => {
    const fixture = TestBed.createComponent(DieStage);
    fixture.componentRef.setInput('staged', makeStaged({ value: null }));
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector('.die-stage') as HTMLElement;
    expect(el.classList.contains('die-stage--pulse')).toBe(false);
  });

  it('clears pending timers when the component is destroyed mid-scramble', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(DieStage);
    fixture.componentRef.setInput('staged', makeStaged({ value: null }));
    fixture.detectChanges();

    fixture.destroy();

    expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
  });

  it('skips the scramble entirely when the user prefers reduced motion', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: ReducedMotion, useValue: { enabled: signal(true) } }],
    });
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(DieStage);
    fixture.componentRef.setInput('staged', makeStaged({ value: null }));
    fixture.detectChanges();

    const value = fixture.nativeElement.querySelector('.die-stage-value') as HTMLElement;
    expect(value.textContent?.trim()).toBe('D8');

    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(value.textContent?.trim()).toBe('D8');
  });

  it('skips the reveal pulse when the user prefers reduced motion', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: ReducedMotion, useValue: { enabled: signal(true) } }],
    });
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(DieStage);
    fixture.componentRef.setInput('staged', makeStaged({ value: null }));
    fixture.detectChanges();

    fixture.componentRef.setInput('staged', makeStaged({ value: 3 }));
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector('.die-stage') as HTMLElement;
    expect(el.classList.contains('die-stage--pulse')).toBe(false);
  });
});
