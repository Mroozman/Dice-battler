import type { Faker } from '@faker-js/faker';
import type { DieDef, DieId, DieKind, DieSides } from '../model/die';

const SIDES_BY_STAGE: Readonly<Record<number, readonly DieSides[]>> = {
  0: [6, 8],
  1: [8, 10, 12],
  2: [12, 14, 16, 20],
};

const KIND_WEIGHTS: ReadonlyArray<{ value: DieKind; weight: number }> = [
  { value: 'attack', weight: 5 },
  { value: 'heal', weight: 3 },
  { value: 'shield', weight: 3 },
];

export function rollReward(f: Faker, stageIndex: number): DieDef {
  const sidesChoices = SIDES_BY_STAGE[stageIndex];
  if (!sidesChoices) {
    throw new Error(`No reward sides configured for stage ${stageIndex}`);
  }

  const sides = f.helpers.arrayElement(sidesChoices);
  const kind = f.helpers.weightedArrayElement(KIND_WEIGHTS);

  return {
    id: `reward-${stageIndex}` as DieId,
    sides,
    kind,
    label: `D${sides}`,
  };
}
