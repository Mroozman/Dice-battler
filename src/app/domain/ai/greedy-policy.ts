import type { EnemyPolicy } from './policy';
import type { BattleState } from '../model/battle';
import type { Combatant, CombatantId } from '../model/combatant';
import type { DieDef, DieId } from '../model/die';

const LOW_HP_THRESHOLD = 0.4;

function findEnemy(state: BattleState, enemyId: CombatantId): Combatant {
  const enemy = state.enemies.find((e) => e.id === enemyId);
  if (!enemy) {
    throw new Error(`Unknown enemy: ${enemyId}`);
  }
  return enemy;
}

function availableDice(enemy: Combatant, excluded: ReadonlySet<DieId>): readonly DieDef[] {
  return enemy.deck.hand.filter((id) => !excluded.has(id)).map((id) => enemy.deck.catalog[id]);
}

function biggestAttack(dice: readonly DieDef[]): DieDef | null {
  const attacks = dice.filter((d) => d.kind === 'attack');
  if (attacks.length === 0) {
    return null;
  }
  return attacks.reduce((best, d) => (d.sides > best.sides ? d : best));
}

function pickOne(enemy: Combatant, excluded: ReadonlySet<DieId>): DieDef | null {
  const pool = availableDice(enemy, excluded);
  const isLowHp = enemy.hp / enemy.maxHp < LOW_HP_THRESHOLD;

  if (isLowHp) {
    const heal = pool.find((d) => d.kind === 'heal');
    if (heal) {
      return heal;
    }
  }

  if (enemy.shield === 0) {
    const shield = pool.find((d) => d.kind === 'shield');
    if (shield) {
      return shield;
    }
  }

  return biggestAttack(pool) ?? pool[0] ?? null;
}

export const GreedyPolicy: EnemyPolicy = {
  chooseDice(state: BattleState, enemyId: CombatantId, count: number): readonly DieId[] {
    const enemy = findEnemy(state, enemyId);
    const excluded = new Set<DieId>();
    const chosen: DieId[] = [];

    for (let i = 0; i < count; i++) {
      const die = pickOne(enemy, excluded);
      if (!die) {
        break;
      }
      chosen.push(die.id);
      excluded.add(die.id);
    }

    return chosen;
  },
};
