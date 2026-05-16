'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DemoStepper } from '@/components/DemoStepper';
import { evaluateInputSafety, type SafetyGateResult } from '@hearthos/core';

// ──────────────────────────────────────────────────────────────────────
// Categories — naive keyword classifier; default "generic" for misses.
// ──────────────────────────────────────────────────────────────────────

type Category =
  | 'screens'
  | 'mealtime'
  | 'bedtime'
  | 'chores'
  | 'schoolwork'
  | 'sibling'
  | 'refusal'
  | 'generic';

interface CategoryDef {
  key: Category;
  label: string;
  keywords: string[];
  rationale: string;
}

const CATEGORIES: CategoryDef[] = [
  {
    key: 'screens',
    label: 'Screen time',
    keywords: ['screen', 'phone', 'tablet', 'tv', 'youtube', 'game', 'video', 'ipad', 'computer'],
    rationale: 'A screen-time conflict — the boundary is the time, not the device.',
  },
  {
    key: 'mealtime',
    label: 'Mealtime',
    keywords: ['eat', 'food', 'meal', 'dinner', 'breakfast', 'snack', 'lunch', 'hungry', 'plate'],
    rationale: 'A mealtime conflict — the goal is participation, not perfect eating.',
  },
  {
    key: 'bedtime',
    label: 'Bedtime / sleep',
    keywords: ['bed', 'sleep', 'wake', 'nap', 'tired', 'pajamas', 'pyjamas', 'night'],
    rationale: 'A bedtime conflict — the boundary is the time, the negotiation is the order.',
  },
  {
    key: 'chores',
    label: 'Chores / tidying',
    keywords: ['chore', 'clean', 'tidy', 'mess', 'help', 'task', 'dishes', 'laundry', 'room'],
    rationale: 'A chore conflict — the boundary is responsibility, not punishment.',
  },
  {
    key: 'schoolwork',
    label: 'Schoolwork',
    keywords: ['school', 'homework', 'study', 'class', 'teacher', 'exam', 'test', 'grade'],
    rationale: 'A schoolwork conflict — the boundary protects effort, not the outcome.',
  },
  {
    key: 'sibling',
    label: 'Sibling friction',
    keywords: ['sibling', 'brother', 'sister', 'fight', 'fair', 'unfair', 'mine', 'turn'],
    rationale: 'A sibling conflict — the boundary serves the relationship, not the case.',
  },
  {
    key: 'refusal',
    label: 'Refusal / pushback',
    keywords: ['no', 'won\'t', 'refuse', 'tantrum', 'angry', 'frustrated', 'argue', 'shout', 'cry'],
    rationale: 'A refusal moment — the boundary holds, the door to repair stays open.',
  },
  {
    key: 'generic',
    label: 'Family decision',
    keywords: [],
    rationale: 'A general family-decision moment — the boundary is the practice, not the script.',
  },
];

function classify(input: string): CategoryDef {
  const lower = input.toLowerCase();
  for (const c of CATEGORIES) {
    if (c.keywords.some(k => lower.includes(k))) return c;
  }
  return CATEGORIES[CATEGORIES.length - 1]; // generic
}

// ──────────────────────────────────────────────────────────────────────
// Hash for variant selection
// ──────────────────────────────────────────────────────────────────────

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h = h & h;
  }
  return Math.abs(h);
}

// ──────────────────────────────────────────────────────────────────────
// Templates — 8 categories × 3 tones × 2 variants per cell
// Each variant is a short, parent-spoken script.
// ──────────────────────────────────────────────────────────────────────

type Tone = 'soft' | 'firm' | 'repair';

const TEMPLATES: Record<Category, Record<Tone, string[]>> = {
  screens: {
    soft: [
      'Hey — I can see you\'re in the middle of something good. Five more minutes and then we\'ll wrap up together. Can you find a stopping point?',
      'I know it\'s hard to step away when you\'re enjoying it. Let\'s set a timer for five minutes so you don\'t have to guess when it ends.',
    ],
    firm: [
      'Screens off at the agreed time, every day. I\'m not negotiating it tonight; I\'ll be happy to talk about the rule itself tomorrow when neither of us is tired.',
      'The rule is the rule today. If you want to suggest changing it, write down what you\'d propose and we\'ll review it on Sunday — but not right now.',
    ],
    repair: [
      'Earlier was hard for both of us. The boundary still stands, but I want you to know I\'m not angry at you — I\'m holding the rule, not blaming you for wanting more time.',
      'I came in too sharp before. The screen rule didn\'t change, but my tone could have been better. Can we restart this part of the evening?',
    ],
  },
  mealtime: {
    soft: [
      'You don\'t have to finish it. I just need you to try the new thing once, sitting at the table with us.',
      'I see you\'re not hungry tonight — that\'s OK. Stay at the table with us for ten minutes and then you can be done.',
    ],
    firm: [
      'Dinner is what\'s on the table tonight. You don\'t have to eat it, but I\'m not making something separate at this hour. We\'ll have a snack option at the agreed time.',
      'You can choose what to eat from what\'s served, and you can choose how much. You can\'t choose to make this into a negotiation tonight.',
    ],
    repair: [
      'Tonight got tense — that wasn\'t about you, it was about the timing. The rule about meals stays, but I\'m sorry it landed sharp.',
      'I don\'t want dinner to feel like a battle. The boundary about what\'s on offer doesn\'t change, but I want to hear what would make the meal easier for you.',
    ],
  },
  bedtime: {
    soft: [
      'Bedtime\'s coming up in fifteen minutes. What\'s the one thing you want to finish before we start the wind-down?',
      'I know it feels too soon. Pick the order — teeth first or pyjamas first — but the lights go out at the agreed time.',
    ],
    firm: [
      'Lights out at the agreed time. The order is negotiable; the time is not. I\'ll see you in the morning.',
      'This isn\'t a discussion for tonight. The bedtime is what we agreed on this morning when you were thinking clearly.',
    ],
    repair: [
      'Last night was rough. The bedtime still stands, but I want you to know I noticed how hard you tried to settle.',
      'I raised my voice last night. The rule didn\'t change but my tone wasn\'t fair. Can we try again tonight without the rush?',
    ],
  },
  chores: {
    soft: [
      'This isn\'t about punishment — it\'s about each of us taking one piece of the household. Pick the one that bothers you least and I\'ll handle the rest.',
      'I\'m not asking you to do everything. I\'m asking you to own this one specific thing for the week. If it\'s not working by Wednesday we\'ll talk.',
    ],
    firm: [
      'This is yours this week. I won\'t remind you a second time. If it isn\'t done by tonight, the screen time that was going to follow doesn\'t happen.',
      'I\'m not nagging — I\'ve told you once. The rest is on you. The consequence is the same whether I notice or not.',
    ],
    repair: [
      'I came in too hard about the chores yesterday. The responsibility still stays with you, but I could have asked instead of accused.',
      'I noticed you got it done after our hard conversation. Thank you — I see the effort. The rule will keep standing, and I\'ll keep noticing.',
    ],
  },
  schoolwork: {
    soft: [
      'You don\'t have to enjoy it. You do have to spend the time. Twenty minutes of real effort, even if it\'s imperfect.',
      'Tell me where you\'re stuck. I\'m not going to do it for you, but I can sit with you while you work through one piece.',
    ],
    firm: [
      'The homework window is the homework window. We\'re not adding screen time before it\'s done, and we\'re not extending it past bedtime.',
      'You\'re responsible for the work — I\'m responsible for the time and the space. Both of us hold our part.',
    ],
    repair: [
      'I pushed too hard about the grade. The effort is the part I care about; I should have said that more clearly.',
      'I know yesterday felt like I cared more about the work than about you. The homework rule stays — but you matter more than any single assignment.',
    ],
  },
  sibling: {
    soft: [
      'I\'m not going to decide who started it. I\'m going to decide what happens next: a five-minute pause, then a quick check-in with both of you.',
      'Both of you are upset. Take a minute apart and we\'ll come back to this when nobody\'s shouting.',
    ],
    firm: [
      'In this house we don\'t fix things by yelling. Whoever is shouting steps out of the room until they can speak normally.',
      'I\'m not refereeing this one. You both know the house rule about how we treat each other. It applies now.',
    ],
    repair: [
      'Earlier I picked a side too fast. The rule about how you treat each other stays, but I owe both of you a more careful listen next time.',
      'I see you trying to repair it on your own. That counts. The rule about voices in the house stays, but I want to notice the trying.',
    ],
  },
  refusal: {
    soft: [
      'I hear that you don\'t want to. I\'m not changing what needs to happen, but I want to know what would make it easier.',
      'You can be upset about this — that\'s allowed. We\'re still going to do the thing we said we\'d do.',
    ],
    firm: [
      'I\'m not going to argue this one. The answer is the answer; we can talk about why later, but not in the middle of a refusal.',
      'I see the resistance. The decision doesn\'t change tonight. If you want to propose a different rule for next week, write it down and we\'ll review it on Sunday.',
    ],
    repair: [
      'Earlier you said no and I heard angry. I heard the no — I just couldn\'t move on the rule. I\'m not angry at you for pushing back.',
      'I didn\'t handle the pushback well. The decision held, but my tone was sharp. Can we restart this moment?',
    ],
  },
  generic: {
    soft: [
      'I want to find a way through this that works for both of us. Tell me what feels unfair about the way I\'m holding the line.',
      'I\'m not changing my mind on the decision, but I want to understand what would make it easier to live with.',
    ],
    firm: [
      'I\'ve made the decision and I\'m not reopening it tonight. We can revisit the rule itself on Sunday — but not the specific call.',
      'The rule is the rule, and the time to argue it isn\'t in the moment it applies. I\'ll listen carefully on the weekend; tonight, I won\'t.',
    ],
    repair: [
      'I held the line in a way that didn\'t leave much room. The decision stands, but I want to acknowledge that it landed harder than it had to.',
      'My job is to keep the rule and keep the relationship. I did one of those well today — let\'s reset the other.',
    ],
  },
};

interface Script {
  tone: Tone;
  text: string;
}

function generateScripts(input: string): { category: CategoryDef; scripts: Script[] } {
  const cat = classify(input);
  const seed = hashString(input.trim().toLowerCase());
  const pickVariant = (tone: Tone): Script => {
    const pool = TEMPLATES[cat.key][tone];
    const idx = pool.length === 0 ? 0 : seed % pool.length;
    return { tone, text: pool[idx] };
  };
  return {
    category: cat,
    scripts: [
      pickVariant('soft'),
      pickVariant('firm'),
      pickVariant('repair'),
    ],
  };
}

// ──────────────────────────────────────────────────────────────────────
// UI helpers
// ──────────────────────────────────────────────────────────────────────

const TONE_META: Record<Tone, { label: string; description: string; color: string }> = {
  soft: {
    label: 'Soft',
    description: 'Empathic. Low friction. Use when the relationship is fragile and the boundary can be held without escalation.',
    color: 'border-emerald-300 bg-emerald-50',
  },
  firm: {
    label: 'Firm',
    description: 'Clear line, no negotiation. Use when the rule has slipped and needs to be re-grounded — not when the child is dysregulated.',
    color: 'border-sky-300 bg-sky-50',
  },
  repair: {
    label: 'Repair',
    description: 'Post-conflict reconnect. Use after the hard moment has passed — the rule still stands, but the relationship is foregrounded.',
    color: 'border-violet-300 bg-violet-50',
  },
};

function ApprovalPill() {
  return (
    <span className="inline-block text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded">
      Suggestion — parent chooses
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────

export default function BoundaryScriptPage() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<
    { category: CategoryDef; scripts: Script[]; safety: SafetyGateResult } | null
  >(null);
  const [copiedTone, setCopiedTone] = useState<Tone | null>(null);

  function handleGenerate() {
    if (!input.trim()) return;
    const safety = evaluateInputSafety(input);
    setResult({ ...generateScripts(input), safety });
    setCopiedTone(null);
  }

  async function handleCopy(text: string, tone: Tone) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTone(tone);
      setTimeout(() => setCopiedTone(null), 2000);
    } catch {
      // silent
    }
  }

  const hasInput = input.trim().length > 0;
  return (
    <div>
      <DemoStepper active="boundary-script" />
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-2">Boundary Script</h1>
        <p className="text-slate-600 max-w-2xl">
          Describe a recurring tough moment in one line. HearthOS returns three versions of the
          same boundary script — soft, firm, and repair — for you to pick from in the moment.
        </p>
      </header>

      <section className="bg-white border border-stone-300 rounded-lg p-5 mb-6">
        <label htmlFor="situation" className="block text-sm font-medium text-slate-700 mb-2">
          What's the recurring moment?
        </label>
        <textarea
          id="situation"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Example: My 9-year-old keeps arguing when screen time ends."
          rows={3}
          className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        />
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <button
            onClick={handleGenerate}
            disabled={!hasInput}
            className={
              hasInput
                ? 'text-base font-semibold bg-sky-700 hover:bg-sky-800 text-white px-6 py-2.5 rounded-lg shadow-sm transition-colors'
                : 'text-base font-medium bg-stone-200 text-stone-500 px-6 py-2.5 rounded-lg cursor-not-allowed'
            }
          >
            {result ? 'Regenerate scripts' : 'Generate scripts →'}
          </button>
          <p className="text-xs text-slate-500">
            Your description stays in this browser session. Nothing is sent to a server.
          </p>
        </div>
      </section>

      {result && (
        <div>
          {result.category.key === 'generic' && (
            <section className="bg-sky-50 border border-sky-300 rounded-lg p-5 mb-5">
              <div className="flex items-start gap-3">
                <div className="text-xl" aria-hidden>💭</div>
                <div className="text-sm flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-sky-700 mb-1">
                    Generic fallback
                  </div>
                  <p className="text-sky-900 font-medium mb-1">
                    We couldn't map this situation to a specific HearthOS pattern yet.
                  </p>
                  <p className="text-sky-900/85 text-sm leading-relaxed">
                    Here is a general boundary script. If it feels off, try describing the moment more
                    concretely — name the time of day, the specific recurring action, or the person
                    involved.
                  </p>
                </div>
              </div>
            </section>
          )}

          {result.safety.triggered && (
            <section className="bg-amber-50 border-2 border-amber-300 rounded-lg p-5 mb-5">
              <div className="flex items-start gap-3">
                <div className="text-xl" aria-hidden>🛡️</div>
                <div className="text-sm flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">
                    Input safety gate triggered
                  </div>
                  <p className="text-amber-900 font-medium mb-1">
                    Sensitive area detected: <span className="capitalize">{result.safety.category?.replace('_', ' ')}</span>
                  </p>
                  <p className="text-amber-900/85 text-sm leading-relaxed">
                    {result.safety.rationale} The scripts below are <strong>starting points only</strong>; pick the version that fits and run it past the other parent before using it on a high-stakes day.
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="bg-stone-100 border border-stone-300 rounded-lg p-4 mb-5 flex items-start gap-3">
            <div className="text-sm">
              <p className="text-slate-700 mb-1">
                <strong>Category:</strong> {result.category.label}
              </p>
              <p className="text-slate-600 text-xs italic">{result.category.rationale}</p>
            </div>
          </section>

          <div className="space-y-4 mb-6">
            {result.scripts.map((s) => {
              const meta = TONE_META[s.tone];
              return (
                <article
                  key={s.tone}
                  className={`border-2 rounded-lg p-5 ${meta.color}`}
                >
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h2 className="font-semibold text-slate-900 text-lg">{meta.label}</h2>
                    <ApprovalPill />
                  </div>
                  <p className="text-slate-800 leading-relaxed serif italic mb-3 text-[15px]">
                    "{s.text}"
                  </p>
                  <p className="text-xs text-slate-600 mb-3">{meta.description}</p>
                  <button
                    onClick={() => handleCopy(s.text, s.tone)}
                    className="text-xs font-medium border border-stone-400 text-slate-700 hover:bg-white px-3 py-1 rounded transition-colors"
                  >
                    {copiedTone === s.tone ? '✓ Copied' : 'Copy this version'}
                  </button>
                </article>
              );
            })}
          </div>

          <section className="bg-stone-100 border border-stone-300 rounded-lg p-5 text-sm text-slate-700 mb-6">
            <p className="mb-2 font-semibold">How to use these</p>
            <p className="text-slate-600 mb-0">
              These are suggestions only. The right tone depends on this moment, not the last one.
              Soft when the relationship is fragile; firm when the rule has slipped; repair after the
              hard moment has already passed.
            </p>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/weekly-reset"
              className="text-sm font-medium border border-stone-400 text-slate-700 hover:bg-stone-100 px-4 py-2 rounded transition-colors"
            >
              Try a Weekly Reset →
            </Link>
            <Link
              href="/diagnostic"
              className="text-sm font-medium border border-stone-400 text-slate-700 hover:bg-stone-100 px-4 py-2 rounded transition-colors"
            >
              ← Back to the Diagnostic
            </Link>
            <Link
              href="/"
              className="text-sm font-medium text-slate-500 hover:text-slate-700 px-4 py-2"
            >
              Home
            </Link>
          </div>
        </div>
      )}

      {!result && (
        <section className="bg-stone-100 border border-stone-300 rounded-lg p-5 text-sm text-slate-600">
          <p className="mb-2 font-semibold text-slate-700">Examples that work well</p>
          <ul className="list-disc list-inside space-y-1 marker:text-slate-400">
            <li>"My twelve-year-old won't put the phone down at bedtime."</li>
            <li>"Mornings keep ending in shouting about leaving for school."</li>
            <li>"Dinner becomes a negotiation every single night."</li>
            <li>"My kids fight about whose turn it is on the tablet."</li>
            <li>"Homework time keeps getting pushed later and later."</li>
          </ul>
        </section>
      )}
    </div>
  );
}
