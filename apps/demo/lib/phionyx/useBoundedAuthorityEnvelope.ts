/**
 * React hook that wraps the Phionyx bounded-authority envelope library.
 *
 * Each module (Diagnostic / Weekly Reset / Boundary Script) calls
 * `useBoundedAuthorityEnvelope({ traceId, scenarioId, packageVersion })`
 * and gets back:
 *
 *   - `emit(ctx)`       — appends a signed envelope to the chain
 *   - `chain`           — current BoundedAuthorityEnvelope[] (live state)
 *   - `downloadJsonl()` — triggers a browser download of the chain as
 *                         `.jsonl` (one envelope per line, canonical JSON)
 *   - `reset()`         — clears the chain (for "Restart" buttons)
 *
 * The chain lives in React state for the lifetime of the page session.
 * Reload clears it by design — this is the browser-only demo posture
 * ("Your inputs stay in this browser session"). A future patch may
 * persist to IndexedDB if a "resume from last session" feature is
 * desired; v0.7.0 ships in-memory only.
 */
'use client';

import { useCallback, useRef, useState } from 'react';
import {
  type BoundedAuthorityEnvelope,
  type BuildEnvelopeContext,
  buildBoundedAuthorityEnvelope,
  canonicalJson,
  GENESIS_HASH,
} from './envelope';

interface UseBoundedAuthorityEnvelopeOpts {
  /**
   * Trace identifier for this session's chain. Stable across the
   * module's lifecycle. The pinned reference traces use:
   *   - "demo-family-diagnostic"
   *   - "demo-family-weekly-reset"
   *   - "demo-family-boundary-script"
   * but live demo sessions can use anything stable per session.
   */
  traceId: string;
  /** "diagnostic" | "weekly_reset" | "boundary_script" */
  scenarioId: string;
  /** semver string for the `subject.version` envelope field */
  packageVersion?: string;
}

export interface UseBoundedAuthorityEnvelopeResult {
  emit: (
    ctx: Omit<BuildEnvelopeContext, 'family_id' | 'scenario_id' | 'turn_index' | 'timestamp_utc'>,
  ) => Promise<BoundedAuthorityEnvelope>;
  chain: BoundedAuthorityEnvelope[];
  downloadJsonl: () => void;
  reset: () => void;
}

export function useBoundedAuthorityEnvelope({
  traceId,
  scenarioId,
  packageVersion = '0.1.0',
}: UseBoundedAuthorityEnvelopeOpts): UseBoundedAuthorityEnvelopeResult {
  const [chain, setChain] = useState<BoundedAuthorityEnvelope[]>([]);

  // Use a ref for previousHash + turnIndex so that successive emit calls
  // within the same render batch see the latest chain head. React state
  // alone would race because setState is async; a chain emitting two
  // envelopes back-to-back would build both against the same previous.
  const headRef = useRef<{ previousHash: string; turnIndex: number }>({
    previousHash: GENESIS_HASH,
    turnIndex: 0,
  });

  const emit = useCallback(
    async (
      ctx: Omit<BuildEnvelopeContext, 'family_id' | 'scenario_id' | 'turn_index' | 'timestamp_utc'>,
    ): Promise<BoundedAuthorityEnvelope> => {
      const nextTurn = headRef.current.turnIndex + 1;
      const envelope = await buildBoundedAuthorityEnvelope(
        {
          ...ctx,
          family_id: traceId,
          scenario_id: scenarioId,
          turn_index: nextTurn,
          timestamp_utc: new Date().toISOString(),
        },
        headRef.current.previousHash,
        packageVersion,
      );
      headRef.current = {
        previousHash: envelope.integrity.current,
        turnIndex: nextTurn,
      };
      setChain((prev) => [...prev, envelope]);
      return envelope;
    },
    [traceId, scenarioId, packageVersion],
  );

  const downloadJsonl = useCallback(() => {
    if (chain.length === 0) return;
    const jsonl = chain.map((env) => canonicalJson(env)).join('\n') + '\n';
    const blob = new Blob([jsonl], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `${scenarioId}-${ts}.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [chain, scenarioId]);

  const reset = useCallback(() => {
    headRef.current = { previousHash: GENESIS_HASH, turnIndex: 0 };
    setChain([]);
  }, []);

  return { emit, chain, downloadJsonl, reset };
}
