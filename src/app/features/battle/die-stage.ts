import { Component, computed, input } from '@angular/core';
import type { StagedRoll } from '../../domain/model/battle';

@Component({
  selector: 'app-die-stage',
  templateUrl: './die-stage.html',
  styleUrl: './die-stage.css',
})
export class DieStage {
  readonly staged = input<StagedRoll | null>(null);

  readonly display = computed(() => {
    const staged = this.staged();
    if (!staged) {
      return '—';
    }
    return staged.value === null ? `D${staged.sides}` : String(staged.value);
  });
}
