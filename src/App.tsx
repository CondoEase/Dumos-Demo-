import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'

import Login from './pages/Login'

// Admin pages
import AdminDashboard from './pages/admin/Dashboard'
import Residents from './pages/admin/Residents'
import Invoices from './pages/admin/Invoices'
import Expenses from './pages/admin/Expenses'
import AdminTickets from './pages/admin/Tickets'
import AdminReports from './pages/admin/Reports'

// Resident pages
import ResidentDashboard from './pages/resident/Dashboard'
import ResidentInvoices from './pages/resident/Invoices'
import ResidentReceipts from './pages/resident/Receipts'
import ResidentTickets from './pages/resident/Tickets'

// Shared
import Announcements from './pages/Announcements'

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-text-secondary">Loading…</div>
  if (!profile) return <Navigate to="/login" replace />
  if (profile.role !== 'admin') return <Navigate to="/resident/dashboard" replace />
  return <>{children}</>
}

function ResidentGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-text-secondary">Loading…</div>
  if (!profile) return <Navigate to="/login" replace />
  if (profile.role === 'admin') return <Navigate to="/admin/dashboard" replace />
  return <>{children}</>
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-text-secondary">Loading…</div>
  if (!profile) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Admin routes */}
        <Route path="/admin/dashboard" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
        <Route path="/admin/residents" element={<AdminGuard><Residents /></AdminGuard>} />
        <Route path="/admin/invoices" element={<AdminGuard><Invoices /></AdminGuard>} />
        <Route path="/admin/expenses" element={<AdminGuard><Expenses /></AdminGuard>} />
        <Route path="/admin/tickets" element={<AdminGuard><AdminTickets /></AdminGuard>} />
        <Route path="/admin/reports" element={<AdminGuard><AdminReports /></AdminGuard>} />

        {/* Resident routes */}
        <Route path="/resident/dashboard" element={<ResidentGuard><ResidentDashboard /></ResidentGuard>} />
        <Route path="/resident/invoices" element={<ResidentGuard><ResidentInvoices /></ResidentGuard>} />
        <Route path="/resident/receipts" element={<ResidentGuard><ResidentReceipts /></ResidentGuard>} />
        <Route path="/resident/tickets" element={<ResidentGuard><ResidentTickets /></ResidentGuard>} />

        {/* Shared */}
        <Route path="/announcements" element={<AuthGuard><Announcements /></AuthGuard>} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
