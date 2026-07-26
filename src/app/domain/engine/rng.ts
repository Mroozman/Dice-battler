import type { DieSides } from '../model/die';

const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;
const MULBERRY32_INCREMENT = 0x6d2b79f5;

export interface Rng {
  next(): number;
  readonly cursor: number;
}

function hashSeed(seed: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + MULBERRY32_INCREMENT) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: string, cursor = 0): Rng {
  const next = mulberry32(hashSeed(seed));
  for (let i = 0; i < cursor; i++) {
    next();
  }

  let currentCursor = cursor;
  return {
    next(): number {
      currentCursor += 1;
      return next();
    },
    get cursor(): number {
      return currentCursor;
    },
  };
}

export function rollDie(sides: DieSides, rng: Rng): number {
  return Math.floor(rng.next() * sides) + 1;
}
