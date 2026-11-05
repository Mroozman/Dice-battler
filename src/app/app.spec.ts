import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { GameStore } from './core/game-store';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('shows the title screen, then the stage intro once a new run is started', async () => {
    const fixture = TestBed.createComponent(App);
    const compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    const startButton = compiled.querySelector('.title-screen-start') as HTMLButtonElement;
    expect(startButton).toBeTruthy();
    expect(compiled.querySelector('app-stage-intro')).toBeNull();

    startButton.click();
    fixture.detectChanges();

    const store = TestBed.inject(GameStore);
    await store.startNewRun();
    fixture.detectChanges();

    expect(compiled.querySelector('app-stage-intro')).toBeTruthy();
  });

  it('shows the level-up choice and returns to the stage intro after a stat is chosen', async () => {
    const fixture = TestBed.createComponent(App);
    const compiled = fixture.nativeElement as HTMLElement;
    const store = TestBed.inject(GameStore);
    await store.startNewRun();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (store as any)._state.set({ ...store.state(), screen: 'levelUp', run: { ...store.run(), stageIndex: 1 } });
    fixture.detectChanges();

    expect(compiled.querySelector('app-level-up-screen')).toBeTruthy();

    (compiled.querySelector('[data-stat="defense"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(store.run().stats.defense).toBe(1);
    expect(compiled.querySelector('app-stage-intro')).toBeTruthy();
    expect(compiled.querySelector('app-level-up-screen')).toBeNull();
  });

  it('renders the battle screen once the stage is entered', async () => {
    const fixture = TestBed.createComponent(App);
    const store = TestBed.inject(GameStore);
    await store.startNewRun();
    store.dispatch({ type: 'stage/enter' });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-battle-screen')).toBeTruthy();
  });
});
