import { prisma } from '../prisma';
import { OllamaAdapter } from '@hearthos/core';

const llm = new OllamaAdapter({
  model: process.env.OLLAMA_MODEL ?? 'llama3.1',
  baseUrl: process.env.OLLAMA_URL ?? 'http://localhost:11434',
});

function parseContract(contractStr: string): Record<string, unknown> {
  try {
    return JSON.parse(contractStr);
  } catch {
    return {};
  }
}

function getNeverRules(contract: Record<string, unknown>): string {
  if (!Array.isArray(contract.neverRules)) return '';
  return (contract.neverRules as string[])
    .map((r, i) => `${i + 1}. ${r}`)
    .join('\n');
}

// Scribe → Weekly Report
export async function runScribeTask(familyId: string) {
  const agent = await prisma.staffAgent.findFirst({
    where: { role: 'scribe' },
  });
  if (!agent) throw new Error('Scribe agent not found');

  const contract = parseContract(agent.contract);
  const neverRules = getNeverRules(contract);

  // Gather data: last 7 days of messages, memories, audit logs
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentMessages = await prisma.message.findMany({
    where: {
      createdAt: { gte: sevenDaysAgo },
      thread: { familyId },
    },
    include: { thread: { select: { title: true, member: { select: { name: true } }, agent: { select: { name: true } } } } },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  const recentMemories = await prisma.familyMemory.findMany({
    where: { familyId, createdAt: { gte: sevenDaysAgo } },
    orderBy: { createdAt: 'desc' },
  });

  const recentAudit = await prisma.auditLog.findMany({
    where: { timestamp: { gte: sevenDaysAgo } },
    orderBy: { timestamp: 'desc' },
    take: 50,
  });

  // Build context
  const messageSummary = recentMessages.map(m =>
    `[${m.thread.member.name} ↔ ${m.thread.agent.name}] ${m.role}: ${m.content.slice(0, 200)}`,
  ).join('\n');

  const memorySummary = recentMemories.map(m =>
    `[${m.category}] ${m.content}`,
  ).join('\n');

  const auditSummary = recentAudit.map(a =>
    `${a.action} on ${a.resource} by ${a.actor}`,
  ).join('\n');

  const prompt = `You are the family's Scribe in HearthOS. Your task is to summarise this family's week.

${neverRules ? `Things you must never do:\n${neverRules}\n` : ''}
Use the data below to produce a structured weekly report (in English):

## Last 7 days of messages:
${messageSummary || 'No messages'}

## Family memories / notes:
${memorySummary || 'No notes'}

## Audit log:
${auditSummary || 'No entries'}

Report format:
1. Weekly summary (overall assessment)
2. Notable conversations
3. Milestones and significant events
4. Recommendations`;

  const output = await llm.complete(prompt);

  const taskOutput = await prisma.agentTaskOutput.create({
    data: {
      agentId: agent.id,
      taskType: 'weekly-report',
      output,
      metadata: JSON.stringify({
        familyId,
        messageCount: recentMessages.length,
        memoryCount: recentMemories.length,
      }),
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: agent.id,
      action: 'RUN_AGENT_TASK',
      resource: `agent-task:${taskOutput.id}`,
      details: JSON.stringify({ taskType: 'weekly-report', familyId }),
      proofType: 'outcome',
    },
  });

  return taskOutput;
}

// Steward → Weekly Package
export async function runStewardTask(familyId: string) {
  const agent = await prisma.staffAgent.findFirst({
    where: { role: 'steward' },
  });
  if (!agent) throw new Error('Steward agent not found');

  const contract = parseContract(agent.contract);
  const neverRules = getNeverRules(contract);

  // Gather data: active plans, course plans, family memories, member profiles
  const activePlans = await prisma.plan.findMany({
    where: { familyId, status: { in: ['draft', 'proposed', 'approved', 'active'] } },
    include: { items: true, member: { select: { name: true } } },
  });

  const familyMemories = await prisma.familyMemory.findMany({
    where: { familyId, category: { in: ['preference', 'rule'] } },
  });

  const members = await prisma.familyMember.findMany({
    where: { familyId },
  });

  const coursePlans = await prisma.coursePlanRecord.findMany({
    where: { member: { familyId } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // Build context
  const plansSummary = activePlans.map(p =>
    `${p.member.name}: "${p.title}" (${p.status}) - ${p.items.length} items, ${p.items.filter(i => i.completed).length} completed`,
  ).join('\n');

  const memoriesSummary = familyMemories.map(m =>
    `[${m.category}] ${m.content}`,
  ).join('\n');

  const membersSummary = members.map(m => {
    let profile: Record<string, unknown> = {};
    try { profile = JSON.parse(m.profile); } catch { /* */ }
    return `${m.name} (${m.role}${m.age ? `, age ${m.age}` : ''}) - ${JSON.stringify(profile)}`;
  }).join('\n');

  const courseSummary = coursePlans.map(c =>
    `${c.tier} plan: ${c.totalHoursPerWeek}h/week, $${c.totalCostPerMonth}/mo`,
  ).join('\n');

  const prompt = `You are the family's Steward in HearthOS. Your task is to compose three weekly packages for this family.

${neverRules ? `Things you must never do:\n${neverRules}\n` : ''}
Use the data below to compose three tiered weekly packages (in English):

## Family members:
${membersSummary}

## Active plans:
${plansSummary || 'No plans'}

## Course plans:
${courseSummary || 'No course plans'}

## Family rules and preferences:
${memoriesSummary || 'Not specified'}

Compose three packages:
1. **Light package** — minimal effort, core priorities only
2. **Standard package** — balanced approach, recommended activities
3. **Ambitious package** — maximum growth, extra activities

For each package: state priorities, recommended activities, estimated time.`;

  const output = await llm.complete(prompt);

  const taskOutput = await prisma.agentTaskOutput.create({
    data: {
      agentId: agent.id,
      taskType: 'weekly-package',
      output,
      metadata: JSON.stringify({
        familyId,
        planCount: activePlans.length,
        memberCount: members.length,
      }),
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: agent.id,
      action: 'RUN_AGENT_TASK',
      resource: `agent-task:${taskOutput.id}`,
      details: JSON.stringify({ taskType: 'weekly-package', familyId }),
      proofType: 'outcome',
    },
  });

  return taskOutput;
}

// Critic → Risk Review
export async function runCriticTask(familyId: string) {
  const agent = await prisma.staffAgent.findFirst({
    where: { role: 'critic' },
  });
  if (!agent) throw new Error('Critic agent not found');

  const contract = parseContract(agent.contract);
  const neverRules = getNeverRules(contract);

  // Gather data: recent draft outputs, active plans, recent proposals
  const draftOutputs = await prisma.agentTaskOutput.findMany({
    where: { status: 'draft' },
    include: { agent: { select: { name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const activePlans = await prisma.plan.findMany({
    where: { familyId, status: { in: ['proposed', 'draft'] } },
    include: { items: true, member: { select: { name: true } } },
  });

  // Build context
  const outputsSummary = draftOutputs.map(o =>
    `[${o.agent.name} - ${o.taskType}]\n${o.output.slice(0, 500)}`,
  ).join('\n\n---\n\n');

  const plansSummary = activePlans.map(p =>
    `"${p.title}" (${p.status}) - ${p.member.name}: ${p.description}`,
  ).join('\n');

  const prompt = `You are the family's Critic in HearthOS. Your task is to review proposals and drafts and produce a risk analysis.

${neverRules ? `Things you must never do:\n${neverRules}\n` : ''}
Review the draft outputs and proposals below (in English):

## Draft agent outputs:
${outputsSummary || 'No draft outputs'}

## Proposed / draft plans:
${plansSummary || 'No proposals'}

For each item:
1. **Risks** — what could go wrong?
2. **Hidden assumptions** — what assumptions are being made?
3. **Recommendations** — how could it be improved?

Be constructive; offer concrete suggestions.`;

  const output = await llm.complete(prompt);

  const taskOutput = await prisma.agentTaskOutput.create({
    data: {
      agentId: agent.id,
      taskType: 'risk-review',
      output,
      metadata: JSON.stringify({
        familyId,
        reviewedOutputs: draftOutputs.length,
        reviewedPlans: activePlans.length,
      }),
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: agent.id,
      action: 'RUN_AGENT_TASK',
      resource: `agent-task:${taskOutput.id}`,
      details: JSON.stringify({ taskType: 'risk-review', familyId }),
      proofType: 'decision',
    },
  });

  return taskOutput;
}

// Task runner dispatcher
const TASK_RUNNERS: Record<string, (familyId: string) => Promise<unknown>> = {
  steward: runStewardTask,
  scribe: runScribeTask,
  critic: runCriticTask,
};

export function getTaskRunner(role: string) {
  return TASK_RUNNERS[role] ?? null;
}
