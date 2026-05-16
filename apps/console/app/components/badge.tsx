const variants: Record<string, string> = {
  // Staff roles
  steward: 'bg-indigo-100 text-indigo-700',
  'nanny-coach': 'bg-pink-100 text-pink-700',
  butler: 'bg-blue-100 text-blue-700',
  driver: 'bg-cyan-100 text-cyan-700',
  chef: 'bg-orange-100 text-orange-700',
  gardener: 'bg-green-100 text-green-700',
  critic: 'bg-red-100 text-red-700',
  guardian: 'bg-violet-100 text-violet-700',
  scribe: 'bg-teal-100 text-teal-700',
  treasurer: 'bg-yellow-100 text-yellow-700',
  // Stage badges
  'front-stage': 'bg-emerald-100 text-emerald-700',
  'back-stage': 'bg-slate-200 text-slate-600',
  // Family roles
  parent: 'bg-amber-100 text-amber-700',
  child: 'bg-sky-100 text-sky-700',
  // Legacy
  tutor: 'bg-blue-100 text-blue-700',
  mentor: 'bg-green-100 text-green-700',
  counselor: 'bg-purple-100 text-purple-700',
  default: 'bg-slate-100 text-slate-700',
};

interface BadgeProps {
  label: string;
  variant?: string;
}

export function Badge({ label, variant }: BadgeProps) {
  const cls = variants[variant ?? label.toLowerCase()] ?? variants.default;
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${cls}`}>
      {label}
    </span>
  );
}
