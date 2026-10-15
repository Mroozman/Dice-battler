import { simulateRun } from './simulate-run';
import { RULES } from '../engine/rules';
import type { GameRules } from '../engine/rules';

const DEFAULT_RUN_COUNT = 20;
const DEFAULT_RUN_TIMEOUT_MS = 120_000;
const SEED_PREFIX = 'balance';

export interface BalanceReport {
  readonly totalRuns: number;
  readonly victories: number;
  readonly winRate: number;
  readonly defeatsByStage: ReadonlyMap<number, number>;
}

export async function runBalanceSimulation(count: number, rules: GameRules): Promise<BalanceReport> {
  let victories = 0;
  const defeatsByStage = new Map<number, number>();

  for (let i = 0; i < count; i++) {
    const result = await simulateRun(`${SEED_PREFIX}-${i}`, rules);
    if (result.outcome === 'victory') {
      victories++;
    } else {
      defeatsByStage.set(result.stageReached, (defeatsByStage.get(result.stageReached) ?? 0) + 1);
    }
  }

  return { totalRuns: count, victories, winRate: victories / count, defeatsByStage };
}

export function formatBalanceReport(report: BalanceReport): string {
  const lines: string[] = [
    `Runs: ${report.totalRuns}`,
    `Victories: ${report.victories} (${(report.winRate * 100).toFixed(1)}% win rate)`,
    'Defeats by stage reached:',
  ];

  const stages = [...report.defeatsByStage.keys()].sort((a, b) => a - b);
  for (const stage of stages) {
    const count = report.defeatsByStage.get(stage) ?? 0;
    const share = ((count / report.totalRuns) * 100).toFixed(1);
    lines.push(`  stage ${stage}: ${count} (${share}%)`);
  }

  return lines.join('\n');
}

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
