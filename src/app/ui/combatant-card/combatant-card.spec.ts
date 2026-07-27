import { TestBed } from '@angular/core/testing';
import { CombatantCard } from './combatant-card';
import type { Combatant, CombatantId } from '../../domain/model/combatant';

function makeCombatant(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: 'e0' as CombatantId,
    name: 'Padlinożerca',
    archetypeKey: 'scavenger',
    kind: 'enemy',
    hp: 5,
    maxHp: 7,
    shield: 0,
    deck: { catalog: {}, pool: [], hand: [], discard: [] },
    dicePerTurn: 1,
    ...overrides,
  };
}

describe('CombatantCard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('renders the name and forwards hp to the nested health bar', () => {
    const fixture = TestBed.createComponent(CombatantCard);
    fixture.componentRef.setInput('combatant', makeCombatant());
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Padlinożerca');
    expect(fixture.nativeElement.textContent).toContain('5 / 7');
  });

  it('is disabled and inert by default (idle state)', () => {
    const fixture = TestBed.createComponent(CombatantCard);
    fixture.componentRef.setInput('combatant', makeCombatant());
    let emitted = false;
    fixture.componentInstance.picked.subscribe(() => (emitted = true));
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    button.click();
    expect(emitted).toBe(false);
  });

  it('is clickable and emits picked when targetable', () => {
    const fixture = TestBed.createComponent(CombatantCard);
    fixture.componentRef.setInput('combatant', makeCombatant());
    fixture.componentRef.setInput('state', 'targetable');
    let emitted = false;
    fixture.componentInstance.picked.subscribe(() => (emitted = true));
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.classList.contains('combatant-card--targetable')).toBe(true);
    button.click();
    expect(emitted).toBe(true);
  });

  it.each(['selected', 'hurt', 'dead', 'acting'] as const)('applies the %s state class', (state) => {
    const fixture = TestBed.createComponent(CombatantCard);
    fixture.componentRef.setInput('combatant', makeCombatant());
    fixture.componentRef.setInput('state', state);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.classList.contains(`combatant-card--${state}`)).toBe(true);
  });

  it('distinguishes player and enemy cards', () => {
    const fixture = TestBed.createComponent(CombatantCard);
    fixture.componentRef.setInput('combatant', makeCombatant({ kind: 'player' }));
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.classList.contains('combatant-card--player')).toBe(true);
    expect(button.classList.contains('combatant-card--enemy')).toBe(false);
  });
});
