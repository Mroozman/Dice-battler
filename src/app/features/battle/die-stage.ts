import { Component, computed, effect, inject, input, signal } from '@angular/core';
import type { StagedRoll } from '../../domain/model/battle';
import { ReducedMotion } from '../../core/reduced-motion';

const SCRAMBLE_START_DELAY_MS = 60;
const SCRAMBLE_MAX_DELAY_MS = 180;
const SCRAMBLE_SLOWDOWN_FACTOR = 1.35;
const REVEAL_PULSE_MS = 300;

function randomDieFace(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

@Component({
  selector: 'app-die-stage',
  templateUrl: './die-stage.html',
  styleUrl: './die-stage.css',
})
export class DieStage {
  readonly staged = input<StagedRoll | null>(null);

  private readonly reducedMotion = inject(ReducedMotion);
  private readonly scrambleValue = signal<number | null>(null);
  private readonly pulsing = signal(false);

  readonly isPulsing = this.pulsing.asReadonly();

  readonly display = computed(() => {
    const staged = this.staged();
    if (!staged) {
      return '—';
    }
    if (staged.value !== null) {
      return String(staged.value);
    }
    const scramble = this.scrambleValue();
    return scramble === null ? `D${staged.sides}` : String(scramble);
  });

  constructor() {
    effect((onCleanup) => {
      const staged = this.staged();
      if (!staged || staged.value !== null || this.reducedMotion.enabled()) {
        this.scrambleValue.set(null);
        return;
      }

      const sides = staged.sides;
      let delay = SCRAMBLE_START_DELAY_MS;
      let timeoutId: ReturnType<typeof setTimeout>;

      const tick = (): void => {
        this.scrambleValue.set(randomDieFace(sides));
        timeoutId = setTimeout(tick, delay);
        delay = Math.min(delay * SCRAMBLE_SLOWDOWN_FACTOR, SCRAMBLE_MAX_DELAY_MS);
      };
      tick();

      onCleanup(() => clearTimeout(timeoutId));
    });

    effect((onCleanup) => {
      const staged = this.staged();
      if (!staged || staged.value === null || this.reducedMotion.enabled()) {
        return;
      }

      this.pulsing.set(true);
      const timeoutId = setTimeout(() => this.pulsing.set(false), REVEAL_PULSE_MS);

      onCleanup(() => clearTimeout(timeoutId));
    });
  }
}
