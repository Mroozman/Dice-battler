import { archetypes, createGameFaker, epithets } from './game-faker';

function sampleInts(f: Awaited<ReturnType<typeof createGameFaker>>, count: number): number[] {
  return Array.from({ length: count }, () => f.number.int({ min: 1, max: 1_000_000 }));
}

describe('createGameFaker', () => {
  it('is deterministic for the same seed', async () => {
    const f1 = await createGameFaker('seed-a');
    const f2 = await createGameFaker('seed-a');

    expect(sampleInts(f1, 10)).toEqual(sampleInts(f2, 10));
  });

  it('differs across distinct seeds', async () => {
    const f1 = await createGameFaker('seed-a');
    const f2 = await createGameFaker('seed-b');

    expect(sampleInts(f1, 10)).not.toEqual(sampleInts(f2, 10));
  });

  it('falls back to the en/base locale chain for standard modules our custom locale does not define', async () => {
    const f = await createGameFaker('seed-a');

    expect(() => f.person.firstName()).not.toThrow();
  });

  it('exposes our custom bestiary archetypes through the definitions proxy', async () => {
    const f = await createGameFaker('seed-a');

    const list = archetypes(f);

    expect(list.length).toBe(7);
    expect(list.map((a) => a.key)).toContain('scavenger');
    expect(list.find((a) => a.tier === 'boss')?.key).toBe('devourer');
  });

  it('exposes our custom epithet list', async () => {
    const f = await createGameFaker('seed-a');

    const list = epithets(f);

    expect(list.length).toBeGreaterThan(0);
    expect(list).toContain('Rdzawy');
  });
});
