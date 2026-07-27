import { Component, computed, input, output } from '@angular/core';
import type { DieDef, DieKind } from '../../domain/model/die';
import type { DieStatus } from '../../domain/engine/deck';

const KIND_ICON: Record<DieKind, string> = {
  attack: '⚔',
  heal: '✚',
  shield: '🛡',
};

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

  readonly icon = computed(() => KIND_ICON[this.def().kind]);

  onClick(): void {
    if (this.interactive()) {
      this.activated.emit();
    }
  }
}
