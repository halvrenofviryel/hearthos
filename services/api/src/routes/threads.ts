import { Router } from 'express';
import { prisma } from '../prisma';

export const threadsRouter: Router = Router();

threadsRouter.get('/', async (req, res) => {
  const { familyId } = req.query;
  const where = familyId ? { familyId: String(familyId) } : {};
  const threads = await prisma.thread.findMany({
    where,
    include: { agent: true },
    orderBy: { updatedAt: 'desc' },
  });
  res.json(threads);
});

threadsRouter.get('/:id', async (req, res) => {
  const thread = await prisma.thread.findUnique({
    where: { id: req.params.id },
    include: { agent: true, member: true },
  });
  if (!thread) return res.status(404).json({ error: 'Thread not found' });
  res.json(thread);
});

threadsRouter.post('/', async (req, res) => {
  const { familyId, memberId, agentId, title } = req.body;
  const thread = await prisma.thread.create({
    data: { id: `thread-${Date.now()}`, familyId, memberId, agentId, title },
    include: { agent: true },
  });

  await prisma.auditLog.create({
    data: {
      actor: memberId,
      action: 'CREATE_THREAD',
      resource: `thread:${thread.id}`,
      details: JSON.stringify({ title, agentId }),
    },
  });

  res.status(201).json(thread);
});
