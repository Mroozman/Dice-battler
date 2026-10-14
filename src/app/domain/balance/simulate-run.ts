import { createRng, rollDie } from '../engine/rng';
import { reduce } from '../engine/reduce';
import type { GameAction } from '../model/actions';
import type { GameState } from '../model/state';
import type { BattleState } from '../model/battle';
import type { GameRules } from '../engine/rules';
import { battleOutcome } from '../engine/outcome';
import { targetableFor } from '../engine/targeting';
import { createRun } from '../content/run-factory';
import { createGameFaker } from '../content/game-faker';
import { rollReward } from '../content/reward-factory';
import { GreedyPlayerPolicy } from '../ai/greedy-player-policy';
import { chooseRewardAction } from '../ai/greedy-reward-policy';

export interface RunResult {
  readonly outcome: 'victory' | 'defeat';
  readonly stageReached: number;
  readonly rounds: number;
}

const MAX_STEPS = 10_000;

export async function simulateRun(seed: string, rules: GameRules): Promise<RunResult> {
  const run = await createRun(seed, rules);
  const rewardFaker = await createGameFaker(`${seed}-rewards`);
  const rollRng = createRng(`${seed}-rolls`);

  let state: GameState = reduce(
    {
      schemaVersion: 1,
      seed,
      rngCursor: 0,
      screen: 'title',
      run,
      battle: null,
      log: [],
    },
    { type: 'run/start', run, seed },
    rules,
  ).state;

  let nextEnemyIndex = 0;
  let totalRounds = 0;

  const dispatch = (action: GameAction): void => {
    state = reduce(state, action, rules).state;
  };

  for (let step = 0; step < MAX_STEPS && state.screen !== 'runOver'; step++) {
    advanceSimulation();
  }

  if (state.screen !== 'runOver') {
    throw new Error(`simulateRun exceeded ${MAX_STEPS} steps for seed "${seed}"`);
  }

  return {
    outcome: state.run.outcome === 'victory' ? 'victory' : 'defeat',
    stageReached: state.run.stageIndex,
    rounds: totalRounds,
  };

  function advanceSimulation(): void {
    switch (state.screen) {
      case 'stageIntro':
        dispatch({ type: 'stage/enter' });
        nextEnemyIndex = 0;
        return;
      case 'battle':
        advanceBattle();
        return;
      case 'reward':
        advanceReward();
        return;
    }
  }

  function advanceBattle(): void {
    const battle = state.battle as BattleState;

    if (battleOutcome(battle) === 'victory') {
      advanceVictoriousBattle(battle);
      return;
    }

    switch (battle.phase) {
      case 'player.selecting':
        choosePlayerDice(battle);
        return;
      case 'player.rolling':
        if (battle.staged && battle.staged.value === null) {
          dispatch({ type: 'roll/reveal', value: rollDie(battle.staged.sides, rollRng) });
        }
        return;
      case 'player.resolving':
        dispatch({ type: 'roll/apply' });
        return;
      case 'player.retargeting': {
        const head = battle.resolveQueue[0];
        dispatch({ type: 'player/setTarget', dieId: head.dieId, targetId: targetableFor(battle)[0] });
        return;
      }
      case 'player.drawing':
        dispatch({ type: 'hand/refill' });
        dispatch({ type: 'turn/endPlayer' });
        nextEnemyIndex = 0;
        return;
      case 'enemy.acting':
        actNextEnemy(battle);
        return;
    }
  }

  function choosePlayerDice(battle: BattleState): void {
    const choices = GreedyPlayerPolicy.chooseDice(battle, rules.dicePerTurn);
    for (const choice of choices) {
      dispatch({ type: 'player/toggleDie', dieId: choice.dieId });
      const kind = battle.player.deck.catalog[choice.dieId].kind;
      if (kind === 'attack' && choice.targetId !== null) {
        dispatch({ type: 'player/setTarget', dieId: choice.dieId, targetId: choice.targetId });
      }
    }
    dispatch({ type: 'player/confirm' });
  }

  function actNextEnemy(battle: BattleState): void {
    while (nextEnemyIndex < battle.enemies.length && battle.enemies[nextEnemyIndex].hp <= 0) {
      nextEnemyIndex++;
    }

    if (nextEnemyIndex >= battle.enemies.length) {
      dispatch({ type: 'turn/endRound' });
      totalRounds++;
      return;
    }

    const enemyId = battle.enemies[nextEnemyIndex].id;
    nextEnemyIndex++;
    dispatch({ type: 'enemy/act', enemyId });
  }

  function advanceVictoriousBattle(battle: BattleState): void {
    const currentStage = state.run.stages[state.run.stageIndex];
    if (currentStage?.kind === 'boss') {
      dispatch({ type: 'stage/advance' });
      return;
    }
    const reward = rollReward(rewardFaker, state.run.stageIndex);
    dispatch({ type: 'reward/offer', die: reward });
  }

  function advanceReward(): void {
    const reward = state.run.pendingReward;
    if (!reward) {
      dispatch({ type: 'stage/advance' });
      return;
    }

    const decision = chooseRewardAction(state.run.playerCatalog, reward);
    if (decision.type === 'swap') {
      dispatch({ type: 'reward/swap', replacedId: decision.replacedId });
    } else {
      dispatch({ type: 'reward/skip' });
    }
  }
}
