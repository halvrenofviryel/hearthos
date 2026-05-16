import { prisma } from '../prisma';

interface SyncResult {
  created: number;
  updated: number;
  deactivated: number;
}

function generateInstructions(
  agent: { name: string; role: string; purpose: string; contract: string },
  member: { name: string; age: number | null; profile: string },
): string {
  let profile: Record<string, unknown> = {};
  try {
    profile = JSON.parse(member.profile);
  } catch { /* empty */ }

  const interests = Array.isArray(profile.interests)
    ? (profile.interests as string[]).join(', ')
    : '';

  let purpose = agent.purpose;
  if (!purpose) {
    try {
      const contract = JSON.parse(agent.contract);
      purpose = contract.purpose ?? '';
    } catch { /* empty */ }
  }

  let text = `${member.name}`;
  if (member.age) text += ` is ${member.age} years old.`;
  if (interests) text += ` Interests: ${interests}.`;
  if (purpose) text += ` Agent role: ${purpose}`;

  return text;
}

export async function syncAssignments(familyId: string): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, deactivated: 0 };

  // Fetch all front-stage agents
  const agents = await prisma.staffAgent.findMany({
    where: { stage: 'front-stage' },
  });

  // Fetch all children in the family
  const children = await prisma.familyMember.findMany({
    where: { familyId, role: 'child' },
  });

  const childIds = new Set(children.map(c => c.id));

  // For each (agent, child) pair, ensure assignment exists
  for (const agent of agents) {
    for (const child of children) {
      const existing = await prisma.agentAssignment.findUnique({
        where: {
          agentId_memberId: {
            agentId: agent.id,
            memberId: child.id,
          },
        },
      });

      const instructions = generateInstructions(agent, child);

      if (!existing) {
        await prisma.agentAssignment.create({
          data: {
            agentId: agent.id,
            memberId: child.id,
            instructions,
            active: true,
          },
        });
        result.created++;
      } else if (existing.instructions !== instructions) {
        await prisma.agentAssignment.update({
          where: { id: existing.id },
          data: { instructions },
        });
        result.updated++;
      }
    }

    // Deactivate assignments for deleted/inactive children
    const agentAssignments = await prisma.agentAssignment.findMany({
      where: { agentId: agent.id, active: true },
    });
    for (const assign of agentAssignments) {
      if (!childIds.has(assign.memberId)) {
        // Check if member still exists
        const member = await prisma.familyMember.findUnique({
          where: { id: assign.memberId },
        });
        if (!member || member.role !== 'child' || member.familyId !== familyId) {
          await prisma.agentAssignment.update({
            where: { id: assign.id },
            data: { active: false },
          });
          result.deactivated++;
        }
      }
    }
  }

  return result;
}
