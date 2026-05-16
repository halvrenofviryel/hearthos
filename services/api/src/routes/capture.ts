import { Router } from 'express';
import { prisma } from '../prisma';

export const captureRouter: Router = Router();

captureRouter.post('/', async (req, res) => {
  const { memberId, category, content, tags = [] } = req.body;

  const entry = await prisma.memoryEntry.create({
    data: {
      memberId,
      category,
      content,
      tags: JSON.stringify(tags),
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: memberId,
      action: 'CAPTURE_MEMORY',
      resource: `memory:${entry.id}`,
      details: JSON.stringify({ category, tags }),
    },
  });

  res.status(201).json({ ...entry, tags: JSON.parse(entry.tags) });
});

captureRouter.get('/:memberId', async (req, res) => {
  const entries = await prisma.memoryEntry.findMany({
    where: { memberId: req.params.memberId },
    orderBy: { capturedAt: 'desc' },
  });
  res.json(entries.map(e => ({ ...e, tags: JSON.parse(e.tags) })));
});
