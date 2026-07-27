import { Injectable, effect, inject } from '@angular/core';
import { createRng, rollDie } from '../domain/engine/rng';
import type { Rng } from '../domain/engine/rng';
import type { DieSides } from '../domain/model/die';
import { GameStore } from './game-store';
import { RULES } from './tokens';

@Injectable({ providedIn: 'root' })
export class TurnEngine {
  private readonly store = inject(GameStore);
  private readonly rules = inject(RULES);
  private readonly rollRng: Rng = createRng(`${this.store.state().seed}-rolls`);
  private advancing = false;

  constructor() {
    effect(() => {
      const battle = this.store.battle();
      if (!battle || this.advancing) {
        return;
      }

      if (battle.phase === 'player.rolling' && battle.staged && battle.staged.value === null) {
        this.scheduleRoll(battle.staged.sides);
      } else if (battle.phase === 'player.resolving') {
        this.scheduleApply();
      } else if (battle.phase === 'player.drawing') {
        this.scheduleEndOfTurn();
      }
    });
  }

  private scheduleRoll(sides: DieSides): void {
    this.advancing = true;
    const value = rollDie(sides, this.rollRng);
    setTimeout(() => {
      this.store.dispatch({ type: 'roll/reveal', value });
      this.advancing = false;
    }, this.rules.timing.rollMs);
  }

  private scheduleApply(): void {
    this.advancing = true;
    setTimeout(() => {
      this.store.dispatch({ type: 'roll/apply' });
      this.advancing = false;
    }, this.rules.timing.impactMs);
  }

  private scheduleEndOfTurn(): void {
    this.advancing = true;
    setTimeout(() => {
      this.store.dispatch({ type: 'hand/refill' });
      this.store.dispatch({ type: 'turn/endPlayer' });
      this.advancing = false;
    }, this.rules.timing.drawMs);
  }
}
