import { Component, computed, input, output } from '@angular/core';
import type { DieDef } from '../../domain/model/die';
import type { DieStatus } from '../../domain/engine/deck';
import { DIE_KIND_ICON } from '../die-kind-icon';

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

  readonly activated = output<void>();

  readonly icon = computed(() => DIE_KIND_ICON[this.def().kind]);

  onClick(): void {
    if (this.interactive()) {
      this.activated.emit();
    }
  }
}
