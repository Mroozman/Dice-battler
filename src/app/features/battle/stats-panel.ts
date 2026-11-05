import { Component, input } from '@angular/core';
import type { PlayerStats } from '../../domain/model/stats';
import { STAT_INFO } from '../../ui/stat-info';

@Component({
  selector: 'app-stats-panel',
  templateUrl: './stats-panel.html',
  styleUrl: './stats-panel.css',
})
export class StatsPanel {
  readonly stats = input.required<PlayerStats>();

  readonly items = STAT_INFO;
}
