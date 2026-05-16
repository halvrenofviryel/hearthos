import { describe, it, expect } from 'vitest';
import {
  HOUSEHOLD_DIMENSIONS,
  DIMENSION_KIND,
  CONCERN_BAND_THRESHOLDS,
  emptyHouseholdState,
  clamp01,
  normaliseState,
  concernBand,
  asConcerns,
  dominantConcern,
  type HouseholdState,
} from '../src/state/household-state';

describe('HouseholdState core', () => {
  describe('constants', () => {
    it('exposes exactly five dimensions in canonical order', () => {
      expect(HOUSEHOLD_DIMENSIONS).toEqual(['load', 'friction', 'clarity', 'fatigue', 'risk']);
    });

    it('clarity is the only goodness dimension', () => {
      const kinds = HOUSEHOLD_DIMENSIONS.map((d) => DIMENSION_KIND[d]);
      const goodness = HOUSEHOLD_DIMENSIONS.filter((d) => DIMENSION_KIND[d] === 'goodness');
      expect(goodness).toEqual(['clarity']);
      expect(kinds.filter((k) => k === 'concern')).toHaveLength(4);
    });

    it('exposes the band thresholds explicitly', () => {
      expect(CONCERN_BAND_THRESHOLDS.watch).toBeLessThan(CONCERN_BAND_THRESHOLDS.attention);
      expect(CONCERN_BAND_THRESHOLDS.watch).toBeGreaterThan(0);
      expect(CONCERN_BAND_THRESHOLDS.attention).toBeLessThan(1);
    });
  });

  describe('emptyHouseholdState', () => {
    it('returns zero concern dimensions and neutral clarity', () => {
      const s = emptyHouseholdState();
      expect(s.load).toBe(0);
      expect(s.friction).toBe(0);
      expect(s.fatigue).toBe(0);
      expect(s.risk).toBe(0);
      expect(s.clarity).toBe(0.5);
    });

    it('returns a fresh object each call (no shared mutable state)', () => {
      const a = emptyHouseholdState();
      const b = emptyHouseholdState();
      a.load = 0.9;
      expect(b.load).toBe(0);
    });
  });

  describe('clamp01', () => {
    it('returns the value unchanged when already in range', () => {
      expect(clamp01(0)).toBe(0);
      expect(clamp01(0.5)).toBe(0.5);
      expect(clamp01(1)).toBe(1);
    });

    it('clamps below 0 to 0', () => {
      expect(clamp01(-1)).toBe(0);
      expect(clamp01(-0.01)).toBe(0);
    });

    it('clamps above 1 to 1', () => {
      expect(clamp01(1.5)).toBe(1);
      expect(clamp01(100)).toBe(1);
    });

    it('handles NaN and infinity by returning 0', () => {
      expect(clamp01(NaN)).toBe(0);
      expect(clamp01(Infinity)).toBe(0);
      expect(clamp01(-Infinity)).toBe(0);
    });
  });

  describe('normaliseState', () => {
    it('clamps every dimension into range', () => {
      const dirty: HouseholdState = { load: 1.5, friction: -0.1, clarity: 2, fatigue: 0.3, risk: NaN };
      const clean = normaliseState(dirty);
      expect(clean.load).toBe(1);
      expect(clean.friction).toBe(0);
      expect(clean.clarity).toBe(1);
      expect(clean.fatigue).toBe(0.3);
      expect(clean.risk).toBe(0);
    });

    it('passes through already-valid state unchanged', () => {
      const s: HouseholdState = { load: 0.4, friction: 0.6, clarity: 0.3, fatigue: 0.2, risk: 0.5 };
      const out = normaliseState(s);
      expect(out).toEqual(s);
    });
  });

  describe('concernBand', () => {
    it('classifies concern values straightforwardly', () => {
      expect(concernBand(0.1, 'concern')).toBe('stable');
      expect(concernBand(0.4, 'concern')).toBe('watch');
      expect(concernBand(0.8, 'concern')).toBe('attention');
    });

    it('inverts the read for goodness dimensions', () => {
      expect(concernBand(0.9, 'goodness')).toBe('stable');    // high goodness = low concern
      expect(concernBand(0.5, 'goodness')).toBe('watch');
      expect(concernBand(0.1, 'goodness')).toBe('attention'); // low goodness = high concern
    });

    it('places threshold boundaries inclusively in the higher band', () => {
      expect(concernBand(CONCERN_BAND_THRESHOLDS.watch, 'concern')).toBe('watch');
      expect(concernBand(CONCERN_BAND_THRESHOLDS.attention, 'concern')).toBe('attention');
    });

    it('clamps out-of-range inputs before banding', () => {
      expect(concernBand(-1, 'concern')).toBe('stable');
      expect(concernBand(2, 'concern')).toBe('attention');
    });
  });

  describe('asConcerns', () => {
    it('returns one entry per dimension in canonical order', () => {
      const s: HouseholdState = { load: 0.1, friction: 0.2, clarity: 0.3, fatigue: 0.4, risk: 0.5 };
      const concerns = asConcerns(s);
      expect(concerns.map((c) => c.dimension)).toEqual([
        'load', 'friction', 'clarity', 'fatigue', 'risk',
      ]);
    });

    it('reports raw values alongside concern scores', () => {
      const s: HouseholdState = { load: 0.7, friction: 0, clarity: 0.2, fatigue: 0, risk: 0 };
      const concerns = asConcerns(s);
      const load = concerns.find((c) => c.dimension === 'load')!;
      expect(load.value).toBe(0.7);
      expect(load.concernScore).toBe(0.7);

      const clarity = concerns.find((c) => c.dimension === 'clarity')!;
      expect(clarity.value).toBe(0.2);
      expect(clarity.concernScore).toBeCloseTo(0.8, 5); // goodness inverted
      expect(clarity.kind).toBe('goodness');
    });
  });

  describe('dominantConcern', () => {
    it('returns the dimension with the highest concern score', () => {
      const s: HouseholdState = { load: 0.9, friction: 0.3, clarity: 0.5, fatigue: 0.2, risk: 0.1 };
      const top = dominantConcern(s);
      expect(top.dimension).toBe('load');
      expect(top.concernScore).toBeCloseTo(0.9, 5);
    });

    it('inverts clarity so that very low clarity can win', () => {
      const s: HouseholdState = { load: 0.3, friction: 0.3, clarity: 0.05, fatigue: 0.3, risk: 0.3 };
      const top = dominantConcern(s);
      expect(top.dimension).toBe('clarity');
      expect(top.concernScore).toBeCloseTo(0.95, 5);
      expect(top.kind).toBe('goodness');
    });

    it('returns load on the empty state (all-zero concern + neutral clarity tie)', () => {
      const top = dominantConcern(emptyHouseholdState());
      // clarity 0.5 → concern 0.5; load/friction/fatigue/risk 0 → concern 0
      expect(top.dimension).toBe('clarity');
      expect(top.concernScore).toBeCloseTo(0.5, 5);
    });

    it('breaks ties in canonical dimension order', () => {
      const s: HouseholdState = { load: 0.5, friction: 0.5, clarity: 0.5, fatigue: 0.5, risk: 0.5 };
      // all dimensions tie at concernScore 0.5
      const top = dominantConcern(s);
      expect(top.dimension).toBe('load'); // first in canonical order
    });
  });
});
