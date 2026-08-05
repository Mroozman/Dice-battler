import { reduce } from './reduce';
import type { ReduceRules } from './reduce';
import type { GameState } from '../model/state';
import type { EnemyBlueprint, RunState, StageDef } from '../model/run';
import type { CombatantId } from '../model/combatant';
import type { DieDef, DieId } from '../model/die';

const RULES: ReduceRules = { handSize: 2, dicePerTurn: 2, effectFromRoll: (roll) => roll, healBetweenStages: 0.25 };

/**
 * Every die here is an identical D8 attack die — same trick as battle-e2e.spec.ts (M3): the
 * outcome only depends on the explicit values dispatched via roll/reveal, never on which
 * particular id a shuffle happens to draw, so the whole scripted run is fully deterministic.
 */
function makeDie(id: string): DieDef {
  return { id: id as DieId, sides: 8, kind: 'attack', label: 'D8' };
}

function makeEnemyBlueprint(id: string, hp: number): EnemyBlueprint {
  const dice = [makeDie(`${id}-a`)];
  const catalog = Object.fromEntries(dice.map((d) => [d.id, d])) as Readonly<Record<DieId, DieDef>>;
  return {
    id: id as CombatantId,
    archetypeKey: 'test',
    name: id,
    hp,
    maxHp: hp,
    shield: 0,
    dicePerTurn: 1,
    deck: { catalog, pool: dice.map((d) => d.id), hand: [], discard: [] },
  };
}

describe('a full run, scripted end to end (M6 point 9)', () => {
  it('plays two stages (group + boss) to a run victory, with a reward taken between them', () => {
    const [p1, p2, p3, p4] = ['p1', 'p2', 'p3', 'p4'].map((id) => makeDie(id));
    const playerCatalog = Object.fromEntries([p1, p2, p3, p4].map((d) => [d.id, d])) as Readonly<
      Record<DieId, DieDef>
    >;

    const stage0: StageDef = { index: 0, kind: 'group', tier: 1, enemies: [makeEnemyBlueprint('e0', 8)] };
    const stage1: StageDef = { index: 1, kind: 'boss', tier: 'boss', enemies: [makeEnemyBlueprint('boss', 8)] };

    const run: RunState = {
      stageIndex: 0,
      stages: [stage0, stage1],
      playerCatalog,
      playerHp: 12,
      playerMaxHp: 20,
      pendingReward: null,
      outcome: 'ongoing',
      lastHealAmount: 0,
    };

    let state: GameState = {
      schemaVersion: 1,
      seed: 'run-e2e-seed',
      rngCursor: 0,
      screen: 'title',
      run: { stageIndex: 0, stages: [], playerCatalog: {}, playerHp: 0, playerMaxHp: 0, pendingReward: null, outcome: 'ongoing', lastHealAmount: 0 },
      battle: null,
      log: [],
    };

    const dispatch = (action: Parameters<typeof reduce>[1]) => {
      state = reduce(state, action, RULES).state;
    };

    // --- Boot the run, walk through the stage 1 intro, and enter the first battle.
    dispatch({ type: 'run/start', run, seed: 'run-e2e-seed' });
    expect(state.screen).toBe('stageIntro');

    dispatch({ type: 'stage/enter' });
    expect(state.screen).toBe('battle');
    expect(state.battle!.enemies.map((e) => e.id)).toEqual(['e0']);

    // --- Win stage 0 (group): two identical attack dice, first one already lethal.
    const [handA, handB] = state.battle!.player.deck.hand;
    dispatch({ type: 'player/toggleDie', dieId: handA });
    dispatch({ type: 'player/setTarget', dieId: handA, targetId: 'e0' as CombatantId });
    dispatch({ type: 'player/toggleDie', dieId: handB });
    dispatch({ type: 'player/setTarget', dieId: handB, targetId: 'e0' as CombatantId });
    dispatch({ type: 'player/confirm' });
    dispatch({ type: 'roll/reveal', value: 8 });
    dispatch({ type: 'roll/apply' });

    expect(state.battle!.enemies[0].hp).toBe(0);
    expect(state.screen).toBe('battle'); // victory alone does not touch run-level state (M6 point 6)

    // --- The orchestrator (TurnEngine, tested separately) would roll a reward here; we dispatch
    // it by hand since this test is about the reducer's state-machine wiring, not content rolls.
    // Kept as an identical D8 attack die for the same reason as the rest of the catalog: whichever
    // 2 of the (now 4) catalog dice the next shuffle deals into the boss-stage hand, both are
    // still plain attack dice that can target the boss without any special-casing here.
    const reward: DieDef = { id: 'reward-0' as DieId, sides: 8, kind: 'attack', label: 'D8' };
    dispatch({ type: 'reward/offer', die: reward });
    expect(state.screen).toBe('reward');
    expect(state.run.playerHp).toBe(12); // not yet carried over from the battle

    dispatch({ type: 'reward/swap', replacedId: p1.id });
    expect(state.run.playerCatalog[p1.id]).toBeUndefined();
    expect(state.run.playerCatalog[reward.id]).toEqual(reward);

    dispatch({ type: 'stage/advance' });
    expect(state.screen).toBe('stageIntro');
    expect(state.run.stageIndex).toBe(1);
    // 12 hp -> +round(0.25 * 20) = 5, well under the maxHp-hp=8 cap, so the full amount applies.
    expect(state.run.playerHp).toBe(17);
    expect(state.run.lastHealAmount).toBe(5);
    expect(state.battle).toBeNull();

    // --- Enter and win the boss stage the same way.
    dispatch({ type: 'stage/enter' });
    expect(state.screen).toBe('battle');
    expect(state.battle!.enemies.map((e) => e.id)).toEqual(['boss']);

    const [bossHandA, bossHandB] = state.battle!.player.deck.hand;
    dispatch({ type: 'player/toggleDie', dieId: bossHandA });
    dispatch({ type: 'player/setTarget', dieId: bossHandA, targetId: 'boss' as CombatantId });
    dispatch({ type: 'player/toggleDie', dieId: bossHandB });
    dispatch({ type: 'player/setTarget', dieId: bossHandB, targetId: 'boss' as CombatantId });
    dispatch({ type: 'player/confirm' });
    dispatch({ type: 'roll/reveal', value: 8 });
    dispatch({ type: 'roll/apply' });

    expect(state.battle!.enemies[0].hp).toBe(0);

    // --- No reward after the boss: the orchestrator goes straight to stage/advance.
    dispatch({ type: 'stage/advance' });

    expect(state.screen).toBe('runOver');
    expect(state.run.outcome).toBe('victory');
    expect(state.battle).toBeNull();

    // The run is over — nothing further should be accepted.
    expect(() => dispatch({ type: 'stage/enter' })).toThrow();
  });
});
