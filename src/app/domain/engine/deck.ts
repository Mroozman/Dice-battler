import type { Deck } from '../model/deck';
import type { DieDef, DieId } from '../model/die';
import type { Rng } from './rng';

export function minDeckSize(handSize: number, dicePerTurn: number): number {
  return handSize + dicePerTurn;
}

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function buildBattleDeck(
  catalog: Readonly<Record<DieId, DieDef>>,
  handSize: number,
  dicePerTurn: number,
  rng: Rng,
): Deck {
  const ids = Object.keys(catalog) as DieId[];
  const minSize = minDeckSize(handSize, dicePerTurn);
  if (ids.length < minSize) {
    throw new Error(`Deck too small: catalog has ${ids.length} dice, needs at least ${minSize}`);
  }

  const shuffled = shuffle(ids, rng);
  return {
    catalog,
    hand: shuffled.slice(0, handSize),
    pool: shuffled.slice(handSize),
    discard: [],
  };
}

export function discardUsed(deck: Deck, ids: readonly DieId[]): Deck {
  const discarded = new Set(ids);
  return {
    ...deck,
    hand: deck.hand.filter((id) => !discarded.has(id)),
    pool: deck.pool.filter((id) => !discarded.has(id)),
    discard: [...deck.discard, ...ids],
  };
}

export interface DrawResult {
  readonly deck: Deck;
  readonly drawn: readonly DieId[];
  readonly reshuffled: boolean;
}

export function draw(deck: Deck, count: number, rng: Rng): DrawResult {
  let pool = [...deck.pool];
  let discard = [...deck.discard];
  let reshuffled = false;
  const drawn: DieId[] = [];

  for (let i = 0; i < count; i++) {
    if (pool.length === 0) {
      if (discard.length === 0) {
        throw new Error('Cannot draw: pool and discard are both empty');
      }
      pool = shuffle(discard, rng);
      discard = [];
      reshuffled = true;
    }
    drawn.push(pool.shift()!);
  }

  return {
    deck: { ...deck, pool, hand: [...deck.hand, ...drawn], discard },
    drawn,
    reshuffled,
  };
}

export function handView(deck: Deck): readonly DieDef[] {
  return deck.hand.map((id) => deck.catalog[id]);
}

export type DieStatus = 'pool' | 'hand' | 'discard';

export interface DeckViewEntry {
  readonly def: DieDef;
  readonly status: DieStatus;
}

function compareDieDef(a: DieDef, b: DieDef): number {
  if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
  if (a.sides !== b.sides) return a.sides - b.sides;
  return a.id.localeCompare(b.id);
}

export function deckView(deck: Deck): readonly DeckViewEntry[] {
  const statusById = new Map<DieId, DieStatus>();
  for (const id of deck.pool) statusById.set(id, 'pool');
  for (const id of deck.hand) statusById.set(id, 'hand');
  for (const id of deck.discard) statusById.set(id, 'discard');

  return Object.values(deck.catalog)
    .slice()
    .sort(compareDieDef)
    .map((def) => ({ def, status: statusById.get(def.id)! }));
}

export function assertDeckInvariant(deck: Deck): void {
  const catalogSize = Object.keys(deck.catalog).length;
  const total = deck.pool.length + deck.hand.length + deck.discard.length;
  if (total !== catalogSize) {
    throw new Error(
      `Deck invariant violated: pool(${deck.pool.length}) + hand(${deck.hand.length}) + discard(${deck.discard.length}) = ${total}, expected catalog size ${catalogSize}`,
    );
  }
}
