import { Injectable, signal } from '@angular/core';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function readPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

@Injectable({ providedIn: 'root' })
export class ReducedMotion {
  private readonly _enabled = signal(readPrefersReducedMotion());

  readonly enabled = this._enabled.asReadonly();

  constructor() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    query.addEventListener('change', (event) => this._enabled.set(event.matches));
  }
}
