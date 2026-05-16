'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DemoStepper } from '@/components/DemoStepper';
import { StarterKitDownload } from '@/components/StarterKitDownload';
import {
  concernBand,
  dominantConcern,
  type HouseholdState,
  type HouseholdDimension,
  type DimensionKind,
  type ConcernBand,
} from '@hearthos/core';

// HouseholdState type + banding helpers live in @hearthos/core
// (packages/core/src/state/household-state.ts). The demo owns the
// question-set + UI labels only.
type Dimension = HouseholdDimension;

// ──────────────────────────────────────────────────────────────────────
// Questions
// 12 items mapped across the 5 dimensions. Each question's `score`
// returns a 0..1 contribution to its dimension where higher = more
// of that dimension's named quantity (e.g. higher load value = heavier
// household; higher clarity value = clearer household).
// ──────────────────────────────────────────────────────────────────────

type AnswerScale = 'likert5' | 'yns';

interface Question {
  id: number;
  text: string;
  dimension: Dimension;
  scale: AnswerScale;
  options: string[];          // labels shown to user (left → right)
  scoreFromIndex: (i: number) => number; // i: 0..options.length-1 → 0..1
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    text: 'How hard is your morning routine on a typical school day?',
    dimension: 'load',
    scale: 'likert5',
    options: ['Very easy', 'Easy', 'OK', 'Hard', 'Very hard'],
    scoreFromIndex: (i) => i / 4, // higher index = harder = higher load
  },
  {
    id: 2,
    text: 'Does screen time create conflict at home?',
    dimension: 'friction',
    scale: 'likert5',
    options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Constantly'],
    scoreFromIndex: (i) => i / 4,
  },
  {
    id: 3,
    text: 'Do you plan meals for the week?',
    dimension: 'clarity',
    scale: 'yns',
    options: ['Yes', 'Sometimes', 'No'],
    // Yes = clear plan exists → high clarity; No = no plan → low clarity
    scoreFromIndex: (i) => 1 - i / 2, // 0→1.0 clarity, 1→0.5, 2→0.0
  },
  {
    id: 4,
    text: 'How clear are your children\'s regular tasks and chores?',
    dimension: 'clarity',
    scale: 'likert5',
    options: ['Not clear', 'Slightly', 'Somewhat', 'Mostly', 'Very clear'],
    scoreFromIndex: (i) => i / 4, // higher index = clearer
  },
  {
    id: 5,
    text: 'How often do you feel decision fatigue as a parent?',
    dimension: 'fatigue',
    scale: 'likert5',
    options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Constantly'],
    scoreFromIndex: (i) => i / 4,
  },
  {
    id: 6,
    text: 'Do you hold a regular family meeting or check-in?',
    dimension: 'clarity',
    scale: 'yns',
    options: ['Yes', 'Sometimes', 'No'],
    scoreFromIndex: (i) => 1 - i / 2,
  },
  {
    id: 7,
    text: 'How are spending and subscription decisions made?',
    dimension: 'risk',
    scale: 'likert5',
    options: ['Rule-based', 'Mostly rule-based', 'Mixed', 'Mostly ad-hoc', 'Ad-hoc'],
    // Rule-based = low risk; ad-hoc = high risk
    scoreFromIndex: (i) => i / 4,
  },
  {
    id: 8,
    text: 'How consistent is your evening routine?',
    dimension: 'load',
    scale: 'likert5',
    options: ['Very consistent', 'Mostly', 'Mixed', 'Often inconsistent', 'Always different'],
    // Inconsistent evening = higher load
    scoreFromIndex: (i) => i / 4,
  },
  {
    id: 9,
    text: 'How clearly are vacations or big family events planned?',
    dimension: 'clarity',
    scale: 'likert5',
    options: ['Not at all', 'Slightly', 'Somewhat', 'Mostly clear', 'Very clear'],
    scoreFromIndex: (i) => i / 4, // higher = clearer
  },
  {
    id: 10,
    text: 'Do you have explicit rules for sharing about your children publicly (photos, social media, school posts)?',
    dimension: 'risk',
    scale: 'yns',
    options: ['Yes', 'Sometimes', 'No'],
    // Yes = rules exist = low risk; No = no rules = high risk
    scoreFromIndex: (i) => i / 2,
  },
  {
    id: 11,
    text: 'How consistent are screen-time rules across days and parents?',
    dimension: 'friction',
    scale: 'likert5',
    options: ['Very consistent', 'Mostly', 'Mixed', 'Often inconsistent', 'Always different'],
    // Inconsistent = high friction
    scoreFromIndex: (i) => i / 4,
  },
  {
    id: 12,
    text: 'How clearly defined are roles in your family (who decides what)?',
    dimension: 'clarity',
    scale: 'likert5',
    options: ['Not at all', 'Slightly', 'Somewhat', 'Mostly', 'Very clear'],
    scoreFromIndex: (i) => i / 4,
  },
];

// ──────────────────────────────────────────────────────────────────────
// Computation
// ──────────────────────────────────────────────────────────────────────

function computeHouseholdState(answers: Map<number, number>): HouseholdState {
  const buckets: Record<Dimension, number[]> = {
    load: [], friction: [], clarity: [], fatigue: [], risk: [],
  };
  for (const q of QUESTIONS) {
    const idx = answers.get(q.id);
    if (idx === undefined) continue;
    buckets[q.dimension].push(q.scoreFromIndex(idx));
  }
  const avg = (arr: number[]) => arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
  return {
    load: avg(buckets.load),
    friction: avg(buckets.friction),
    clarity: avg(buckets.clarity),
    fatigue: avg(buckets.fatigue),
    risk: avg(buckets.risk),
  };
}

interface Recommendation {
  module: 'weekly-reset' | 'boundary-script' | 'activity-review';
  label: string;
  reason: string;
  href: string;
}

interface RecommendationFull extends Recommendation {
  headline: string;
  why: string;
}

function recommendModule(state: HouseholdState): RecommendationFull {
  // Convert each dimension into a "concern score": higher = more concern
  const concerns: Array<{ kind: string; value: number }> = [
    { kind: 'load', value: state.load },
    { kind: 'friction', value: state.friction },
    { kind: 'clarity-deficit', value: 1 - state.clarity },
    { kind: 'fatigue', value: state.fatigue },
    { kind: 'risk', value: state.risk },
  ];
  const top = concerns.reduce((a, b) => (b.value > a.value ? b : a));

  if (top.kind === 'friction') {
    return {
      module: 'boundary-script',
      label: 'Boundary Script',
      headline: 'Write one boundary script this week.',
      why: 'Friction is your strongest signal. The fix is not new routines — it is a clear script you can pull off the shelf the next time the same conflict starts.',
      reason: 'Friction is your strongest signal. The fix is not new routines — it is a clear script you can pull off the shelf the next time the same conflict starts.',
      href: '/boundary-script',
    };
  }
  if (top.kind === 'risk') {
    return {
      module: 'activity-review',
      label: 'Activity Review',
      headline: 'Make this week\'s ad-hoc decisions explicit.',
      why: 'Risk is your strongest signal. Decisions made in the moment leak; write down what should never be on autopilot — subscriptions, sharing, schedule changes — and make those a parent-only call.',
      reason: 'Risk is your strongest signal.',
      href: '/weekly-reset',
    };
  }
  // load / fatigue / clarity-deficit → Weekly Reset
  return {
    module: 'weekly-reset',
    label: 'Weekly Reset',
    headline: 'Run a fifteen-minute Weekly Reset this week.',
    why: 'Load and fatigue rise when the household carries too many open decisions. Start by reducing open decisions, not by adding new routines.',
    reason: 'Start by reducing open decisions, not by adding new routines.',
    href: '/weekly-reset',
  };
}

// ──────────────────────────────────────────────────────────────────────
// Result display helpers
// ──────────────────────────────────────────────────────────────────────

// UI helpers: map the core ConcernBand to demo labels + Tailwind classes.
// (The core decides the band; the demo decides how to talk about it.)

function bandLabel(band: ConcernBand, kind: DimensionKind): string {
  if (kind === 'concern') {
    return band === 'attention' ? 'Needs attention' : band === 'watch' ? 'Watch zone' : 'Stable';
  }
  // goodness — for clarity, "stable" means high goodness (= "Strong")
  return band === 'stable' ? 'Strong' : band === 'watch' ? 'Watch zone' : 'Needs attention';
}

function bandColor(band: ConcernBand): string {
  // The same colour logic regardless of kind, because the band itself
  // already encodes "more concern" vs "less concern" (clarity is inverted
  // by core.concernBand before reaching us).
  if (band === 'attention') return 'bg-rose-100 text-rose-800 border-rose-300';
  if (band === 'watch') return 'bg-amber-100 text-amber-800 border-amber-300';
  return 'bg-emerald-100 text-emerald-800 border-emerald-300';
}

function Bar({ value, kind }: { value: number; kind: DimensionKind }) {
  const pct = Math.round(value * 100);
  const band = concernBand(value, kind);
  const barColor = band === 'attention' ? 'bg-rose-500'
                 : band === 'watch' ? 'bg-amber-500'
                 : 'bg-emerald-500';
  return (
    <div className="w-full bg-stone-200 rounded-full h-2.5 overflow-hidden">
      <div className={`h-2.5 ${barColor} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Page component
// ──────────────────────────────────────────────────────────────────────

export default function DiagnosticPage() {
  const [step, setStep] = useState<'questions' | 'result'>('questions');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());

  const current = QUESTIONS[currentIdx];
  const progress = Math.round((currentIdx / QUESTIONS.length) * 100);
  const answered = answers.get(current?.id ?? -1);

  function selectOption(idx: number) {
    const next = new Map(answers);
    next.set(current.id, idx);
    setAnswers(next);
  }

  function goNext() {
    if (answered === undefined) return;
    if (currentIdx + 1 >= QUESTIONS.length) {
      setStep('result');
    } else {
      setCurrentIdx(currentIdx + 1);
    }
  }

  function goBack() {
    if (currentIdx === 0) return;
    setCurrentIdx(currentIdx - 1);
  }

  function restart() {
    setAnswers(new Map());
    setCurrentIdx(0);
    setStep('questions');
  }

  if (step === 'result') {
    const state = computeHouseholdState(answers);
    const rec = recommendModule(state);
    const dims: Array<{
      key: Dimension; label: string; value: number; kind: DimensionKind; description: string;
    }> = [
      { key: 'load', label: 'Household Load', value: state.load, kind: 'concern', description: 'How heavy daily operations feel.' },
      { key: 'friction', label: 'Friction', value: state.friction, kind: 'concern', description: 'Recurring conflict or resistance.' },
      { key: 'clarity', label: 'Clarity', value: state.clarity, kind: 'goodness', description: 'How clear plans, rules, and roles are.' },
      { key: 'fatigue', label: 'Parent Decision Fatigue', value: state.fatigue, kind: 'concern', description: 'Cumulative decision load on the parent.' },
      { key: 'risk', label: 'Risk', value: state.risk, kind: 'concern', description: 'Decisions made ad-hoc that could go wrong.' },
    ];

    return (
      <div>
        <DemoStepper active="diagnostic" />
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-2">Your household signals</h1>
          <p className="text-slate-600 max-w-2xl">
            Five dimensions of how your household is running right now. None of this is collected or stored —
            it stays in this browser session. The Starter Kit PDF below is a free take-home companion.
          </p>
        </header>

        <section className="bg-white border border-stone-300 rounded-lg p-6 mb-6">
          <div className="space-y-5">
            {dims.map(d => {
              const band = concernBand(d.value, d.kind);
              return (
                <div key={d.key}>
                  <div className="flex items-baseline justify-between mb-1">
                    <div>
                      <h3 className="font-semibold text-slate-900 inline">{d.label}</h3>
                      <span className={`ml-2 inline-block text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${bandColor(band)}`}>
                        {bandLabel(band, d.kind)}
                      </span>
                    </div>
                    <span className="text-sm text-slate-500 tabular-nums">{Math.round(d.value * 100)}/100</span>
                  </div>
                  <Bar value={d.value} kind={d.kind} />
                  <p className="text-xs text-slate-500 mt-1">{d.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-sky-50 border-2 border-sky-300 rounded-lg p-6 mb-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-sky-700 mb-2">
            Recommended first move
          </div>
          <h2 className="text-xl font-semibold text-sky-900 mb-2">{rec.headline}</h2>
          <p className="text-sm text-sky-900/85 leading-relaxed mb-4">
            <strong className="text-sky-900">Why:</strong> {rec.why}
          </p>
          <Link
            href={rec.href}
            className="inline-flex items-center gap-2 text-sm font-semibold bg-sky-700 hover:bg-sky-800 text-white px-5 py-2.5 rounded-lg transition-colors"
          >
            Open {rec.label} →
          </Link>
        </section>

        <section className="bg-stone-100 border border-stone-300 rounded-lg p-5 text-sm text-slate-700 mb-6">
          <p className="mb-2 font-semibold">Remember</p>
          <p className="text-slate-600 mb-0">
            HearthOS can <em>suggest</em>. Only the parent can <em>execute</em>. Every result you see here is a
            starting point for a conversation, not a directive.
          </p>
        </section>

        <div className="mb-6">
          <StarterKitDownload />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={restart}
            className="text-sm font-medium border border-stone-400 text-slate-700 hover:bg-stone-100 px-4 py-2 rounded transition-colors"
          >
            ↺ Try again with different answers
          </button>
          <Link
            href="/"
            className="text-sm font-medium text-slate-500 hover:text-slate-700 px-4 py-2"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  // ─── Question step ──────────────────────────────────────────────────
  return (
    <div>
      <DemoStepper active="diagnostic" />
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-2">HearthOS Diagnostic</h1>
        <p className="text-slate-600 max-w-2xl">
          Twelve quick questions. About three minutes. Nothing is stored — your answers stay in this
          browser session.
        </p>
      </header>

      <section className="mb-4">
        <div className="flex items-center justify-between mb-2 text-sm text-slate-500">
          <span>Question {currentIdx + 1} of {QUESTIONS.length}</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
          <div className="h-1.5 bg-sky-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="bg-white border border-stone-300 rounded-lg p-6 mb-4">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">{current.text}</h2>
        <div className="space-y-2">
          {current.options.map((opt, i) => {
            const selected = answered === i;
            return (
              <button
                key={i}
                onClick={() => selectOption(i)}
                className={`w-full text-left px-4 py-3 rounded border transition-colors ${
                  selected
                    ? 'border-sky-600 bg-sky-50 text-sky-900 font-medium'
                    : 'border-stone-300 bg-white hover:border-sky-400 text-slate-700'
                }`}
              >
                <span className="inline-block w-4 text-slate-400 mr-2">{selected ? '●' : '○'}</span>
                {opt}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          className="text-sm font-medium px-4 py-2 rounded border border-stone-300 text-slate-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={goNext}
          disabled={answered === undefined}
          className="text-sm font-medium px-5 py-2 rounded bg-sky-700 hover:bg-sky-800 text-white disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed transition-colors"
        >
          {currentIdx + 1 >= QUESTIONS.length ? 'See your signals →' : 'Next →'}
        </button>
      </div>
    </div>
  );
}
