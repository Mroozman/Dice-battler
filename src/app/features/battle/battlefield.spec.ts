import { TestBed } from '@angular/core/testing';
import { Battlefield } from './battlefield';
import type { Combatant, CombatantId } from '../../domain/model/combatant';

function makeCombatant(id: string, hp: number, kind: Combatant['kind'] = 'enemy'): Combatant {
  return {
    id: id as CombatantId,
    name: id,
    archetypeKey: id,
    kind,
    hp,
    maxHp: 10,
    shield: 0,
    deck: { catalog: {}, pool: [], hand: [], discard: [] },
    dicePerTurn: 1,
  };
}

describe('Battlefield', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('renders one numbered slot per enemy, left to right', () => {
    const fixture = TestBed.createComponent(Battlefield);
    fixture.componentRef.setInput('enemies', [makeCombatant('e0', 5), makeCombatant('e1', 5)]);
    fixture.componentRef.setInput('player', makeCombatant('player', 20, 'player'));
    fixture.detectChanges();

    const numbers = Array.from(fixture.nativeElement.querySelectorAll('.enemy-number')).map(
      (el) => (el as HTMLElement).textContent,
    );
    expect(numbers).toEqual(['1', '2']);
  });

  it('marks a living, targetable enemy as targetable during player.selecting and emits targetPicked on click', () => {
    const fixture = TestBed.createComponent(Battlefield);
    const enemy = makeCombatant('e0', 5);
    fixture.componentRef.setInput('enemies', [enemy]);
    fixture.componentRef.setInput('player', makeCombatant('player', 20, 'player'));
    fixture.componentRef.setInput('targetableIds', [enemy.id]);
    fixture.componentRef.setInput('phase', 'player.selecting');
    let picked: CombatantId | null = null;
    fixture.componentInstance.targetPicked.subscribe((id) => (picked = id));
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.combatant-card') as NodeListOf<HTMLButtonElement>;
    expect(cards[0].classList.contains('combatant-card--targetable')).toBe(true);
    expect(cards[0].disabled).toBe(false);
    cards[0].click();

    expect(picked).toBe('e0');
  });

  it('does not treat a living enemy as targetable outside a targeting phase', () => {
    const fixture = TestBed.createComponent(Battlefield);
    const enemy = makeCombatant('e0', 5);
    fixture.componentRef.setInput('enemies', [enemy]);
    fixture.componentRef.setInput('player', makeCombatant('player', 20, 'player'));
    fixture.componentRef.setInput('targetableIds', [enemy.id]);
    fixture.componentRef.setInput('phase', 'enemy.acting');
    let picked: CombatantId | null = null;
    fixture.componentInstance.targetPicked.subscribe((id) => (picked = id));
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.combatant-card') as NodeListOf<HTMLButtonElement>;
    expect(cards[0].disabled).toBe(true);
    cards[0].click();

    expect(picked).toBeNull();
  });

  it('marks a dead enemy as dead regardless of phase', () => {
    const fixture = TestBed.createComponent(Battlefield);
    const enemy = makeCombatant('e0', 0);
    fixture.componentRef.setInput('enemies', [enemy]);
    fixture.componentRef.setInput('player', makeCombatant('player', 20, 'player'));
    fixture.componentRef.setInput('targetableIds', [enemy.id]);
    fixture.componentRef.setInput('phase', 'player.selecting');
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.combatant-card') as NodeListOf<HTMLButtonElement>;
    expect(cards[0].classList.contains('combatant-card--dead')).toBe(true);
    expect(cards[0].disabled).toBe(true);
  });

  it('renders the player card and forwards staged to the die stage', () => {
    const fixture = TestBed.createComponent(Battlefield);
    fixture.componentRef.setInput('enemies', []);
    fixture.componentRef.setInput('player', makeCombatant('player', 15, 'player'));
    fixture.componentRef.setInput('staged', {
      dieId: 'atk',
      sides: 6,
      kind: 'attack',
      ownerId: 'player',
      value: 4,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.die-stage-value')?.textContent?.trim()).toBe('4');
    const cards = fixture.nativeElement.querySelectorAll('.combatant-card') as NodeListOf<HTMLButtonElement>;
    expect(cards.length).toBe(1);
    expect(cards[0].classList.contains('combatant-card--player')).toBe(true);
  });

  it('only shows the enemy deck preview when deckPreviewEnabled is true', () => {
    const fixture = TestBed.createComponent(Battlefield);
    fixture.componentRef.setInput('enemies', [makeCombatant('e0', 5)]);
    fixture.componentRef.setInput('player', makeCombatant('player', 20, 'player'));
    fixture.componentRef.setInput('deckPreviewEnabled', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-deck-preview')).toBeNull();

    fixture.componentRef.setInput('deckPreviewEnabled', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-deck-preview')).toBeTruthy();
  });
});
