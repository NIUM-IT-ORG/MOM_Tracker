interface Props {
  crumb: React.ReactNode;
  user?: { name: string; initials: string; designation: string; colour: string };
}

export function TopBar({ crumb, user }: Props) {
  return (
    <header className="flex min-h-[60px] flex-none flex-wrap items-center gap-3 border-b border-line bg-card px-[22px] py-[9px]">
      <div className="text-[12.5px] text-muted">{crumb}</div>

      <div className="ml-auto flex flex-wrap items-center gap-[9px]">
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-navy"
          aria-label="Notifications"
        >
          <BellIcon />
        </button>

        {user ? (
          <div className="flex items-center gap-[9px] rounded-[22px] border border-line bg-white py-[5px] pl-[5px] pr-3">
            <span
              className="grid h-[29px] w-[29px] place-items-center rounded-full text-[11px] font-bold text-white"
              style={{ background: user.colour }}
              aria-hidden="true"
            >
              {user.initials}
            </span>
            <span>
              <b className="block text-xs leading-tight">{user.name}</b>
              <small className="text-[9.5px] font-bold text-accent">{user.designation}</small>
            </span>
          </div>
        ) : (
          <span className="text-[12px] text-muted">Not signed in</span>
        )}
      </div>
    </header>
  );
}

function BellIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.7 21a2 2 0 0 1-3.4 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
