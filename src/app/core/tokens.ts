import { InjectionToken } from '@angular/core';
import type { GameRules } from '../domain/engine/rules';
import { RULES as DEFAULT_RULES } from '../domain/engine/rules';

export const RULES = new InjectionToken<GameRules>('RULES', {
  providedIn: 'root',
  factory: () => DEFAULT_RULES,
});
