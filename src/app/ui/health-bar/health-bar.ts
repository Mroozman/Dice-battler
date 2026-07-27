import { Component, computed, input } from '@angular/core';

function clampPercent(value: number, max: number): number {
  if (max <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, (value / max) * 100));
}

@Component({
  selector: 'app-health-bar',
  templateUrl: './health-bar.html',
  styleUrl: './health-bar.css',
})
export class HealthBar {
  readonly hp = input.required<number>();
  readonly maxHp = input.required<number>();
  readonly shield = input(0);

  readonly hpPercent = computed(() => clampPercent(this.hp(), this.maxHp()));
  readonly shieldPercent = computed(() => clampPercent(this.shield(), this.maxHp()));

  readonly ariaLabel = computed(() => {
    const base = `${this.hp()} / ${this.maxHp()}`;
    return this.shield() > 0 ? `${base}, +${this.shield()} osłony` : base;
  });
}
