import type { Faker } from '@faker-js/faker';
import { hashSeed } from '../engine/rng';
import type { ArchetypeDef } from './bestiary-locale';

export async function createGameFaker(seed: string): Promise<Faker> {
  const { Faker, en, base } = await import('@faker-js/faker');
  const { bestiaryLocale } = await import('./bestiary-locale');

  const gameFaker = new Faker({ locale: [bestiaryLocale, en, base] });
  gameFaker.seed(hashSeed(seed));
  return gameFaker;
}

export function archetypes(f: Faker): readonly ArchetypeDef[] {
  return f.definitions['bestiary']['archetype'] as unknown as readonly ArchetypeDef[];
}

export function epithets(f: Faker): readonly string[] {
  return f.definitions['bestiary']['epithet'] as unknown as readonly string[];
}
