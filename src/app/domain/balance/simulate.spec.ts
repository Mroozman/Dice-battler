import { runBalanceSimulation, formatBalanceReport } from './simulate-report';
import { RULES } from '../engine/rules';

const DEFAULT_RUN_COUNT = 20;
const DEFAULT_RUN_TIMEOUT_MS = 120_000;

describe('balance simulation report', () => {
  it(
    `runs ${DEFAULT_RUN_COUNT} seeded runs through GreedyPlayerPolicy vs GreedyPolicy and prints a win-rate report`,
    async () => {
      const report = await runBalanceSimulation(DEFAULT_RUN_COUNT, RULES);
      console.log(formatBalanceReport(report));

      expect(report.totalRuns).toBe(DEFAULT_RUN_COUNT);
      expect(report.winRate).toBeGreaterThanOrEqual(0);
      expect(report.winRate).toBeLessThanOrEqual(1);
    },
    DEFAULT_RUN_TIMEOUT_MS,
  );
});
