import { Component, input, output } from '@angular/core';
import type { Combatant, CombatantId } from '../../domain/model/combatant';
import type { BattlePhase, StagedRoll } from '../../domain/model/battle';
import { CombatantCard, type CombatantCardState } from '../../ui/combatant-card/combatant-card';
import { DieStage } from './die-stage';

const TARGETING_PHASES: ReadonlySet<BattlePhase> = new Set(['player.selecting', 'player.retargeting']);

@Component({
  selector: 'app-battlefield',
  imports: [CombatantCard, DieStage],
  templateUrl: './battlefield.html',
  styleUrl: './battlefield.css',
})
export class Battlefield {
  readonly enemies = input<readonly Combatant[]>([]);
  readonly player = input.required<Combatant>();
  readonly targetableIds = input<readonly CombatantId[]>([]);
  readonly phase = input<BattlePhase>('player.selecting');
  readonly staged = input<StagedRoll | null>(null);
  readonly deckPreviewEnabled = input(false);

  readonly targetPicked = output<CombatantId>();

  enemyState(enemy: Combatant): CombatantCardState {
    if (enemy.hp <= 0) {
      return 'dead';
    }
    if (TARGETING_PHASES.has(this.phase()) && this.targetableIds().includes(enemy.id)) {
      return 'targetable';
    }
    return 'idle';
  }

  onEnemyPicked(enemyId: CombatantId): void {
    this.targetPicked.emit(enemyId);
  }
}
