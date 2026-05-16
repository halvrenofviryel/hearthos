import Link from 'next/link';

export default function HomePage() {
  return (
    <div>
      {/* ─── Hero ────────────────────────────────────────────────── */}
      <section className="mb-10">
        <h1 className="text-4xl md:text-[2.65rem] leading-[1.1] font-semibold tracking-tight text-slate-900 mb-5 max-w-3xl">
          Turn daily chaos into clear routines, safe boundaries, and parent-approved decisions.
        </h1>
        <p className="text-lg text-slate-700 mb-2 max-w-2xl leading-relaxed">
          <strong className="text-slate-900">Most AI assistants answer.</strong>{' '}
          HearthOS <em>separates suggestion from authority</em> — every output is a proposal; only
          the parent executes.
        </p>
        <p className="text-base text-slate-500 italic mb-7">
          Powered by bounded-authority AI orchestration.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/diagnostic"
            className="inline-flex items-center gap-2 text-base font-semibold bg-sky-700 hover:bg-sky-800 text-white px-6 py-3 rounded-lg shadow-sm transition-colors"
          >
            Start the 3-minute Diagnostic →
          </Link>
          <Link
            href="/weekly-reset"
            className="inline-flex items-center gap-2 text-base font-medium text-slate-700 hover:text-slate-900 border border-stone-400 hover:border-slate-700 px-5 py-3 rounded-lg transition-colors"
          >
            Preview a Weekly Reset
          </Link>
        </div>
      </section>

      {/* ─── Trust strip ─────────────────────────────────────────── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12 text-xs text-slate-600">
        {[
          { t: 'No account', s: 'Nothing to sign up for' },
          { t: 'No child names', s: 'Try with a fictional family' },
          { t: 'Browser-only', s: 'No data leaves this tab' },
          { t: 'Parent approval', s: 'Built into every output' },
        ].map((item) => (
          <div
            key={item.t}
            className="bg-stone-100 border border-stone-300 rounded-lg px-3 py-2.5"
          >
            <div className="font-semibold text-slate-800">{item.t}</div>
            <div className="text-slate-500">{item.s}</div>
          </div>
        ))}
      </section>

      {/* ─── Three modules ───────────────────────────────────────── */}
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
        Three modules
      </h2>
      <section className="grid md:grid-cols-3 gap-4 mb-12">
        <ModuleCard
          icon="🔎"
          title="Diagnostic"
          benefit="Find your household's pressure points in three minutes."
          output="Output: load · friction · clarity · fatigue · risk"
          time="≈ 3 min"
          cta="Start diagnostic →"
          href="/diagnostic"
          primary
        />
        <ModuleCard
          icon="🗓️"
          title="Weekly Reset"
          benefit="Plan the week without making it heavier."
          output="Output: 3 priorities, 3 child tasks, meal rhythm, risks, approval queue"
          time="≈ 5 min"
          cta="Generate a reset →"
          href="/weekly-reset"
        />
        <ModuleCard
          icon="💬"
          title="Boundary Script"
          benefit="Three matched scripts for the conversation you keep having."
          output="Output: soft / firm / repair versions"
          time="≈ 2 min"
          cta="Write a script →"
          href="/boundary-script"
        />
      </section>

      {/* ─── Closing positioning ─────────────────────────────────── */}
      <section className="bg-white border-l-4 border-sky-700 rounded-r-lg p-6 mb-4">
        <p className="text-lg text-slate-800 leading-relaxed mb-2">
          HearthOS is not an AI that runs your family.
        </p>
        <p className="text-slate-700 leading-relaxed">
          It is a bounded-authority system that helps parents see, plan, and approve family decisions.
          The AI proposes; you decide.
        </p>
      </section>
    </div>
  );
}

interface ModuleCardProps {
  icon: string;
  title: string;
  benefit: string;
  output: string;
  time: string;
  cta: string;
  href: string;
  primary?: boolean;
}

function ModuleCard({ icon, title, benefit, output, time, cta, href, primary }: ModuleCardProps) {
  const borderClass = primary
    ? 'border-sky-700 hover:border-sky-800 ring-1 ring-sky-700/20'
    : 'border-stone-300 hover:border-sky-500';
  return (
    <Link
      href={href}
      className={`group flex flex-col bg-white border-2 ${borderClass} rounded-lg p-5 transition-all hover:shadow-md`}
    >
      <div className="text-3xl mb-3" aria-hidden>{icon}</div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-700 mb-3 leading-relaxed">{benefit}</p>
      <p className="text-xs text-slate-500 mb-1">{output}</p>
      <p className="text-xs text-slate-500 mb-4">{time}</p>
      <span
        className={
          primary
            ? 'mt-auto text-sm font-semibold text-sky-700 group-hover:text-sky-900'
            : 'mt-auto text-sm font-medium text-slate-700 group-hover:text-sky-700'
        }
      >
        {cta}
      </span>
    </Link>
  );
}
