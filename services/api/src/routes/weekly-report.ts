import { Router } from 'express';
import { prisma } from '../prisma';

export const weeklyReportRouter: Router = Router();

weeklyReportRouter.get('/', async (req, res) => {
  const familyId = String(req.query.familyId ?? 'family-1');
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const members = await prisma.familyMember.findMany({
    where: { familyId },
  });

  const memberSummaries = await Promise.all(
    members.map(async member => {
      const totalMessages = await prisma.message.count({
        where: {
          thread: { memberId: member.id },
          createdAt: { gte: oneWeekAgo },
        },
      });

      const activePlans = await prisma.plan.count({
        where: { memberId: member.id, status: 'active' },
      });

      const recentMemories = await prisma.memoryEntry.findMany({
        where: { memberId: member.id, capturedAt: { gte: oneWeekAgo } },
        orderBy: { capturedAt: 'desc' },
        take: 5,
      });

      const latestCoursePlan = await prisma.coursePlanRecord.findFirst({
        where: { memberId: member.id },
        orderBy: { createdAt: 'desc' },
      });

      return {
        memberId: member.id,
        memberName: member.name,
        totalMessages,
        activePlans,
        recentMemories: recentMemories.map(m => ({
          ...m,
          tags: JSON.parse(m.tags),
        })),
        coursePlan: latestCoursePlan
          ? {
              id: latestCoursePlan.id,
              memberId: latestCoursePlan.memberId,
              tier: latestCoursePlan.tier,
              courses: JSON.parse(latestCoursePlan.coursesJson),
              totalHoursPerWeek: latestCoursePlan.totalHoursPerWeek,
              totalCostPerMonth: latestCoursePlan.totalCostPerMonth,
              totalFatigueScore: latestCoursePlan.totalFatigueScore,
              conflicts: JSON.parse(latestCoursePlan.conflictsJson),
              score: latestCoursePlan.score,
            }
          : undefined,
      };
    }),
  );

  const upcomingPlans = await prisma.plan.findMany({
    where: {
      familyId,
      status: { in: ['active', 'proposed', 'approved'] },
    },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });

  const recentAuditEntries = await prisma.auditLog.findMany({
    where: { timestamp: { gte: oneWeekAgo } },
    orderBy: { timestamp: 'desc' },
    take: 20,
  });

  res.json({
    familyId,
    generatedAt: new Date(),
    memberSummaries,
    upcomingPlans,
    recentAuditEntries: recentAuditEntries.map(e => ({
      ...e,
      details: JSON.parse(e.details),
    })),
  });
});
