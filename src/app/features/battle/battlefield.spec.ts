import { TestBed } from '@angular/core/testing';
import { Battlefield } from './battlefield';
import type { Combatant, CombatantId } from '../../domain/model/combatant';
import type { StagedRoll } from '../../domain/model/battle';
import type { DieId } from '../../domain/model/die';

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
    fixture.componentRef.setInput('canPickTarget', true);
    let picked: CombatantId | null = null;
    fixture.componentInstance.targetPicked.subscribe((id) => (picked = id));
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.combatant-card') as NodeListOf<HTMLButtonElement>;
    expect(cards[0].classList.contains('combatant-card--targetable')).toBe(true);
    expect(cards[0].disabled).toBe(false);
    cards[0].click();

    expect(picked).toBe('e0');
  });

  it('does not make a living enemy clickable while no die is awaiting a target', () => {
    const fixture = TestBed.createComponent(Battlefield);
    const enemy = makeCombatant('e0', 5);
    fixture.componentRef.setInput('enemies', [enemy]);
    fixture.componentRef.setInput('player', makeCombatant('player', 20, 'player'));
    fixture.componentRef.setInput('targetableIds', [enemy.id]);
    fixture.componentRef.setInput('phase', 'player.selecting');
    fixture.componentRef.setInput('canPickTarget', false);
    let picked: CombatantId | null = null;
    fixture.componentInstance.targetPicked.subscribe((id) => (picked = id));
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.combatant-card') as NodeListOf<HTMLButtonElement>;
    expect(cards[0].classList.contains('combatant-card--targetable')).toBe(false);
    expect(cards[0].disabled).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));

    expect(picked).toBeNull();
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

  it('picks a targetable enemy via its number key, numbered left to right', () => {
    const fixture = TestBed.createComponent(Battlefield);
    const enemy0 = makeCombatant('e0', 5);
    const enemy1 = makeCombatant('e1', 5);
    fixture.componentRef.setInput('enemies', [enemy0, enemy1]);
    fixture.componentRef.setInput('player', makeCombatant('player', 20, 'player'));
    fixture.componentRef.setInput('targetableIds', [enemy0.id, enemy1.id]);
    fixture.componentRef.setInput('phase', 'player.selecting');
    fixture.componentRef.setInput('canPickTarget', true);
    let picked: CombatantId | null = null;
    fixture.componentInstance.targetPicked.subscribe((id) => (picked = id));
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));

    expect(picked).toBe('e1');
  });

  it('ignores a number key for an enemy that is not targetable', () => {
    const fixture = TestBed.createComponent(Battlefield);
    const enemy = makeCombatant('e0', 5);
    fixture.componentRef.setInput('enemies', [enemy]);
    fixture.componentRef.setInput('player', makeCombatant('player', 20, 'player'));
    fixture.componentRef.setInput('targetableIds', [enemy.id]);
    fixture.componentRef.setInput('phase', 'enemy.acting');
    let picked: CombatantId | null = null;
    fixture.componentInstance.targetPicked.subscribe((id) => (picked = id));
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));

    expect(picked).toBeNull();
  });

  it('ignores a number key with no matching enemy slot, without throwing', () => {
    const fixture = TestBed.createComponent(Battlefield);
    const enemy = makeCombatant('e0', 5);
    fixture.componentRef.setInput('enemies', [enemy]);
    fixture.componentRef.setInput('player', makeCombatant('player', 20, 'player'));
    fixture.componentRef.setInput('targetableIds', [enemy.id]);
    fixture.componentRef.setInput('phase', 'player.selecting');
    let picked: CombatantId | null = null;
    fixture.componentInstance.targetPicked.subscribe((id) => (picked = id));
    fixture.detectChanges();

    expect(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: '9' }))).not.toThrow();
    expect(picked).toBeNull();
  });

  it('ignores a number key combined with a modifier, so browser/OS shortcuts stay intact', () => {
    const fixture = TestBed.createComponent(Battlefield);
    const enemy = makeCombatant('e0', 5);
    fixture.componentRef.setInput('enemies', [enemy]);
    fixture.componentRef.setInput('player', makeCombatant('player', 20, 'player'));
    fixture.componentRef.setInput('targetableIds', [enemy.id]);
    fixture.componentRef.setInput('phase', 'player.selecting');
    let picked: CombatantId | null = null;
    fixture.componentInstance.targetPicked.subscribe((id) => (picked = id));
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1', ctrlKey: true }));

    expect(picked).toBeNull();
  });

  it('ignores an auto-repeated keydown while a number key is held', () => {
    const fixture = TestBed.createComponent(Battlefield);
    const enemy = makeCombatant('e0', 5);
    fixture.componentRef.setInput('enemies', [enemy]);
    fixture.componentRef.setInput('player', makeCombatant('player', 20, 'player'));
    fixture.componentRef.setInput('targetableIds', [enemy.id]);
    fixture.componentRef.setInput('phase', 'player.selecting');
    let pickedCount = 0;
    fixture.componentInstance.targetPicked.subscribe(() => pickedCount++);
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1', repeat: true }));

    expect(pickedCount).toBe(0);
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

  it('shows the turn message above the enemies', () => {
    const fixture = TestBed.createComponent(Battlefield);
    fixture.componentRef.setInput('enemies', [makeCombatant('e0', 5)]);
    fixture.componentRef.setInput('player', makeCombatant('player', 20, 'player'));
    fixture.componentRef.setInput('turnMessage', { side: 'player', text: 'Tura gracza: wybierz kości' });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const banner = root.querySelector('.turn-banner') as HTMLElement;
    const enemyRow = root.querySelector('.enemy-row') as HTMLElement;
    expect(banner.textContent?.trim()).toBe('Tura gracza: wybierz kości');
    expect(banner.compareDocumentPosition(enemyRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('highlights only the living enemies that are currently picked as targets', () => {
    const fixture = TestBed.createComponent(Battlefield);
    const enemies = [makeCombatant('e0', 5), makeCombatant('e1', 5), makeCombatant('e2', 0)];
    fixture.componentRef.setInput('enemies', enemies);
    fixture.componentRef.setInput('player', makeCombatant('player', 20, 'player'));
    fixture.componentRef.setInput('pickedTargetIds', ['e1', 'e2']);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.combatant-card--enemy') as NodeListOf<HTMLElement>;
    expect(Array.from(cards).map((card) => card.classList.contains('combatant-card--targeted'))).toEqual([
      false,
      true,
      false,
    ]);
  });

  it('hides the enemy number badge and marks the card as boss during a boss encounter', () => {
    const fixture = TestBed.createComponent(Battlefield);
    const enemy = makeCombatant('boss', 30);
    fixture.componentRef.setInput('enemies', [enemy]);
    fixture.componentRef.setInput('player', makeCombatant('player', 20, 'player'));
    fixture.componentRef.setInput('isBoss', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.enemy-number')).toBeNull();
    expect(fixture.nativeElement.querySelector('.enemy-row')?.classList.contains('enemy-row--boss')).toBe(true);
    const card = fixture.nativeElement.querySelector('.combatant-card--enemy') as HTMLElement;
    expect(card.classList.contains('combatant-card--boss')).toBe(true);
  });

  it('shows the enemy number badge and no boss styling outside a boss encounter', () => {
    const fixture = TestBed.createComponent(Battlefield);
    const enemy = makeCombatant('e0', 5);
    fixture.componentRef.setInput('enemies', [enemy]);
    fixture.componentRef.setInput('player', makeCombatant('player', 20, 'player'));
    fixture.componentRef.setInput('isBoss', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.enemy-number')).toBeTruthy();
    const card = fixture.nativeElement.querySelector('.combatant-card--enemy') as HTMLElement;
    expect(card.classList.contains('combatant-card--boss')).toBe(false);
  });

  describe('bonus die', () => {
    const PLAYER_ID = 'player' as CombatantId;
    const STATS = { strength: 2, vitality: 1, defense: 0 };

    function createWithStaged(ownerId: string, kind: StagedRoll['kind'], value: number | null) {
      const fixture = TestBed.createComponent(Battlefield);
      fixture.componentRef.setInput('player', makeCombatant('player', 20, 'player'));
      fixture.componentRef.setInput('stats', STATS);
      fixture.componentRef.setInput('staged', {
        dieId: 'd' as DieId,
        sides: 6,
        kind,
        ownerId: ownerId as CombatantId,
        value,
      });
      fixture.detectChanges();
      return fixture;
    }

    it('shows the stat bonus for the staged player roll next to the roll die', () => {
      const fixture = createWithStaged(PLAYER_ID, 'attack', null);

      const bonus = fixture.nativeElement.querySelector('.bonus-die') as HTMLElement;
      expect(bonus.classList.contains('bonus-die--hidden')).toBe(false);
      expect(bonus.querySelector('.bonus-die-value')?.textContent).toBe('+2');
      expect(fixture.componentInstance.stagedBonus()).toBe(2);
    });

    it('uses the stat matching the staged die kind', () => {
      expect(createWithStaged(PLAYER_ID, 'heal', 3).componentInstance.stagedBonus()).toBe(1);
      expect(createWithStaged(PLAYER_ID, 'shield', 3).componentInstance.stagedBonus()).toBe(0);
    });

    it('hides the bonus for enemy rolls and when nothing is staged', () => {
      const enemyRoll = createWithStaged('e0', 'attack', 4);
      expect(enemyRoll.componentInstance.stagedBonus()).toBeNull();
      expect(enemyRoll.nativeElement.querySelector('.bonus-die').classList.contains('bonus-die--hidden')).toBe(true);

      const idle = TestBed.createComponent(Battlefield);
      idle.componentRef.setInput('player', makeCombatant('player', 20, 'player'));
      idle.detectChanges();
      expect(idle.componentInstance.stagedBonus()).toBeNull();
    });
  });
});
