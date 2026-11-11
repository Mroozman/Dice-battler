import { Component, input, output } from '@angular/core';
import type { DieDef, DieId } from '../../domain/model/die';
import type { SelectedDie } from '../../domain/model/battle';
import type { DieStatus } from '../../domain/engine/deck';
import { Die } from '../../ui/die/die';
import { ZERO_STATS, type PlayerStats } from '../../domain/model/stats';
import { rollBonus } from '../../domain/engine/stats';

@Component({
  selector: 'app-hand-bar',
  imports: [Die],
  templateUrl: './hand-bar.html',
  styleUrl: './hand-bar.css',
})
export class HandBar {
  readonly hand = input<readonly DieDef[]>([]);
  readonly selection = input<readonly SelectedDie[]>([]);
  readonly canConfirm = input(false);
  readonly maxSelectable = input.required<number>();
  readonly stats = input<PlayerStats>(ZERO_STATS);

  readonly toggled = output<DieId>();
  readonly confirmed = output<void>();

  readonly handStatus: DieStatus = 'hand';

  bonusFor(def: DieDef): number {
    return rollBonus(this.stats(), def.kind);
  }

  isSelected(dieId: DieId): boolean {
    return this.selection().some((sel) => sel.dieId === dieId);
  }

  isSelectable(dieId: DieId): boolean {
    return this.isSelected(dieId) || this.selection().length < this.maxSelectable();
  }

  onToggle(dieId: DieId): void {
    this.toggled.emit(dieId);
  }

  onConfirm(): void {
    if (this.canConfirm()) {
      this.confirmed.emit();
    }
  }
}
