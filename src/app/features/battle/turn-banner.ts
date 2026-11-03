import { Component, input } from '@angular/core';
import type { TurnMessage } from '../../domain/engine/turn-message';

@Component({
  selector: 'app-turn-banner',
  templateUrl: './turn-banner.html',
  styleUrl: './turn-banner.css',
})
export class TurnBanner {
  readonly message = input<TurnMessage | null>(null);
}
