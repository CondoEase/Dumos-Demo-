import { useEffect, useState } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { supabase } from '../../lib/supabase'
import { formatCents, formatDate } from '../../lib/api'
import type { Expense } from '../../types'

const CATEGORIES = ['Cleaning', 'Repairs', 'Utilities', 'Security', 'Landscaping', 'Administration', 'Insurance', 'Other']

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const [form, setForm] = useState({
    category: '', description: '', amount: '', date: '', vendor: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })
    setExpenses((data as Expense[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function saveExpense() {
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('expenses').insert({
      category: form.category,
      description: form.description,
      amount_cents: Math.round(parseFloat(form.amount) * 100),
      date: form.date,
      vendor: form.vendor || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setModalOpen(false)
    setForm({ category: '', description: '', amount: '', date: '', vendor: '' })
    load()
  }

  const filtered = expenses.filter((e) => !filterCategory || e.category === filterCategory)
  const totalCents = filtered.reduce((sum, e) => sum + e.amount_cents, 0)

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-semibold text-primary">Expenses</h1>
        <Button onClick={() => { setError(''); setModalOpen(true) }}>+ Add Expense</Button>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-44">
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <span className="text-sm text-text-secondary ml-auto">
          Total: <span className="font-semibold text-text-primary">{formatCents(totalCents)}</span>
        </span>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50 text-text-secondary text-left">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Vendor</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-text-secondary">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-text-secondary">No expenses recorded</td></tr>
              ) : filtered.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-text-secondary whitespace-nowrap">{formatDate(exp.date)}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{exp.category}</span>
                  </td>
                  <td className="px-4 py-3">{exp.description}</td>
                  <td className="px-4 py-3 text-text-secondary">{exp.vendor ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCents(exp.amount_cents)}</td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t border-border bg-gray-50">
                  <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-right text-text-secondary">Total</td>
                  <td className="px-4 py-3 text-right font-semibold text-text-primary">{formatCents(totalCents)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Expense">
        <div className="space-y-4">
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
            <option value="">Select category…</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <Input label="Amount (Rs.)" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required placeholder="0.00" />
          <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          <Input label="Vendor (optional)" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={saveExpense}>Save Expense</Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}
