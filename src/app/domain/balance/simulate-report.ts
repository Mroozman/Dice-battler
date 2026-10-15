import { simulateRun } from './simulate-run';
import type { GameRules } from '../engine/rules';

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
