import type { DieDef, DieId } from './die';

export interface Deck {
  readonly catalog: Readonly<Record<DieId, DieDef>>;
  readonly pool: readonly DieId[];
  readonly hand: readonly DieId[];
  readonly discard: readonly DieId[];
}
