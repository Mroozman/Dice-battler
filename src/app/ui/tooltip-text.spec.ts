import { dieTooltip, bonusTooltip, healthTooltip } from './tooltip-text';
import type { DieDef, DieId } from '../domain/model/die';

const D6_ATTACK: DieDef = { id: 'd' as DieId, sides: 6, kind: 'attack', label: 'D6' };
const D4_HEAL: DieDef = { id: 'h' as DieId, sides: 4, kind: 'heal', label: 'D4' };

describe('tooltip text', () => {
  it('describes the effect range of a die without bonus', () => {
    expect(dieTooltip(D6_ATTACK, 0)).toBe('D6 · atak: 1–6 obrażeń');
  });

  it('adds the stat bonus and the shifted range', () => {
    expect(dieTooltip(D6_ATTACK, 2)).toBe('D6 · atak: 1–6 obrażeń. +2 siły → 3–8');
    expect(dieTooltip(D4_HEAL, 1)).toBe('D4 · leczenie: 1–4 leczenia. +1 żywotności → 2–5');
  });

  it('describes the roll bonus', () => {
    expect(bonusTooltip('shield', 3)).toBe('Bonus obrony: +3 do tego rzutu');
  });

  it('describes health with and without shield', () => {
    expect(healthTooltip(10, 20, 0)).toBe('Zdrowie: 10 z 20');
    expect(healthTooltip(10, 20, 4)).toContain('Osłona (4)');
  });
});
