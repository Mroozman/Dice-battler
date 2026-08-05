import { InjectionToken } from '@angular/core';
import type { GameRules } from '../domain/engine/rules';
import { RULES as DEFAULT_RULES } from '../domain/engine/rules';

export const RULES = new InjectionToken<GameRules>('RULES', {
  providedIn: 'root',
  factory: () => DEFAULT_RULES,
});

export const NEW_RUN_SEED = new InjectionToken<() => string>('NEW_RUN_SEED', {
  providedIn: 'root',
  factory: () => () => Math.random().toString(36).slice(2),
});
