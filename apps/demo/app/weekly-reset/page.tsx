'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DemoStepper } from '@/components/DemoStepper';
import { AuditChainPanel } from '@/components/AuditChainPanel';
import { useBoundedAuthorityEnvelope } from '@/lib/phionyx/useBoundedAuthorityEnvelope';
import type { AuthorityBlock } from '@/lib/phionyx/envelope';

// Weekly Reset uses execute-with-review tier — every queued action
// requires explicit parent approval before it counts as executed.
// Matches scripts/active/generate_hearthos_pinned_traces.py
// EXECUTE_WITH_REVIEW_AUTHORITY.
const EXECUTE_WITH_REVIEW_AUTHORITY: AuthorityBlock = {
  tier: 'EXECUTE',
  subclass: 'execute-with-review',
  contract_id: 'hearthos.steward.v1',
  contract_version: '1.0.0',
  never_rules_active: [
    "never act on a child's request without parent visibility",
    'never override an existing parent-set rule silently',
  ],
  stop_conditions_active: [
    'two-consecutive-rejections-from-parent',
    'family-member-marks-urgent',
  ],
};

// ──────────────────────────────────────────────────────────────────────
// Inputs
// ──────────────────────────────────────────────────────────────────────

type Children = 'one' | 'multiple';
type AgeBand = 'young' | 'middle' | 'teen';
type FocusArea = 'mornings' | 'evenings' | 'screens' | 'school' | 'chores';
type TimeBudget = 'tight' | 'normal' | 'generous';

interface Inputs {
  children: Children;
  ageBand: AgeBand;
  focusArea: FocusArea;
  timeBudget: TimeBudget;
}

const DEFAULT_INPUTS: Inputs = {
  children: 'multiple',
  ageBand: 'middle',
  focusArea: 'mornings',
  timeBudget: 'normal',
};

// ──────────────────────────────────────────────────────────────────────
// Deterministic hash → picks variant from a pool reproducibly
// ──────────────────────────────────────────────────────────────────────

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h = h & h;
  }
  return Math.abs(h);
}

function inputKey(i: Inputs): string {
  return `${i.children}|${i.ageBand}|${i.focusArea}|${i.timeBudget}`;
}

function pickN<T>(pool: T[], seed: number, n: number): T[] {
  if (pool.length <= n) return [...pool];
  const out: T[] = [];
  const used = new Set<number>();
  let s = seed;
  while (out.length < n) {
    s = (s * 1664525 + 1013904223) | 0; // LCG
    const idx = Math.abs(s) % pool.length;
    if (!used.has(idx)) {
      used.add(idx);
      out.push(pool[idx]);
    }
  }
  return out;
}

function pickOne<T>(pool: T[], seed: number): T {
  return pool[seed % pool.length];
}

// ──────────────────────────────────────────────────────────────────────
// Content pools
// ──────────────────────────────────────────────────────────────────────

const PRIORITIES_POOL: Record<FocusArea, string[]> = {
  mornings: [
    'Cut one decision out of the morning routine — same breakfast, same outfit-system, same exit order',
    'Move tomorrow\'s pack-up to tonight: bags, lunchboxes, signed forms ready by the door',
    'Identify the single bottleneck that breaks mornings most often — name it; the family can see it',
    'Build a five-minute pre-school anchor (one shared activity that signals the day is starting)',
    'Set a non-negotiable departure time and a visible countdown — twenty / ten / five minutes',
  ],
  evenings: [
    'Pick a fixed wind-down start time and protect it from late tasks',
    'Move dinner thirty minutes earlier this week to give recovery time before bed',
    'Designate one "no-screens" evening to test how it lands; agree on one alternative activity',
    'Limit evening decisions: same bedtime sequence every night this week, no negotiation',
    'Reserve the last twenty minutes for connection (book, talk, plan tomorrow) — not logistics',
  ],
  screens: [
    'Write down the actual screen-time rule everyone has been improvising — one sentence',
    'Pick the single most-fought-over device or app and apply the rule there first',
    'Move screens out of the bedrooms for sleep — set a charging spot in a shared room',
    'Create two visible windows when screens are OK; outside those windows is a default no',
    'Agree on one screen-free meal or activity each day this week',
  ],
  school: [
    'Set a fixed homework start time and a fixed end time — even when it\'s not finished',
    'Pick one subject to track this week (low-stakes win — not the most stressful one)',
    'Move homework supplies to one designated spot — pack-up at the end is part of the routine',
    'Decide in advance who handles which kind of school issue (administrative vs emotional)',
    'Replace "did you do your homework?" with one specific check-in question agreed up front',
  ],
  chores: [
    'Pick three chores total — not a whole list — and rotate them on a written schedule',
    'Give each child a single recurring responsibility they own for the whole week',
    'Connect each chore to a clear trigger ("after dinner" / "before screen time"), not a parent reminder',
    'Move from "help me with X" to a list on the fridge — chores live there, not in the parent\'s head',
    'Agree on what "done" looks like — written, not assumed',
  ],
};

const CHILD_TASKS_POOL: Record<AgeBand, string[]> = {
  young: [
    'Pack tomorrow\'s school bag the night before with one adult check',
    'Choose tomorrow\'s outfit before getting into bed',
    'Help set or clear the table for one meal a day',
    'Put away laundry in their own room for ten minutes',
    'Pick one book to read or be read to before bed',
    'Tidy one specific corner (toy box, shelf) at the end of the day',
  ],
  middle: [
    'Pack tomorrow\'s bag and lay out clothes before bed — no parent check unless asked',
    'Take responsibility for one specific household chore this week (dishes, recycling, pet)',
    'Set a daily homework start time and stick to it for five out of seven days',
    'Plan one short activity for the weekend and present it for parent approval',
    'Read or work on one personal project for twenty minutes daily',
    'Track one personal goal (steps, pages, practice minutes) in a visible spot',
  ],
  teen: [
    'Own one weekly meal: plan it, shop for ingredients if needed, cook it',
    'Manage their own school deadlines for the week — share a one-line summary with a parent on Sunday',
    'Hand-write tomorrow\'s schedule before bed — not just on a phone',
    'Take responsibility for one ongoing family responsibility (recycling, pet, sibling pickup)',
    'Set their own screen-time limit for the week and report whether they kept it',
    'Pick one independent learning goal and report progress at end of week',
  ],
};

const MEAL_ROUTINE_POOL: Record<FocusArea, Record<TimeBudget, string>> = {
  mornings: {
    tight: 'Pre-set breakfast: two rotating options, both ready in under three minutes. Decide tonight, not in the morning.',
    normal: 'Pick three weekday breakfasts and one weekend special; rotate. Lunches packed the night before.',
    generous: 'Plan a shared sit-down breakfast for at least two weekdays. Lunches packed the night before, one child involved per night.',
  },
  evenings: {
    tight: 'Two minimum-viable dinners on hand for stressful nights (frozen + side). No shame, no improvisation.',
    normal: 'Three planned dinners + two flex slots. Shopping list written on Sunday.',
    generous: 'Five planned dinners with at least one slow / batch-cook night. Family contributes one input each.',
  },
  screens: {
    tight: 'Pick one screen-free meal per day this week. Anything else is OK.',
    normal: 'Set two screen-free meals daily. Adults match the rule.',
    generous: 'Designate one full screen-free evening this week. Agree on one alternative activity in advance.',
  },
  school: {
    tight: 'Homework snack at a fixed time. After-dinner is for connection, not catch-up.',
    normal: 'Homework window: same start time, same end time, same place. Snack first, work second.',
    generous: 'Homework + connect ritual: thirty minutes of homework, ten minutes of conversation about it, then closed.',
  },
  chores: {
    tight: 'Tie one chore to one meal (e.g. "after breakfast: bins"). Eliminate every other reminder this week.',
    normal: 'Three chores rotate across the week, all tied to natural meal-time triggers.',
    generous: 'Sunday family stand-up: review the week\'s chore rotation, celebrate one specific win.',
  },
};

const RISKS_POOL: string[] = [
  'Over-scheduling — the week looks fine on paper but ignores recovery time. Build one buffer day.',
  'One parent absorbing the cognitive load silently. The list goes in a shared spot, not in someone\'s head.',
  'A child\'s "yes" without a real plan. Each commitment should have a how, not just a what.',
  'Approval given in a tired moment that gets reversed in the morning. High-stakes decisions wait twelve hours.',
  'Late-week drift: by Wednesday the routine slips. Plan for the slip on Tuesday evening, not Wednesday morning.',
  'Sibling fairness perception: routines applied unevenly leak as resentment. Same rules, visible, written.',
  'New activity creep — adding without removing. If something new comes in this week, something else comes out.',
  'Decisions made by exhaustion rather than design. Pause point: "Am I deciding this because I want to, or because I\'m done?"',
];

const APPROVAL_POOL: string[] = [
  'Subscription / payment renewal or change requires explicit parent approval — not implicit by silence',
  'School or activity sign-up needs parent sign-off, even if a child started the form',
  'Sharing a child\'s photo, schedule, or work outside the family — explicit approval each time',
  'Schedule changes that affect more than one family member need a quick check before being confirmed',
  'Permissions to attend events away from the family default to "ask the other parent first"',
  'Any commitment over an hour of weekly time needs both parents to confirm before it joins the calendar',
  'Money decisions over the agreed family threshold pause for one overnight before execution',
  'Sharing a household routine publicly (social, parent groups) — always parent decision, never agent default',
];

// ──────────────────────────────────────────────────────────────────────
// Generator
// ──────────────────────────────────────────────────────────────────────

interface Output {
  priorities: string[];
  childTasks: string[];
  mealRoutine: string;
  risks: string[];
  approvalQueue: string[];
}

function generate(inputs: Inputs): Output {
  const seed = hashString(inputKey(inputs));
  const priorityPool = PRIORITIES_POOL[inputs.focusArea];
  const childPool = CHILD_TASKS_POOL[inputs.ageBand];
  return {
    priorities: pickN(priorityPool, seed, 3),
    childTasks: pickN(childPool, seed + 1, inputs.children === 'one' ? 3 : 3),
    mealRoutine: MEAL_ROUTINE_POOL[inputs.focusArea][inputs.timeBudget],
    risks: pickN(RISKS_POOL, seed + 2, 3),
    approvalQueue: pickN(APPROVAL_POOL, seed + 3, 3),
  };
}

// ──────────────────────────────────────────────────────────────────────
// UI helpers
// ──────────────────────────────────────────────────────────────────────

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-[10px] font-semibold uppercase tracking-wider bg-stone-200 text-slate-600 px-2 py-0.5 rounded">
      {children}
    </span>
  );
}

function ApprovalPill() {
  return (
    <span className="inline-block text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded">
      Awaiting parent approval
    </span>
  );
}

function Section({
  title,
  agent,
  status,
  emphasise,
  children,
}: {
  title: string;
  agent?: string;
  status?: string;
  emphasise?: boolean;
  children: React.ReactNode;
}) {
  const borderCls = emphasise
    ? 'border-2 border-amber-400 bg-amber-50'
    : 'border border-stone-300 bg-white';
  return (
    <section className={`${borderCls} rounded-lg p-5`}>
      <div className="mb-3">
        <h2 className={emphasise ? 'font-semibold text-amber-900 text-lg' : 'font-semibold text-slate-900'}>
          {title}
        </h2>
        {(agent || status) && (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
            {agent && (
              <span>
                <span className="font-medium text-slate-600">Suggested by:</span> {agent}
              </span>
            )}
            {status && (
              <span>
                <span className="font-medium text-slate-600">Status:</span> {status}
              </span>
            )}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────

type ApprovalDecision = 'approved' | 'modified' | 'declined';

const DECISION_META: Record<ApprovalDecision, { label: string; pillClass: string }> = {
  approved: { label: '✓ Approved', pillClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  modified: { label: '📝 Sent back to modify', pillClass: 'bg-amber-100 text-amber-800 border-amber-300' },
  declined: { label: '✗ Declined', pillClass: 'bg-rose-100 text-rose-800 border-rose-300' },
};

export default function WeeklyResetPage() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS);
  const [output, setOutput] = useState<Output | null>(null);
  const [copied, setCopied] = useState(false);
  const [decisions, setDecisions] = useState<Map<number, ApprovalDecision>>(new Map());

  const audit = useBoundedAuthorityEnvelope({
    traceId: 'demo-family-weekly-reset',
    scenarioId: 'weekly_reset',
    packageVersion: '0.1.0',
  });

  function update<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    setInputs({ ...inputs, [key]: value });
  }

  function handleGenerate() {
    const newOutput = generate(inputs);
    setOutput(newOutput);
    setCopied(false);
    setDecisions(new Map());
    audit.reset();

    // Emit the plan-proposal envelope. Each action in the approval
    // queue is a PROPOSE-tier proposal that will need parent approval
    // via execute-with-review subclass before counting as executed.
    void audit.emit({
      producer: 'hearthos.steward',
      event_type: 'propose',
      authority: EXECUTE_WITH_REVIEW_AUTHORITY,
      proposal: {
        action_id: `wr-plan-${inputKey(inputs)}`,
        action_kind: 'weekly_plan_draft',
        action_payload: {
          inputs: { ...inputs },
          queued_actions: newOutput.approvalQueue.length,
        },
        rationale_summary: 'Draft a balanced week using the supplied family inputs.',
        proof_obligations_declared: ['decision', 'outcome'],
      },
    });
  }

  async function approverIdHash(role: string): Promise<string> {
    // SHA-256 of a stable per-role identifier for the demo. The
    // hashing pattern matches scripts/active/generate_hearthos_pinned_traces.py
    const enc = new TextEncoder().encode(`parent.${role}@demo-family`);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function decide(idx: number, decision: ApprovalDecision) {
    const next = new Map(decisions);
    const isToggleOff = next.get(idx) === decision;
    if (isToggleOff) {
      next.delete(idx); // toggle off
    } else {
      next.set(idx, decision);
    }
    setDecisions(next);

    // Only emit on the SET (not toggle-off) and only for approved /
    // declined (not "modified" — that one is informational in the
    // demo, no audit value).
    if (isToggleOff || !output) return;
    if (decision === 'modified') return;

    const actionText = output.approvalQueue[idx];
    if (!actionText) return;
    const actionId = `wr-action-${inputKey(inputs)}-${idx}`;

    void (async () => {
      const idHash = await approverIdHash('alice');

      // Step 1: execute_requested envelope (queued action enters approval queue)
      await audit.emit({
        producer: 'hearthos.steward',
        event_type: 'execute_requested',
        authority: EXECUTE_WITH_REVIEW_AUTHORITY,
        proposal: {
          action_id: actionId,
          action_kind: 'weekly_plan_action',
          action_payload: { description: actionText },
          rationale_summary: `Queue action: ${actionText}`,
          proof_obligations_declared: ['permission', 'outcome'],
        },
      });

      // Step 2: parent decision envelope
      await audit.emit({
        producer: 'hearthos.steward',
        event_type: decision === 'approved' ? 'execute_approved' : 'execute_rejected',
        authority: EXECUTE_WITH_REVIEW_AUTHORITY,
        proposal: {
          action_id: actionId,
          action_kind: 'weekly_plan_action',
          action_payload: { description: actionText },
          rationale_summary: `Queue action: ${actionText}`,
          proof_obligations_declared: ['permission', 'outcome'],
        },
        approval: {
          queue_id: `queue-${actionId}`,
          decision: decision === 'approved' ? 'approved' : 'rejected',
          approver_role: 'parent',
          approver_id_hash: idHash,
          reason: decision === 'approved' ? null : 'Parent declined.',
        },
      });

      // Step 3 (only if approved): execute_completed
      if (decision === 'approved') {
        await audit.emit({
          producer: 'hearthos.steward',
          event_type: 'execute_completed',
          authority: EXECUTE_WITH_REVIEW_AUTHORITY,
          proposal: {
            action_id: actionId,
            action_kind: 'weekly_plan_action',
            action_payload: { description: actionText },
            rationale_summary: `Queue action: ${actionText}`,
            proof_obligations_declared: ['permission', 'outcome'],
          },
        });
      }
    })();
  }

  function resetDecisions() {
    setDecisions(new Map());
  }

  function handlePrint() {
    if (typeof window !== 'undefined') window.print();
  }

  async function handleCopy() {
    if (!output) return;
    const text = formatPlain(inputs, output);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available — silent fallback
    }
  }

  return (
    <div>
      <DemoStepper active="weekly-reset" />
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-2">Weekly Reset</h1>
        <p className="text-slate-600 max-w-2xl">
          A fifteen-minute reset for the week ahead — three priorities, three child tasks, meal
          rhythm, risks to watch, and an explicit list of what needs parent approval.
        </p>
      </header>

      <section className="bg-white border border-stone-300 rounded-lg p-5 mb-6">
        <h2 className="font-semibold text-slate-900 mb-3">Quick setup</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Children</label>
            <select
              value={inputs.children}
              onChange={(e) => update('children', e.target.value as Children)}
              className="w-full border border-stone-300 rounded px-3 py-2 text-sm"
            >
              <option value="one">One child</option>
              <option value="multiple">More than one child</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Youngest age band</label>
            <select
              value={inputs.ageBand}
              onChange={(e) => update('ageBand', e.target.value as AgeBand)}
              className="w-full border border-stone-300 rounded px-3 py-2 text-sm"
            >
              <option value="young">5 – 8</option>
              <option value="middle">9 – 12</option>
              <option value="teen">13 +</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Focus this week</label>
            <select
              value={inputs.focusArea}
              onChange={(e) => update('focusArea', e.target.value as FocusArea)}
              className="w-full border border-stone-300 rounded px-3 py-2 text-sm"
            >
              <option value="mornings">Mornings</option>
              <option value="evenings">Evenings</option>
              <option value="screens">Screens</option>
              <option value="school">School / homework</option>
              <option value="chores">Chores</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Time budget</label>
            <select
              value={inputs.timeBudget}
              onChange={(e) => update('timeBudget', e.target.value as TimeBudget)}
              className="w-full border border-stone-300 rounded px-3 py-2 text-sm"
            >
              <option value="tight">Tight (≈ 5 min/day)</option>
              <option value="normal">Normal (≈ 15 min/day)</option>
              <option value="generous">Generous (30+ min/day)</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleGenerate}
            className="text-sm font-medium bg-sky-700 hover:bg-sky-800 text-white px-5 py-2 rounded transition-colors"
          >
            {output ? 'Regenerate' : 'Generate weekly reset →'}
          </button>
          <p className="text-xs text-slate-500">
            No data is sent or stored — generation is deterministic and runs in your browser.
          </p>
        </div>
      </section>

      {output && (
        <div className="space-y-5">
          <Section
            title="These decisions should not run on autopilot"
            agent="Safety Guardian"
            status="Parent approval required"
            emphasise
          >
            <p className="text-sm text-amber-900/85 mb-3 leading-relaxed">
              HearthOS suggests. Only the parent executes. Tap a decision against each item; nothing
              actually happens — this is a demo of how the gate would route a real action.
            </p>
            <ul className="space-y-3">
              {output.approvalQueue.map((a, i) => {
                const decision = decisions.get(i);
                return (
                  <li key={i} className="bg-white/60 border border-amber-300 rounded-md p-3">
                    <p className="text-amber-950 leading-relaxed mb-3">{a}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {decision ? (
                        <>
                          <span className={`inline-block text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded border ${DECISION_META[decision].pillClass}`}>
                            {DECISION_META[decision].label}
                          </span>
                          <button
                            onClick={() => decide(i, decision)}
                            className="text-xs text-amber-900 hover:text-amber-700 underline"
                          >
                            change my mind
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => decide(i, 'approved')}
                            className="text-xs font-semibold border border-emerald-400 text-emerald-800 hover:bg-emerald-50 px-3 py-1.5 rounded transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => decide(i, 'modified')}
                            className="text-xs font-semibold border border-amber-400 text-amber-800 hover:bg-amber-50 px-3 py-1.5 rounded transition-colors"
                          >
                            Modify
                          </button>
                          <button
                            onClick={() => decide(i, 'declined')}
                            className="text-xs font-semibold border border-rose-400 text-rose-800 hover:bg-rose-50 px-3 py-1.5 rounded transition-colors"
                          >
                            Decline
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {decisions.size > 0 && (
              <div className="mt-4 pt-3 border-t border-amber-300 flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-amber-900/80">
                  {decisions.size} of {output.approvalQueue.length} decided
                </p>
                <button
                  onClick={resetDecisions}
                  className="text-xs text-amber-900 hover:text-amber-700 underline"
                >
                  Reset all decisions
                </button>
              </div>
            )}
          </Section>

          <Section
            title="This week's three priorities"
            agent="Family Coordinator"
            status="Parent review recommended"
          >
            <ol className="list-decimal list-inside space-y-2 text-slate-700 marker:text-slate-400">
              {output.priorities.map((p, i) => <li key={i} className="leading-relaxed">{p}</li>)}
            </ol>
          </Section>

          <Section
            title="Three child-side tasks"
            agent="Child Growth Coach"
            status="Parent review recommended"
          >
            <ol className="list-decimal list-inside space-y-2 text-slate-700 marker:text-slate-400">
              {output.childTasks.map((t, i) => <li key={i} className="leading-relaxed">{t}</li>)}
            </ol>
          </Section>

          <Section
            title="Meal and routine rhythm"
            agent="Meal Planner"
            status="Parent review recommended"
          >
            <p className="text-slate-700 leading-relaxed">{output.mealRoutine}</p>
          </Section>

          <Section
            title="Risks to watch"
            agent="Gentle Reviewer"
            status="Advisory only"
          >
            <ul className="list-disc list-inside space-y-2 text-slate-700 marker:text-slate-400">
              {output.risks.map((r, i) => <li key={i} className="leading-relaxed">{r}</li>)}
            </ul>
          </Section>

          <div className="flex flex-wrap gap-3 pt-2 print:hidden">
            <button
              onClick={handleCopy}
              className="text-sm font-medium border border-stone-400 text-slate-700 hover:bg-stone-100 px-4 py-2 rounded transition-colors"
            >
              {copied ? '✓ Copied to clipboard' : 'Copy as plain text'}
            </button>
            <button
              onClick={handlePrint}
              className="text-sm font-medium border border-stone-400 text-slate-700 hover:bg-stone-100 px-4 py-2 rounded transition-colors"
            >
              Print this
            </button>
            <Link
              href="/boundary-script"
              className="text-sm font-medium border border-stone-400 text-slate-700 hover:bg-stone-100 px-4 py-2 rounded transition-colors"
            >
              Try a Boundary Script →
            </Link>
            <Link
              href="/"
              className="text-sm font-medium text-slate-500 hover:text-slate-700 px-4 py-2"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      )}

      {!output && (
        <section className="bg-stone-100 border border-stone-300 rounded-lg p-5 text-sm text-slate-600">
          Pick the inputs above and click <strong>Generate</strong>. The result will appear here.
          Nothing about your family is collected; the same inputs always produce the same plan.
        </section>
      )}

      <AuditChainPanel
        chain={audit.chain}
        onDownload={audit.downloadJsonl}
        onReset={audit.reset}
      />
    </div>
  );
}

function formatPlain(inputs: Inputs, output: Output): string {
  return [
    'HearthOS — Weekly Reset',
    '',
    `Setup: ${inputs.children === 'one' ? '1 child' : '2+ children'}, age ${inputs.ageBand}, focus ${inputs.focusArea}, ${inputs.timeBudget} time budget`,
    '',
    'Priorities (family):',
    ...output.priorities.map((p, i) => `  ${i + 1}. ${p}`),
    '',
    'Child tasks:',
    ...output.childTasks.map((t, i) => `  ${i + 1}. ${t}`),
    '',
    'Meal and routine:',
    `  ${output.mealRoutine}`,
    '',
    'Risks to watch:',
    ...output.risks.map((r) => `  - ${r}`),
    '',
    'Parent approval queue:',
    ...output.approvalQueue.map((a) => `  - ${a}`),
    '',
    'HearthOS can suggest. Only the parent can execute.',
  ].join('\n');
}
