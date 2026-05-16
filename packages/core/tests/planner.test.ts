import { describe, it, expect, beforeEach } from 'vitest';
import { CoursePlanner } from '../src/planner/course-planner';
import { CourseOption } from '../src/types';
import { seedCourses } from '../src/seed/data';

describe('CoursePlanner', () => {
  let planner: CoursePlanner;

  beforeEach(() => {
    planner = new CoursePlanner();
  });

  describe('generatePlan', () => {
    it('respects light tier hour constraint', () => {
      const plan = planner.generatePlan('member-lily', 'light', seedCourses);
      expect(plan.totalHoursPerWeek).toBeLessThanOrEqual(5);
    });

    it('respects light tier cost constraint', () => {
      const plan = planner.generatePlan('member-lily', 'light', seedCourses);
      expect(plan.totalCostPerMonth).toBeLessThanOrEqual(200);
    });

    it('respects light tier fatigue constraint', () => {
      const plan = planner.generatePlan('member-lily', 'light', seedCourses);
      expect(plan.totalFatigueScore).toBeLessThanOrEqual(15);
    });

    it('respects standard tier constraints', () => {
      const plan = planner.generatePlan('member-max', 'standard', seedCourses);
      expect(plan.totalHoursPerWeek).toBeLessThanOrEqual(10);
      expect(plan.totalCostPerMonth).toBeLessThanOrEqual(500);
      expect(plan.totalFatigueScore).toBeLessThanOrEqual(30);
    });

    it('respects ambitious tier constraints', () => {
      const plan = planner.generatePlan('member-max', 'ambitious', seedCourses);
      expect(plan.totalHoursPerWeek).toBeLessThanOrEqual(20);
      expect(plan.totalCostPerMonth).toBeLessThanOrEqual(1000);
      expect(plan.totalFatigueScore).toBeLessThanOrEqual(50);
    });

    it('selects at least one course for any tier', () => {
      const plan = planner.generatePlan('member-lily', 'light', seedCourses);
      expect(plan.courses.length).toBeGreaterThanOrEqual(1);
    });

    it('selects more courses for higher tiers', () => {
      const light = planner.generatePlan('member-lily', 'light', seedCourses);
      const ambitious = planner.generatePlan('member-lily', 'ambitious', seedCourses);
      expect(ambitious.courses.length).toBeGreaterThanOrEqual(light.courses.length);
    });

    it('generates a valid plan id containing member and tier', () => {
      const plan = planner.generatePlan('member-lily', 'light', seedCourses);
      expect(plan.id).toContain('plan-member-lily-light');
    });

    it('sets correct tier on the result', () => {
      const plan = planner.generatePlan('member-max', 'standard', seedCourses);
      expect(plan.tier).toBe('standard');
      expect(plan.memberId).toBe('member-max');
    });
  });

  describe('detectConflicts', () => {
    it('detects overlapping schedules on the same day', () => {
      const courses: CourseOption[] = [
        {
          id: 'c1', name: 'A', category: 'a',
          hoursPerWeek: 2, costPerMonth: 50, fatigueScore: 2,
          schedule: [{ day: 'mon', startHour: 10, endHour: 12 }],
        },
        {
          id: 'c2', name: 'B', category: 'b',
          hoursPerWeek: 2, costPerMonth: 50, fatigueScore: 2,
          schedule: [{ day: 'mon', startHour: 11, endHour: 13 }],
        },
      ];

      const conflicts = planner.detectConflicts(courses);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].courseA).toBe('c1');
      expect(conflicts[0].courseB).toBe('c2');
      expect(conflicts[0].day).toBe('mon');
      expect(conflicts[0].overlapHours).toBe(1);
    });

    it('returns empty for non-overlapping schedules', () => {
      const courses: CourseOption[] = [
        {
          id: 'c1', name: 'A', category: 'a',
          hoursPerWeek: 2, costPerMonth: 50, fatigueScore: 2,
          schedule: [{ day: 'mon', startHour: 10, endHour: 12 }],
        },
        {
          id: 'c2', name: 'B', category: 'b',
          hoursPerWeek: 2, costPerMonth: 50, fatigueScore: 2,
          schedule: [{ day: 'mon', startHour: 13, endHour: 15 }],
        },
      ];

      expect(planner.detectConflicts(courses)).toHaveLength(0);
    });

    it('returns empty for courses on different days', () => {
      const courses: CourseOption[] = [
        {
          id: 'c1', name: 'A', category: 'a',
          hoursPerWeek: 2, costPerMonth: 50, fatigueScore: 2,
          schedule: [{ day: 'mon', startHour: 10, endHour: 12 }],
        },
        {
          id: 'c2', name: 'B', category: 'b',
          hoursPerWeek: 2, costPerMonth: 50, fatigueScore: 2,
          schedule: [{ day: 'tue', startHour: 10, endHour: 12 }],
        },
      ];

      expect(planner.detectConflicts(courses)).toHaveLength(0);
    });
  });

  describe('calculateScore', () => {
    const constraints = { maxHoursPerWeek: 20, maxCostPerMonth: 1000, maxFatigue: 50 };

    it('reduces score for schedule conflicts', () => {
      const courses = seedCourses.slice(0, 3);
      const noConflict = planner.calculateScore(courses, 6, 350, 12, constraints, []);
      const withConflict = planner.calculateScore(courses, 6, 350, 12, constraints, [
        { courseA: 'c1', courseB: 'c2', day: 'mon', overlapHours: 1 },
      ]);
      expect(withConflict).toBeLessThan(noConflict);
    });

    it('awards diversity bonus for unique categories', () => {
      const diverse: CourseOption[] = [
        { id: '1', name: 'A', category: 'music', hoursPerWeek: 1, costPerMonth: 50, schedule: [], fatigueScore: 1 },
        { id: '2', name: 'B', category: 'sports', hoursPerWeek: 1, costPerMonth: 50, schedule: [], fatigueScore: 1 },
        { id: '3', name: 'C', category: 'academics', hoursPerWeek: 1, costPerMonth: 50, schedule: [], fatigueScore: 1 },
      ];
      const same: CourseOption[] = [
        { id: '1', name: 'A', category: 'music', hoursPerWeek: 1, costPerMonth: 50, schedule: [], fatigueScore: 1 },
        { id: '2', name: 'B', category: 'music', hoursPerWeek: 1, costPerMonth: 50, schedule: [], fatigueScore: 1 },
        { id: '3', name: 'C', category: 'music', hoursPerWeek: 1, costPerMonth: 50, schedule: [], fatigueScore: 1 },
      ];

      const diverseScore = planner.calculateScore(diverse, 3, 150, 3, constraints, []);
      const sameScore = planner.calculateScore(same, 3, 150, 3, constraints, []);
      expect(diverseScore).toBeGreaterThan(sameScore);
    });

    it('applies fatigue penalty when over 70% threshold', () => {
      const courses = seedCourses.slice(0, 2);
      const low = planner.calculateScore(courses, 4, 200, 5, { ...constraints, maxFatigue: 10 }, []);
      const high = planner.calculateScore(courses, 4, 200, 9, { ...constraints, maxFatigue: 10 }, []);
      expect(high).toBeLessThan(low);
    });

    it('never returns a negative score', () => {
      const courses = seedCourses.slice(0, 1);
      const score = planner.calculateScore(
        courses, 2, 100, 45, constraints,
        Array.from({ length: 10 }, (_, i) => ({ courseA: `a${i}`, courseB: `b${i}`, day: 'mon', overlapHours: 1 })),
      );
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });
});
