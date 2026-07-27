import { Component, input, output } from '@angular/core';
import type { DieId } from '../../domain/model/die';
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

  readonly dieActivated = output<DieId>();

  isInteractive(): boolean {
    return this.mode() === 'reward';
  }

  onActivate(dieId: DieId): void {
    this.dieActivated.emit(dieId);
  }
}
