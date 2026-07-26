import { Component } from '@angular/core';
import { BattleScreen } from './features/battle/battle-screen';

@Component({
  selector: 'app-root',
  imports: [BattleScreen],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
