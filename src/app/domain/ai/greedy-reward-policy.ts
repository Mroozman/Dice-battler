import type { DieDef, DieId } from '../model/die';

export type RewardDecision =
  | { readonly type: 'swap'; readonly replacedId: DieId }
  | { readonly type: 'skip' };

function weakestOfKind(catalog: Readonly<Record<DieId, DieDef>>, kind: DieDef['kind']): DieDef | null {
  const sameKind = Object.values(catalog).filter((d) => d.kind === kind);
  if (sameKind.length === 0) {
    return null;
  }
  return sameKind.reduce((worst, d) => (d.sides < worst.sides ? d : worst));
}

export function chooseRewardAction(
  catalog: Readonly<Record<DieId, DieDef>>,
  reward: DieDef,
): RewardDecision {
  const weakest = weakestOfKind(catalog, reward.kind);
  if (!weakest || reward.sides <= weakest.sides) {
    return { type: 'skip' };
  }
  return { type: 'swap', replacedId: weakest.id };
}
