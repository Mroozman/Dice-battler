import { TestBed } from '@angular/core/testing';
import { TitleScreen } from './title-screen';

describe('TitleScreen', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('shows the game name and an enabled start button', () => {
    const fixture = TestBed.createComponent(TitleScreen);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const button = root.querySelector('.title-screen-start') as HTMLButtonElement;
    expect(root.textContent).toContain('Dice Battler');
    expect(button.disabled).toBe(false);
    expect(button.textContent?.trim()).toBe('Nowa gra');
  });

  it('emits start and switches to a disabled loading state on click', () => {
    const fixture = TestBed.createComponent(TitleScreen);
    fixture.detectChanges();

    let emitted = 0;
    fixture.componentInstance.start.subscribe(() => emitted++);

    const button = fixture.nativeElement.querySelector('.title-screen-start') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(emitted).toBe(1);
    expect(button.disabled).toBe(true);
    expect(button.textContent?.trim()).toBe('Ładowanie…');
  });

  it('does not emit start again on a second click while already starting', () => {
    const fixture = TestBed.createComponent(TitleScreen);
    fixture.detectChanges();

    let emitted = 0;
    fixture.componentInstance.start.subscribe(() => emitted++);

    const button = fixture.nativeElement.querySelector('.title-screen-start') as HTMLButtonElement;
    button.click();
    button.click();
    fixture.detectChanges();

    expect(emitted).toBe(1);
  });
});
