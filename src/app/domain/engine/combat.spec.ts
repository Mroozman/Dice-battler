import { applyDamage, applyHeal, applyShield } from './combat';
import type { Combatant, CombatantId } from '../model/combatant';

function makeCombatant(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: 'c1' as CombatantId,
    name: 'Test Combatant',
    archetypeKey: 'test',
    kind: 'enemy',
    hp: 10,
    maxHp: 10,
    shield: 0,
    deck: { catalog: {}, pool: [], hand: [], discard: [] },
    dicePerTurn: 1,
    ...overrides,
  };
}

describe('applyDamage', () => {
  it('reduces hp directly when there is no shield', () => {
    const target = makeCombatant({ hp: 10 });
    const result = applyDamage(target, 4);

    expect(result.hp).toBe(6);
    expect(result.shield).toBe(0);
  });

  it('absorbs damage with shield before touching hp', () => {
    const target = makeCombatant({ hp: 10, shield: 5 });
    const result = applyDamage(target, 3);

    expect(result.shield).toBe(2);
    expect(result.hp).toBe(10);
  });

  it('partially absorbs damage when shield is smaller than the hit', () => {
    const target = makeCombatant({ hp: 10, shield: 2 });
    const result = applyDamage(target, 5);

    expect(result.shield).toBe(0);
    expect(result.hp).toBe(7);
  });

  it('never drops hp below zero on an overkill hit', () => {
    const target = makeCombatant({ hp: 3, shield: 0 });
    const result = applyDamage(target, 999);

    expect(result.hp).toBe(0);
  });

  it('allows two attacks against the same target in sequence', () => {
    const target = makeCombatant({ hp: 10, shield: 0 });
    const afterFirst = applyDamage(target, 4);
    const afterSecond = applyDamage(afterFirst, 3);

    expect(afterSecond.hp).toBe(3);
  });
});

describe('applyHeal', () => {
  it('adds the rolled amount to hp', () => {
    const target = makeCombatant({ hp: 5, maxHp: 20 });
    const { combatant, healedAmount } = applyHeal(target, 6);

    expect(combatant.hp).toBe(11);
    expect(healedAmount).toBe(6);
  });

  it('caps healing at maxHp and reports the actually healed amount', () => {
    const target = makeCombatant({ hp: 18, maxHp: 20 });
    const { combatant, healedAmount } = applyHeal(target, 8);

    expect(combatant.hp).toBe(20);
    expect(healedAmount).toBe(2);
  });

  it('reports zero healed amount when already at full hp', () => {
    const target = makeCombatant({ hp: 20, maxHp: 20 });
    const { combatant, healedAmount } = applyHeal(target, 5);

    expect(combatant.hp).toBe(20);
    expect(healedAmount).toBe(0);
  });
});

describe('applyShield', () => {
  it('accumulates shield across multiple applications', () => {
    const target = makeCombatant({ shield: 2 });
    const afterFirst = applyShield(target, 3);
    const afterSecond = applyShield(afterFirst, 4);

    expect(afterSecond.shield).toBe(9);
  });

  it('does not affect hp', () => {
    const target = makeCombatant({ hp: 10, shield: 0 });
    const result = applyShield(target, 5);

    expect(result.hp).toBe(10);
  });
});
