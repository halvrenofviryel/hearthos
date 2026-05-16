'use client';

// ──────────────────────────────────────────────────────────────────────
// StarterKitDownload
//
// The HearthOS Starter Kit v0.1 ships as a static PDF in apps/demo/public.
// This component renders a download card; the file is served directly by
// Next.js so no API or backend is involved.
//
// Built from scripts/starter-kit/source.html via scripts/starter-kit/build.py.
// ──────────────────────────────────────────────────────────────────────

export function StarterKitDownload() {
  const fileHref = '/hearthos-starter-kit-v0.1.pdf';
  const sizeKB = '597 KB';

  return (
    <section className="bg-white border-2 border-sky-300 rounded-lg p-5">
      <div className="flex items-start gap-4">
        <div className="text-3xl shrink-0" aria-hidden>📄</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 mb-1">
            Download the HearthOS Starter Kit
          </h3>
          <p className="text-sm text-slate-600 mb-3 leading-relaxed">
            A short, printable companion to the demo. Includes a Diagnostic-results capture page,
            a Weekly Reset template, six boundary-script categories (soft / firm / repair
            examples), and the parent-approval checklist. No AI required.
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <a
              href={fileHref}
              download
              className="inline-flex items-center gap-2 text-sm font-semibold bg-sky-700 hover:bg-sky-800 text-white px-5 py-2 rounded-lg shadow-sm transition-colors"
            >
              Download PDF
              <span className="text-xs opacity-80">({sizeKB})</span>
            </a>
            <a
              href={fileHref}
              target="_blank"
              rel="noopener"
              className="text-sm font-medium text-sky-700 hover:text-sky-900"
            >
              Open in a new tab
            </a>
          </div>
          <p className="text-xs text-slate-500">
            v0.1 · AGPL-3.0 · Print, copy, fold, share.
          </p>
        </div>
      </div>
    </section>
  );
}
