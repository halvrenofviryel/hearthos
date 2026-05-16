// ──────────────────────────────────────────────────────────────────────
// HouseholdState
//
// Five family-readable signals, each bounded to [0, 1].
//
//   load     — how heavy daily operations feel.       higher = worse
//   friction — recurring conflict or resistance.       higher = worse
//   clarity  — how clear plans, rules, and roles are. higher = better
//   fatigue  — cumulative decision load on the parent. higher = worse
//   risk     — decisions made ad-hoc that could fail.  higher = worse
//
// The HouseholdState is the *family-facing* analogue of a structured
// telemetry vector. It is intentionally deterministic, explainable in
// two sentences, and has no Phionyx-specific terminology baked in.
// ──────────────────────────────────────────────────────────────────────

export interface HouseholdState {
  load: number;
  friction: number;
  clarity: number;
  fatigue: number;
  risk: number;
}

export type HouseholdDimension = keyof HouseholdState;

export const HOUSEHOLD_DIMENSIONS: readonly HouseholdDimension[] = [
  'load',
  'friction',
  'clarity',
  'fatigue',
  'risk',
] as const;

/**
 * Whether a dimension reads as "higher = more concern" or "higher = better".
 */
export type DimensionKind = 'concern' | 'goodness';

export const DIMENSION_KIND: Record<HouseholdDimension, DimensionKind> = {
  load: 'concern',
  friction: 'concern',
  clarity: 'goodness',
  fatigue: 'concern',
  risk: 'concern',
};

/**
 * A neutral starting state. Load / friction / fatigue / risk default to 0
 * (no observed concern); clarity defaults to 0.5 (unknown, not assumed bad).
 */
export function emptyHouseholdState(): HouseholdState {
  return { load: 0, friction: 0, clarity: 0.5, fatigue: 0, risk: 0 };
}

/**
 * Coerce any input number into the legal [0, 1] range.
 */
export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * Coerce an entire state into the legal [0, 1] range per dimension.
 * Useful when composing state from external signals.
 */
export function normaliseState(state: HouseholdState): HouseholdState {
  return {
    load: clamp01(state.load),
    friction: clamp01(state.friction),
    clarity: clamp01(state.clarity),
    fatigue: clamp01(state.fatigue),
    risk: clamp01(state.risk),
  };
}

// ──────────────────────────────────────────────────────────────────────
// Concern banding
//
// Translates a continuous [0, 1] dimension into a discrete band suitable
// for UI display. "concern" dimensions are read directly; "goodness"
// dimensions are inverted (low goodness = high concern).
// ──────────────────────────────────────────────────────────────────────

export type ConcernBand = 'stable' | 'watch' | 'attention';

export const CONCERN_BAND_THRESHOLDS = { watch: 0.33, attention: 0.66 } as const;

export function concernBand(value: number, kind: DimensionKind): ConcernBand {
  const concern = kind === 'concern' ? clamp01(value) : 1 - clamp01(value);
  if (concern >= CONCERN_BAND_THRESHOLDS.attention) return 'attention';
  if (concern >= CONCERN_BAND_THRESHOLDS.watch) return 'watch';
  return 'stable';
}

// ──────────────────────────────────────────────────────────────────────
// Dominant concern
//
// Returns the dimension contributing the most to a household's overall
// concern level. Useful as a "what should we look at first?" signal.
// ──────────────────────────────────────────────────────────────────────

export interface DimensionConcern {
  dimension: HouseholdDimension;
  value: number;
  kind: DimensionKind;
  concernScore: number; // [0, 1]; higher = more concern
}

export function asConcerns(state: HouseholdState): DimensionConcern[] {
  return HOUSEHOLD_DIMENSIONS.map((d) => {
    const value = clamp01(state[d]);
    const kind = DIMENSION_KIND[d];
    const concernScore = kind === 'concern' ? value : 1 - value;
    return { dimension: d, value, kind, concernScore };
  });
}

/**
 * Return the single dimension with the highest concern score.
 * Ties resolve in the canonical dimension order (load, friction, clarity, fatigue, risk).
 */
export function dominantConcern(state: HouseholdState): DimensionConcern {
  const concerns = asConcerns(state);
  return concerns.reduce((a, b) => (b.concernScore > a.concernScore ? b : a));
}
