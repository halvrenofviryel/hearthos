import { Router } from 'express';
import { prisma } from '../prisma';

export const agentsRouter: Router = Router();

// GET /api/agents — list all agents, optionally filter by ?stage=front-stage|back-stage
agentsRouter.get('/', async (req, res) => {
  const { stage } = req.query;
  const where: Record<string, unknown> = {};
  if (stage) where.stage = String(stage);

  const agents = await prisma.staffAgent.findMany({
    where,
    include: { assignments: true },
  });
  const parsed = agents.map(a => ({
    ...a,
    specialties: JSON.parse(a.specialties),
    contract: JSON.parse(a.contract),
  }));
  res.json(parsed);
});

// POST /api/agents — create agent
agentsRouter.post('/', async (req, res) => {
  const { id, name, role, specialties, stage, contract, purpose } = req.body;
  const agent = await prisma.staffAgent.create({
    data: {
      id: id ?? `agent-${Date.now()}`,
      name,
      role,
      specialties: JSON.stringify(specialties ?? []),
      stage: stage ?? 'front-stage',
      contract: JSON.stringify(contract ?? {}),
      purpose: purpose ?? '',
    },
  });
  await prisma.auditLog.create({
    data: {
      actor: 'system',
      action: 'CREATE_AGENT',
      resource: `agent:${agent.id}`,
      details: JSON.stringify({ name, role }),
    },
  });
  res.status(201).json({ ...agent, specialties: JSON.parse(agent.specialties), contract: JSON.parse(agent.contract) });
});

// GET /api/agents/:id — get single agent
agentsRouter.get('/:id', async (req, res) => {
  const agent = await prisma.staffAgent.findUnique({
    where: { id: req.params.id },
    include: { assignments: { include: { member: true } } },
  });
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json({ ...agent, specialties: JSON.parse(agent.specialties), contract: JSON.parse(agent.contract) });
});

// PUT /api/agents/:id — update agent (name & specialties editable; contract is read-only)
agentsRouter.put('/:id', async (req, res) => {
  const { name, specialties } = req.body;
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (specialties !== undefined) data.specialties = JSON.stringify(specialties);

  const agent = await prisma.staffAgent.update({
    where: { id: req.params.id },
    data,
  });
  await prisma.auditLog.create({
    data: {
      actor: 'system',
      action: 'UPDATE_AGENT',
      resource: `agent:${agent.id}`,
      details: JSON.stringify(data),
    },
  });
  res.json({ ...agent, specialties: JSON.parse(agent.specialties), contract: JSON.parse(agent.contract) });
});

// DELETE /api/agents/:id — delete agent
agentsRouter.delete('/:id', async (req, res) => {
  await prisma.agentAssignment.deleteMany({ where: { agentId: req.params.id } });
  await prisma.staffAgent.delete({ where: { id: req.params.id } });
  await prisma.auditLog.create({
    data: {
      actor: 'system',
      action: 'DELETE_AGENT',
      resource: `agent:${req.params.id}`,
    },
  });
  res.json({ success: true });
});
