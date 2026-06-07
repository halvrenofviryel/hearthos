/**
 * AuditChainPanel — surfaces the live Phionyx bounded-authority envelope
 * chain for the current demo session.
 *
 * Renders below each module (Household Check / Weekly Reset / Boundary Script).
 * Shows:
 *   - Live envelope count for the session
 *   - Latest envelope's event_type + integrity.current (truncated)
 *   - Schema id (so visitors learn the wire-level identifier)
 *   - "Download audit chain (.jsonl)" button (disabled until chain ≥ 1)
 *   - "Verify offline" one-liner snippet
 *
 * The panel is intentionally compact — it complements the module UX, not
 * dominates it. The pattern: bounded-authority means visible.
 */
'use client';

import type { BoundedAuthorityEnvelope } from '../lib/phionyx/envelope';

interface AuditChainPanelProps {
  chain: BoundedAuthorityEnvelope[];
  onDownload: () => void;
  /** Optional reset handler — pairs with module "Restart" button. */
  onReset?: () => void;
}

function truncHash(hash: string): string {
  if (!hash.startsWith('sha256:')) return hash.slice(0, 18);
  return hash.slice(0, 18) + '…';
}

export function AuditChainPanel({ chain, onDownload, onReset }: AuditChainPanelProps) {
  const latest = chain[chain.length - 1];

  return (
    <section className="mt-8 border-t border-stone-300 pt-6">
      <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-slate-900">
          Bounded-authority audit chain
        </h3>
        <span className="text-xs text-slate-500 font-mono">
          {chain.length} envelope{chain.length !== 1 ? 's' : ''}
        </span>
      </div>

      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
        Every step you take here emits a signed, hash-chained envelope in
        your browser. Nothing is uploaded. You can download the chain as a{' '}
        <code className="text-[11px] bg-stone-100 px-1 py-0.5 rounded">.jsonl</code>{' '}
        file and verify it offline with the Phionyx verifier.
      </p>

      {latest && (
        <div className="bg-stone-50 border border-stone-300 rounded p-3 mb-3 text-xs space-y-1 font-mono">
          <div className="flex gap-2 flex-wrap">
            <span className="text-slate-500">Latest:</span>
            <span className="text-slate-900">turn {latest.subject.turn_index}</span>
            <span className="text-slate-400">·</span>
            <span className="text-sky-700">{latest.subject.event_type}</span>
            <span className="text-slate-400">·</span>
            <span className="text-emerald-700">{latest.authority.tier}</span>
          </div>
          <div className="text-slate-500 break-all">
            current: <span className="text-slate-700">{truncHash(latest.integrity.current)}</span>
          </div>
          <div className="text-slate-500">
            schema: <span className="text-slate-700">phionyx.bounded_authority_envelope.v1</span>
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={onDownload}
          disabled={chain.length === 0}
          className="text-sm font-medium px-4 py-2 rounded bg-sky-700 hover:bg-sky-800 text-white disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors"
        >
          ↓ Download audit chain (.jsonl)
        </button>
        {onReset && chain.length > 0 && (
          <button
            onClick={onReset}
            className="text-sm font-medium px-4 py-2 rounded border border-stone-300 text-slate-700 hover:bg-stone-100 transition-colors"
          >
            Clear chain
          </button>
        )}
      </div>

      {chain.length > 0 && (
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer text-slate-600 hover:text-slate-900">
            How to verify offline
          </summary>
          <pre className="mt-2 p-3 bg-stone-900 text-stone-100 rounded text-[11px] overflow-x-auto leading-relaxed">{`python3 -c "
from phionyx_mcp_server.audit_chain import verify_chain
import json, sys
chain = [json.loads(l) for l in open(sys.argv[1])]
print(verify_chain(chain))
" your-downloaded.jsonl`}</pre>
          <p className="mt-2 text-slate-500 leading-relaxed">
            Or use the TypeScript verifier at{' '}
            <code className="text-[11px] bg-stone-100 px-1 py-0.5 rounded">
              apps/phionyx-website/lib/hearthos/envelope.ts
            </code>{' '}
            in the{' '}
            <a
              href="https://github.com/halvrenofviryel/phionyx-research"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-700 hover:underline"
            >
              phionyx-research
            </a>{' '}
            repo (<code>verifyChain</code> + <code>verifyBoundedAuthority</code>).
          </p>
        </details>
      )}
    </section>
  );
}
