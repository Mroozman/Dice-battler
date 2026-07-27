import { Injectable, computed, inject, signal } from '@angular/core';
import type { GameState } from '../domain/model/state';
import type { GameAction } from '../domain/model/actions';
import type { CombatantId } from '../domain/model/combatant';
import { reduce } from '../domain/engine/reduce';
import { deckView, handView, type DeckViewEntry } from '../domain/engine/deck';
import { targetableFor } from '../domain/engine/targeting';
import type { DieDef } from '../domain/model/die';
import { RULES } from './tokens';
import { createDevGameState } from './dev-battle-fixture';

@Injectable({ providedIn: 'root' })
export class GameStore {
  private readonly rules = inject(RULES);
  private readonly _state = signal<GameState>(createDevGameState(this.rules));

  readonly state = this._state.asReadonly();
  readonly screen = computed(() => this._state().screen);
  readonly battle = computed(() => this._state().battle);
  readonly enemies = computed(() => this._state().battle?.enemies ?? []);
  readonly hand = computed<readonly DieDef[]>(() => {
    const deck = this._state().battle?.player.deck;
    return deck ? handView(deck) : [];
  });
  readonly staged = computed(() => this._state().battle?.staged ?? null);

  readonly deckView = computed<readonly DeckViewEntry[]>(() => {
    const deck = this._state().battle?.player.deck;
    return deck ? deckView(deck) : [];
  });

  readonly targetableIds = computed<readonly CombatantId[]>(() => targetableFor(this._state().battle));

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
}
