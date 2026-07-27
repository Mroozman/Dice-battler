import { Component, input, output } from '@angular/core';
import type { DieDef, DieId } from '../../domain/model/die';
import type { SelectedDie } from '../../domain/model/battle';
import type { DieStatus } from '../../domain/engine/deck';
import { Die } from '../../ui/die/die';

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

  readonly toggled = output<DieId>();
  readonly confirmed = output<void>();

  readonly handStatus: DieStatus = 'hand';

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
