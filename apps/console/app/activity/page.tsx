'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '../components/page-header';
import { Card } from '../components/card';
import { Badge } from '../components/badge';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  resource: string;
  details: string;
  timestamp: string;
}

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  SEND: 'bg-purple-100 text-purple-700',
};

function getActionColor(action: string): string {
  for (const [key, cls] of Object.entries(actionColors)) {
    if (action.includes(key)) return cls;
  }
  return 'bg-slate-100 text-slate-700';
}

export default function ActivityPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    fetch(`${API}/api/audit?limit=${limit}`)
      .then(r => r.json())
      .then(setEntries)
      .catch(() => {});
  }, [limit]);

  return (
    <div className="p-8">
      <PageHeader
        title="Activity Log"
        description="Audit trail of all actions"
        action={
          <select
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={25}>Last 25</option>
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
          </select>
        }
      />

      <Card>
        {entries.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No activity yet</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {entries.map(entry => (
              <div key={entry.id} className="px-5 py-3 flex items-center gap-4">
                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getActionColor(entry.action)}`}>
                  {entry.action}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-slate-700">{entry.resource}</span>
                  <span className="text-sm text-slate-400 ml-2">by {entry.actor}</span>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
