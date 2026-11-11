import { Component, computed, input, output } from '@angular/core';
import type { DieDef } from '../../domain/model/die';
import type { DieStatus } from '../../domain/engine/deck';
import { DIE_KIND_ICON } from '../die-kind-icon';
import { dieTooltip } from '../tooltip-text';

@Component({
  selector: 'app-die',
  templateUrl: './die.html',
  styleUrl: './die.css',
})
export class Die {
  readonly def = input.required<DieDef>();
  readonly status = input<DieStatus>('pool');
  readonly selected = input(false);
  readonly interactive = input(false);
  readonly bonus = input(0);

  readonly activated = output<void>();

  readonly tooltip = computed(() => dieTooltip(this.def(), this.bonus()));

  readonly icon = computed(() => DIE_KIND_ICON[this.def().kind]);

  onClick(): void {
    if (this.interactive()) {
      this.activated.emit();
    }
  }
}
