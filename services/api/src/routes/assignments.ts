import { Router } from 'express';
import { prisma } from '../prisma';

export const assignmentsRouter: Router = Router();

// GET /api/assignments — list all assignments
assignmentsRouter.get('/', async (_req, res) => {
  const assignments = await prisma.agentAssignment.findMany({
    include: { agent: true, member: true },
  });
  res.json(assignments);
});

// POST /api/assignments — create assignment
assignmentsRouter.post('/', async (req, res) => {
  const { agentId, memberId, instructions, active } = req.body;
  const assignment = await prisma.agentAssignment.create({
    data: {
      agentId,
      memberId,
      instructions: instructions ?? '',
      active: active ?? true,
    },
    include: { agent: true, member: true },
  });
  await prisma.auditLog.create({
    data: {
      actor: 'system',
      action: 'CREATE_ASSIGNMENT',
      resource: `assignment:${assignment.id}`,
      details: JSON.stringify({ agentId, memberId }),
    },
  });
  res.status(201).json(assignment);
});

// PUT /api/assignments/:id — update assignment
assignmentsRouter.put('/:id', async (req, res) => {
  const { instructions, active } = req.body;
  const data: Record<string, unknown> = {};
  if (instructions !== undefined) data.instructions = instructions;
  if (active !== undefined) data.active = active;

  const assignment = await prisma.agentAssignment.update({
    where: { id: req.params.id },
    data,
    include: { agent: true, member: true },
  });
  await prisma.auditLog.create({
    data: {
      actor: 'system',
      action: 'UPDATE_ASSIGNMENT',
      resource: `assignment:${assignment.id}`,
      details: JSON.stringify(data),
    },
  });
  res.json(assignment);
});

// DELETE /api/assignments/:id — delete assignment
assignmentsRouter.delete('/:id', async (req, res) => {
  await prisma.agentAssignment.delete({ where: { id: req.params.id } });
  await prisma.auditLog.create({
    data: {
      actor: 'system',
      action: 'DELETE_ASSIGNMENT',
      resource: `assignment:${req.params.id}`,
    },
  });
  res.json({ success: true });
});

// GET /api/assignments/member/:memberId — get assignments for a member
assignmentsRouter.get('/member/:memberId', async (req, res) => {
  const assignments = await prisma.agentAssignment.findMany({
    where: { memberId: req.params.memberId, active: true },
    include: { agent: true },
  });
  res.json(assignments);
});
