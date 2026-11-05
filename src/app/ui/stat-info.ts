import type { StatKind } from '../domain/model/stats';
import type { DieKind } from '../domain/model/die';
import { DIE_KIND_ICON } from './die-kind-icon';

export interface StatInfo {
  readonly stat: StatKind;
  readonly label: string;
  readonly icon: string;
  readonly description: string;
}

const DIE_KIND_BY_STAT: Readonly<Record<StatKind, DieKind>> = {
  strength: 'attack',
  vitality: 'heal',
  defense: 'shield',
};

const LABELS: Readonly<Record<StatKind, string>> = {
  strength: 'Siła',
  vitality: 'Żywotność',
  defense: 'Obrona',
};

const DESCRIPTIONS: Readonly<Record<StatKind, string>> = {
  strength: '+1 do efektu każdej kości ataku',
  vitality: '+1 do efektu każdej kości leczenia',
  defense: '+1 do efektu każdej kości osłony',
};

export const STAT_ORDER: readonly StatKind[] = ['strength', 'vitality', 'defense'];

export const STAT_INFO: readonly StatInfo[] = STAT_ORDER.map((stat) => ({
  stat,
  label: LABELS[stat],
  icon: DIE_KIND_ICON[DIE_KIND_BY_STAT[stat]],
  description: DESCRIPTIONS[stat],
}));
