import { Router } from 'express';
import { prisma } from '../prisma';

export const auditRouter: Router = Router();

auditRouter.get('/', async (req, res) => {
  const { actor, action, proofType, limit = '50' } = req.query;
  const where: Record<string, unknown> = {};
  if (actor) where.actor = String(actor);
  if (action) where.action = String(action);
  if (proofType) where.proofType = String(proofType);

  const entries = await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: Number(limit),
  });

  res.json(
    entries.map(e => ({
      ...e,
      details: JSON.parse(e.details),
    })),
  );
});
