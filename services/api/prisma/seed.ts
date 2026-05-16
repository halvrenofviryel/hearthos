import { PrismaClient } from '@prisma/client';
import { seedFamily, seedMembers, seedAgents, seedCourses } from '@hearthos/core';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  await prisma.family.upsert({
    where: { id: seedFamily.id },
    update: {},
    create: { id: seedFamily.id, name: seedFamily.name },
  });

  for (const member of seedMembers) {
    await prisma.familyMember.upsert({
      where: { id: member.id },
      update: {},
      create: {
        id: member.id,
        familyId: member.familyId,
        name: member.name,
        role: member.role,
        age: member.age ?? null,
        profile: JSON.stringify(member.profile),
      },
    });
  }

  // Upsert all 10 staff agents with contracts
  for (const agent of seedAgents) {
    await prisma.staffAgent.upsert({
      where: { id: agent.id },
      update: {
        name: agent.name,
        role: agent.role,
        specialties: JSON.stringify(agent.specialties),
        stage: agent.stage,
        contract: JSON.stringify(agent.contract),
        purpose: agent.contract.purpose,
      },
      create: {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        specialties: JSON.stringify(agent.specialties),
        stage: agent.stage,
        contract: JSON.stringify(agent.contract),
        purpose: agent.contract.purpose,
      },
    });
  }

  // Clean up old agents that no longer exist in seed data
  const seedAgentIds = seedAgents.map(a => a.id);
  const existingAgents = await prisma.staffAgent.findMany({ select: { id: true } });
  for (const existing of existingAgents) {
    if (!seedAgentIds.includes(existing.id)) {
      // Remove assignments and threads referencing old agents before deleting
      await prisma.agentAssignment.deleteMany({ where: { agentId: existing.id } });
      // Leave threads intact but skip agent deletion if threads exist
      const threadCount = await prisma.thread.count({ where: { agentId: existing.id } });
      if (threadCount === 0) {
        await prisma.staffAgent.delete({ where: { id: existing.id } });
        console.log(`  Removed old agent: ${existing.id}`);
      } else {
        console.log(`  Skipped removing ${existing.id} (has ${threadCount} threads)`);
      }
    }
  }

  // Create sample threads using new agents
  const thread1 = await prisma.thread.upsert({
    where: { id: 'thread-seed-1' },
    update: {},
    create: {
      id: 'thread-seed-1',
      familyId: 'family-1',
      memberId: 'member-lily',
      agentId: 'agent-nanny-coach',
      title: 'Skill Tree Check-in',
    },
  });

  const thread2 = await prisma.thread.upsert({
    where: { id: 'thread-seed-2' },
    update: {},
    create: {
      id: 'thread-seed-2',
      familyId: 'family-1',
      memberId: 'member-max',
      agentId: 'agent-butler',
      title: 'Weekly Checklist',
    },
  });

  // Create sample messages
  const seedMessages = [
    { id: 'msg-seed-1', threadId: thread1.id, role: 'user', content: 'Hi Nanny-Coach! Can you check my reading skill tree?' },
    { id: 'msg-seed-2', threadId: thread1.id, role: 'assistant', content: "Hi Lily! Let me look at your reading skill tree. You've completed 3 milestones this month — great progress! Your next micro-habit could be reading 15 minutes before bed. What do you think?" },
    { id: 'msg-seed-3', threadId: thread2.id, role: 'user', content: 'Hey Butler, what should I do next today?' },
    { id: 'msg-seed-4', threadId: thread2.id, role: 'assistant', content: "Hi Max! Looking at your checklist: you've finished homework and soccer practice. Next best action: your chess club prep — review the Sicilian Defense opening you bookmarked. That takes about 20 minutes." },
  ];
  for (const msg of seedMessages) {
    const existing = await prisma.message.findUnique({ where: { id: msg.id } });
    if (!existing) await prisma.message.create({ data: msg });
  }

  // Create a sample plan
  await prisma.plan.upsert({
    where: { id: 'plan-seed-1' },
    update: {},
    create: {
      id: 'plan-seed-1',
      familyId: 'family-1',
      memberId: 'member-lily',
      title: "Lily's Reading Adventure",
      description: 'A structured reading plan to boost comprehension and vocabulary',
      status: 'active',
      items: {
        create: [
          { id: 'item-seed-1', title: 'Read 20 minutes daily', completed: true },
          { id: 'item-seed-2', title: 'Complete vocabulary worksheet', completed: false },
          { id: 'item-seed-3', title: 'Write a book summary', completed: false },
        ],
      },
    },
  });

  // Create sample memory entries
  const seedMemoryEntries = [
    {
      id: 'mem-seed-1',
      memberId: 'member-lily',
      category: 'achievement',
      content: 'Lily completed her first chapter book independently!',
      tags: JSON.stringify(['reading', 'milestone']),
    },
    {
      id: 'mem-seed-2',
      memberId: 'member-max',
      category: 'interest',
      content: 'Max showed strong interest in learning Python programming',
      tags: JSON.stringify(['coding', 'technology']),
    },
  ];
  for (const mem of seedMemoryEntries) {
    const existing = await prisma.memoryEntry.findUnique({ where: { id: mem.id } });
    if (!existing) await prisma.memoryEntry.create({ data: mem });
  }

  // Create a sample course plan
  const lilyCourses = seedCourses.filter(c => ['course-piano', 'course-swimming', 'course-art'].includes(c.id));
  await prisma.coursePlanRecord.upsert({
    where: { id: 'cplan-seed-1' },
    update: {},
    create: {
      id: 'cplan-seed-1',
      memberId: 'member-lily',
      tier: 'standard',
      coursesJson: JSON.stringify(lilyCourses),
      totalHoursPerWeek: lilyCourses.reduce((sum, c) => sum + c.hoursPerWeek, 0),
      totalCostPerMonth: lilyCourses.reduce((sum, c) => sum + c.costPerMonth, 0),
      totalFatigueScore: lilyCourses.reduce((sum, c) => sum + c.fatigueScore, 0),
      conflictsJson: JSON.stringify([]),
      score: 130,
    },
  });

  // Create default agent assignments — only front-stage agents assigned to children
  const frontStageAgents = seedAgents.filter(a => a.stage === 'front-stage');
  const children = seedMembers.filter(m => m.role === 'child');

  const defaultAssignments: { id: string; agentId: string; memberId: string; instructions: string }[] = [];
  for (const agent of frontStageAgents) {
    for (const child of children) {
      defaultAssignments.push({
        id: `assign-${agent.role}-${child.name.split(' ')[0].toLowerCase()}`,
        agentId: agent.id,
        memberId: child.id,
        instructions: `${child.name} is ${child.age} years old. Agent role: ${agent.contract.purpose}`,
      });
    }
  }

  for (const assign of defaultAssignments) {
    await prisma.agentAssignment.upsert({
      where: { id: assign.id },
      update: {},
      create: assign,
    });
  }

  console.log('Seed complete! Created 10 staff agents (6 front-stage, 4 back-stage).');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
