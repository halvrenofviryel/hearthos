'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '../components/page-header';
import { Card } from '../components/card';
import { Badge } from '../components/badge';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Thread {
  id: string;
  familyId: string;
  memberId: string;
  agentId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface Agent {
  id: string;
  name: string;
  uiLabel?: string;
  role: string;
  stage: 'front-stage' | 'back-stage';
}

interface Member {
  id: string;
  name: string;
  role: 'parent' | 'child';
  age?: number;
}

export default function ThreadsPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [members, setMembers] = useState<Record<string, Member>>({});

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/threads?familyId=family-1`).then((r) => r.json()).catch(() => []),
      fetch(`${API}/api/agents`).then((r) => r.json()).catch(() => []),
      fetch(`${API}/api/family/members`).then((r) => r.json()).catch(() => []),
    ]).then(([t, a, m]) => {
      setThreads(Array.isArray(t) ? t : []);
      const aMap: Record<string, Agent> = {};
      if (Array.isArray(a)) a.forEach((x: Agent) => { aMap[x.id] = x; });
      setAgents(aMap);
      const mMap: Record<string, Member> = {};
      if (Array.isArray(m)) m.forEach((x: Member) => { mMap[x.id] = x; });
      setMembers(mMap);
    });
  }, []);

  const sorted = [...threads].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <div className="p-8">
      <PageHeader
        title="Threads"
        description="Read-only view of every chat thread the orchestrator has opened. Use the chat app to start or continue conversations."
      />

      {sorted.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-slate-500 mb-1">No threads yet.</p>
          <p className="text-xs text-slate-400">
            Open the chat app at <code className="bg-slate-100 px-1 rounded">http://localhost:3000</code> and start a conversation.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((t) => {
            const agent = agents[t.agentId];
            const member = members[t.memberId];
            return (
              <Card key={t.id} className="p-5">
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <h2 className="font-semibold text-slate-900 text-base">{t.title}</h2>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    Updated {new Date(t.updatedAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span>Member:</span>
                  <span className="font-medium text-slate-700">
                    {member ? member.name : t.memberId}
                  </span>
                  {member && <Badge label={member.role} />}
                  <span className="text-slate-300">·</span>
                  <span>Agent:</span>
                  <span className="font-medium text-slate-700">
                    {agent ? (agent.uiLabel ?? agent.name) : t.agentId}
                  </span>
                  {agent && <Badge label={agent.role} />}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
