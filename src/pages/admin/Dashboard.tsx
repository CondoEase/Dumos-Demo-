import { useEffect, useState } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { StatCard } from '../../components/ui/Card'
import { supabase } from '../../lib/supabase'
import { formatCents } from '../../lib/api'

interface DashboardStats {
  totalUnits: number
  totalResidents: number
  collectedThisMonth: number
  arrears: number
  pendingSlips: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const currentPeriod = new Date().toISOString().slice(0, 7)

  useEffect(() => {
    async function load() {
      const [units, residents, invoices, pendingPayments] = await Promise.all([
        supabase.from('units').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'resident').eq('is_active', true),
        supabase.from('invoices').select('amount_due_cents, status').eq('period', currentPeriod),
        supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pending_verification'),
      ])

      const invoiceData = invoices.data ?? []
      const collectedCents = invoiceData
        .filter((i) => i.status === 'paid')
        .reduce((sum, i) => sum + i.amount_due_cents, 0)
      const arrearsCount = invoiceData.filter((i) => i.status === 'overdue').length

      setStats({
        totalUnits: units.count ?? 0,
        totalResidents: residents.count ?? 0,
        collectedThisMonth: collectedCents,
        arrears: arrearsCount,
        pendingSlips: pendingPayments.count ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [currentPeriod])

  return (
    <AdminLayout>
      <div className="mb-5">
        <h1 className="text-2xl font-serif font-semibold text-primary">Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">
          {new Date().toLocaleDateString('en-LK', { month: 'long', year: 'numeric', timeZone: 'Asia/Colombo' })}
        </p>
      </div>

      {loading ? (
        <div className="text-text-secondary text-sm">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Total Units" value={stats!.totalUnits} />
          <StatCard label="Active Residents" value={stats!.totalResidents} />
          <StatCard
            label="Collected This Month"
            value={formatCents(stats!.collectedThisMonth)}
            accent="accent"
          />
          <StatCard
            label="Overdue Invoices"
            value={stats!.arrears}
            accent={stats!.arrears > 0 ? 'warning' : undefined}
          />
          <StatCard
            label="Pending Bank Slips"
            value={stats!.pendingSlips}
            accent={stats!.pendingSlips > 0 ? 'warning' : undefined}
          />
        </div>
      )}
    </AdminLayout>
  )
}
