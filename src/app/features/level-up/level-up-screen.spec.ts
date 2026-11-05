import { TestBed } from '@angular/core/testing';
import { LevelUpScreen } from './level-up-screen';
import type { StageDef } from '../../domain/model/run';
import type { StatKind } from '../../domain/model/stats';

const STAGE: StageDef = { index: 1, kind: 'group', tier: 2, enemies: [] };

function createScreen(stats = { strength: 2, vitality: 0, defense: 1 }, stage: StageDef = STAGE) {
  const fixture = TestBed.createComponent(LevelUpScreen);
  fixture.componentRef.setInput('stats', stats);
  fixture.componentRef.setInput('stage', stage);
  const chosen: StatKind[] = [];
  fixture.componentInstance.chosen.subscribe((stat) => chosen.push(stat));
  fixture.detectChanges();
  return { fixture, chosen };
}

describe('LevelUpScreen', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('offers the three stats with name, icon, effect and a current → next preview', () => {
    const { fixture } = createScreen();

    const options = Array.from(fixture.nativeElement.querySelectorAll('.level-up-option')) as HTMLElement[];
    expect(options.length).toBe(3);
    expect(options.map((o) => o.querySelector('.level-up-label')?.textContent)).toEqual([
      'Siła',
      'Żywotność',
      'Obrona',
    ]);
    expect(options.map((o) => o.querySelector('.level-up-change')?.textContent?.trim())).toEqual([
      '2 → 3',
      '0 → 1',
      '1 → 2',
    ]);
    expect(options.every((o) => (o.querySelector('.level-up-icon')?.textContent?.trim().length ?? 0) > 0)).toBe(
      true,
    );
    expect(options[0].querySelector('.level-up-description')?.textContent).toContain('ataku');
  });

  it('emits the chosen stat when an option is clicked', () => {
    const { fixture, chosen } = createScreen();

    (fixture.nativeElement.querySelector('[data-stat="defense"]') as HTMLButtonElement).click();

    expect(chosen).toEqual(['defense']);
  });

  it('chooses a stat with the 1-3 number keys and ignores everything else', () => {
    const { chosen } = createScreen();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '4' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '1', ctrlKey: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '3', repeat: true }));

    expect(chosen).toEqual(['vitality']);
  });

  it('renders every option as a native, focusable button', () => {
    const { fixture } = createScreen();

    const buttons = fixture.nativeElement.querySelectorAll('.level-up-option') as NodeListOf<HTMLButtonElement>;
    expect(Array.from(buttons).every((b) => b.tagName === 'BUTTON' && b.type === 'button' && b.tabIndex === 0)).toBe(
      true,
    );
  });

  it('tints the background for the upcoming stage', () => {
    const { fixture } = createScreen(undefined, { index: 3, kind: 'boss', tier: 'boss', enemies: [] });

    expect(fixture.nativeElement.querySelector('.level-up').classList.contains('stage-shade--boss')).toBe(true);
  });
});
