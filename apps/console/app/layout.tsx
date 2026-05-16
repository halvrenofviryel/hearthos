import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from './components/sidebar';

export const metadata: Metadata = {
  title: 'HearthOS - Console',
  description: 'Father admin console for HearthOS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
