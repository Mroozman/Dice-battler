import { TestBed } from '@angular/core/testing';
import { StageIntro } from './stage-intro';
import type { StageDef } from '../../domain/model/run';

function makeStage(index: number, kind: StageDef['kind'] = 'group'): StageDef {
  return { index, kind, tier: kind === 'boss' ? 'boss' : 1, enemies: [] };
}

describe('StageIntro', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('labels a regular stage by its 1-based number', () => {
    const fixture = TestBed.createComponent(StageIntro);
    fixture.componentRef.setInput('stage', makeStage(1));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.stage-intro-title').textContent.trim()).toBe('Etap 2');
  });

  it('labels the boss stage distinctly', () => {
    const fixture = TestBed.createComponent(StageIntro);
    fixture.componentRef.setInput('stage', makeStage(3, 'boss'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.stage-intro-title').textContent.trim()).toBe('BOSS');
  });

  it('shows the regeneration message only when something was healed', () => {
    const fixture = TestBed.createComponent(StageIntro);
    fixture.componentRef.setInput('stage', makeStage(1));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.stage-intro-heal')).toBeNull();

    fixture.componentRef.setInput('healedBy', 5);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.stage-intro-heal').textContent).toContain('5');
  });

  it('emits continue when the button is clicked', () => {
    const fixture = TestBed.createComponent(StageIntro);
    fixture.componentRef.setInput('stage', makeStage(0));
    let emitted = false;
    fixture.componentInstance.continue.subscribe(() => (emitted = true));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.stage-intro-continue') as HTMLButtonElement).click();

    expect(emitted).toBe(true);
  });
});
