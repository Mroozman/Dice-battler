import type { GameState } from '../model/state';
import type { GameAction } from '../model/actions';
import type { BattleState, SelectedDie, StagedRoll } from '../model/battle';
import type { Combatant, CombatantId } from '../model/combatant';
import type { DieDef, DieId } from '../model/die';
import { createRng } from './rng';
import { discardUsed, draw } from './deck';
import { applyDamage, applyHeal, applyShield } from './combat';
import { needsTarget, targetableFor } from './targeting';

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
      throw new Error('enemy/act is not implemented yet');
    case 'turn/endRound':
      throw new Error('turn/endRound is not implemented yet');
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

function findDieDef(battle: BattleState, dieId: DieId): DieDef {
  const def = battle.player.deck.catalog[dieId];
  if (!def) {
    throw new Error(`Unknown die: ${dieId}`);
  }
  return def;
}

function buildStagedRoll(sel: SelectedDie, battle: BattleState): StagedRoll {
  const def = findDieDef(battle, sel.dieId);
  return {
    dieId: sel.dieId,
    sides: def.sides,
    kind: def.kind,
    ownerId: battle.player.id,
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
    const def = findDieDef(battle, dieId);
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
      staged: buildStagedRoll(next.resolveQueue[0], next),
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
    staged: buildStagedRoll(resolveQueue[0], battleWithPlayer),
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

  let player = battle.player;
  let enemies = battle.enemies;

  if (staged.kind === 'attack') {
    const target = enemies.find((enemy) => enemy.id === sel.targetId);
    if (!target) {
      throw new Error(`Attack target ${sel.targetId} not found`);
    }
    const wasAlive = target.hp > 0;
    const updatedTarget = applyDamage(target, amount);
    enemies = enemies.map((enemy) => (enemy.id === updatedTarget.id ? updatedTarget : enemy));
    if (wasAlive && updatedTarget.hp === 0) {
      effects.push({ type: 'combatant/died', combatantId: updatedTarget.id });
    }
  } else if (staged.kind === 'heal') {
    player = applyHeal(player, amount).combatant;
  } else {
    player = applyShield(player, amount);
  }

  let next: BattleState = { ...battle, player, enemies };
  let remaining = battle.resolveQueue.slice(1);

  while (remaining.length > 0) {
    const head = remaining[0];
    const headDef = findDieDef(next, head.dieId);
    const targetStillAlive = head.targetId !== null && targetableFor(next).includes(head.targetId);

    if (headDef.kind === 'attack' && !targetStillAlive) {
      if (targetableFor(next).length === 0) {
        remaining = remaining.slice(1);
        continue;
      }
      remaining = [{ ...head, targetId: null }, ...remaining.slice(1)];
      next = {
        ...next,
        resolveQueue: remaining,
        phase: 'player.retargeting',
        staged: buildStagedRoll(remaining[0], next),
      };
      return { state: withBattle(state, next), effects };
    }

    next = {
      ...next,
      resolveQueue: remaining,
      phase: 'player.rolling',
      staged: buildStagedRoll(remaining[0], next),
    };
    return { state: withBattle(state, next), effects };
  }

  next = { ...next, resolveQueue: [], phase: 'player.drawing', staged: null };
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
