import type { GameState } from '../model/state';
import type { GameAction } from '../model/actions';
import type { BattleState, SelectedDie, StagedRoll } from '../model/battle';
import type { Combatant, CombatantId } from '../model/combatant';
import type { DieDef, DieId } from '../model/die';
import { createRng } from './rng';
import { discardUsed, draw } from './deck';
import { applyDamage, applyHeal, applyShield } from './combat';
import { needsTarget, resolveEnemyTarget, targetableFor } from './targeting';
import { GreedyPolicy } from '../ai/greedy-policy';

export interface ReduceRules {
  readonly dicePerTurn: number;
  readonly effectFromRoll: (roll: number) => number;
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
  }
}

function noEffects(state: GameState): Reduction {
  return { state, effects: [] };
}

function requireBattle(state: GameState): BattleState {
  if (!state.battle) {
    throw new Error('No battle in progress');
  }
  return state.battle;
}

function withBattle(state: GameState, battle: BattleState): GameState {
  return { ...state, battle };
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

  let next: BattleState = battle;

  if (staged.kind === 'attack') {
    if (sel.targetId === null) {
      throw new Error('Attack die has no target to apply');
    }
    const target = findCombatant(next, sel.targetId);
    const wasAlive = target.hp > 0;
    const updatedTarget = applyDamage(target, amount);
    next = withCombatant(next, target.id, updatedTarget);
    if (wasAlive && updatedTarget.hp === 0) {
      effects.push({ type: 'combatant/died', combatantId: updatedTarget.id });
    }
  } else {
    const actor = findCombatant(next, ownerId);
    const updatedActor = staged.kind === 'heal' ? applyHeal(actor, amount).combatant : applyShield(actor, amount);
    next = withCombatant(next, ownerId, updatedActor);
  }

  const ownerIsPlayer = ownerId === next.player.id;
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
        return { state: withBattle(state, next), effects };
      }
    }

    next = {
      ...next,
      resolveQueue: remaining,
      phase: 'player.rolling',
      staged: buildStagedRoll(remaining[0], ownerId, next),
    };
    return { state: withBattle(state, next), effects };
  }

  next = {
    ...next,
    resolveQueue: [],
    phase: ownerIsPlayer ? 'player.drawing' : 'enemy.acting',
    staged: null,
  };
  return { state: withBattle(state, next), effects };
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

  return {
    state: { ...withBattle(state, { ...battle, player }), rngCursor: rng.cursor },
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

  return {
    state: { ...withBattle(state, next), rngCursor: rng.cursor },
    effects,
  };
}

function reduceEndRound(state: GameState): Reduction {
  const battle = requireBattle(state);
  if (battle.phase !== 'enemy.acting') {
    throw new Error(`Cannot end round outside enemy.acting (phase: ${battle.phase})`);
  }

  return noEffects(
    withBattle(state, {
      ...battle,
      round: battle.round + 1,
      phase: 'player.selecting',
      activeCombatantId: battle.player.id,
    }),
  );
}
