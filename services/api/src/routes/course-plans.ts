import { Router } from 'express';
import { prisma } from '../prisma';
import { CoursePlanner, seedCourses } from '@hearthos/core';
import type { CourseTier } from '@hearthos/core';

const planner = new CoursePlanner();

export const coursePlansRouter: Router = Router();

coursePlansRouter.get('/', async (req, res) => {
  const { memberId, tier } = req.query;

  if (memberId && tier) {
    const plan = planner.generatePlan(
      String(memberId),
      String(tier) as CourseTier,
      seedCourses,
    );
    return res.json(plan);
  }

  const records = await prisma.coursePlanRecord.findMany({
    where: memberId ? { memberId: String(memberId) } : {},
    orderBy: { createdAt: 'desc' },
  });
  res.json(
    records.map(r => ({
      id: r.id,
      memberId: r.memberId,
      tier: r.tier,
      courses: JSON.parse(r.coursesJson),
      totalHoursPerWeek: r.totalHoursPerWeek,
      totalCostPerMonth: r.totalCostPerMonth,
      totalFatigueScore: r.totalFatigueScore,
      conflicts: JSON.parse(r.conflictsJson),
      score: r.score,
    })),
  );
});

coursePlansRouter.post('/', async (req, res) => {
  const { memberId, tier } = req.body;
  const plan = planner.generatePlan(memberId, tier as CourseTier, seedCourses);

  const record = await prisma.coursePlanRecord.create({
    data: {
      memberId: plan.memberId,
      tier: plan.tier,
      coursesJson: JSON.stringify(plan.courses),
      totalHoursPerWeek: plan.totalHoursPerWeek,
      totalCostPerMonth: plan.totalCostPerMonth,
      totalFatigueScore: plan.totalFatigueScore,
      conflictsJson: JSON.stringify(plan.conflicts),
      score: plan.score,
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: memberId,
      action: 'CREATE_COURSE_PLAN',
      resource: `course-plan:${record.id}`,
      details: JSON.stringify({ tier, courseCount: plan.courses.length, score: plan.score }),
    },
  });

  res.status(201).json({ ...plan, id: record.id });
});
