import { Router } from 'express';
import { prisma } from '../prisma';
import { getTaskRunner } from '../lib/agent-tasks';

export const agentTasksRouter: Router = Router();

// POST /api/agents/:id/run — trigger agent task runner
agentTasksRouter.post('/:id/run', async (req, res) => {
  const agent = await prisma.staffAgent.findUnique({
    where: { id: req.params.id },
  });
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const runner = getTaskRunner(agent.role);
  if (!runner) {
    return res.status(400).json({
      error: 'This agent operates in chat mode only',
      agentRole: agent.role,
    });
  }

  // Default to family-1 if not specified
  const familyId = req.body.familyId ?? 'family-1';

  try {
    const output = await runner(familyId);
    res.status(201).json(output);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Task execution failed';
    res.status(500).json({ error: message });
  }
});

// GET /api/agents/:id/outputs — list agent's task outputs
agentTasksRouter.get('/:id/outputs', async (req, res) => {
  const outputs = await prisma.agentTaskOutput.findMany({
    where: { agentId: req.params.id },
    orderBy: { createdAt: 'desc' },
  });

  const parsed = outputs.map(o => ({
    ...o,
    metadata: JSON.parse(o.metadata),
  }));

  res.json(parsed);
});

// Agent outputs routes (mounted at /api/agent-outputs)
export const agentOutputsRouter: Router = Router();

// GET /api/agent-outputs/:id — get single output detail
agentOutputsRouter.get('/:id', async (req, res) => {
  const output = await prisma.agentTaskOutput.findUnique({
    where: { id: req.params.id },
    include: { agent: { select: { id: true, name: true, role: true } } },
  });
  if (!output) return res.status(404).json({ error: 'Output not found' });

  res.json({ ...output, metadata: JSON.parse(output.metadata) });
});

// PUT /api/agent-outputs/:id — update status (draft → reviewed → approved)
agentOutputsRouter.put('/:id', async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['draft', 'reviewed', 'approved'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  const output = await prisma.agentTaskOutput.findUnique({
    where: { id: req.params.id },
  });
  if (!output) return res.status(404).json({ error: 'Output not found' });

  const updated = await prisma.agentTaskOutput.update({
    where: { id: req.params.id },
    data: { status },
  });

  await prisma.auditLog.create({
    data: {
      actor: 'system',
      action: 'UPDATE_AGENT_OUTPUT_STATUS',
      resource: `agent-task:${updated.id}`,
      details: JSON.stringify({ from: output.status, to: status }),
    },
  });

  res.json({ ...updated, metadata: JSON.parse(updated.metadata) });
});
