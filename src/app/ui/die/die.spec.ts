import { TestBed } from '@angular/core/testing';
import { Die } from './die';
import type { DieDef, DieId } from '../../domain/model/die';

function makeDef(kind: DieDef['kind'], sides: DieDef['sides'] = 6): DieDef {
  return { id: 'd1' as DieId, sides, kind, label: `D${sides}` };
}

describe('Die', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('renders the label and a kind class', () => {
    const fixture = TestBed.createComponent(Die);
    fixture.componentRef.setInput('def', makeDef('attack'));
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.textContent).toContain('D6');
    expect(button.classList.contains('die--attack')).toBe(true);
  });

  it.each([
    ['attack', 'die--attack'],
    ['heal', 'die--heal'],
    ['shield', 'die--shield'],
  ] as const)('applies %s styling via a class, not color alone', (kind, expectedClass) => {
    const fixture = TestBed.createComponent(Die);
    fixture.componentRef.setInput('def', makeDef(kind));
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.classList.contains(expectedClass)).toBe(true);
    expect(button.querySelector('.die-icon')?.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('is disabled and does not emit activated when not interactive', () => {
    const fixture = TestBed.createComponent(Die);
    fixture.componentRef.setInput('def', makeDef('attack'));
    fixture.componentRef.setInput('interactive', false);
    let emitted = false;
    fixture.componentInstance.activated.subscribe(() => (emitted = true));
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    button.click();

    expect(emitted).toBe(false);
  });

  it('emits activated on click when interactive', () => {
    const fixture = TestBed.createComponent(Die);
    fixture.componentRef.setInput('def', makeDef('attack'));
    fixture.componentRef.setInput('interactive', true);
    let emitted = false;
    fixture.componentInstance.activated.subscribe(() => (emitted = true));
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    button.click();

    expect(emitted).toBe(true);
  });

  it('reflects selected and discard status as classes', () => {
    const fixture = TestBed.createComponent(Die);
    fixture.componentRef.setInput('def', makeDef('heal'));
    fixture.componentRef.setInput('selected', true);
    fixture.componentRef.setInput('status', 'discard');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.classList.contains('die--selected')).toBe(true);
    expect(button.classList.contains('die--discard')).toBe(true);
  });
});
