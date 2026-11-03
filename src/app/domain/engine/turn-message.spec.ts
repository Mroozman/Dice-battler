import { turnMessage } from './turn-message';
import type { BattleState } from '../model/battle';
import type { Combatant, CombatantId } from '../model/combatant';
import type { DieDef, DieId, DieKind } from '../model/die';

function makeDie(id: string, kind: DieKind): DieDef {
  return { id: id as DieId, sides: 6, kind, label: 'D6' };
}

const ATTACK = makeDie('atk', 'attack');
const HEAL = makeDie('heal', 'heal');

function makeCombatant(id: string, kind: Combatant['kind'], dice: readonly DieDef[] = []): Combatant {
  return {
    id: id as CombatantId,
    name: id === 'e0' ? 'Zbir' : id,
    archetypeKey: id,
    kind,
    hp: 10,
    maxHp: 10,
    shield: 0,
    deck: {
      catalog: Object.fromEntries(dice.map((d) => [d.id, d])) as Combatant['deck']['catalog'],
      pool: [],
      hand: dice.map((d) => d.id),
      discard: [],
    },
    dicePerTurn: 2,
  };
}

function makeBattle(overrides: Partial<BattleState> = {}): BattleState {
  const player = makeCombatant('player', 'player', [ATTACK, HEAL]);
  return {
    round: 1,
    phase: 'player.selecting',
    activeCombatantId: player.id,
    player,
    enemies: [makeCombatant('e0', 'enemy')],
    selection: [],
    resolveQueue: [],
    staged: null,
    ...overrides,
  };
}

describe('turnMessage', () => {
  it('asks the player to pick dice while the selection is not full', () => {
    expect(turnMessage(makeBattle())).toEqual({ side: 'player', text: 'Tura gracza: wybierz kości' });
    expect(
      turnMessage(makeBattle({ selection: [{ dieId: HEAL.id, targetId: 'player' as CombatantId }] })).text,
    ).toBe('Tura gracza: wybierz kości');
  });

  it('asks for a target while an attack die has none', () => {
    const battle = makeBattle({ selection: [{ dieId: ATTACK.id, targetId: null }] });

    expect(turnMessage(battle).text).toBe('Tura gracza: wybierz cel');
  });

  it('asks to confirm once the selection is full and targeted', () => {
    const battle = makeBattle({
      selection: [
        { dieId: ATTACK.id, targetId: 'e0' as CombatantId },
        { dieId: HEAL.id, targetId: 'player' as CombatantId },
      ],
    });

    expect(turnMessage(battle).text).toBe('Tura gracza: potwierdź wybór');
  });

  it('asks for a new target when the previous one died', () => {
    expect(turnMessage(makeBattle({ phase: 'player.retargeting' })).text).toBe(
      'Tura gracza: cel poległ — wybierz nowy cel',
    );
  });

  it.each([
    ['player.rolling', 'Tura gracza: rzut kością'],
    ['player.resolving', 'Tura gracza: efekt rzutu'],
    ['player.drawing', 'Tura gracza: dobieranie kości'],
  ] as const)('describes the player phase %s', (phase, text) => {
    expect(turnMessage(makeBattle({ phase })).text).toBe(text);
  });

  it('announces the enemy choosing dice', () => {
    expect(turnMessage(makeBattle({ phase: 'enemy.acting' }))).toEqual({
      side: 'enemy',
      text: 'Tura przeciwnika: wybór kości',
    });
  });

  it('names the enemy during its roll and describes its action once revealed', () => {
    const staged = { dieId: 'x' as DieId, sides: 6, kind: 'heal', ownerId: 'e0' as CombatantId, value: null } as const;

    expect(turnMessage(makeBattle({ phase: 'player.rolling', staged })).text).toBe(
      'Tura przeciwnika: Zbir rzuca kością',
    );
    expect(turnMessage(makeBattle({ phase: 'player.resolving', staged: { ...staged, value: 3 } })).text).toBe(
      'Tura przeciwnika: Zbir leczy się',
    );
    expect(
      turnMessage(makeBattle({ phase: 'player.resolving', staged: { ...staged, kind: 'attack', value: 3 } })).text,
    ).toBe('Tura przeciwnika: Zbir atakuje');
  });
});
