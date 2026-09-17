import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '⊞' },
  { to: '/admin/residents', label: 'Residents & Units', icon: '🏠' },
  { to: '/admin/invoices', label: 'Invoices', icon: '📄' },
  { to: '/admin/expenses', label: 'Expenses', icon: '💳' },
  { to: '/admin/tickets', label: 'Tickets', icon: '🔧' },
  { to: '/admin/reports', label: 'Reports', icon: '📊' },
  { to: '/announcements', label: 'Announcements', icon: '📢' },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-primary text-white shrink-0">
        <div className="px-6 py-5 border-b border-white/10">
          <h1 className="font-serif text-xl font-semibold">Domos</h1>
          <p className="text-xs text-white/60 mt-0.5">Admin Panel</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-white/15 font-semibold'
                    : 'hover:bg-white/10 text-white/80'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-xs text-white/60 truncate">{profile?.full_name}</p>
          <button
            onClick={handleSignOut}
            className="mt-2 text-xs text-white/70 hover:text-white underline"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-primary text-white flex items-center justify-between px-4 py-3">
        <h1 className="font-serif font-semibold">Domos</h1>
        <button onClick={() => setMenuOpen(!menuOpen)} className="text-white">
          ☰
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <nav className="absolute top-0 left-0 bottom-0 w-64 bg-primary text-white flex flex-col">
            <div className="px-6 py-5 border-b border-white/10 flex justify-between">
              <h1 className="font-serif font-semibold">Domos</h1>
              <button onClick={() => setMenuOpen(false)}>✕</button>
            </div>
            <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                      isActive ? 'bg-white/15 font-semibold' : 'hover:bg-white/10 text-white/80'
                    }`
                  }
                >
                  <span>{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
            <div className="px-4 py-4 border-t border-white/10">
              <button onClick={handleSignOut} className="text-xs text-white/70 hover:text-white underline">
                Sign out
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 min-w-0 md:overflow-y-auto">
        <div className="pt-14 md:pt-0 px-4 py-4 sm:p-6 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
