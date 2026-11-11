import { Component, input, output } from '@angular/core';
import type { DieDef, DieId } from '../../domain/model/die';
import { ZERO_STATS, type PlayerStats } from '../../domain/model/stats';
import { rollBonus } from '../../domain/engine/stats';
import type { DeckViewEntry } from '../../domain/engine/deck';
import { Die } from '../../ui/die/die';

export type DeckPanelMode = 'battle' | 'reward';

@Component({
  selector: 'app-deck-panel',
  imports: [Die],
  templateUrl: './deck-panel.html',
  styleUrl: './deck-panel.css',
})
export class DeckPanel {
  readonly entries = input<readonly DeckViewEntry[]>([]);
  readonly mode = input<DeckPanelMode>('battle');
  readonly stats = input<PlayerStats>(ZERO_STATS);

  readonly dieActivated = output<DieId>();

  bonusFor(def: DieDef): number {
    return rollBonus(this.stats(), def.kind);
  }

  isInteractive(): boolean {
    return this.mode() === 'reward';
  }

  onActivate(dieId: DieId): void {
    this.dieActivated.emit(dieId);
  }
}
