import type { StageKind } from '../domain/model/run';

const MAX_GROUP_SHADE = 2;

export function stageShadeClass(index: number, kind: StageKind): string {
  if (kind === 'boss') {
    return 'stage-shade--boss';
  }
  return `stage-shade--${Math.min(index, MAX_GROUP_SHADE)}`;
}
