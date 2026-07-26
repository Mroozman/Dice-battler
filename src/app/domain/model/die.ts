export type DieSides = 4 | 6 | 8 | 10 | 12 | 14 | 16 | 18 | 20;

export type DieKind = 'attack' | 'heal' | 'shield';

export type DieId = string & { readonly __brand: 'DieId' };

export interface DieDef {
  readonly id: DieId;
  readonly sides: DieSides;
  readonly kind: DieKind;
  readonly label: string;
}
