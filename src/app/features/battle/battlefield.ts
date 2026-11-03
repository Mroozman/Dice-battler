import { Component, input, output } from '@angular/core';
import type { Combatant, CombatantId } from '../../domain/model/combatant';
import type { BattlePhase, StagedRoll } from '../../domain/model/battle';
import { CombatantCard, type CombatantCardState } from '../../ui/combatant-card/combatant-card';
import type { TurnMessage } from '../../domain/engine/turn-message';
import { DieStage } from './die-stage';
import { TurnBanner } from './turn-banner';

const TARGETING_PHASES: ReadonlySet<BattlePhase> = new Set(['player.selecting', 'player.retargeting']);

@Component({
  selector: 'app-battlefield',
  imports: [CombatantCard, DieStage, TurnBanner],
  templateUrl: './battlefield.html',
  styleUrl: './battlefield.css',
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class Battlefield {
  readonly enemies = input<readonly Combatant[]>([]);
  readonly player = input.required<Combatant>();
  readonly targetableIds = input<readonly CombatantId[]>([]);
  readonly canPickTarget = input(false);
  readonly pickedTargetIds = input<readonly CombatantId[]>([]);
  readonly turnMessage = input<TurnMessage | null>(null);
  readonly phase = input<BattlePhase>('player.selecting');
  readonly staged = input<StagedRoll | null>(null);
  readonly deckPreviewEnabled = input(false);
  readonly isBoss = input(false);

  readonly targetPicked = output<CombatantId>();

  enemyState(enemy: Combatant): CombatantCardState {
    if (enemy.hp <= 0) {
      return 'dead';
    }
    if (this.canPickTarget() && TARGETING_PHASES.has(this.phase()) && this.targetableIds().includes(enemy.id)) {
      return 'targetable';
    }
    return 'idle';
  }

  onEnemyPicked(enemyId: CombatantId): void {
    this.targetPicked.emit(enemyId);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const slot = Number(event.key);
    if (!Number.isInteger(slot) || slot < 1 || slot > this.enemies().length) {
      return;
    }
    const enemy = this.enemies()[slot - 1];
    if (this.enemyState(enemy) !== 'targetable') {
      return;
    }
    event.preventDefault();
    this.onEnemyPicked(enemy.id);
  }
}
