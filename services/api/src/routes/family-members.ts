import { Router } from 'express';
import { prisma } from '../prisma';
import { syncAssignments } from '../lib/assignment-sync';

export const familyMembersRouter: Router = Router();

// GET /api/family — get family info
familyMembersRouter.get('/', async (_req, res) => {
  const family = await prisma.family.findFirst({
    include: { members: true },
  });
  if (!family) return res.status(404).json({ error: 'No family found' });
  const members = family.members.map(m => ({
    ...m,
    profile: JSON.parse(m.profile),
  }));
  res.json({ ...family, members });
});

// PUT /api/family/:id — update family name
familyMembersRouter.put('/:id', async (req, res) => {
  const { name } = req.body;
  const family = await prisma.family.update({
    where: { id: req.params.id },
    data: { name },
  });
  await prisma.auditLog.create({
    data: {
      actor: 'system',
      action: 'UPDATE_FAMILY',
      resource: `family:${family.id}`,
      details: JSON.stringify({ name }),
    },
  });
  res.json(family);
});

// GET /api/family/members — list all members
familyMembersRouter.get('/members', async (_req, res) => {
  const members = await prisma.familyMember.findMany({
    include: { assignments: { include: { agent: true } } },
  });
  const parsed = members.map(m => ({
    ...m,
    profile: JSON.parse(m.profile),
  }));
  res.json(parsed);
});

// POST /api/family/members — create member
familyMembersRouter.post('/members', async (req, res) => {
  const { id, familyId, name, role, age, profile } = req.body;
  const member = await prisma.familyMember.create({
    data: {
      id: id ?? `member-${Date.now()}`,
      familyId: familyId ?? 'family-1',
      name,
      role,
      age: age ?? null,
      profile: JSON.stringify(profile ?? {}),
    },
  });
  await prisma.auditLog.create({
    data: {
      actor: 'system',
      action: 'CREATE_MEMBER',
      resource: `member:${member.id}`,
      details: JSON.stringify({ name, role }),
    },
  });

  // Auto-sync assignments for new children
  if (role === 'child') {
    await syncAssignments(member.familyId);
  }

  res.status(201).json({ ...member, profile: JSON.parse(member.profile) });
});

// GET /api/family/members/:id — get single member
familyMembersRouter.get('/members/:id', async (req, res) => {
  const member = await prisma.familyMember.findUnique({
    where: { id: req.params.id },
    include: { assignments: { include: { agent: true } } },
  });
  if (!member) return res.status(404).json({ error: 'Member not found' });
  res.json({ ...member, profile: JSON.parse(member.profile) });
});

// PUT /api/family/members/:id — update member
familyMembersRouter.put('/members/:id', async (req, res) => {
  const { name, age, profile, role } = req.body;
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (age !== undefined) data.age = age;
  if (role !== undefined) data.role = role;
  if (profile !== undefined) data.profile = JSON.stringify(profile);

  const member = await prisma.familyMember.update({
    where: { id: req.params.id },
    data,
  });
  await prisma.auditLog.create({
    data: {
      actor: 'system',
      action: 'UPDATE_MEMBER',
      resource: `member:${member.id}`,
      details: JSON.stringify(data),
    },
  });

  // Re-sync assignments when member profile changes
  await syncAssignments(member.familyId);

  res.json({ ...member, profile: JSON.parse(member.profile) });
});
