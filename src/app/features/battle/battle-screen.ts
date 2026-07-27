import { Component, inject } from '@angular/core';
import { GameStore } from '../../core/game-store';
import { TurnEngine } from '../../core/turn-engine';
import type { CombatantId } from '../../domain/model/combatant';
import type { DieId } from '../../domain/model/die';
import { DeckPanel } from './deck-panel';
import { Battlefield } from './battlefield';
import { HandBar } from './hand-bar';

@Component({
  selector: 'app-battle-screen',
  imports: [DeckPanel, Battlefield, HandBar],
  templateUrl: './battle-screen.html',
  styleUrl: './battle-screen.css',
})
export class BattleScreen {
  private readonly turnEngine = inject(TurnEngine);
  protected readonly store = inject(GameStore);

  private awaitingTargetDieId(): DieId | null {
    const battle = this.store.battle();
    if (!battle) {
      return null;
    }
    if (battle.phase === 'player.retargeting') {
      return battle.resolveQueue[0]?.dieId ?? null;
    }
    return battle.selection.find((sel) => sel.targetId === null)?.dieId ?? null;
  }

  onDieToggled(dieId: DieId): void {
    this.store.dispatch({ type: 'player/toggleDie', dieId });
  }

  onTargetPicked(targetId: CombatantId): void {
    const dieId = this.awaitingTargetDieId();
    if (dieId) {
      this.store.dispatch({ type: 'player/setTarget', dieId, targetId });
    }
  }

  onConfirmed(): void {
    this.store.dispatch({ type: 'player/confirm' });
  }
}
