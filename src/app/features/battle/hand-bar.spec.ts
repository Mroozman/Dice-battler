import { TestBed } from '@angular/core/testing';
import { HandBar } from './hand-bar';
import type { DieDef, DieId } from '../../domain/model/die';
import type { SelectedDie } from '../../domain/model/battle';
import type { CombatantId } from '../../domain/model/combatant';

function makeDie(id: string, kind: DieDef['kind'] = 'attack'): DieDef {
  return { id: id as DieId, sides: 6, kind, label: 'D6' };
}

describe('HandBar', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('renders one Die per hand entry', () => {
    const fixture = TestBed.createComponent(HandBar);
    fixture.componentRef.setInput('hand', [makeDie('a'), makeDie('b'), makeDie('c')]);
    fixture.componentRef.setInput('maxSelectable', 2);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.die').length).toBe(3);
  });

  it('emits toggled with the die id when an unselected, selectable die is clicked', () => {
    const fixture = TestBed.createComponent(HandBar);
    fixture.componentRef.setInput('hand', [makeDie('a'), makeDie('b'), makeDie('c')]);
    fixture.componentRef.setInput('maxSelectable', 2);
    let toggledId: DieId | null = null;
    fixture.componentInstance.toggled.subscribe((id) => (toggledId = id));
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.die') as NodeListOf<HTMLButtonElement>;
    buttons[0].click();

    expect(toggledId).toBe('a');
  });

  it('blocks selecting a third die once maxSelectable dice are already selected', () => {
    const fixture = TestBed.createComponent(HandBar);
    const selection: SelectedDie[] = [
      { dieId: 'a' as DieId, targetId: 'e0' as CombatantId },
      { dieId: 'b' as DieId, targetId: 'e0' as CombatantId },
    ];
    fixture.componentRef.setInput('hand', [makeDie('a'), makeDie('b'), makeDie('c')]);
    fixture.componentRef.setInput('selection', selection);
    fixture.componentRef.setInput('maxSelectable', 2);
    let toggledId: DieId | null = null;
    fixture.componentInstance.toggled.subscribe((id) => (toggledId = id));
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.die') as NodeListOf<HTMLButtonElement>;
    expect(buttons[2].disabled).toBe(true);
    buttons[2].click();
    expect(toggledId).toBeNull();

    // An already-selected die stays clickable so it can be deselected.
    expect(buttons[0].disabled).toBe(false);
    buttons[0].click();
    expect(toggledId).toBe('a');
  });

  it('disables the confirm button until canConfirm is true, then emits confirmed', () => {
    const fixture = TestBed.createComponent(HandBar);
    fixture.componentRef.setInput('hand', [makeDie('a')]);
    fixture.componentRef.setInput('maxSelectable', 2);
    fixture.componentRef.setInput('canConfirm', false);
    let confirmed = false;
    fixture.componentInstance.confirmed.subscribe(() => (confirmed = true));
    fixture.detectChanges();

    const confirmButton = fixture.nativeElement.querySelector('.hand-bar-confirm') as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(true);

    fixture.componentRef.setInput('canConfirm', true);
    fixture.detectChanges();
    expect(confirmButton.disabled).toBe(false);
    confirmButton.click();

    expect(confirmed).toBe(true);
  });
});
