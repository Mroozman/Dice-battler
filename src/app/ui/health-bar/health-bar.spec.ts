import { TestBed } from '@angular/core/testing';
import { HealthBar } from './health-bar';

describe('HealthBar', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('renders the hp fraction as a percentage width', () => {
    const fixture = TestBed.createComponent(HealthBar);
    fixture.componentRef.setInput('hp', 5);
    fixture.componentRef.setInput('maxHp', 20);
    fixture.detectChanges();

    const hpFill = fixture.nativeElement.querySelector('.health-bar-hp') as HTMLElement;
    expect(hpFill.style.width).toBe('25%');
    expect(fixture.nativeElement.textContent).toContain('5 / 20');
  });

  it('shows no shield overlay when shield is zero', () => {
    const fixture = TestBed.createComponent(HealthBar);
    fixture.componentRef.setInput('hp', 10);
    fixture.componentRef.setInput('maxHp', 10);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.health-bar-shield')).toBeNull();
  });

  it('renders a shield overlay proportional to maxHp when shield is set', () => {
    const fixture = TestBed.createComponent(HealthBar);
    fixture.componentRef.setInput('hp', 10);
    fixture.componentRef.setInput('maxHp', 20);
    fixture.componentRef.setInput('shield', 5);
    fixture.detectChanges();

    const shieldFill = fixture.nativeElement.querySelector('.health-bar-shield') as HTMLElement;
    expect(shieldFill.style.width).toBe('25%');
    expect(fixture.nativeElement.textContent).toContain('+5');
  });

  it('never exceeds 100 percent even if hp is above maxHp', () => {
    const fixture = TestBed.createComponent(HealthBar);
    fixture.componentRef.setInput('hp', 30);
    fixture.componentRef.setInput('maxHp', 20);
    fixture.detectChanges();

    const hpFill = fixture.nativeElement.querySelector('.health-bar-hp') as HTMLElement;
    expect(hpFill.style.width).toBe('100%');
  });
});
