import { useEffect, useState } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { supabase } from '../../lib/supabase'
import { apiPost, formatCents, formatDate, formatPeriod } from '../../lib/api'
import type { Invoice, Unit, MaintenanceRate, Payment } from '../../types'
// Unit used for InvoiceWithUnit

interface InvoiceWithUnit extends Invoice {
  unit: Unit
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<InvoiceWithUnit[]>([])
  const [rates, setRates] = useState<MaintenanceRate[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPeriod, setFilterPeriod] = useState('')
  const [generateOpen, setGenerateOpen] = useState(false)
  const [rateOpen, setRateOpen] = useState(false)
  const [genPeriod, setGenPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [genDueDate, setGenDueDate] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState<string | null>(null)
  const [slipsModal, setSlipsModal] = useState<{ open: boolean; invoice: InvoiceWithUnit | null; payments: Payment[] }>({ open: false, invoice: null, payments: [] })
  const [rateForm, setRateForm] = useState({ effective_from: '', flat_rate_cents: '', rate_per_sqft: '', late_fee_percent: '10' })
  const [savingRate, setSavingRate] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [{ data: invData }, { data: rateData }] = await Promise.all([
      supabase.from('invoices').select('*, unit:unit_id(*)').order('created_at', { ascending: false }),
      supabase.from('maintenance_rates').select('*').order('effective_from', { ascending: false }),
    ])
    setInvoices((invData as InvoiceWithUnit[]) ?? [])
    setRates((rateData as MaintenanceRate[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function generateInvoices() {
    setGenerating(true)
    setGenResult(null)
    setError('')
    const { data, error: err } = await apiPost<{ created: number; skipped: number }>('/invoices/generate', {
      period: genPeriod,
      due_date: genDueDate,
    })
    setGenerating(false)
    if (err) { setError(err); return }
    setGenResult(`Created ${data!.created} invoice(s). Skipped ${data!.skipped} duplicate(s).`)
    load()
  }

  async function generateReceipt(invoiceId: string) {
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .eq('status', 'confirmed')
      .order('paid_at', { ascending: false })
      .limit(1)
    if (!payments || payments.length === 0) {
      alert('No confirmed payment found for this invoice.')
      return
    }
    const { data, error: err } = await apiPost<{ pdf_url: string }>('/receipts/generate', {
      payment_id: payments[0].id,
    })
    if (err) { alert(err); return }
    window.open(data!.pdf_url, '_blank')
  }

  async function viewSlips(invoice: InvoiceWithUnit) {
    const { data } = await supabase.from('payments').select('*').eq('invoice_id', invoice.id)
    setSlipsModal({ open: true, invoice, payments: (data as Payment[]) ?? [] })
  }

  async function confirmSlip(paymentId: string) {
    await supabase.from('payments').update({ status: 'confirmed', paid_at: new Date().toISOString() }).eq('id', paymentId)
    await supabase.from('invoices').update({ status: 'paid' }).eq('id', slipsModal.invoice!.id)
    // Generate receipt
    await apiPost('/receipts/generate', { payment_id: paymentId })
    setSlipsModal({ open: false, invoice: null, payments: [] })
    load()
  }

  async function rejectSlip(paymentId: string) {
    await supabase.from('payments').update({ status: 'rejected' }).eq('id', paymentId)
    setSlipsModal({ open: false, invoice: null, payments: [] })
    load()
  }

  async function saveRate() {
    setSavingRate(true)
    setError('')
    const { error: err } = await supabase.from('maintenance_rates').insert({
      effective_from: rateForm.effective_from,
      flat_rate_cents: rateForm.flat_rate_cents ? Math.round(parseFloat(rateForm.flat_rate_cents) * 100) : null,
      rate_per_sqft: rateForm.rate_per_sqft ? Math.round(parseFloat(rateForm.rate_per_sqft) * 100) : null,
      late_fee_percent: parseFloat(rateForm.late_fee_percent),
    })
    setSavingRate(false)
    if (err) { setError(err.message); return }
    setRateOpen(false)
    load()
  }

  const filtered = invoices.filter((inv) => {
    if (filterStatus && inv.status !== filterStatus) return false
    if (filterPeriod && !inv.period.includes(filterPeriod)) return false
    return true
  })

  const currentRate = rates[0]

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-primary">Invoices</h1>
          {currentRate && (
            <p className="text-xs text-text-secondary mt-0.5">
              Current rate: {currentRate.flat_rate_cents
                ? `Rs. ${(currentRate.flat_rate_cents / 100).toLocaleString()} flat`
                : `Rs. ${(currentRate.rate_per_sqft! / 100).toLocaleString()}/sqft`
              } · Late fee: {currentRate.late_fee_percent}%
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => { setError(''); setRateOpen(true) }}>Set Rate</Button>
          <Button size="sm" onClick={() => { setGenResult(null); setError(''); setGenerateOpen(true) }}>Generate Invoices</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="flex-1 min-w-[130px] max-w-[180px]">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="partially_paid">Partially Paid</option>
        </Select>
        <Input type="month" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} className="flex-1 min-w-[130px] max-w-[180px]" />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-surface border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50 text-text-secondary text-left">
                <th className="px-4 py-3 font-semibold">Unit</th>
                <th className="px-4 py-3 font-semibold">Period</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Due Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-text-secondary">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-text-secondary">No invoices found</td></tr>
              ) : filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold">{inv.unit?.unit_number ?? '—'}</td>
                  <td className="px-4 py-3">{formatPeriod(inv.period)}</td>
                  <td className="px-4 py-3">{formatCents(inv.amount_due_cents)}</td>
                  <td className="px-4 py-3 text-text-secondary">{formatDate(inv.due_date)}</td>
                  <td className="px-4 py-3"><Badge status={inv.status} /></td>
                  <td className="px-4 py-3 flex gap-2 flex-wrap">
                    <Button variant="ghost" size="sm" onClick={() => viewSlips(inv)}>Payments</Button>
                    {inv.status === 'paid' && (
                      <Button variant="ghost" size="sm" onClick={() => generateReceipt(inv.id)}>Receipt</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <p className="text-center text-text-secondary py-8 text-sm">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-text-secondary py-8 text-sm">No invoices found</p>
        ) : filtered.map((inv) => (
          <div key={inv.id} className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-semibold text-text-primary">{inv.unit?.unit_number ?? '—'}</p>
                <p className="text-sm text-text-secondary">{formatPeriod(inv.period)}</p>
              </div>
              <Badge status={inv.status} />
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-text-primary">{formatCents(inv.amount_due_cents)}</span>
              <span className="text-xs text-text-secondary">Due {formatDate(inv.due_date)}</span>
            </div>
            <div className="flex gap-2 pt-2 border-t border-border">
              <Button variant="ghost" size="sm" onClick={() => viewSlips(inv)}>Payments</Button>
              {inv.status === 'paid' && (
                <Button variant="ghost" size="sm" onClick={() => generateReceipt(inv.id)}>Receipt</Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Generate Modal */}
      <Modal open={generateOpen} onClose={() => setGenerateOpen(false)} title="Generate Monthly Invoices">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            This will create invoices for all active units for the selected period using the current maintenance rate.
            Units already invoiced for this period will be skipped.
          </p>
          <Input label="Period (YYYY-MM)" type="month" value={genPeriod} onChange={(e) => setGenPeriod(e.target.value)} />
          <Input label="Due Date" type="date" value={genDueDate} onChange={(e) => setGenDueDate(e.target.value)} required />
          {!currentRate && <p className="text-sm text-warning">⚠ No maintenance rate set. Please add a rate first.</p>}
          {error && <p className="text-sm text-danger">{error}</p>}
          {genResult && <p className="text-sm text-accent">{genResult}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => setGenerateOpen(false)}>Close</Button>
            <Button loading={generating} onClick={generateInvoices} disabled={!currentRate || !genDueDate}>
              Generate
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rate Modal */}
      <Modal open={rateOpen} onClose={() => setRateOpen(false)} title="Set Maintenance Rate">
        <div className="space-y-4">
          <Input label="Effective From" type="date" value={rateForm.effective_from} onChange={(e) => setRateForm({ ...rateForm, effective_from: e.target.value })} required />
          <Input label="Flat Rate (Rs.) — leave blank to use per-sqft" type="number" value={rateForm.flat_rate_cents} onChange={(e) => setRateForm({ ...rateForm, flat_rate_cents: e.target.value })} placeholder="e.g. 5000" />
          <Input label="Rate per Sqft (Rs.) — leave blank to use flat rate" type="number" value={rateForm.rate_per_sqft} onChange={(e) => setRateForm({ ...rateForm, rate_per_sqft: e.target.value })} placeholder="e.g. 3.50" />
          <Input label="Late Fee %" type="number" value={rateForm.late_fee_percent} onChange={(e) => setRateForm({ ...rateForm, late_fee_percent: e.target.value })} />
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => setRateOpen(false)}>Cancel</Button>
            <Button loading={savingRate} onClick={saveRate}>Save Rate</Button>
          </div>
        </div>
      </Modal>

      {/* Payments/Slips Modal */}
      <Modal open={slipsModal.open} onClose={() => setSlipsModal({ open: false, invoice: null, payments: [] })} title={`Payments — ${slipsModal.invoice?.unit?.unit_number ?? ''} ${slipsModal.invoice ? formatPeriod(slipsModal.invoice.period) : ''}`}>
        <div className="space-y-3">
          {slipsModal.payments.length === 0 ? (
            <p className="text-sm text-text-secondary">No payments recorded for this invoice.</p>
          ) : slipsModal.payments.map((p) => (
            <div key={p.id} className="border border-border rounded-lg p-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{formatCents(p.amount_cents)} · {p.method}</p>
                <Badge status={p.status} />
                {p.slip_url && (
                  <a href={p.slip_url} target="_blank" rel="noreferrer" className="text-xs text-accent underline block mt-1">View slip</a>
                )}
              </div>
              {p.status === 'pending_verification' && (
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => confirmSlip(p.id)}>Confirm</Button>
                  <Button size="sm" variant="danger" onClick={() => rejectSlip(p.id)}>Reject</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Modal>
    </AdminLayout>
  )
}
