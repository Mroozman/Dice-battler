import { Component, inject } from '@angular/core';
import { GameStore } from './core/game-store';
import { BattleScreen } from './features/battle/battle-screen';
import { StageIntro } from './features/stage-intro/stage-intro';
import { RewardScreen } from './features/reward/reward-screen';
import { RunOver } from './features/run-over/run-over';
import type { DieId } from './domain/model/die';

@Component({
  selector: 'app-root',
  imports: [BattleScreen, StageIntro, RewardScreen, RunOver],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly store = inject(GameStore);

  onStageContinue(): void {
    this.store.dispatch({ type: 'stage/enter' });
  }

  onRewardSwap(replacedId: DieId): void {
    this.store.dispatch({ type: 'reward/swap', replacedId });
  }

  onRewardSkip(): void {
    this.store.dispatch({ type: 'reward/skip' });
  }
}
