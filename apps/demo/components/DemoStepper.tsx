import Link from 'next/link';

interface DemoStepperProps {
  active: 'diagnostic' | 'weekly-reset' | 'boundary-script';
}

const STEPS = [
  { id: 'diagnostic', n: 1, label: 'Diagnostic', href: '/diagnostic' },
  { id: 'weekly-reset', n: 2, label: 'Weekly Reset', href: '/weekly-reset' },
  { id: 'boundary-script', n: 3, label: 'Boundary Script', href: '/boundary-script' },
] as const;

export function DemoStepper({ active }: DemoStepperProps) {
  return (
    <nav aria-label="Demo progress" className="mb-8">
      <ol className="flex items-center gap-2 sm:gap-3 text-sm flex-wrap">
        {STEPS.map((s, i) => {
          const isActive = s.id === active;
          const cls = isActive
            ? 'flex items-center gap-2 font-medium text-slate-900'
            : 'flex items-center gap-2 text-slate-500 hover:text-slate-700';
          return (
            <li key={s.id} className="flex items-center gap-2 sm:gap-3">
              <Link href={s.href} className={cls}>
                <span
                  className={
                    isActive
                      ? 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-700 text-white text-xs font-semibold'
                      : 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-stone-200 text-slate-600 text-xs font-semibold'
                  }
                >
                  {s.n}
                </span>
                <span className="whitespace-nowrap">{s.label}</span>
              </Link>
              {i < STEPS.length - 1 && (
                <span aria-hidden className="text-stone-400 select-none">→</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
