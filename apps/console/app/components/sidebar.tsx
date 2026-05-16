'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '▣' },
  { href: '/threads', label: 'Threads', icon: '◈' },
  { href: '/agents', label: 'Agents', icon: '◉' },
  { href: '/activity', label: 'Activity', icon: '↻' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-slate-900 text-slate-200 flex flex-col">
      <div className="p-5 border-b border-slate-700">
        <h1 className="text-lg font-bold text-white tracking-tight">HearthOS</h1>
        <p className="text-xs text-slate-400 mt-0.5">Chat Console</p>
      </div>
      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const active = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-700 text-xs text-slate-500 leading-snug">
        <div>v0.1.0</div>
        <div className="mt-1 text-[10px] text-slate-600">
          Read-only chat control surface.
          No edits land from this console.
        </div>
      </div>
    </aside>
  );
}
