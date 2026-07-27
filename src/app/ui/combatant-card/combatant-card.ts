import { Component, input, output } from '@angular/core';
import type { Combatant } from '../../domain/model/combatant';
import { HealthBar } from '../health-bar/health-bar';

export type CombatantCardState = 'idle' | 'targetable' | 'selected' | 'hurt' | 'dead' | 'acting';

@Component({
  selector: 'app-combatant-card',
  imports: [HealthBar],
  templateUrl: './combatant-card.html',
  styleUrl: './combatant-card.css',
})
export class CombatantCard {
  readonly combatant = input.required<Combatant>();
  readonly state = input<CombatantCardState>('idle');

  readonly picked = output<void>();

  onClick(): void {
    if (this.state() === 'targetable') {
      this.picked.emit();
    }
  }
}
