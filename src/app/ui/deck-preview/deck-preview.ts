import { Component, input } from '@angular/core';
import type { DeckViewEntry } from '../../domain/engine/deck';

@Component({
  selector: 'app-deck-preview',
  templateUrl: './deck-preview.html',
  styleUrl: './deck-preview.css',
})
export class DeckPreview {
  readonly entries = input<readonly DeckViewEntry[]>([]);
}
