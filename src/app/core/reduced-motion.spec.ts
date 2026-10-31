import { TestBed } from '@angular/core/testing';
import { ReducedMotion } from './reduced-motion';

function mockMatchMedia(initialMatches: boolean) {
  const listeners: Array<(event: { matches: boolean }) => void> = [];
  const mediaQueryList = {
    matches: initialMatches,
    addEventListener: (_type: string, listener: (event: { matches: boolean }) => void) => {
      listeners.push(listener);
    },
    removeEventListener: () => {},
  };
  window.matchMedia = vi.fn().mockReturnValue(mediaQueryList) as typeof window.matchMedia;

  return {
    emitChange(matches: boolean): void {
      listeners.forEach((listener) => listener({ matches }));
    },
  };
}

describe('ReducedMotion', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    delete (window as { matchMedia?: typeof window.matchMedia }).matchMedia;
  });

  it('reflects the initial OS preference when it is off', () => {
    mockMatchMedia(false);
    const service = TestBed.inject(ReducedMotion);

    expect(service.enabled()).toBe(false);
  });

  it('reflects the initial OS preference when it is on', () => {
    mockMatchMedia(true);
    const service = TestBed.inject(ReducedMotion);

    expect(service.enabled()).toBe(true);
  });

  it('updates live when the OS preference changes', () => {
    const media = mockMatchMedia(false);
    const service = TestBed.inject(ReducedMotion);
    expect(service.enabled()).toBe(false);

    media.emitChange(true);
    expect(service.enabled()).toBe(true);

    media.emitChange(false);
    expect(service.enabled()).toBe(false);
  });
});
