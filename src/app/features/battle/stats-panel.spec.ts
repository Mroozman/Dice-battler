import { TestBed } from '@angular/core/testing';
import { StatsPanel } from './stats-panel';

describe('StatsPanel', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('lists the three stats with icon, name and current value', () => {
    const fixture = TestBed.createComponent(StatsPanel);
    fixture.componentRef.setInput('stats', { strength: 3, vitality: 0, defense: 1 });
    fixture.detectChanges();

    const items = Array.from(fixture.nativeElement.querySelectorAll('.stats-panel-item')) as HTMLElement[];
    expect(items.map((i) => i.querySelector('.stats-panel-label')?.textContent)).toEqual([
      'Siła',
      'Żywotność',
      'Obrona',
    ]);
    expect(items.map((i) => i.querySelector('.stats-panel-value')?.textContent)).toEqual(['3', '0', '1']);
    expect(items.every((i) => (i.querySelector('.stats-panel-icon')?.textContent?.trim().length ?? 0) > 0)).toBe(
      true,
    );
  });

  it('exposes each stat to assistive tech through an aria-label', () => {
    const fixture = TestBed.createComponent(StatsPanel);
    fixture.componentRef.setInput('stats', { strength: 2, vitality: 1, defense: 0 });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-stat="strength"]').getAttribute('aria-label')).toBe('Siła: 2');
  });

  it('updates when the stats change', () => {
    const fixture = TestBed.createComponent(StatsPanel);
    fixture.componentRef.setInput('stats', { strength: 0, vitality: 0, defense: 0 });
    fixture.detectChanges();

    fixture.componentRef.setInput('stats', { strength: 1, vitality: 0, defense: 0 });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-stat="strength"] .stats-panel-value').textContent).toBe('1');
  });
});
