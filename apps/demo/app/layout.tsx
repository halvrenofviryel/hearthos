import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'HearthOS — Bounded-authority family decisions',
  description:
    'HearthOS is not an AI that runs your family. It is a bounded-authority system that helps parents see, plan, and approve family decisions.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-stone-300 bg-stone-50/80 backdrop-blur">
            <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <a
                  href="/hearthos"
                  className="text-sm text-slate-500 hover:text-slate-800"
                  aria-label="Back to HearthOS overview on phionyx.ai"
                >
                  ← HearthOS overview
                </a>
                <Link
                  href="/"
                  className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 hover:text-slate-700"
                >
                  HearthOS
                </Link>
              </div>
              <nav className="flex gap-5 sm:gap-7 text-sm text-slate-600">
                <Link href="/diagnostic" className="hover:text-slate-900">Diagnostic</Link>
                <Link href="/weekly-reset" className="hover:text-slate-900">Weekly Reset</Link>
                <Link href="/boundary-script" className="hover:text-slate-900">Boundary Script</Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-3xl px-6 py-10 flex-1">{children}</main>
          <footer className="border-t border-stone-300 bg-stone-50 mt-12">
            <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-slate-600 flex flex-col gap-3">
              <p className="text-slate-700">
                <strong className="text-slate-900">HearthOS is not an AI that runs your family.</strong>{' '}
                It is a bounded-authority system that helps parents see, plan, and approve family decisions.
              </p>
              <p className="text-xs text-slate-500">
                Reference application inspired by the bounded-authority principles of phionyx-research.
                No account required. No personal child names collected. Your inputs stay in this browser
                session unless you choose to download them.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
