import { Router } from 'express';
import { prisma } from '../prisma';
import { OllamaAdapter } from '@hearthos/core';

const llm = new OllamaAdapter({
  model: 'llama3.1',
  baseUrl: process.env.OLLAMA_URL ?? 'http://localhost:11434',
});

export const messagesRouter: Router = Router();

messagesRouter.get('/:threadId/messages', async (req, res) => {
  const messages = await prisma.message.findMany({
    where: { threadId: req.params.threadId },
    orderBy: { createdAt: 'asc' },
  });
  res.json(messages);
});

messagesRouter.post('/:threadId/messages', async (req, res) => {
  const { threadId } = req.params;
  const { content, role = 'user' } = req.body;

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    include: { agent: true, member: true },
  });
  if (!thread) return res.status(404).json({ error: 'Thread not found' });

  const userMessage = await prisma.message.create({
    data: { threadId, role, content },
  });

  // Build conversation history from DB
  const previousMessages = await prisma.message.findMany({
    where: { threadId },
    orderBy: { createdAt: 'asc' },
  });
  const history = previousMessages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  // Parse agent specialties and contract
  let specialties = '';
  try {
    specialties = JSON.parse(thread.agent.specialties).join(', ');
  } catch {
    specialties = thread.agent.specialties;
  }

  let contract: Record<string, unknown> = {};
  try {
    contract = JSON.parse(thread.agent.contract);
  } catch { /* empty contract */ }

  // Fetch assignment instructions for this agent+member pair
  const assignment = await prisma.agentAssignment.findUnique({
    where: {
      agentId_memberId: {
        agentId: thread.agentId,
        memberId: thread.memberId,
      },
    },
  });

  const neverRules = Array.isArray(contract.neverRules)
    ? (contract.neverRules as string[]).map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')
    : '';

  // Fetch family rules and preferences
  const familyRulesData = await prisma.familyMemory.findMany({
    where: { familyId: thread.familyId, category: 'rule' },
  });
  const familyPrefsData = await prisma.familyMemory.findMany({
    where: { familyId: thread.familyId, category: 'preference' },
  });
  const familyRules = familyRulesData.map(r => r.content).join('; ');
  const familyPreferences = familyPrefsData.map(p => p.content).join('; ');

  const assistantContent = await llm.complete(content, {
    threadId,
    history,
    agentName: thread.agent.name,
    agentRole: thread.agent.role,
    agentSpecialties: specialties,
    agentPurpose: contract.purpose ?? thread.agent.purpose ?? '',
    agentNeverRules: neverRules,
    agentStage: thread.agent.stage,
    agentTier: contract.tier ?? 'PROPOSE',
    memberName: thread.member.name,
    memberAge: thread.member.age,
    assignmentInstructions: assignment?.instructions ?? '',
    familyRules: familyRules || undefined,
    familyPreferences: familyPreferences || undefined,
  });

  const assistantMessage = await prisma.message.create({
    data: { threadId, role: 'assistant', content: assistantContent },
  });

  await prisma.thread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      actor: thread.memberId,
      action: 'SEND_MESSAGE',
      resource: `thread:${threadId}`,
      details: JSON.stringify({
        userMessageId: userMessage.id,
        assistantMessageId: assistantMessage.id,
      }),
    },
  });

  res.status(201).json({ userMessage, assistantMessage });
});
