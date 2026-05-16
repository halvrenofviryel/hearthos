'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from './components/page-header';
import { StatCard } from './components/stat-card';
import { Card } from './components/card';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  resource: string;
  details: string;
  timestamp: string;
}

interface Thread {
  id: string;
  title: string;
  memberId: string;
  agentId: string;
  updatedAt: string;
}

interface Agent {
  id: string;
  name: string;
  stage: 'front-stage' | 'back-stage';
}

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [recentActivity, setRecentActivity] = useState<AuditEntry[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/agents`).then((r) => r.json()).catch(() => []),
      fetch(`${API}/api/threads?familyId=family-1`).then((r) => r.json()).catch(() => []),
      fetch(`${API}/api/audit?limit=12`).then((r) => r.json()).catch(() => []),
    ]).then(([a, t, audit]) => {
      setAgents(Array.isArray(a) ? a : []);
      setThreads(Array.isArray(t) ? t : []);
      setRecentActivity(Array.isArray(audit) ? audit : []);
    });
  }, []);

  const frontStage = agents.filter((a) => a.stage === 'front-stage').length;
  const backStage = agents.filter((a) => a.stage === 'back-stage').length;
  const recentThreads = [...threads]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  return (
    <div className="p-8">
      <PageHeader
        title="Dashboard"
        description="Chat control surface — read-only overview of threads, agents, and activity"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Threads" value={threads.length} detail="Conversations in progress" />
        <StatCard label="Agents" value={agents.length} detail="Total staff agents" />
        <StatCard label="Front-stage" value={frontStage} detail="Direct interaction tier" />
        <StatCard label="Back-stage" value={backStage} detail="Review & audit tier" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent threads</h2>
            <Link href="/threads" className="text-xs text-indigo-600 hover:text-indigo-800">
              View all →
            </Link>
          </div>
          {recentThreads.length === 0 ? (
            <p className="text-sm text-slate-400">No threads yet. Open the chat app to start one.</p>
          ) : (
            <ul className="space-y-2">
              {recentThreads.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 last:border-0"
                >
                  <span className="font-medium text-slate-700 truncate mr-2">{t.title}</span>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {new Date(t.updatedAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Bounded authority — at a glance</h2>
          <p className="text-sm text-slate-600 mb-3 leading-relaxed">
            This console reads what HearthOS already recorded. It does not create, edit, or delete
            anything — agents, contracts, and family seed live in <code className="text-xs bg-slate-100 px-1 rounded">packages/core</code> and are managed in code.
          </p>
          <p className="text-sm text-slate-600 mb-0 leading-relaxed">
            AI proposes via the chat app; only the parent executes. The activity log shows every
            policy decision; the threads view shows what each agent has been asked.
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent activity</h2>
          <Link href="/activity" className="text-xs text-indigo-600 hover:text-indigo-800">
            View full log →
          </Link>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-slate-400">No recent activity recorded.</p>
        ) : (
          <ul className="space-y-2">
            {recentActivity.map((e) => (
              <li
                key={e.id}
                className="flex items-start justify-between text-sm border-b border-slate-100 pb-2 last:border-0"
              >
                <div className="min-w-0 mr-3">
                  <span className="font-medium text-slate-700">{e.action}</span>
                  <span className="text-slate-400 mx-1.5">on</span>
                  <span className="text-slate-600 break-all">{e.resource}</span>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                  {new Date(e.timestamp).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
