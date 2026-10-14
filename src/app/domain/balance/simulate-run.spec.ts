import { simulateRun } from './simulate-run';
import { createRun } from '../content/run-factory';
import { RULES } from '../engine/rules';

const SEEDS = ['sim-1', 'sim-2', 'sim-3', 'sim-4', 'sim-5'];

describe('simulateRun', () => {
  it('plays a full run to completion without throwing, for a handful of seeds', async () => {
    for (const seed of SEEDS) {
      const result = await simulateRun(seed, RULES);

      expect(['victory', 'defeat']).toContain(result.outcome);
      expect(result.stageReached).toBeGreaterThanOrEqual(0);
      expect(result.rounds).toBeGreaterThan(0);
    }
  });

  it('marks stageReached as the full stage count on victory, and an earlier stage on defeat', async () => {
    for (const seed of SEEDS) {
      const [result, run] = await Promise.all([simulateRun(seed, RULES), createRun(seed, RULES)]);

      if (result.outcome === 'victory') {
        expect(result.stageReached).toBe(run.stages.length);
      } else {
        expect(result.stageReached).toBeGreaterThanOrEqual(0);
        expect(result.stageReached).toBeLessThan(run.stages.length);
      }
    }
  });

  it('is deterministic: the same seed produces an identical result', async () => {
    const a = await simulateRun('sim-determinism', RULES);
    const b = await simulateRun('sim-determinism', RULES);

    expect(a).toEqual(b);
  });

  it('produces different outcomes across different seeds, not a single hardcoded result', async () => {
    const results = await Promise.all(SEEDS.map((seed) => simulateRun(seed, RULES)));
    const distinctStagesReached = new Set(results.map((r) => r.stageReached));

    expect(distinctStagesReached.size).toBeGreaterThan(1);
  });
});
