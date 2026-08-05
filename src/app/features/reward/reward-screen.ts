import { Component, input, output } from '@angular/core';
import type { DieDef, DieId } from '../../domain/model/die';
import type { DeckViewEntry } from '../../domain/engine/deck';
import { Die } from '../../ui/die/die';
import { DeckPanel } from '../battle/deck-panel';

@Component({
  selector: 'app-reward-screen',
  imports: [Die, DeckPanel],
  templateUrl: './reward-screen.html',
  styleUrl: './reward-screen.css',
})
export class RewardScreen {
  readonly reward = input.required<DieDef>();
  readonly catalog = input<readonly DeckViewEntry[]>([]);
  readonly playerHp = input(0);

  readonly swap = output<DieId>();
  readonly skip = output<void>();

  onDieActivated(dieId: DieId): void {
    this.swap.emit(dieId);
  }

  onSkip(): void {
    this.skip.emit();
  }
}
