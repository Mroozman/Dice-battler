import { Component, computed, effect, inject, input, signal } from '@angular/core';
import type { DieKind } from '../../domain/model/die';
import { ReducedMotion } from '../../core/reduced-motion';
import { DIE_KIND_ICON } from '../../ui/die-kind-icon';
import { bonusTooltip } from '../../ui/tooltip-text';

const REVEAL_PULSE_MS = 300;

@Component({
  selector: 'app-bonus-die',
  templateUrl: './bonus-die.html',
  styleUrl: './bonus-die.css',
})
export class BonusDie {
  public readonly bonus = input<number | null>(null);
  public readonly kind = input<DieKind | null>(null);
  public readonly revealed = input(false);

  private readonly reducedMotion = inject(ReducedMotion);
  private readonly pulsing = signal(false);

  public readonly isPulsing = this.pulsing.asReadonly();
  public readonly isVisible = computed(() => (this.bonus() ?? 0) > 0 && this.kind() !== null);
  public readonly display = computed(() => `+${this.bonus() ?? 0}`);
  public readonly icon = computed(() => {
    const kind = this.kind();
    return kind ? DIE_KIND_ICON[kind] : '';
  });
  public readonly tooltip = computed(() => {
    const kind = this.kind();
    const bonus = this.bonus();
    return kind && bonus !== null ? bonusTooltip(kind, bonus) : '';
  });

  constructor() {
    effect((onCleanup) => {
      if (!this.revealed() || !this.isVisible() || this.reducedMotion.enabled()) {
        return;
      }
      this.pulsing.set(true);
      const timeoutId = setTimeout(() => this.pulsing.set(false), REVEAL_PULSE_MS);
      onCleanup(() => clearTimeout(timeoutId));
    });
  }
}
