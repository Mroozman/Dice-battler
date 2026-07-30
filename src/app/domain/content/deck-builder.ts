import type { DieDef, DieId } from '../model/die';
import type { DeckDieTemplate } from '../engine/rules';

export function expandDeckTemplate(templates: readonly DeckDieTemplate[], prefix: string): DieDef[] {
  return templates.flatMap((template, templateIndex) =>
    Array.from({ length: template.count }, (_, i) => ({
      id: `${prefix}-${templateIndex}-${i}` as DieId,
      sides: template.sides,
      kind: template.kind,
      label: `D${template.sides}`,
    })),
  );
}
