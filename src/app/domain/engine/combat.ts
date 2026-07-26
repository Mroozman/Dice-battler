import type { Combatant } from '../model/combatant';

export function applyDamage(target: Combatant, amount: number): Combatant {
  const shieldAbsorbed = Math.min(target.shield, amount);
  const hpLoss = amount - shieldAbsorbed;
  return {
    ...target,
    shield: target.shield - shieldAbsorbed,
    hp: Math.max(0, target.hp - hpLoss),
  };
}

export interface HealResult {
  readonly combatant: Combatant;
  readonly healedAmount: number;
}

export function applyHeal(target: Combatant, amount: number): HealResult {
  const newHp = Math.min(target.maxHp, target.hp + amount);
  return { combatant: { ...target, hp: newHp }, healedAmount: newHp - target.hp };
}

export function applyShield(target: Combatant, amount: number): Combatant {
  return { ...target, shield: target.shield + amount };
}
