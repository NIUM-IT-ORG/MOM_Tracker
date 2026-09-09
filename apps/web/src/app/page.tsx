async function health(): Promise<{ ok: boolean; database: string } | null> {
  const base = process.env.API_URL ?? 'http://localhost:4000';
  try {
    const res = await fetch(`${base}/api/v1/health/ready`, { cache: 'no-store' });
    if (!res.ok) return null;
    const body = (await res.json()) as { data: { ok: boolean; database: string } };
    return body.data;
  } catch {
    return null;
  }
}

export default async function Page() {
  const status = await health();

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div>
          <div className="text-[10.5px] font-extrabold uppercase tracking-[2px] text-accent">
            Phase 0 · foundation
          </div>
          <h2 className="mt-0.5 font-serif text-[23px] font-semibold text-navy">
            The shell is up
          </h2>
          <p className="mt-1.5 max-w-[820px] text-[13.5px] text-muted">
            Workspace, database, migration, seed and both applications are in place. The
            screens themselves arrive from Phase 1 onwards — build them against{' '}
            <code>prototype/UCF-MoM-Tracker-Interactive.html</code>, which is the visual and
            behavioural source of truth.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <div className="flex items-center gap-2.5 border-b border-line px-[17px] py-[13px]">
            <h3 className="m-0 text-[14.5px] font-bold text-navy">Services</h3>
          </div>
          <div className="px-[17px] py-4">
            <Row label="Web (Next.js)" value="running" good />
            <Row
              label="API (NestJS)"
              value={status ? 'reachable' : 'not reachable'}
              good={!!status}
            />
            <Row
              label="Database (PostgreSQL)"
              value={status?.database ?? 'unknown'}
              good={status?.database === 'up'}
            />
            {!status && (
              <p className="mt-3 rounded-lg bg-ice px-3 py-2.5 text-[12px] text-muted">
                Start the API with <code>pnpm dev</code> from the repository root, or{' '}
                <code>pnpm --filter @mom/api dev</code> on its own.
              </p>
            )}
          </div>
        </section>

        <section className="card">
          <div className="flex items-center gap-2.5 border-b border-line px-[17px] py-[13px]">
            <h3 className="m-0 text-[14.5px] font-bold text-navy">Next</h3>
          </div>
          <div className="px-[17px] py-4 text-[13px] text-muted">
            <p className="m-0">
              Phase 1 is identity and access — tickets P1-01 to P1-08 in{' '}
              <code>docs/08-BUILD-PLAN.md</code>. It ends with a demo: sign in as four
              designations and watch the navigation and the visible projects change.
            </p>
            <p className="mb-0 mt-3">
              The navigation on the left already renders locked items as disabled rather than
              hiding them. That is deliberate, and it is rule 1 of the UI spec.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

function Row({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2.5 last:border-0">
      <span className="text-[13px]">{label}</span>
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
        style={{
          background: good ? '#E6F4EC' : '#FBEBE8',
          color: good ? 'var(--ok)' : 'var(--danger)',
        }}
      >
        <i
          className="h-[7px] w-[7px] rounded-full"
          style={{ background: 'currentColor' }}
          aria-hidden="true"
        />
        {value}
      </span>
    </div>
  );
}
