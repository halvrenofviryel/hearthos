import { Router } from 'express';
import { prisma } from '../prisma';

export const plansRouter: Router = Router();

plansRouter.get('/', async (req, res) => {
  const { familyId, memberId, status } = req.query;
  const where: Record<string, unknown> = {};
  if (familyId) where.familyId = String(familyId);
  if (memberId) where.memberId = String(memberId);
  if (status) where.status = String(status);

  const plans = await prisma.plan.findMany({
    where,
    include: { items: true, member: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(plans);
});

plansRouter.get('/:id', async (req, res) => {
  const plan = await prisma.plan.findUnique({
    where: { id: req.params.id },
    include: { items: true, member: true },
  });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(plan);
});

plansRouter.post('/', async (req, res) => {
  const { familyId, memberId, title, description, status = 'draft', items = [] } = req.body;
  const plan = await prisma.plan.create({
    data: {
      familyId,
      memberId,
      title,
      description,
      status,
      items: {
        create: items.map((item: { title: string }) => ({ title: item.title })),
      },
    },
    include: { items: true },
  });

  await prisma.auditLog.create({
    data: {
      actor: memberId,
      action: 'CREATE_PLAN',
      resource: `plan:${plan.id}`,
      details: JSON.stringify({ title, status }),
    },
  });

  res.status(201).json(plan);
});

plansRouter.patch('/:id', async (req, res) => {
  const { status } = req.body;
  const plan = await prisma.plan.update({
    where: { id: req.params.id },
    data: { status },
    include: { items: true },
  });

  await prisma.auditLog.create({
    data: {
      actor: 'system',
      action: 'UPDATE_PLAN_STATUS',
      resource: `plan:${plan.id}`,
      details: JSON.stringify({ newStatus: status }),
    },
  });

  res.json(plan);
});
