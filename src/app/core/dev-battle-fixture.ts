import type { DieDef, DieId } from '../domain/model/die';
import type { Combatant, CombatantId } from '../domain/model/combatant';
import type { BattleState } from '../domain/model/battle';
import type { GameState } from '../domain/model/state';
import type { DeckDieTemplate, GameRules } from '../domain/engine/rules';
import { createRng } from '../domain/engine/rng';
import { buildBattleDeck } from '../domain/engine/deck';
import { expandDeckTemplate } from '../domain/content/deck-builder';

const DEV_SEED = 'dev-seed';

interface DevEnemySpec {
  readonly id: string;
  readonly name: string;
  readonly hp: number;
  readonly deck: readonly DeckDieTemplate[];
}

const DEV_ENEMIES: readonly DevEnemySpec[] = [
  {
    id: 'e0',
    name: 'Rdzawy Padlinożerca',
    hp: 6,
    deck: [
      { sides: 4, kind: 'attack', count: 3 },
      { sides: 4, kind: 'shield', count: 1 },
    ],
  },
  {
    id: 'e1',
    name: 'Zgniły Zbir',
    hp: 9,
    deck: [
      { sides: 6, kind: 'attack', count: 3 },
      { sides: 4, kind: 'heal', count: 1 },
    ],
  },
];

function makeEnemy(spec: DevEnemySpec): Combatant {
  const dice = expandDeckTemplate(spec.deck, spec.id);
  const catalog = Object.fromEntries(dice.map((d) => [d.id, d])) as Readonly<Record<DieId, DieDef>>;
  return {
    id: spec.id as CombatantId,
    name: spec.name,
    archetypeKey: spec.id,
    kind: 'enemy',
    hp: spec.hp,
    maxHp: spec.hp,
    shield: 0,
    deck: { catalog, pool: dice.map((d) => d.id), hand: [], discard: [] },
    dicePerTurn: 1,
  };
}

export function createDevGameState(rules: GameRules): GameState {
  const dice = expandDeckTemplate(rules.starterDeck, 'player');
  const catalog = Object.fromEntries(dice.map((d) => [d.id, d])) as Readonly<Record<DieId, DieDef>>;
  const rng = createRng(DEV_SEED);
  const deck = buildBattleDeck(catalog, rules.handSize, rules.dicePerTurn, rng);

  const player: Combatant = {
    id: 'player' as CombatantId,
    name: 'Gracz',
    archetypeKey: 'player',
    kind: 'player',
    hp: rules.playerMaxHp,
    maxHp: rules.playerMaxHp,
    shield: 0,
    deck,
    dicePerTurn: rules.dicePerTurn,
  };

  const enemies = DEV_ENEMIES.map(makeEnemy);

  const battle: BattleState = {
    round: 1,
    phase: 'player.selecting',
    activeCombatantId: player.id,
    player,
    enemies,
    selection: [],
    resolveQueue: [],
    staged: null,
  };

  return {
    schemaVersion: 1,
    seed: DEV_SEED,
    rngCursor: rng.cursor,
    screen: 'battle',
    run: {
      stageIndex: 0,
      stages: [],
      playerCatalog: catalog,
      playerHp: player.hp,
      playerMaxHp: player.maxHp,
      pendingReward: null,
      outcome: 'ongoing',
    },
    battle,
    log: [],
  };
}
