import { Injectable, effect, inject } from '@angular/core';
import { createRng, rollDie } from '../domain/engine/rng';
import type { Rng } from '../domain/engine/rng';
import type { DieSides } from '../domain/model/die';
import type { Combatant } from '../domain/model/combatant';
import { GameStore } from './game-store';
import { RULES } from './tokens';

@Injectable({ providedIn: 'root' })
export class TurnEngine {
  private readonly store = inject(GameStore);
  private readonly rules = inject(RULES);
  private readonly rollRng: Rng = createRng(`${this.store.state().seed}-rolls`);
  private advancing = false;
  private nextEnemyIndex = 0;

  constructor() {
    effect(() => {
      const battle = this.store.battle();
      if (!battle || this.advancing || this.store.battleOutcome() !== 'ongoing') {
        return;
      }

      if (battle.phase === 'player.rolling' && battle.staged && battle.staged.value === null) {
        this.scheduleRoll(battle.staged.sides);
      } else if (battle.phase === 'player.resolving') {
        this.scheduleApply();
      } else if (battle.phase === 'player.drawing') {
        this.scheduleEndOfTurn();
      } else if (battle.phase === 'enemy.acting') {
        this.scheduleEnemyStep(battle.enemies);
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
      this.nextEnemyIndex = 0;
      this.advancing = false;
    }, this.rules.timing.drawMs);
  }

  private scheduleEnemyStep(enemies: readonly Combatant[]): void {
    while (this.nextEnemyIndex < enemies.length && enemies[this.nextEnemyIndex].hp <= 0) {
      this.nextEnemyIndex++;
    }

    this.advancing = true;

    if (this.nextEnemyIndex >= enemies.length) {
      setTimeout(() => {
        this.store.dispatch({ type: 'turn/endRound' });
        this.advancing = false;
      }, this.rules.timing.enemyActMs);
      return;
    }

    const enemyId = enemies[this.nextEnemyIndex].id;
    this.nextEnemyIndex++;
    setTimeout(() => {
      this.store.dispatch({ type: 'enemy/act', enemyId });
      this.advancing = false;
    }, this.rules.timing.enemyActMs);
  }
}
