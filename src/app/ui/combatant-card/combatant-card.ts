import { Component, computed, input, output } from '@angular/core';
import type { Combatant } from '../../domain/model/combatant';
import { deckView, type DeckViewEntry } from '../../domain/engine/deck';
import { HealthBar } from '../health-bar/health-bar';
import { DeckPreview } from '../deck-preview/deck-preview';

export type CombatantCardState = 'idle' | 'targetable' | 'selected' | 'hurt' | 'dead' | 'acting';

@Component({
  selector: 'app-combatant-card',
  imports: [HealthBar, DeckPreview],
  templateUrl: './combatant-card.html',
  styleUrl: './combatant-card.css',
})
export class CombatantCard {
  readonly combatant = input.required<Combatant>();
  readonly state = input<CombatantCardState>('idle');
  readonly showDeckPreview = input(false);

  readonly picked = output<void>();

  readonly deckEntries = computed<readonly DeckViewEntry[]>(() => deckView(this.combatant().deck));

  onClick(): void {
    if (this.state() === 'targetable') {
      this.picked.emit();
    }
  }
}
