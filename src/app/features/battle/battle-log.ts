import { Component, input } from '@angular/core';
import type { LogEntry } from '../../domain/model/log';

@Component({
  selector: 'app-battle-log',
  templateUrl: './battle-log.html',
  styleUrl: './battle-log.css',
})
export class BattleLog {
  readonly entries = input<readonly LogEntry[]>([]);
}
