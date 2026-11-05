import { Component, computed, inject, signal } from '@angular/core';
import { GameStore } from '../../core/game-store';
import { TurnEngine } from '../../core/turn-engine';
import type { CombatantId } from '../../domain/model/combatant';
import type { DieId } from '../../domain/model/die';
import { stageShadeClass } from '../../ui/stage-shade';
import { DeckPanel } from './deck-panel';
import { Battlefield } from './battlefield';
import { HandBar } from './hand-bar';
import { BattleLog } from './battle-log';
import { StatsPanel } from './stats-panel';

@Component({
  selector: 'app-battle-screen',
  imports: [DeckPanel, Battlefield, HandBar, BattleLog, StatsPanel],
  templateUrl: './battle-screen.html',
  styleUrl: './battle-screen.css',
})
export class BattleScreen {
  private readonly turnEngine = inject(TurnEngine);
  protected readonly store = inject(GameStore);

  private readonly _logOpen = signal(false);
  protected readonly logOpen = this._logOpen.asReadonly();

  protected readonly currentStage = computed(() => {
    const run = this.store.run();
    return run.stages[run.stageIndex];
  });

  protected readonly shadeClass = computed(() => {
    const stage = this.currentStage();
    return stage ? stageShadeClass(stage.index, stage.kind) : 'stage-shade--0';
  });

  protected readonly isBoss = computed(() => this.currentStage()?.kind === 'boss');

  protected readonly outcomeTitle = computed(() => {
    switch (this.store.battleOutcome()) {
      case 'victory':
        return 'Zwycięstwo!';
      case 'defeat':
        return 'Porażka';
      default:
        return '';
    }
  });

  onDieToggled(dieId: DieId): void {
    this.store.selectDie(dieId);
  }

  onTargetPicked(targetId: CombatantId): void {
    this.store.pickTarget(targetId);
  }

  onConfirmed(): void {
    this.store.dispatch({ type: 'player/confirm' });
  }

  toggleLog(): void {
    this._logOpen.update((open) => !open);
  }
}
