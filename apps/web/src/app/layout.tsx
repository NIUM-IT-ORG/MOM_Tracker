import type { Metadata } from 'next';
import type { Capability } from '@mom/shared';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import './globals.css';

export const metadata: Metadata = {
  title: 'UCF Meeting & Action Item Tracker',
  description:
    'Every commitment made in a meeting, written down with named officers and a date, and tracked until it is confirmed done.',
};

/**
 * Phase 0 renders the shell with a placeholder identity so the layout can be
 * compared against the prototype. Phase 1 (P1-07) replaces this with the real
 * session — at which point `caps` comes from the server on every request, not
 * from a token claim, so an access change takes effect without re-login.
 */
const PLACEHOLDER_CAPS: Capability[] = [];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bitter:wght@500;600;700&family=Public+Sans:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>
        <div className="app-shell">
          <Sidebar caps={PLACEHOLDER_CAPS} />
          <main className="flex min-h-0 min-w-0 flex-col">
            <TopBar crumb={<b className="text-ink">Dashboard</b>} />
            <div className="stage">
              <div className="content">{children}</div>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
