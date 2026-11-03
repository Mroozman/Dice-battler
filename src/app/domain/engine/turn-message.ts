import type { BattleState } from '../model/battle';
import { needsTarget } from './targeting';

export type TurnMessageSide = 'player' | 'enemy';

export interface TurnMessage {
  readonly side: TurnMessageSide;
  readonly text: string;
}

const PLAYER_PREFIX = 'Tura gracza';
const ENEMY_PREFIX = 'Tura przeciwnika';

const ENEMY_ACTION_BY_KIND = {
  attack: 'atakuje',
  heal: 'leczy się',
  shield: 'wzmacnia tarczę',
} as const;

function playerMessage(text: string): TurnMessage {
  return { side: 'player', text: `${PLAYER_PREFIX}: ${text}` };
}

function enemyMessage(text: string): TurnMessage {
  return { side: 'enemy', text: `${ENEMY_PREFIX}: ${text}` };
}

function enemyStagedMessage(battle: BattleState): TurnMessage | null {
  const staged = battle.staged;
  if (!staged || staged.ownerId === battle.player.id) {
    return null;
  }
  const name = battle.enemies.find((e) => e.id === staged.ownerId)?.name ?? 'przeciwnik';
  return staged.value === null
    ? enemyMessage(`${name} rzuca kością`)
    : enemyMessage(`${name} ${ENEMY_ACTION_BY_KIND[staged.kind]}`);
}

function selectingMessage(battle: BattleState): TurnMessage {
  const { selection, player } = battle;
  const attackWithoutTarget = selection.some(
    (sel) => sel.targetId === null && needsTarget(player.deck.catalog[sel.dieId].kind),
  );
  if (attackWithoutTarget) {
    return playerMessage('wybierz cel');
  }
  if (selection.length < player.dicePerTurn) {
    return playerMessage('wybierz kości');
  }
  return playerMessage('potwierdź wybór');
}

export function turnMessage(battle: BattleState): TurnMessage {
  const fromEnemy = enemyStagedMessage(battle);
  if (fromEnemy) {
    return fromEnemy;
  }

  switch (battle.phase) {
    case 'enemy.acting':
      return enemyMessage('wybór kości');
    case 'player.selecting':
      return selectingMessage(battle);
    case 'player.retargeting':
      return playerMessage('cel poległ — wybierz nowy cel');
    case 'player.rolling':
      return playerMessage('rzut kością');
    case 'player.resolving':
      return playerMessage('efekt rzutu');
    case 'player.drawing':
      return playerMessage('dobieranie kości');
  }
}
