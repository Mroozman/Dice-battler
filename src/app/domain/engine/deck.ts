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

export function assertDeckInvariant(deck: Deck): void {
  const catalogSize = Object.keys(deck.catalog).length;
  const total = deck.pool.length + deck.hand.length + deck.discard.length;
  if (total !== catalogSize) {
    throw new Error(
      `Deck invariant violated: pool(${deck.pool.length}) + hand(${deck.hand.length}) + discard(${deck.discard.length}) = ${total}, expected catalog size ${catalogSize}`,
    );
  }
}
