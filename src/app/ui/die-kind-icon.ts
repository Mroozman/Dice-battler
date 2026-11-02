import type { DieKind } from '../domain/model/die';

export const DIE_KIND_ICON: Readonly<Record<DieKind, string>> = {
  attack: '⚔',
  heal: '✚',
  shield: '🛡',
};
