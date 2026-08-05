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

  it('shows a loading placeholder before the run is ready, then the stage intro', async () => {
    const fixture = TestBed.createComponent(App);
    const compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    expect(compiled.querySelector('.app-loading')).toBeTruthy();

    const store = TestBed.inject(GameStore);
    await store.ready;
    fixture.detectChanges();

    expect(compiled.querySelector('app-stage-intro')).toBeTruthy();
  });

  it('renders the battle screen once the stage is entered', async () => {
    const fixture = TestBed.createComponent(App);
    const store = TestBed.inject(GameStore);
    await store.ready;
    store.dispatch({ type: 'stage/enter' });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-battle-screen')).toBeTruthy();
  });
});
