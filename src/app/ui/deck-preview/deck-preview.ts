import { Component, input } from '@angular/core';
import type { DeckViewEntry } from '../../domain/engine/deck';
import { DIE_KIND_ICON } from '../die-kind-icon';

@Component({
  selector: 'app-deck-preview',
  templateUrl: './deck-preview.html',
  styleUrl: './deck-preview.css',
})
export class DeckPreview {
  readonly entries = input<readonly DeckViewEntry[]>([]);

  readonly icon = DIE_KIND_ICON;
}
