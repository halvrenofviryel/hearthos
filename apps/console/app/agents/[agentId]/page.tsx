'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '../../components/page-header';
import { Card } from '../../components/card';
import { Badge } from '../../components/badge';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface AgentContract {
  purpose?: string;
  tier?: 'READ' | 'PROPOSE' | 'EXECUTE';
  allowedOutputs?: { read?: string[]; propose?: string[] };
  neverRules?: string[];
  stopConditions?: string[];
  proofObligations?: string[];
}

interface Agent {
  id: string;
  name: string;
  uiLabel?: string;
  role: string;
  stage: 'front-stage' | 'back-stage';
  specialties: string[];
  contract: AgentContract;
}

export default function AgentDetailPage() {
  const params = useParams<{ agentId: string }>();
  const agentId = params?.agentId;
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loaded, setLoaded] = useState(false);

  const fetchAgent = useCallback(async () => {
    if (!agentId) return;
    try {
      const res = await fetch(`${API}/api/agents/${agentId}`);
      const data = await res.json();
      setAgent(data);
    } catch {
      setAgent(null);
    } finally {
      setLoaded(true);
    }
  }, [agentId]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  if (!loaded) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!agent) {
    return (
      <div className="p-8">
        <PageHeader title="Agent not found" description={`No agent with id "${agentId}"`} />
        <Link href="/agents" className="text-sm text-indigo-600 hover:text-indigo-800">
          ← Back to agents
        </Link>
      </div>
    );
  }

  const displayName = agent.uiLabel ?? agent.name;
  const contract = agent.contract ?? {};

  return (
    <div className="p-8">
      <PageHeader
        title={displayName}
        description={`Read-only inspector for ${agent.name} (${agent.role}). Contracts are owned by @hearthos/core seed data; edits happen in the codebase, not here.`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Profile</h2>
            <div className="flex items-center gap-2 mb-3">
              <Badge label={agent.role} />
              <Badge label={agent.stage} />
            </div>
            <div className="space-y-2 text-sm">
              <KV label="Canonical name" value={agent.name} />
              {agent.uiLabel && <KV label="UI label" value={agent.uiLabel} />}
              <KV
                label="Specialties"
                value={agent.specialties.length > 0 ? agent.specialties.join(', ') : '—'}
              />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Contract</h2>
            <div className="space-y-4 text-sm">
              {contract.purpose && <KVBlock label="Purpose" value={contract.purpose} />}
              {contract.tier && <KV label="Permission tier" value={contract.tier} />}
              {contract.allowedOutputs && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Allowed outputs
                  </h3>
                  <KV label="Read" value={listOrDash(contract.allowedOutputs.read)} />
                  <KV label="Propose" value={listOrDash(contract.allowedOutputs.propose)} />
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {contract.neverRules && contract.neverRules.length > 0 && (
            <Card className="p-5">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Never-rules</h2>
              <p className="text-xs text-slate-500 mb-3">
                Hard constraints the agent must never violate.
              </p>
              <ul className="space-y-1.5 text-sm text-slate-700 list-disc list-inside marker:text-rose-400">
                {contract.neverRules.map((r, i) => (
                  <li key={i} className="leading-relaxed">{r}</li>
                ))}
              </ul>
            </Card>
          )}

          {contract.stopConditions && contract.stopConditions.length > 0 && (
            <Card className="p-5">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Stop-conditions</h2>
              <p className="text-xs text-slate-500 mb-3">When this agent halts work and yields.</p>
              <ul className="space-y-1.5 text-sm text-slate-700 list-disc list-inside marker:text-amber-400">
                {contract.stopConditions.map((s, i) => (
                  <li key={i} className="leading-relaxed">{s}</li>
                ))}
              </ul>
            </Card>
          )}

          {contract.proofObligations && contract.proofObligations.length > 0 && (
            <Card className="p-5">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Proof obligations</h2>
              <p className="text-xs text-slate-500 mb-3">
                What this agent must produce as evidence of its decisions and outcomes.
              </p>
              <ul className="space-y-1.5 text-sm text-slate-700 list-disc list-inside marker:text-emerald-400">
                {contract.proofObligations.map((p, i) => (
                  <li key={i} className="leading-relaxed">{p}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <div className="mt-8">
        <Link href="/agents" className="text-sm text-indigo-600 hover:text-indigo-800">
          ← Back to agents
        </Link>
      </div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 w-32 shrink-0">
        {label}
      </span>
      <span className="text-slate-700">{value}</span>
    </div>
  );
}

function KVBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </h3>
      <p className="text-slate-700 leading-relaxed">{value}</p>
    </div>
  );
}

function listOrDash(arr?: string[]): string {
  if (!arr || arr.length === 0) return '—';
  return arr.join(', ');
}
