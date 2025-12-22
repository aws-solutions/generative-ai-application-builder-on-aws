import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Auth } from 'aws-amplify';
import { Button } from '@/portal/ui/Button';
import { cn } from '@/portal/lib/cn';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '@/portal/theme/ThemeProvider';
import { Input } from '@/portal/ui/Input';

const navItems = [
  { to: '/app/agents', label: 'Agents' },
  { to: '/app/usage', label: 'Usage' }
];

function Icon({
  name,
  className
}: {
  name: 'gear' | 'sun' | 'moon' | 'monitor' | 'copy' | 'user' | 'menu' | 'close';
  className?: string;
}) {
  const common = cn('h-4 w-4', className);
  switch (name) {
    case 'gear':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M19.4 15a7.97 7.97 0 0 0 .1-1 7.97 7.97 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a8.1 8.1 0 0 0-1.7-1l-.4-2.6H9.1l-.4 2.6a8.1 8.1 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.97 7.97 0 0 0-.1 1c0 .34.03.67.1 1l-2 1.6 2 3.4 2.4-1c.54.4 1.1.74 1.7 1l.4 2.6h5.8l.4-2.6c.6-.26 1.16-.6 1.7-1l2.4 1 2-3.4-2-1.6Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'sun':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5 3.6 3.6M20.4 20.4 19 19M19 5l1.4-1.4M3.6 20.4 5 19"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'moon':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M21 14.5A8.5 8.5 0 0 1 9.5 3a7 7 0 1 0 11.5 11.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'monitor':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 5h16v11H4V5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M8 20h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'copy':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M9 9h10v10H9V9Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'user':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M20 20a8 8 0 1 0-16 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'menu':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'close':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}

function ThemeSegment() {
  const { theme, setTheme } = useTheme();
  const items: Array<{ key: 'light' | 'dark' | 'system'; icon: 'sun' | 'moon' | 'monitor'; label: string }> = [
    { key: 'light', icon: 'sun', label: 'Light' },
    { key: 'dark', icon: 'moon', label: 'Dark' },
    { key: 'system', icon: 'monitor', label: 'System' }
  ];

  return (
    <div className="flex items-center gap-1 rounded-lg bg-background p-1">
      {items.map((i) => (
        <button
          key={i.key}
          type="button"
          onClick={() => setTheme(i.key)}
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors',
            theme === i.key ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted'
          )}
          aria-label={i.label}
          title={i.label}
        >
          <Icon name={i.icon} />
        </button>
      ))}
    </div>
  );
}

function UserMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string>('User');
  const [email, setEmail] = useState<string>('');
  const menuRef = useRef<HTMLDivElement | null>(null);

  const initials = useMemo(() => {
    const base = displayName?.trim() || email?.trim() || 'U';
    const parts = base.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? 'U';
    const b = parts.length > 1 ? parts[1]?.[0] : (parts[0]?.[1] ?? '');
    return (a + b).toUpperCase();
  }, [displayName, email]);

  useEffect(() => {
    let mounted = true;
    Auth.currentAuthenticatedUser()
      .then((u: any) => {
        if (!mounted) return;
        const attrs = u?.attributes ?? {};
        setEmail(attrs.email ?? '');
        setDisplayName(attrs.name ?? attrs.given_name ?? u?.username ?? 'User');
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as any)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={menuRef} className="relative flex items-center gap-2">
      {/* Settings cog */}
      <button
        type="button"
        onClick={() => navigate('/app/settings')}
        className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted"
        aria-label="Settings"
        title="Settings"
      >
        <Icon name="gear" className="h-5 w-5" />
      </button>

      {/* User dropdown trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-sm hover:bg-muted"
        aria-label="User menu"
      >
        <Icon name="user" className="h-6 w-6" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 rounded-xl border border-border bg-card shadow-xl">
          <div className="p-4">
            <div className="text-base font-semibold">{displayName}</div>
            {email && <div className="mt-1 text-sm text-muted-foreground">{email}</div>}

            <div className="mt-3">
              <ThemeSegment />
            </div>
          </div>

          <div className="border-t border-border p-2">
            <button
              type="button"
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => Auth.signOut()}
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AppShell() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState<boolean>(() => window.innerWidth < 1024);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => (window.innerWidth < 1024 ? false : true));
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = () => {
      const nowMobile = !mq.matches;
      setIsMobile(nowMobile);
      if (nowMobile) {
        // Auto-collapse on smaller screens
        setSidebarOpen(false);
      } else {
        // Always show sidebar on desktop
        setSidebarOpen(true);
      }
    };
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav (full width) */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background px-6">
        <div className="flex items-center gap-3">
          {/* Hamburger only on small screens (sidebar auto-collapses) */}
          {isMobile && (
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted"
              aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
              title={sidebarOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setSidebarOpen((v) => !v)}
            >
              <Icon name={sidebarOpen ? 'close' : 'menu'} className="h-6 w-6" />
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg border border-border bg-muted" />
            <div className="text-sm font-semibold tracking-wide">AiAgentsWorkforce</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <UserMenu />
        </div>
      </header>

      {/* Body: sidebar starts under top nav */}
      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Mobile backdrop */}
        {isMobile && sidebarOpen && (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-10 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            'z-20 w-72 border-r border-border bg-background p-4',
            isMobile
              ? cn(
                  'fixed left-0 top-16 h-[calc(100vh-4rem)] shadow-xl transition-transform',
                  sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                )
              : 'sticky top-16 h-[calc(100vh-4rem)]'
          )}
        >
          <div className="space-y-3">
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="pr-16"
              />
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                ⌘K
              </div>
            </div>

            <div className="pt-2">
              <div className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Get started
              </div>
              <nav className="mt-2 space-y-1">
                {navItems.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    onClick={() => {
                      if (isMobile) setSidebarOpen(false);
                    }}
                    className={({ isActive }) =>
                      cn(
                        'block rounded-md px-3 py-2 text-sm',
                        isActive ? 'bg-muted font-medium' : 'hover:bg-muted'
                      )
                    }
                  >
                    {n.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        </aside>

        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}


