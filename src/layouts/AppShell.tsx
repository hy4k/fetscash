import { NavLink, Outlet, useLocation } from 'react-router'
import { Toaster } from 'sonner'

/**
 * App shell — no global chrome. The home page carries its own hero with the
 * menu; every other page gets a small banknote that doubles as a home button.
 */
export function AppShell() {
  const isHome = useLocation().pathname === '/'

  return (
    <div className="min-h-screen bg-[var(--f-paper)] text-[var(--f-ink)]">
      {!isHome && (
        <div className="mx-auto w-full max-w-[1440px] px-6 pt-6 sm:px-10 sm:pt-7">
          <NavLink to="/" aria-label="FETS Cash — back to home" title="Back to home" className="inline-block">
            <img
              src="/assets/hero-note.jpg"
              alt="FETS CASH banknote — home"
              className="h-14 w-auto rounded-[10px] border border-[var(--f-hairline)] shadow-[0_6px_18px_rgba(17,23,19,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(17,23,19,0.18)]"
            />
          </NavLink>
        </div>
      )}

      {/* Content */}
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 pb-24 sm:px-10">
        <Outlet />
      </main>

      <Toaster position="bottom-right" toastOptions={{ style: { zIndex: 'var(--z-toast)' } }} />
    </div>
  )
}
