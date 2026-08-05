import type { LogEntry } from '../model/log';
import type { Combatant } from '../model/combatant';
import type { DieSides } from '../model/die';

export interface LogContext {
  readonly log: readonly LogEntry[];
  readonly stageIndex: number;
  readonly round: number;
}

function nextId(log: readonly LogEntry[]): string {
  return `log-${log.length}`;
}

export function logAttack(
  ctx: LogContext,
  actor: Combatant,
  target: Combatant,
  sides: DieSides,
  amount: number,
): LogEntry {
  return {
    id: nextId(ctx.log),
    stageIndex: ctx.stageIndex,
    round: ctx.round,
    tone: 'attack',
    text: `${actor.name} rzuca D${sides} → ${amount} obrażeń w ${target.name}`,
    actorId: actor.id,
    targetId: target.id,
    amount,
  };
}

export function logHeal(ctx: LogContext, actor: Combatant, sides: DieSides, healedAmount: number): LogEntry {
  return {
    id: nextId(ctx.log),
    stageIndex: ctx.stageIndex,
    round: ctx.round,
    tone: 'heal',
    text: `${actor.name} rzuca D${sides} → leczy się o ${healedAmount}`,
    actorId: actor.id,
    amount: healedAmount,
  };
}

export function logShield(ctx: LogContext, actor: Combatant, sides: DieSides, amount: number): LogEntry {
  return {
    id: nextId(ctx.log),
    stageIndex: ctx.stageIndex,
    round: ctx.round,
    tone: 'shield',
    text: `${actor.name} rzuca D${sides} → +${amount} osłony`,
    actorId: actor.id,
    amount,
  };
}

export function logDeath(ctx: LogContext, target: Combatant): LogEntry {
  return {
    id: nextId(ctx.log),
    stageIndex: ctx.stageIndex,
    round: ctx.round,
    tone: 'death',
    text: `${target.name} zostaje pokonany`,
    actorId: target.id,
  };
}

export function logReshuffle(ctx: LogContext, actor: Combatant): LogEntry {
  return {
    id: nextId(ctx.log),
    stageIndex: ctx.stageIndex,
    round: ctx.round,
    tone: 'system',
    text: 'Odrzucone kości wracają do puli',
    actorId: actor.id,
  };
}

export function logRoundStart(ctx: LogContext, player: Combatant): LogEntry {
  return {
    id: nextId(ctx.log),
    stageIndex: ctx.stageIndex,
    round: ctx.round,
    tone: 'turn',
    text: `Runda ${ctx.round} rozpoczęta`,
    actorId: player.id,
  };
}

export function logRegen(ctx: LogContext, player: Combatant, healedAmount: number): LogEntry {
  return {
    id: nextId(ctx.log),
    stageIndex: ctx.stageIndex,
    round: ctx.round,
    tone: 'heal',
    text: `${player.name} regeneruje ${healedAmount} HP przed kolejnym etapem`,
    actorId: player.id,
    amount: healedAmount,
  };
}
