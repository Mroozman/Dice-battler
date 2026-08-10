import type { PlayerChoice, PlayerPolicy } from './policy';
import type { BattleState } from '../model/battle';
import type { Combatant, CombatantId } from '../model/combatant';
import type { DieDef, DieId } from '../model/die';

const LOW_HP_THRESHOLD = 0.4;

function availableDice(player: Combatant, excluded: ReadonlySet<DieId>): readonly DieDef[] {
  return player.deck.hand.filter((id) => !excluded.has(id)).map((id) => player.deck.catalog[id]);
}

function biggestAttack(dice: readonly DieDef[]): DieDef | null {
  const attacks = dice.filter((d) => d.kind === 'attack');
  if (attacks.length === 0) {
    return null;
  }
  return attacks.reduce((best, d) => (d.sides > best.sides ? d : best));
}

function pickOne(player: Combatant, excluded: ReadonlySet<DieId>): DieDef | null {
  const pool = availableDice(player, excluded);
  const isLowHp = player.hp / player.maxHp < LOW_HP_THRESHOLD;

  if (isLowHp) {
    const heal = pool.find((d) => d.kind === 'heal');
    if (heal) {
      return heal;
    }
  }

  if (player.shield === 0) {
    const shield = pool.find((d) => d.kind === 'shield');
    if (shield) {
      return shield;
    }
  }

  return biggestAttack(pool) ?? pool[0] ?? null;
}

function weakestEnemy(enemies: readonly Combatant[]): CombatantId | null {
  const alive = enemies.filter((e) => e.hp > 0);
  if (alive.length === 0) {
    return null;
  }
  return alive.reduce((weakest, e) => (e.hp < weakest.hp ? e : weakest)).id;
}

export const GreedyPlayerPolicy: PlayerPolicy = {
  chooseDice(state: BattleState, count: number): readonly PlayerChoice[] {
    const player = state.player;
    const excluded = new Set<DieId>();
    const chosen: PlayerChoice[] = [];

    for (let i = 0; i < count; i++) {
      const die = pickOne(player, excluded);
      if (!die) {
        break;
      }
      excluded.add(die.id);
      const targetId = die.kind === 'attack' ? weakestEnemy(state.enemies) : player.id;
      chosen.push({ dieId: die.id, targetId });
    }

    return chosen;
  },
};
