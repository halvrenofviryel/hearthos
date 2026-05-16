import { CourseOption, CoursePlan, CourseTier, ScheduleConflict } from '../types';

interface TierConstraints {
  maxHoursPerWeek: number;
  maxCostPerMonth: number;
  maxFatigue: number;
}

const TIER_CONSTRAINTS: Record<CourseTier, TierConstraints> = {
  light: { maxHoursPerWeek: 5, maxCostPerMonth: 200, maxFatigue: 15 },
  standard: { maxHoursPerWeek: 10, maxCostPerMonth: 500, maxFatigue: 30 },
  ambitious: { maxHoursPerWeek: 20, maxCostPerMonth: 1000, maxFatigue: 50 },
};

export class CoursePlanner {
  generatePlan(memberId: string, tier: CourseTier, availableCourses: CourseOption[]): CoursePlan {
    const constraints = TIER_CONSTRAINTS[tier];

    const sorted = [...availableCourses].sort((a, b) => {
      const valueA = a.hoursPerWeek / ((a.costPerMonth * a.fatigueScore) || 1);
      const valueB = b.hoursPerWeek / ((b.costPerMonth * b.fatigueScore) || 1);
      return valueB - valueA;
    });

    const selected: CourseOption[] = [];
    let totalHours = 0;
    let totalCost = 0;
    let totalFatigue = 0;

    for (const course of sorted) {
      const newHours = totalHours + course.hoursPerWeek;
      const newCost = totalCost + course.costPerMonth;
      const newFatigue = totalFatigue + course.fatigueScore;

      if (
        newHours <= constraints.maxHoursPerWeek &&
        newCost <= constraints.maxCostPerMonth &&
        newFatigue <= constraints.maxFatigue
      ) {
        selected.push(course);
        totalHours = newHours;
        totalCost = newCost;
        totalFatigue = newFatigue;
      }
    }

    const conflicts = this.detectConflicts(selected);
    const score = this.calculateScore(selected, totalHours, totalCost, totalFatigue, constraints, conflicts);

    return {
      id: `plan-${memberId}-${tier}-${Date.now()}`,
      memberId,
      tier,
      courses: selected,
      totalHoursPerWeek: totalHours,
      totalCostPerMonth: totalCost,
      totalFatigueScore: totalFatigue,
      conflicts,
      score,
    };
  }

  detectConflicts(courses: CourseOption[]): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];

    for (let i = 0; i < courses.length; i++) {
      for (let j = i + 1; j < courses.length; j++) {
        for (const schedA of courses[i].schedule) {
          for (const schedB of courses[j].schedule) {
            if (schedA.day === schedB.day) {
              const overlapStart = Math.max(schedA.startHour, schedB.startHour);
              const overlapEnd = Math.min(schedA.endHour, schedB.endHour);
              if (overlapStart < overlapEnd) {
                conflicts.push({
                  courseA: courses[i].id,
                  courseB: courses[j].id,
                  day: schedA.day,
                  overlapHours: overlapEnd - overlapStart,
                });
              }
            }
          }
        }
      }
    }

    return conflicts;
  }

  calculateScore(
    courses: CourseOption[],
    totalHours: number,
    totalCost: number,
    totalFatigue: number,
    constraints: TierConstraints,
    conflicts: ScheduleConflict[],
  ): number {
    const conflictPenalty = conflicts.length * 20;

    const fatigueRatio = totalFatigue / constraints.maxFatigue;
    const fatiguePenalty = fatigueRatio > 0.7 ? fatigueRatio * 10 * 5 : 0;

    const uniqueCategories = new Set(courses.map(c => c.category));
    const diversityBonus = Math.min(uniqueCategories.size, 5) * 10;

    const raw = 100 - conflictPenalty - fatiguePenalty + diversityBonus;
    return Math.round(Math.max(0, Math.min(150, raw)) * 100) / 100;
  }
}
