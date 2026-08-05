import type { GameState } from '../model/state';
import type { GameAction } from '../model/actions';
import type { BattleState, SelectedDie, StagedRoll } from '../model/battle';
import type { Combatant, CombatantId } from '../model/combatant';
import type { DieDef, DieId } from '../model/die';
import type { LogEntry } from '../model/log';
import type { RunState } from '../model/run';
import { createRng } from './rng';
import { buildBattleDeck, discardUsed, draw } from './deck';
import { applyDamage, applyHeal, applyShield } from './combat';
import { needsTarget, resolveEnemyTarget, targetableFor } from './targeting';
import { GreedyPolicy } from '../ai/greedy-policy';
import { battleOutcome } from './outcome';
import { logAttack, logDeath, logHeal, logRegen, logReshuffle, logRoundStart, logShield } from './log';
import type { LogContext } from './log';

export interface ReduceRules {
  readonly handSize: number;
  readonly dicePerTurn: number;
  readonly effectFromRoll: (roll: number) => number;
  readonly healBetweenStages: number;
}

export type GameEffect =
  | { readonly type: 'combatant/died'; readonly combatantId: CombatantId }
  | { readonly type: 'deck/reshuffled' };

export interface Reduction {
  readonly state: GameState;
  readonly effects: readonly GameEffect[];
}

export function reduce(state: GameState, action: GameAction, rules: ReduceRules): Reduction {
  switch (action.type) {
    case 'player/toggleDie':
      return reduceToggleDie(state, action.dieId, rules);
    case 'player/setTarget':
      return reduceSetTarget(state, action.dieId, action.targetId);
    case 'player/confirm':
      return reduceConfirm(state, rules);
    case 'roll/reveal':
      return reduceRollReveal(state, action.value);
    case 'roll/apply':
      return reduceRollApply(state, rules);
    case 'hand/refill':
      return reduceHandRefill(state, rules);
    case 'turn/endPlayer':
      return reduceEndPlayer(state);
    case 'enemy/act':
      return reduceEnemyAct(state, action.enemyId, rules);
    case 'turn/endRound':
      return reduceEndRound(state);
    case 'run/start':
      return reduceRunStart(state, action.run, action.seed);
    case 'stage/enter':
      return reduceStageEnter(state, rules);
    case 'reward/offer':
      return reduceRewardOffer(state, action.die);
    case 'reward/swap':
      return reduceRewardSwap(state, action.replacedId);
    case 'reward/skip':
      return reduceRewardSkip(state);
    case 'stage/advance':
      return reduceStageAdvance(state, rules);
  }
}

function noEffects(state: GameState): Reduction {
  return { state, effects: [] };
}

function requireBattle(state: GameState): BattleState {
  if (!state.battle) {
    throw new Error('No battle in progress');
  }
  const outcome = battleOutcome(state.battle);
  if (outcome !== 'ongoing') {
    throw new Error(`Battle has already ended (${outcome})`);
  }
  return state.battle;
}

function withBattle(state: GameState, battle: BattleState): GameState {
  return { ...state, battle };
}

function appendLog(state: GameState, ...entries: readonly LogEntry[]): GameState {
  if (entries.length === 0) {
    return state;
  }
  return { ...state, log: [...state.log, ...entries] };
}

function findCombatant(battle: BattleState, id: CombatantId): Combatant {
  if (battle.player.id === id) {
    return battle.player;
  }
  const enemy = battle.enemies.find((e) => e.id === id);
  if (!enemy) {
    throw new Error(`Unknown combatant: ${id}`);
  }
  return enemy;
}

function withCombatant(battle: BattleState, id: CombatantId, updated: Combatant): BattleState {
  if (battle.player.id === id) {
    return { ...battle, player: updated };
  }
  return { ...battle, enemies: battle.enemies.map((e) => (e.id === id ? updated : e)) };
}

function findDieDef(battle: BattleState, ownerId: CombatantId, dieId: DieId): DieDef {
  const owner = findCombatant(battle, ownerId);
  const def = owner.deck.catalog[dieId];
  if (!def) {
    throw new Error(`Unknown die: ${dieId}`);
  }
  return def;
}

function buildStagedRoll(sel: SelectedDie, ownerId: CombatantId, battle: BattleState): StagedRoll {
  const def = findDieDef(battle, ownerId, sel.dieId);
  return {
    dieId: sel.dieId,
    sides: def.sides,
    kind: def.kind,
    ownerId,
    value: null,
  };
}

function reduceToggleDie(state: GameState, dieId: DieId, rules: ReduceRules): Reduction {
  const battle = requireBattle(state);
  if (battle.phase !== 'player.selecting') {
    throw new Error(`Cannot toggle a die outside player.selecting (phase: ${battle.phase})`);
  }
  if (!battle.player.deck.hand.includes(dieId)) {
    throw new Error(`Die ${dieId} is not in hand`);
  }

  const alreadySelected = battle.selection.some((sel) => sel.dieId === dieId);
  let selection: readonly SelectedDie[];
  if (alreadySelected) {
    selection = battle.selection.filter((sel) => sel.dieId !== dieId);
  } else {
    if (battle.selection.length >= rules.dicePerTurn) {
      return noEffects(state);
    }
    const def = findDieDef(battle, battle.player.id, dieId);
    const targetId = needsTarget(def.kind) ? null : battle.player.id;
    selection = [...battle.selection, { dieId, targetId }];
  }

  return noEffects(withBattle(state, { ...battle, selection }));
}

function reduceSetTarget(state: GameState, dieId: DieId, targetId: CombatantId): Reduction {
  const battle = requireBattle(state);
  if (!targetableFor(battle).includes(targetId)) {
    throw new Error(`${targetId} is not a valid target`);
  }

  const inSelection = battle.selection.some((sel) => sel.dieId === dieId);
  const inQueue = battle.resolveQueue.some((sel) => sel.dieId === dieId);
  if (!inSelection && !inQueue) {
    throw new Error(`Die ${dieId} is not awaiting a target`);
  }

  const updateList = (list: readonly SelectedDie[]): readonly SelectedDie[] =>
    list.map((sel) => (sel.dieId === dieId ? { ...sel, targetId } : sel));

  let next: BattleState = {
    ...battle,
    selection: inSelection ? updateList(battle.selection) : battle.selection,
    resolveQueue: inQueue ? updateList(battle.resolveQueue) : battle.resolveQueue,
  };

  if (inQueue && battle.phase === 'player.retargeting') {
    next = {
      ...next,
      phase: 'player.rolling',
      staged: buildStagedRoll(next.resolveQueue[0], battle.player.id, next),
    };
  }

  return noEffects(withBattle(state, next));
}

function reduceConfirm(state: GameState, rules: ReduceRules): Reduction {
  const battle = requireBattle(state);
  if (battle.phase !== 'player.selecting') {
    throw new Error(`Cannot confirm outside player.selecting (phase: ${battle.phase})`);
  }
  if (
    battle.selection.length !== rules.dicePerTurn ||
    battle.selection.some((sel) => sel.targetId === null)
  ) {
    throw new Error('Selection is not ready to confirm');
  }

  const player: Combatant = {
    ...battle.player,
    deck: discardUsed(
      battle.player.deck,
      battle.selection.map((sel) => sel.dieId),
    ),
  };
  const resolveQueue = battle.selection;
  const battleWithPlayer: BattleState = { ...battle, player, selection: [], resolveQueue };
  const nextBattle: BattleState = {
    ...battleWithPlayer,
    phase: 'player.rolling',
    staged: buildStagedRoll(resolveQueue[0], battle.player.id, battleWithPlayer),
  };

  return noEffects(withBattle(state, nextBattle));
}

function reduceRollReveal(state: GameState, value: number): Reduction {
  const battle = requireBattle(state);
  if (battle.phase !== 'player.rolling' || !battle.staged || battle.staged.value !== null) {
    throw new Error('No pending roll to reveal');
  }

  return noEffects(
    withBattle(state, {
      ...battle,
      phase: 'player.resolving',
      staged: { ...battle.staged, value },
    }),
  );
}

function reduceRollApply(state: GameState, rules: ReduceRules): Reduction {
  const battle = requireBattle(state);
  if (battle.phase !== 'player.resolving' || !battle.staged) {
    throw new Error('No resolved roll to apply');
  }
  const staged = battle.staged;
  if (staged.value === null) {
    throw new Error('No resolved roll to apply');
  }

  const sel = battle.resolveQueue[0];
  const amount = rules.effectFromRoll(staged.value);
  const effects: GameEffect[] = [];
  const ownerId = staged.ownerId;
  const pendingEntries: LogEntry[] = [];
  const ctx = (): LogContext => ({
    log: [...state.log, ...pendingEntries],
    stageIndex: state.run.stageIndex,
    round: battle.round,
  });

  let next: BattleState = battle;

  if (staged.kind === 'attack') {
    if (sel.targetId === null) {
      throw new Error('Attack die has no target to apply');
    }
    const actor = findCombatant(next, ownerId);
    const target = findCombatant(next, sel.targetId);
    const wasAlive = target.hp > 0;
    const updatedTarget = applyDamage(target, amount);
    next = withCombatant(next, target.id, updatedTarget);
    pendingEntries.push(logAttack(ctx(), actor, target, staged.sides, amount));
    if (wasAlive && updatedTarget.hp === 0) {
      effects.push({ type: 'combatant/died', combatantId: updatedTarget.id });
      pendingEntries.push(logDeath(ctx(), updatedTarget));
    }
  } else {
    const actor = findCombatant(next, ownerId);
    if (staged.kind === 'heal') {
      const { combatant: updatedActor, healedAmount } = applyHeal(actor, amount);
      next = withCombatant(next, ownerId, updatedActor);
      pendingEntries.push(logHeal(ctx(), actor, staged.sides, healedAmount));
    } else {
      const updatedActor = applyShield(actor, amount);
      next = withCombatant(next, ownerId, updatedActor);
      pendingEntries.push(logShield(ctx(), actor, staged.sides, amount));
    }
  }

  const ownerIsPlayer = ownerId === next.player.id;

  if (battleOutcome(next) !== 'ongoing') {
    next = {
      ...next,
      resolveQueue: [],
      staged: null,
      phase: ownerIsPlayer ? 'player.drawing' : 'enemy.acting',
    };
    return { state: appendLog(withBattle(state, next), ...pendingEntries), effects };
  }

  let remaining = battle.resolveQueue.slice(1);

  while (remaining.length > 0) {
    const head = remaining[0];
    const headDef = findDieDef(next, ownerId, head.dieId);

    if (ownerIsPlayer && headDef.kind === 'attack') {
      const targetStillAlive = head.targetId !== null && targetableFor(next).includes(head.targetId);
      if (!targetStillAlive) {
        if (targetableFor(next).length === 0) {
          remaining = remaining.slice(1);
          continue;
        }
        remaining = [{ ...head, targetId: null }, ...remaining.slice(1)];
        next = {
          ...next,
          resolveQueue: remaining,
          phase: 'player.retargeting',
          staged: buildStagedRoll(remaining[0], ownerId, next),
        };
        return { state: appendLog(withBattle(state, next), ...pendingEntries), effects };
      }
    }

    next = {
      ...next,
      resolveQueue: remaining,
      phase: 'player.rolling',
      staged: buildStagedRoll(remaining[0], ownerId, next),
    };
    return { state: appendLog(withBattle(state, next), ...pendingEntries), effects };
  }

  next = {
    ...next,
    resolveQueue: [],
    phase: ownerIsPlayer ? 'player.drawing' : 'enemy.acting',
    staged: null,
  };
  return { state: appendLog(withBattle(state, next), ...pendingEntries), effects };
}

function reduceHandRefill(state: GameState, rules: ReduceRules): Reduction {
  const battle = requireBattle(state);
  if (battle.phase !== 'player.drawing') {
    throw new Error(`Cannot refill hand outside player.drawing (phase: ${battle.phase})`);
  }

  const rng = createRng(state.seed, state.rngCursor);
  const result = draw(battle.player.deck, rules.dicePerTurn, rng);
  const player: Combatant = { ...battle.player, deck: result.deck };
  const effects: GameEffect[] = result.reshuffled ? [{ type: 'deck/reshuffled' }] : [];
  const entries: LogEntry[] = result.reshuffled
    ? [logReshuffle({ log: state.log, stageIndex: state.run.stageIndex, round: battle.round }, player)]
    : [];

  return {
    state: {
      ...appendLog(withBattle(state, { ...battle, player }), ...entries),
      rngCursor: rng.cursor,
    },
    effects,
  };
}

function reduceEndPlayer(state: GameState): Reduction {
  const battle = requireBattle(state);
  if (battle.phase !== 'player.drawing') {
    throw new Error(`Cannot end player turn outside player.drawing (phase: ${battle.phase})`);
  }

  return noEffects(withBattle(state, { ...battle, phase: 'enemy.acting' }));
}

function reduceEnemyAct(state: GameState, enemyId: CombatantId, rules: ReduceRules): Reduction {
  const battle = requireBattle(state);
  if (battle.phase !== 'enemy.acting') {
    throw new Error(`Cannot act outside enemy.acting (phase: ${battle.phase})`);
  }
  const enemy = findCombatant(battle, enemyId);
  if (enemy.kind !== 'enemy') {
    throw new Error(`${enemyId} is not an enemy`);
  }
  if (enemy.hp <= 0) {
    throw new Error(`Enemy ${enemyId} is not alive`);
  }

  const rng = createRng(state.seed, state.rngCursor);
  const drawResult = draw(enemy.deck, enemy.dicePerTurn, rng);
  const drawnEnemy: Combatant = { ...enemy, deck: drawResult.deck };
  const battleWithDrawn = withCombatant(battle, enemyId, drawnEnemy);

  const chosenIds = GreedyPolicy.chooseDice(battleWithDrawn, enemyId, enemy.dicePerTurn);
  if (chosenIds.length === 0) {
    throw new Error(`Enemy ${enemyId} has no dice to act with`);
  }

  const actingEnemy: Combatant = { ...drawnEnemy, deck: discardUsed(drawnEnemy.deck, chosenIds) };
  const battleWithDiscard = withCombatant(battleWithDrawn, enemyId, actingEnemy);

  const resolveQueue: SelectedDie[] = chosenIds.map((dieId) => {
    const def = actingEnemy.deck.catalog[dieId];
    return { dieId, targetId: resolveEnemyTarget(def, enemyId, battle.player.id) };
  });

  const next: BattleState = {
    ...battleWithDiscard,
    activeCombatantId: enemyId,
    resolveQueue,
    phase: 'player.rolling',
    staged: buildStagedRoll(resolveQueue[0], enemyId, battleWithDiscard),
  };
  const effects: GameEffect[] = drawResult.reshuffled ? [{ type: 'deck/reshuffled' }] : [];
  const entries: LogEntry[] = drawResult.reshuffled
    ? [logReshuffle({ log: state.log, stageIndex: state.run.stageIndex, round: battle.round }, actingEnemy)]
    : [];

  return {
    state: { ...appendLog(withBattle(state, next), ...entries), rngCursor: rng.cursor },
    effects,
  };
}

function reduceEndRound(state: GameState): Reduction {
  const battle = requireBattle(state);
  if (battle.phase !== 'enemy.acting') {
    throw new Error(`Cannot end round outside enemy.acting (phase: ${battle.phase})`);
  }

  const nextBattle: BattleState = {
    ...battle,
    round: battle.round + 1,
    phase: 'player.selecting',
    activeCombatantId: battle.player.id,
  };
  const entry = logRoundStart(
    { log: state.log, stageIndex: state.run.stageIndex, round: nextBattle.round },
    battle.player,
  );

  return noEffects(appendLog(withBattle(state, nextBattle), entry));
}

function reduceRunStart(state: GameState, run: RunState, seed: string): Reduction {
  if (state.screen !== 'title') {
    throw new Error(`Cannot start a run outside the title screen (screen: ${state.screen})`);
  }

  return noEffects({
    schemaVersion: 1,
    seed,
    rngCursor: 0,
    screen: 'stageIntro',
    run,
    battle: null,
    log: [],
  });
}

function reduceStageEnter(state: GameState, rules: ReduceRules): Reduction {
  if (state.screen !== 'stageIntro') {
    throw new Error(`Cannot enter a stage outside stageIntro (screen: ${state.screen})`);
  }
  const stageDef = state.run.stages[state.run.stageIndex];
  if (!stageDef) {
    throw new Error(`No stage at index ${state.run.stageIndex}`);
  }

  const rng = createRng(state.seed, state.rngCursor);

  const player: Combatant = {
    id: 'player' as CombatantId,
    name: 'Gracz',
    archetypeKey: 'player',
    kind: 'player',
    hp: state.run.playerHp,
    maxHp: state.run.playerMaxHp,
    shield: 0,
    deck: buildBattleDeck(state.run.playerCatalog, rules.handSize, rules.dicePerTurn, rng),
    dicePerTurn: rules.dicePerTurn,
  };

  const enemies: Combatant[] = stageDef.enemies.map((blueprint) => ({
    id: blueprint.id,
    name: blueprint.name,
    archetypeKey: blueprint.archetypeKey,
    kind: 'enemy',
    hp: blueprint.maxHp,
    maxHp: blueprint.maxHp,
    shield: 0,
    deck: buildBattleDeck(blueprint.deck.catalog, 0, blueprint.dicePerTurn, rng),
    dicePerTurn: blueprint.dicePerTurn,
  }));

  const battle: BattleState = {
    round: 1,
    phase: 'player.selecting',
    activeCombatantId: player.id,
    player,
    enemies,
    selection: [],
    resolveQueue: [],
    staged: null,
  };

  return {
    state: { ...state, battle, screen: 'battle', rngCursor: rng.cursor },
    effects: [],
  };
}

function reduceRewardOffer(state: GameState, die: DieDef): Reduction {
  if (state.screen !== 'battle') {
    throw new Error(`Cannot offer a reward outside battle (screen: ${state.screen})`);
  }
  if (state.run.pendingReward !== null) {
    throw new Error('A reward is already pending');
  }
  if (!state.battle || battleOutcome(state.battle) !== 'victory') {
    throw new Error('Cannot offer a reward without a won battle');
  }

  return noEffects({
    ...state,
    screen: 'reward',
    run: { ...state.run, pendingReward: die },
  });
}

function reduceRewardSwap(state: GameState, replacedId: DieId): Reduction {
  if (state.screen !== 'reward' || !state.run.pendingReward) {
    throw new Error('No pending reward to swap');
  }
  if (!(replacedId in state.run.playerCatalog)) {
    throw new Error(`Unknown die to replace: ${replacedId}`);
  }

  const newDie = state.run.pendingReward;
  const playerCatalog: Record<DieId, DieDef> = { ...state.run.playerCatalog };
  delete playerCatalog[replacedId];
  playerCatalog[newDie.id] = newDie;

  return noEffects({
    ...state,
    run: { ...state.run, playerCatalog, pendingReward: null },
  });
}

function reduceRewardSkip(state: GameState): Reduction {
  if (state.screen !== 'reward' || !state.run.pendingReward) {
    throw new Error('No pending reward to skip');
  }

  return noEffects({ ...state, run: { ...state.run, pendingReward: null } });
}

function reduceStageAdvance(state: GameState, rules: ReduceRules): Reduction {
  const battle = state.battle;
  if (!battle) {
    throw new Error('Cannot advance the stage without a finished battle');
  }

  const currentStage = state.run.stages[state.run.stageIndex];
  const viaReward = state.screen === 'reward' && state.run.pendingReward === null;
  const viaBossVictory =
    state.screen === 'battle' && currentStage?.kind === 'boss' && battleOutcome(battle) === 'victory';

  if (!viaReward && !viaBossVictory) {
    throw new Error(`Cannot advance the stage from screen ${state.screen}`);
  }

  const nextStageIndex = state.run.stageIndex + 1;

  if (nextStageIndex >= state.run.stages.length) {
    return noEffects({
      ...state,
      battle: null,
      screen: 'runOver',
      run: { ...state.run, stageIndex: nextStageIndex, playerHp: battle.player.hp, outcome: 'victory' },
    });
  }

  const healedAmount = Math.max(
    0,
    Math.min(state.run.playerMaxHp - battle.player.hp, Math.round(rules.healBetweenStages * state.run.playerMaxHp)),
  );
  const playerHp = battle.player.hp + healedAmount;
  const entry = logRegen(
    { log: state.log, stageIndex: state.run.stageIndex, round: battle.round },
    battle.player,
    healedAmount,
  );

  return noEffects(
    appendLog(
      {
        ...state,
        battle: null,
        screen: 'stageIntro',
        run: { ...state.run, stageIndex: nextStageIndex, playerHp },
      },
      entry,
    ),
  );
}
