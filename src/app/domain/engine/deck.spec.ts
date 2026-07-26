import { createRng } from './rng';
import { assertDeckInvariant, buildBattleDeck, discardUsed, draw, minDeckSize } from './deck';
import type { Deck } from '../model/deck';
import type { DieDef, DieId } from '../model/die';

function makeCatalog(count: number): Readonly<Record<DieId, DieDef>> {
  const entries = Array.from({ length: count }, (_, i) => {
    const id = `d${i}` as DieId;
    const def: DieDef = { id, sides: 6, kind: 'attack', label: 'D6' };
    return [id, def] as const;
  });
  return Object.fromEntries(entries);
}

function totalSize(deck: Deck): number {
  return deck.pool.length + deck.hand.length + deck.discard.length;
}

describe('buildBattleDeck', () => {
  it('conserves the full catalog across pool, hand and discard (niezmiennik 1)', () => {
    const catalog = makeCatalog(8);
    const deck = buildBattleDeck(catalog, 3, 2, createRng('deck-seed'));

    expect(totalSize(deck)).toBe(8);
    expect(deck.discard.length).toBe(0);
  });

  it('deals exactly handSize dice into the hand', () => {
    const catalog = makeCatalog(8);
    const deck = buildBattleDeck(catalog, 3, 2, createRng('deck-seed'));

    expect(deck.hand.length).toBe(3);
    expect(deck.pool.length).toBe(5);
  });

  it('rejects a catalog smaller than handSize + dicePerTurn (niezmiennik 3)', () => {
    const catalog = makeCatalog(4);

    expect(() => buildBattleDeck(catalog, 3, 2, createRng('deck-seed'))).toThrow();
  });
});

describe('minDeckSize', () => {
  it('is the sum of handSize and dicePerTurn', () => {
    expect(minDeckSize(3, 2)).toBe(5);
  });
});

describe('discardUsed', () => {
  it('moves the given ids into discard without changing the total (niezmiennik 1)', () => {
    const catalog = makeCatalog(8);
    const deck = buildBattleDeck(catalog, 3, 2, createRng('deck-seed'));
    const used = deck.hand.slice(0, 2);

    const next = discardUsed(deck, used);

    expect(totalSize(next)).toBe(8);
    expect(next.discard).toEqual(used);
    expect(next.hand).toEqual(deck.hand.slice(2));
  });
});

describe('draw', () => {
  it('draws from the pool without reshuffling when enough dice are available', () => {
    const catalog = makeCatalog(8);
    const deck = buildBattleDeck(catalog, 3, 2, createRng('deck-seed'));

    const result = draw(deck, 2, createRng('draw-seed'));

    expect(result.drawn.length).toBe(2);
    expect(result.reshuffled).toBe(false);
    expect(totalSize(result.deck)).toBe(8);
  });

  it('reshuffles discard into pool when the pool runs short (niezmiennik 2)', () => {
    const catalog = makeCatalog(5);
    let deck = buildBattleDeck(catalog, 3, 2, createRng('deck-seed'));

    // Empty the pool into discard so the next draw must reshuffle.
    deck = discardUsed(deck, deck.pool);

    const result = draw(deck, 2, createRng('reshuffle-seed'));

    expect(result.reshuffled).toBe(true);
    expect(result.drawn.length).toBe(2);
    expect(totalSize(result.deck)).toBe(5);
  });

  it('never fails when discard happens strictly before draw (niezmiennik 2)', () => {
    const handSize = 3;
    const dicePerTurn = 2;
    const catalog = makeCatalog(minDeckSize(handSize, dicePerTurn));
    let deck = buildBattleDeck(catalog, handSize, dicePerTurn, createRng('turn-seed'));
    const rng = createRng('turn-rolls');

    for (let turn = 0; turn < 200; turn++) {
      const used = deck.hand.slice(0, dicePerTurn);
      deck = discardUsed(deck, used);

      expect(() => {
        const result = draw(deck, dicePerTurn, rng);
        deck = result.deck;
      }).not.toThrow();

      expect(totalSize(deck)).toBe(minDeckSize(handSize, dicePerTurn));
      expect(deck.hand.length).toBe(handSize);
    }
  });
});

describe('assertDeckInvariant', () => {
  it('does not throw for a well-formed deck', () => {
    const catalog = makeCatalog(8);
    const deck = buildBattleDeck(catalog, 3, 2, createRng('deck-seed'));

    expect(() => assertDeckInvariant(deck)).not.toThrow();
  });

  it('throws when the mass-conservation invariant is broken', () => {
    const catalog = makeCatalog(8);
    const deck = buildBattleDeck(catalog, 3, 2, createRng('deck-seed'));
    const broken: Deck = { ...deck, pool: deck.pool.slice(1) };

    expect(() => assertDeckInvariant(broken)).toThrow();
  });
});
