import { Injectable, computed, inject, signal } from '@angular/core';
import type { GameState } from '../domain/model/state';
import type { GameAction } from '../domain/model/actions';
import type { CombatantId } from '../domain/model/combatant';
import { reduce } from '../domain/engine/reduce';
import { deckView, handView, type DeckViewEntry } from '../domain/engine/deck';
import { targetableFor } from '../domain/engine/targeting';
import { battleOutcome, type BattleOutcome } from '../domain/engine/outcome';
import { turnMessage, type TurnMessage } from '../domain/engine/turn-message';
import type { DieDef, DieId } from '../domain/model/die';
import type { LogEntry } from '../domain/model/log';
import { createRun } from '../domain/content/run-factory';
import { NEW_RUN_SEED, RULES } from './tokens';

function createLoadingState(): GameState {
  return {
    schemaVersion: 1,
    seed: '',
    rngCursor: 0,
    screen: 'title',
    run: {
      stageIndex: 0,
      stages: [],
      playerCatalog: {},
      playerHp: 0,
      playerMaxHp: 0,
      pendingReward: null,
      outcome: 'ongoing',
      lastHealAmount: 0,
    },
    battle: null,
    log: [],
  };
}

@Injectable({ providedIn: 'root' })
export class GameStore {
  private readonly rules = inject(RULES);
  private readonly newRunSeed = inject(NEW_RUN_SEED);
  private readonly _state = signal<GameState>(createLoadingState());

  private pendingStart: Promise<void> | null = null;

  readonly dicePerTurn = this.rules.dicePerTurn;

  startNewRun(): Promise<void> {
    this.pendingStart ??= this.bootstrap();
    return this.pendingStart;
  }

  private async bootstrap(): Promise<void> {
    const seed = this.newRunSeed();
    const run = await createRun(seed, this.rules);
    this.dispatch({ type: 'run/start', run, seed });
  }

  readonly state = this._state.asReadonly();
  readonly screen = computed(() => this._state().screen);
  readonly run = computed(() => this._state().run);
  readonly battle = computed(() => this._state().battle);
  readonly enemies = computed(() => this._state().battle?.enemies ?? []);
  readonly hand = computed<readonly DieDef[]>(() => {
    const deck = this._state().battle?.player.deck;
    return deck ? handView(deck) : [];
  });
  readonly staged = computed(() => this._state().battle?.staged ?? null);
  readonly log = computed<readonly LogEntry[]>(() => this._state().log);

  readonly deckView = computed<readonly DeckViewEntry[]>(() => {
    const deck = this._state().battle?.player.deck;
    return deck ? deckView(deck) : [];
  });

  readonly rewardCatalogView = computed<readonly DeckViewEntry[]>(() => {
    const catalog = this._state().run.playerCatalog;
    return deckView({ catalog, pool: Object.keys(catalog) as DieId[], hand: [], discard: [] });
  });

  readonly targetableIds = computed<readonly CombatantId[]>(() =>
    targetableFor(this._state().battle),
  );

  readonly pickedTargetIds = computed<readonly CombatantId[]>(() => {
    const battle = this._state().battle;
    if (!battle) {
      return [];
    }
    const enemyIds = new Set(battle.enemies.map((enemy) => enemy.id));
    const ids = [...battle.selection, ...battle.resolveQueue]
      .map((sel) => sel.targetId)
      .filter((id): id is CombatantId => id !== null && enemyIds.has(id));
    return [...new Set(ids)];
  });

  readonly turnMessage = computed<TurnMessage | null>(() => {
    const battle = this._state().battle;
    return battle ? turnMessage(battle) : null;
  });

  readonly canPickTarget = computed(() => {
    const battle = this._state().battle;
    if (!battle) {
      return false;
    }
    if (battle.phase === 'player.retargeting') {
      return true;
    }
    return battle.phase === 'player.selecting' && battle.selection.some((sel) => this.isAttackDie(sel.dieId));
  });

  readonly enemyDeckVisible = computed(
    () => this._state().run.stageIndex >= this.rules.revealEnemyDeckFromStage,
  );

  readonly battleOutcome = computed<BattleOutcome>(() => {
    const battle = this._state().battle;
    return battle ? battleOutcome(battle) : 'ongoing';
  });

  readonly canConfirm = computed(() => {
    const battle = this._state().battle;
    if (!battle) {
      return false;
    }
    return (
      battle.phase === 'player.selecting' &&
      battle.selection.length === this.rules.dicePerTurn &&
      battle.selection.every((sel) => sel.targetId !== null)
    );
  });

  dispatch(action: GameAction): void {
    const { state } = reduce(this._state(), action, this.rules);
    this._state.set(state);
  }

  selectDie(dieId: DieId): void {
    this.dispatch({ type: 'player/toggleDie', dieId });

    const battle = this._state().battle;
    const selected = battle?.selection.find((sel) => sel.dieId === dieId);
    if (!battle || !selected || selected.targetId !== null) {
      return;
    }
    const sharedTarget = battle.selection.find((sel) => sel.targetId !== null && this.isAttackDie(sel.dieId))?.targetId;
    if (sharedTarget) {
      this.dispatch({ type: 'player/setTarget', dieId, targetId: sharedTarget });
    }
  }

  pickTarget(targetId: CombatantId): void {
    const battle = this._state().battle;
    if (!battle) {
      return;
    }
    const alive = new Set(targetableFor(battle));
    const pending =
      battle.phase === 'player.retargeting'
        ? battle.resolveQueue.filter((sel) => sel.targetId === null || !alive.has(sel.targetId))
        : battle.selection;

    for (const sel of pending) {
      if (this.isAttackDie(sel.dieId)) {
        this.dispatch({ type: 'player/setTarget', dieId: sel.dieId, targetId });
      }
    }
  }

  private isAttackDie(dieId: DieId): boolean {
    return this._state().battle?.player.deck.catalog[dieId]?.kind === 'attack';
  }
}
