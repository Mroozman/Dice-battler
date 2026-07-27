import { TestBed } from '@angular/core/testing';
import { DieStage } from './die-stage';
import type { StagedRoll } from '../../domain/model/battle';
import type { CombatantId } from '../../domain/model/combatant';
import type { DieId } from '../../domain/model/die';

function makeStaged(overrides: Partial<StagedRoll> = {}): StagedRoll {
  return {
    dieId: 'atk' as DieId,
    sides: 6,
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

  it('shows a placeholder when nothing is staged', () => {
    const fixture = TestBed.createComponent(DieStage);
    fixture.detectChanges();

    const value = fixture.nativeElement.querySelector('.die-stage-value') as HTMLElement;
    expect(value.textContent?.trim()).toBe('—');
  });

  it('shows the die size while rolling (value not yet revealed)', () => {
    const fixture = TestBed.createComponent(DieStage);
    fixture.componentRef.setInput('staged', makeStaged({ sides: 8, value: null }));
    fixture.detectChanges();

    const value = fixture.nativeElement.querySelector('.die-stage-value') as HTMLElement;
    const el = fixture.nativeElement.querySelector('.die-stage') as HTMLElement;
    expect(value.textContent?.trim()).toBe('D8');
    expect(el.classList.contains('die-stage--rolling')).toBe(true);
    expect(el.classList.contains('die-stage--attack')).toBe(true);
  });

  it('shows the revealed value and drops the rolling class', () => {
    const fixture = TestBed.createComponent(DieStage);
    fixture.componentRef.setInput('staged', makeStaged({ kind: 'heal', value: 4 }));
    fixture.detectChanges();

    const value = fixture.nativeElement.querySelector('.die-stage-value') as HTMLElement;
    const el = fixture.nativeElement.querySelector('.die-stage') as HTMLElement;
    expect(value.textContent?.trim()).toBe('4');
    expect(el.classList.contains('die-stage--rolling')).toBe(false);
    expect(el.classList.contains('die-stage--heal')).toBe(true);
  });
});
