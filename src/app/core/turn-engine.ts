import { Injectable, computed, effect, inject } from '@angular/core';
import type { Faker } from '@faker-js/faker';
import { createRng, rollDie } from '../domain/engine/rng';
import type { Rng } from '../domain/engine/rng';
import { REDUCED_TIMING } from '../domain/engine/rules';
import type { DieSides } from '../domain/model/die';
import type { Combatant } from '../domain/model/combatant';
import { createGameFaker } from '../domain/content/game-faker';
import { rollReward } from '../domain/content/reward-factory';
import { GameStore } from './game-store';
import { ReducedMotion } from './reduced-motion';
import { RULES } from './tokens';

@Injectable({ providedIn: 'root' })
export class TurnEngine {
  private readonly store = inject(GameStore);
  private readonly rules = inject(RULES);
  private readonly reducedMotion = inject(ReducedMotion);
  private readonly timing = computed(() => (this.reducedMotion.enabled() ? REDUCED_TIMING : this.rules.timing));
  private readonly rollRng: Rng = createRng(`${this.store.state().seed}-rolls`);
  private readonly runFaker: Promise<Faker> = createGameFaker(`${this.store.state().seed}-rewards`);
  private advancing = false;
  private nextEnemyIndex = 0;

  constructor() {
    effect(() => {
      if (this.advancing) {
        return;
      }

      const screen = this.store.screen();

      if (screen === 'reward' && this.store.run().pendingReward === null) {
        this.scheduleStageAdvance();
        return;
      }

      if (screen !== 'battle') {
        return;
      }

      const battle = this.store.battle();
      if (!battle) {
        return;
      }

      const outcome = this.store.battleOutcome();
      if (outcome === 'defeat') {
        return;
      }
      if (outcome === 'victory') {
        this.scheduleFinishStage();
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
    }, this.timing().rollMs);
  }

  private scheduleApply(): void {
    this.advancing = true;
    setTimeout(() => {
      this.store.dispatch({ type: 'roll/apply' });
      this.advancing = false;
    }, this.timing().impactMs);
  }

  private scheduleEndOfTurn(): void {
    this.advancing = true;
    setTimeout(() => {
      this.store.dispatch({ type: 'hand/refill' });
      this.store.dispatch({ type: 'turn/endPlayer' });
      this.nextEnemyIndex = 0;
      this.advancing = false;
    }, this.timing().drawMs);
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
      }, this.timing().enemyActMs);
      return;
    }

    const enemyId = enemies[this.nextEnemyIndex].id;
    this.nextEnemyIndex++;
    setTimeout(() => {
      this.store.dispatch({ type: 'enemy/act', enemyId });
      this.advancing = false;
    }, this.timing().enemyActMs);
  }

  private scheduleStageAdvance(): void {
    this.advancing = true;
    try {
      this.store.dispatch({ type: 'stage/advance' });
    } catch (error) {
      console.error('TurnEngine stage/advance failed', error);
    } finally {
      this.advancing = false;
    }
  }

  private scheduleFinishStage(): void {
    this.advancing = true;
    void this.finishStage();
  }

  private async finishStage(): Promise<void> {
    try {
      const { run } = this.store.state();
      const currentStage = run.stages[run.stageIndex];

      if (currentStage?.kind === 'boss') {
        this.store.dispatch({ type: 'stage/advance' });
        return;
      }
      if (!currentStage) {
        throw new Error(`No stage at index ${run.stageIndex} to finish`);
      }

      const faker = await this.runFaker;
      const die = rollReward(faker, run.stageIndex);
      this.store.dispatch({ type: 'reward/offer', die });
    } catch (error) {
      console.error('TurnEngine.finishStage failed', error);
    } finally {
      this.advancing = false;
    }
  }
}
