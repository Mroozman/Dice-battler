export type StatKind = 'strength' | 'vitality' | 'defense';

export type PlayerStats = Readonly<Record<StatKind, number>>;

export const ZERO_STATS: PlayerStats = { strength: 0, vitality: 0, defense: 0 };
