import { TestBed } from '@angular/core/testing';
import { RunOver } from './run-over';

describe('RunOver', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('shows a victory message with the victory styling', () => {
    const fixture = TestBed.createComponent(RunOver);
    fixture.componentRef.setInput('outcome', 'victory');
    fixture.detectChanges();

    const root = fixture.nativeElement.querySelector('.run-over') as HTMLElement;
    expect(root.textContent).toContain('Zwycięstwo');
    expect(root.classList.contains('run-over--victory')).toBe(true);
    expect(root.classList.contains('run-over--defeat')).toBe(false);
  });

  it('shows a defeat message with the defeat styling', () => {
    const fixture = TestBed.createComponent(RunOver);
    fixture.componentRef.setInput('outcome', 'defeat');
    fixture.detectChanges();

    const root = fixture.nativeElement.querySelector('.run-over') as HTMLElement;
    expect(root.textContent).toContain('Porażka');
    expect(root.classList.contains('run-over--defeat')).toBe(true);
  });
});
