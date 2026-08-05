import { Component, computed, input, output } from '@angular/core';
import type { StageDef } from '../../domain/model/run';

@Component({
  selector: 'app-stage-intro',
  templateUrl: './stage-intro.html',
  styleUrl: './stage-intro.css',
})
export class StageIntro {
  readonly stage = input.required<StageDef>();
  readonly healedBy = input(0);

  readonly continue = output<void>();

  readonly title = computed(() => (this.stage().kind === 'boss' ? 'BOSS' : `Etap ${this.stage().index + 1}`));

  onContinue(): void {
    this.continue.emit();
  }
}
