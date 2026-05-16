import { Router } from 'express';
import { prisma } from '../prisma';

export const familyMemoryRouter: Router = Router();

// GET /api/family-memory?familyId=&category= — list family memories
familyMemoryRouter.get('/', async (req, res) => {
  const { familyId, category } = req.query;
  if (!familyId) return res.status(400).json({ error: 'familyId is required' });

  const where: Record<string, unknown> = { familyId: String(familyId) };
  if (category) where.category = String(category);

  const memories = await prisma.familyMemory.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const parsed = memories.map(m => ({
    ...m,
    tags: JSON.parse(m.tags),
  }));

  res.json(parsed);
});

// POST /api/family-memory — create family memory
familyMemoryRouter.post('/', async (req, res) => {
  const { familyId, category, content, tags, createdBy } = req.body;
  if (!familyId || !category || !content || !createdBy) {
    return res.status(400).json({ error: 'familyId, category, content, and createdBy are required' });
  }

  const memory = await prisma.familyMemory.create({
    data: {
      familyId,
      category,
      content,
      tags: JSON.stringify(tags ?? []),
      createdBy,
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: createdBy,
      action: 'CREATE_FAMILY_MEMORY',
      resource: `family-memory:${memory.id}`,
      details: JSON.stringify({ category, content }),
    },
  });

  res.status(201).json({ ...memory, tags: JSON.parse(memory.tags) });
});

// DELETE /api/family-memory/:id — delete a family memory
familyMemoryRouter.delete('/:id', async (req, res) => {
  const memory = await prisma.familyMemory.findUnique({
    where: { id: req.params.id },
  });
  if (!memory) return res.status(404).json({ error: 'Memory not found' });

  await prisma.familyMemory.delete({ where: { id: req.params.id } });

  await prisma.auditLog.create({
    data: {
      actor: 'system',
      action: 'DELETE_FAMILY_MEMORY',
      resource: `family-memory:${req.params.id}`,
      details: JSON.stringify({ category: memory.category }),
    },
  });

  res.json({ success: true });
});

// Family Status router (mounted separately at /api/family-status)
export const familyStatusRouter: Router = Router();

// GET /api/family-status?familyId= — computed family status
familyStatusRouter.get('/', async (req, res) => {
  const { familyId } = req.query;
  if (!familyId) return res.status(400).json({ error: 'familyId is required' });

  const fId = String(familyId);

  // Get all members
  const members = await prisma.familyMember.findMany({
    where: { familyId: fId },
  });

  // Get member statuses
  const memberStatuses = await Promise.all(
    members.map(async member => {
      // Last activity: most recent message in any of the member's threads
      const latestThread = await prisma.thread.findFirst({
        where: { memberId: member.id },
        orderBy: { updatedAt: 'desc' },
      });

      const activeThreads = await prisma.thread.count({
        where: { memberId: member.id },
      });

      const activePlans = await prisma.plan.count({
        where: {
          memberId: member.id,
          status: { in: ['draft', 'proposed', 'approved', 'active'] },
        },
      });

      return {
        memberId: member.id,
        name: member.name,
        role: member.role,
        lastActivity: latestThread?.updatedAt ?? undefined,
        activeThreads,
        activePlans,
      };
    }),
  );

  // Recent milestones (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentMilestones = await prisma.familyMemory.findMany({
    where: {
      familyId: fId,
      category: 'milestone',
      createdAt: { gte: sevenDaysAgo },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Active rules
  const activeRules = await prisma.familyMemory.findMany({
    where: { familyId: fId, category: 'rule' },
    orderBy: { createdAt: 'desc' },
  });

  // Upcoming plan items (incomplete items from active plans)
  const activePlanItems = await prisma.planItem.findMany({
    where: {
      completed: false,
      plan: {
        familyId: fId,
        status: { in: ['approved', 'active'] },
      },
    },
    take: 10,
    include: { plan: { select: { title: true } } },
  });

  const upcomingItems = activePlanItems.map(
    item => `${item.plan.title}: ${item.title}`,
  );

  res.json({
    familyId: fId,
    memberStatuses,
    recentMilestones: recentMilestones.map(m => ({ ...m, tags: JSON.parse(m.tags) })),
    activeRules: activeRules.map(m => ({ ...m, tags: JSON.parse(m.tags) })),
    upcomingItems,
  });
});
