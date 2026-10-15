import { runBalanceSimulation, formatBalanceReport } from './simulate-report';
import { RULES } from '../engine/rules';

const DEFAULT_RUN_COUNT = 20;
const DEFAULT_RUN_TIMEOUT_MS = 120_000;

const FROZEN_RUN_COUNT = 200;
const MIN_TARGET_WIN_RATE_PERCENT = 35;
const MAX_TARGET_WIN_RATE_PERCENT = 55;

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

describe('balance regression guard', () => {
  it(
    `keeps the win rate over ${FROZEN_RUN_COUNT} fixed seeds within the tuned ${MIN_TARGET_WIN_RATE_PERCENT}-${MAX_TARGET_WIN_RATE_PERCENT}% band (M7 point 6)`,
    async () => {
      const report = await runBalanceSimulation(FROZEN_RUN_COUNT, RULES);
      console.log(formatBalanceReport(report));

      expect(report.totalRuns).toBe(FROZEN_RUN_COUNT);
      expect(report.winRate * 100).toBeGreaterThanOrEqual(MIN_TARGET_WIN_RATE_PERCENT);
      expect(report.winRate * 100).toBeLessThanOrEqual(MAX_TARGET_WIN_RATE_PERCENT);
    },
    DEFAULT_RUN_TIMEOUT_MS,
  );
});
