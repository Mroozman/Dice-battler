import { logAttack, logDeath, logHeal, logRegen, logReshuffle, logRoundStart, logShield } from './log';
import type { LogContext } from './log';
import type { LogEntry } from '../model/log';
import type { Combatant, CombatantId } from '../model/combatant';

function makeCombatant(id: string, name: string): Combatant {
  return {
    id: id as CombatantId,
    name,
    archetypeKey: 'test',
    kind: 'enemy',
    hp: 5,
    maxHp: 10,
    shield: 0,
    deck: { catalog: {}, pool: [], hand: [], discard: [] },
    dicePerTurn: 1,
  };
}

function makeContext(overrides: Partial<LogContext> = {}): LogContext {
  return { log: [], stageIndex: 0, round: 1, ...overrides };
}

describe('log entry constructors', () => {
  it('logAttack describes the hit, its die size and both combatants', () => {
    const actor = makeCombatant('player', 'Gracz');
    const target = makeCombatant('e0', 'Zbir');

    const entry = logAttack(makeContext(), actor, target, 6, 4);

    expect(entry.tone).toBe('attack');
    expect(entry.text).toBe('Gracz rzuca D6 → 4 obrażeń w Zbir');
    expect(entry.actorId).toBe(actor.id);
    expect(entry.targetId).toBe(target.id);
    expect(entry.amount).toBe(4);
  });

  it('logHeal reports the actually healed amount, not necessarily the raw roll', () => {
    const actor = makeCombatant('e0', 'Zbir');

    const entry = logHeal(makeContext(), actor, 4, 2);

    expect(entry.tone).toBe('heal');
    expect(entry.text).toBe('Zbir rzuca D4 → leczy się o 2');
    expect(entry.actorId).toBe(actor.id);
    expect(entry.targetId).toBeUndefined();
    expect(entry.amount).toBe(2);
  });

  it('logShield describes the shield gained', () => {
    const actor = makeCombatant('player', 'Gracz');

    const entry = logShield(makeContext(), actor, 4, 3);

    expect(entry.tone).toBe('shield');
    expect(entry.text).toBe('Gracz rzuca D4 → +3 osłony');
    expect(entry.amount).toBe(3);
  });

  it('logDeath names the combatant who died as the entry subject', () => {
    const target = makeCombatant('e0', 'Zbir');

    const entry = logDeath(makeContext(), target);

    expect(entry.tone).toBe('death');
    expect(entry.text).toBe('Zbir zostaje pokonany');
    expect(entry.actorId).toBe(target.id);
  });

  it('logReshuffle uses the exact wording from the design doc', () => {
    const actor = makeCombatant('e0', 'Zbir');

    const entry = logReshuffle(makeContext(), actor);

    expect(entry.tone).toBe('system');
    expect(entry.text).toBe('Odrzucone kości wracają do puli');
    expect(entry.actorId).toBe(actor.id);
  });

  it('logRoundStart announces the new round, attributed to the player', () => {
    const player = makeCombatant('player', 'Gracz');

    const entry = logRoundStart(makeContext({ round: 3 }), player);

    expect(entry.tone).toBe('turn');
    expect(entry.text).toBe('Runda 3 rozpoczęta');
    expect(entry.actorId).toBe(player.id);
    expect(entry.round).toBe(3);
  });

  it('logRegen announces between-stage healing, distinct from a die roll', () => {
    const player = makeCombatant('player', 'Gracz');

    const entry = logRegen(makeContext(), player, 5);

    expect(entry.tone).toBe('heal');
    expect(entry.text).toBe('Gracz regeneruje 5 HP przed kolejnym etapem');
    expect(entry.actorId).toBe(player.id);
    expect(entry.amount).toBe(5);
  });

  it('propagates stageIndex and round from the context onto every entry', () => {
    const ctx = makeContext({ stageIndex: 2, round: 5 });
    const entry = logShield(ctx, makeCombatant('player', 'Gracz'), 6, 1);

    expect(entry.stageIndex).toBe(2);
    expect(entry.round).toBe(5);
  });

  it('generates sequential ids based on how many entries already exist', () => {
    const empty = makeContext({ log: [] });
    const withThree = makeContext({ log: [{}, {}, {}] as unknown as LogEntry[] });

    const first = logShield(empty, makeCombatant('player', 'Gracz'), 6, 1);
    const fourth = logShield(withThree, makeCombatant('player', 'Gracz'), 6, 1);

    expect(first.id).toBe('log-0');
    expect(fourth.id).toBe('log-3');
  });
});
