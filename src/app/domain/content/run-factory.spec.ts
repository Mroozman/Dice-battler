import { createRun } from './run-factory';
import { RULES } from '../engine/rules';
import { bestiaryLocale } from './bestiary-locale';

const tierByKey = new Map(bestiaryLocale.bestiary.archetype.map((a) => [a.key, a.tier]));

describe('createRun', () => {
  it('is deterministic: the same seed produces an identical run', async () => {
    const runA = await createRun('run-seed', RULES);
    const runB = await createRun('run-seed', RULES);

    expect(runA).toEqual(runB);
  });

  it('differs across distinct seeds', async () => {
    const runA = await createRun('run-seed-1', RULES);
    const runB = await createRun('run-seed-2', RULES);

    expect(runA).not.toEqual(runB);
  });

  it('always produces 3 group stages followed by a single boss stage', async () => {
    const run = await createRun('structure-seed', RULES);

    expect(run.stages.length).toBe(4);
    expect(run.stages.map((s) => s.kind)).toEqual(['group', 'group', 'group', 'boss']);
    expect(run.stages.map((s) => s.tier)).toEqual([1, 2, 3, 'boss']);
    expect(run.stages.map((s) => s.index)).toEqual([0, 1, 2, 3]);
  });

  it('keeps every group stage enemy count and tier within the ranges from the design doc', async () => {
    const run = await createRun('ranges-seed', RULES);
    const [stage1, stage2, stage3, bossStage] = run.stages;

    expect(stage1.enemies.length).toBeGreaterThanOrEqual(1);
    expect(stage1.enemies.length).toBeLessThanOrEqual(2);
    expect(stage2.enemies.length).toBeGreaterThanOrEqual(2);
    expect(stage2.enemies.length).toBeLessThanOrEqual(3);
    expect(stage3.enemies.length).toBeGreaterThanOrEqual(2);
    expect(stage3.enemies.length).toBeLessThanOrEqual(3);
    expect(bossStage.enemies.length).toBe(1);

    for (const enemy of stage1.enemies) expect(tierByKey.get(enemy.archetypeKey)).toBe(1);
    for (const enemy of stage2.enemies) expect(tierByKey.get(enemy.archetypeKey)).toBe(2);
    for (const enemy of stage3.enemies) expect(tierByKey.get(enemy.archetypeKey)).toBe(3);
    expect(bossStage.enemies[0].archetypeKey).toBe('devourer');
    expect(bossStage.enemies[0].dicePerTurn).toBe(2);
  });

  it('rolls boss hp within the archetype range and gives it a matching name', async () => {
    const run = await createRun('boss-seed', RULES);
    const boss = run.stages[3].enemies[0];

    expect(boss.hp).toBe(boss.maxHp);
    expect(boss.hp).toBeGreaterThanOrEqual(10);
    expect(boss.hp).toBeLessThanOrEqual(13);
    expect(boss.name).toContain('Pożeracz');
  });

  it('gives every enemy in a stage its own non-colliding die ids, even with repeated archetypes', async () => {
    const run = await createRun('collision-seed', RULES);

    for (const stage of run.stages) {
      const allIds = stage.enemies.flatMap((enemy) => Object.keys(enemy.deck.catalog));
      expect(new Set(allIds).size).toBe(allIds.length);
    }
  });

  it('builds the player catalog from the starter deck template in the rules', async () => {
    const run = await createRun('player-seed', RULES);

    const expectedDiceCount = RULES.starterDeck.reduce((sum, t) => sum + t.count, 0);
    expect(Object.keys(run.playerCatalog).length).toBe(expectedDiceCount);
  });

  it('starts a fresh run at stage 0 with no pending reward and an ongoing outcome', async () => {
    const run = await createRun('fresh-seed', RULES);

    expect(run.stageIndex).toBe(0);
    expect(run.pendingReward).toBeNull();
    expect(run.outcome).toBe('ongoing');
    expect(run.playerHp).toBe(RULES.playerMaxHp);
    expect(run.playerMaxHp).toBe(RULES.playerMaxHp);
  });
});
