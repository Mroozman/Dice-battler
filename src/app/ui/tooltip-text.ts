import type { DieDef, DieKind } from '../domain/model/die';
import type { StatKind } from '../domain/model/stats';
import { STAT_BY_DIE_KIND } from '../domain/engine/stats';
import { RULES } from '../domain/engine/rules';

const KIND_NAME: Readonly<Record<DieKind, string>> = {
  attack: 'atak',
  heal: 'leczenie',
  shield: 'osłona',
};

const KIND_EFFECT: Readonly<Record<DieKind, string>> = {
  attack: 'obrażeń',
  heal: 'leczenia',
  shield: 'osłony',
};

const STAT_GENITIVE: Readonly<Record<StatKind, string>> = {
  strength: 'siły',
  vitality: 'żywotności',
  defense: 'obrony',
};

const MIN_ROLL = 1;

export function dieTooltip(def: DieDef, bonus: number): string {
  const minEffect = RULES.effectFromRoll(MIN_ROLL);
  const maxEffect = RULES.effectFromRoll(def.sides);
  const base = `${def.label} · ${KIND_NAME[def.kind]}: ${minEffect}–${maxEffect} ${KIND_EFFECT[def.kind]}`;
  if (bonus <= 0) {
    return base;
  }
  const stat = STAT_GENITIVE[STAT_BY_DIE_KIND[def.kind]];
  return `${base}. +${bonus} ${stat} → ${minEffect + bonus}–${maxEffect + bonus}`;
}

export function bonusTooltip(kind: DieKind, bonus: number): string {
  const stat = STAT_GENITIVE[STAT_BY_DIE_KIND[kind]];
  return `Bonus ${stat}: +${bonus} do tego rzutu`;
}

export function healthTooltip(hp: number, maxHp: number, shield: number): string {
  const base = `Zdrowie: ${hp} z ${maxHp}`;
  return shield > 0 ? `${base}. Osłona (${shield}) pochłania obrażenia przed zdrowiem` : base;
}
