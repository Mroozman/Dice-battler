import { Component, computed, input, output } from '@angular/core';
import type { PlayerStats, StatKind } from '../../domain/model/stats';
import type { StageDef } from '../../domain/model/run';
import { stageShadeClass } from '../../ui/stage-shade';
import { STAT_INFO, STAT_ORDER } from '../../ui/stat-info';

@Component({
  selector: 'app-level-up-screen',
  templateUrl: './level-up-screen.html',
  styleUrl: './level-up-screen.css',
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class LevelUpScreen {
  readonly stats = input.required<PlayerStats>();
  readonly stage = input.required<StageDef>();

  readonly chosen = output<StatKind>();

  readonly options = STAT_INFO;

  readonly shadeClass = computed(() => stageShadeClass(this.stage().index, this.stage().kind));

  onChoose(stat: StatKind): void {
    this.chosen.emit(stat);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const stat = STAT_ORDER[Number(event.key) - 1];
    if (stat) {
      event.preventDefault();
      this.onChoose(stat);
    }
  }
}
