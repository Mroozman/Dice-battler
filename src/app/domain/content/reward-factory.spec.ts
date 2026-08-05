import { rollReward } from './reward-factory';
import { createGameFaker } from './game-faker';

describe('rollReward', () => {
  it('is deterministic for the same seed and stage', async () => {
    const f1 = await createGameFaker('reward-seed');
    const f2 = await createGameFaker('reward-seed');

    expect(rollReward(f1, 0)).toEqual(rollReward(f2, 0));
  });

  it.each([
    [0, [6, 8]],
    [1, [8, 10, 12]],
    [2, [12, 14, 16, 20]],
  ] as const)('keeps stage %i rewards within the configured die sizes', async (stageIndex, allowed) => {
    const f = await createGameFaker(`sides-seed-${stageIndex}`);
    for (let i = 0; i < 30; i++) {
      const die = rollReward(f, stageIndex);
      expect(allowed).toContain(die.sides);
    }
  });

  it('always returns a valid die kind', async () => {
    const f = await createGameFaker('kind-seed');
    for (let i = 0; i < 30; i++) {
      expect(['attack', 'heal', 'shield']).toContain(rollReward(f, 1).kind);
    }
  });

  it('can eventually produce all three kinds across enough rolls', async () => {
    const f = await createGameFaker('variety-seed');
    const kinds = new Set(Array.from({ length: 60 }, () => rollReward(f, 1).kind));

    expect(kinds.size).toBe(3);
  });

  it('throws for a stage with no configured reward (e.g. the boss stage)', async () => {
    const f = await createGameFaker('boss-seed');
    expect(() => rollReward(f, 3)).toThrow();
  });

  it('ids identify the reward as stage-scoped', async () => {
    const f = await createGameFaker('id-seed');
    expect(rollReward(f, 2).id).toBe('reward-2');
  });
});
