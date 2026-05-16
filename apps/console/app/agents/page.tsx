'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '../components/page-header';
import { Card } from '../components/card';
import { Badge } from '../components/badge';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Agent {
  id: string;
  name: string;
  role: string;
  stage: string;
  specialties: string[];
  purpose?: string;
  contract?: { purpose?: string };
  assignments: { id: string; memberId: string }[];
}

function AgentCard({ agent }: { agent: Agent }) {
  const purpose = agent.contract?.purpose ?? agent.purpose ?? '';
  return (
    <Link href={`/agents/${agent.id}`}>
      <Card className="p-5 hover:border-indigo-300 transition-colors cursor-pointer">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-slate-900">{agent.name}</h3>
          <Badge label={agent.role} />
        </div>
        {purpose && (
          <p className="text-xs text-slate-500 mb-2 line-clamp-2">{purpose}</p>
        )}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {agent.specialties.map(s => (
            <span key={s} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              {s}
            </span>
          ))}
        </div>
        <p className="text-xs text-slate-400">
          {agent.assignments.length} assignment{agent.assignments.length !== 1 ? 's' : ''}
        </p>
      </Card>
    </Link>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    fetch(`${API}/api/agents`).then(r => r.json()).then(setAgents).catch(() => {});
  }, []);

  const frontStage = agents.filter(a => a.stage === 'front-stage');
  const backStage = agents.filter(a => a.stage === 'back-stage');

  return (
    <div className="p-8">
      <PageHeader
        title="Household Staff"
        description="Read-only view of the 10-agent staff. Agent contracts live in @hearthos/core seed data; this console does not create, edit, or delete agents."
      />

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Front-Stage</h2>
          <Badge label="front-stage" />
          <span className="text-sm text-slate-400">— visible to children</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {frontStage.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Back-Stage</h2>
          <Badge label="back-stage" />
          <span className="text-sm text-slate-400">— background operations</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {backStage.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </div>
  );
}
