import type { Faker } from '@faker-js/faker';
import type { ArchetypeDef } from './bestiary-locale';
import { archetypes, createGameFaker, epithets } from './game-faker';
import { expandDeckTemplate } from './deck-builder';
import type { GameRules } from '../engine/rules';
import type { EnemyBlueprint, RunState, StageDef } from '../model/run';
import type { CombatantId } from '../model/combatant';
import type { DieDef, DieId } from '../model/die';

function spawn(f: Faker, archetype: ArchetypeDef, slot: number): EnemyBlueprint {
  const maxHp = f.number.int({ min: archetype.hp[0], max: archetype.hp[1] });
  const id = `e${slot}` as CombatantId;
  const dice = expandDeckTemplate(archetype.deck, id);
  const catalog = Object.fromEntries(dice.map((d) => [d.id, d])) as Readonly<Record<DieId, DieDef>>;

  return {
    id,
    archetypeKey: archetype.key,
    name: `${f.helpers.arrayElement(epithets(f))} ${archetype.title}`,
    hp: maxHp,
    maxHp,
    shield: 0,
    dicePerTurn: archetype.dicePerTurn,
    deck: { catalog, pool: dice.map((d) => d.id), hand: [], discard: [] },
  };
}

function buildGroupStage(
  f: Faker,
  pool: readonly ArchetypeDef[],
  index: number,
  tier: 1 | 2 | 3,
  count: number,
): StageDef {
  const candidates = pool.filter((a) => a.tier === tier);
  if (candidates.length === 0) {
    throw new Error(`Bestiary has no tier ${tier} archetypes`);
  }

  return {
    index,
    kind: 'group',
    tier,
    enemies: Array.from({ length: count }, (_, slot) => spawn(f, f.helpers.arrayElement(candidates), slot)),
  };
}

export async function createRun(seed: string, rules: GameRules): Promise<RunState> {
  const f = await createGameFaker(seed);
  const pool = archetypes(f);
  const boss = pool.find((a) => a.tier === 'boss');
  if (!boss) {
    throw new Error('Bestiary has no boss archetype');
  }

  const stages: readonly StageDef[] = [
    buildGroupStage(f, pool, 0, 1, f.number.int({ min: 1, max: 3 })),
    buildGroupStage(f, pool, 1, 2, f.number.int({ min: 2, max: 3 })),
    buildGroupStage(f, pool, 2, 3, f.number.int({ min: 3, max: 4 })),
    { index: 3, kind: 'boss', tier: 'boss', enemies: [spawn(f, boss, 0)] },
  ];

  const playerDice = expandDeckTemplate(rules.starterDeck, 'player');
  const playerCatalog = Object.fromEntries(playerDice.map((d) => [d.id, d])) as Readonly<Record<DieId, DieDef>>;

  return {
    stageIndex: 0,
    stages,
    playerCatalog,
    playerHp: rules.playerMaxHp,
    playerMaxHp: rules.playerMaxHp,
    pendingReward: null,
    outcome: 'ongoing',
    lastHealAmount: 0,
  };
}
