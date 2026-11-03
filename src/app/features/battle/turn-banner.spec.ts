import { TestBed } from '@angular/core/testing';
import { TurnBanner } from './turn-banner';

describe('TurnBanner', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('shows the message text as a polite live region', () => {
    const fixture = TestBed.createComponent(TurnBanner);
    fixture.componentRef.setInput('message', { side: 'player', text: 'Tura gracza: wybierz cel' });
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.turn-banner') as HTMLElement;
    expect(banner.textContent?.trim()).toBe('Tura gracza: wybierz cel');
    expect(banner.getAttribute('role')).toBe('status');
    expect(banner.getAttribute('aria-live')).toBe('polite');
  });

  it('marks whose turn it is with a side class', () => {
    const fixture = TestBed.createComponent(TurnBanner);
    fixture.componentRef.setInput('message', { side: 'enemy', text: 'Tura przeciwnika: wybór kości' });
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.turn-banner') as HTMLElement;
    expect(banner.classList.contains('turn-banner--enemy')).toBe(true);
    expect(banner.classList.contains('turn-banner--player')).toBe(false);
  });

  it('renders an empty banner without a message', () => {
    const fixture = TestBed.createComponent(TurnBanner);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.turn-banner').textContent.trim()).toBe('');
  });
});
