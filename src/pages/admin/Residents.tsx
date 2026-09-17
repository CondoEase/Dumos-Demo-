import { useEffect, useState } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { supabase } from '../../lib/supabase'
import type { Profile, Unit } from '../../types'

interface ResidentWithUnit extends Profile {
  unit?: Unit
}

export default function Residents() {
  const [residents, setResidents] = useState<ResidentWithUnit[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [unitModalOpen, setUnitModalOpen] = useState(false)
  const [editingResident, setEditingResident] = useState<ResidentWithUnit | null>(null)
  const [search, setSearch] = useState('')

  const [residentForm, setResidentForm] = useState({
    full_name: '', email: '', phone: '', unit_id: '', role: 'resident' as 'resident' | 'admin',
  })
  const [unitForm, setUnitForm] = useState({
    unit_number: '', block: '', floor: '', square_footage: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [{ data: profileData }, { data: unitData }] = await Promise.all([
      supabase.from('profiles').select('*, unit:unit_id(*)').order('full_name'),
      supabase.from('units').select('*').order('unit_number'),
    ])
    setResidents((profileData as ResidentWithUnit[]) ?? [])
    setUnits((unitData as Unit[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAddResident() {
    setEditingResident(null)
    setResidentForm({ full_name: '', email: '', phone: '', unit_id: '', role: 'resident' })
    setError('')
    setModalOpen(true)
  }

  function openEditResident(r: ResidentWithUnit) {
    setEditingResident(r)
    setResidentForm({
      full_name: r.full_name,
      email: r.email,
      phone: r.phone ?? '',
      unit_id: r.unit_id ?? '',
      role: r.role,
    })
    setError('')
    setModalOpen(true)
  }

  async function saveResident() {
    setSaving(true)
    setError('')
    try {
      if (editingResident) {
        const { error: err } = await supabase.from('profiles').update({
          full_name: residentForm.full_name,
          phone: residentForm.phone || null,
          unit_id: residentForm.unit_id || null,
          role: residentForm.role,
        }).eq('id', editingResident.id)
        if (err) throw err
      } else {
        // Create auth user + profile via API
        const res = await fetch('/api/residents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
          body: JSON.stringify(residentForm),
        })
        const json = await res.json()
        if (json.error) throw new Error(json.error)
      }
      setModalOpen(false)
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(r: ResidentWithUnit) {
    await supabase.from('profiles').update({ is_active: !r.is_active }).eq('id', r.id)
    load()
  }

  async function saveUnit() {
    setSaving(true)
    setError('')
    try {
      const { error: err } = await supabase.from('units').insert({
        unit_number: unitForm.unit_number,
        block: unitForm.block || null,
        floor: unitForm.floor || null,
        square_footage: parseFloat(unitForm.square_footage) || 0,
      })
      if (err) throw err
      setUnitModalOpen(false)
      setUnitForm({ unit_number: '', block: '', floor: '', square_footage: '' })
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save unit')
    } finally {
      setSaving(false)
    }
  }

  const filtered = residents.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-semibold text-primary">Residents & Units</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setError(''); setUnitModalOpen(true) }}>
            + Add Unit
          </Button>
          <Button onClick={openAddResident}>+ Add Resident</Button>
        </div>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50 text-text-secondary text-left">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Unit</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-text-secondary">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-text-secondary">No residents found</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-text-primary">{r.full_name}</td>
                  <td className="px-4 py-3 text-text-secondary">{r.email}</td>
                  <td className="px-4 py-3">
                    {(r.unit as unknown as Unit)?.unit_number ?? <span className="text-text-secondary">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                      {r.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditResident(r)}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(r)}>
                      {r.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resident Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingResident ? 'Edit Resident' : 'Add Resident'}>
        <div className="space-y-4">
          <Input label="Full Name" value={residentForm.full_name} onChange={(e) => setResidentForm({ ...residentForm, full_name: e.target.value })} required />
          {!editingResident && (
            <Input label="Email" type="email" value={residentForm.email} onChange={(e) => setResidentForm({ ...residentForm, email: e.target.value })} required />
          )}
          <Input label="Phone" value={residentForm.phone} onChange={(e) => setResidentForm({ ...residentForm, phone: e.target.value })} />
          <Select label="Unit" value={residentForm.unit_id} onChange={(e) => setResidentForm({ ...residentForm, unit_id: e.target.value })}>
            <option value="">— No unit assigned —</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.unit_number}{u.block ? ` (Block ${u.block})` : ''}</option>
            ))}
          </Select>
          <Select label="Role" value={residentForm.role} onChange={(e) => setResidentForm({ ...residentForm, role: e.target.value as 'resident' | 'admin' })}>
            <option value="resident">Resident</option>
            <option value="admin">Admin</option>
          </Select>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={saveResident}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Unit Modal */}
      <Modal open={unitModalOpen} onClose={() => setUnitModalOpen(false)} title="Add Unit">
        <div className="space-y-4">
          <Input label="Unit Number" value={unitForm.unit_number} onChange={(e) => setUnitForm({ ...unitForm, unit_number: e.target.value })} required placeholder="e.g. A-101" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Block" value={unitForm.block} onChange={(e) => setUnitForm({ ...unitForm, block: e.target.value })} placeholder="A" />
            <Input label="Floor" value={unitForm.floor} onChange={(e) => setUnitForm({ ...unitForm, floor: e.target.value })} placeholder="1" />
          </div>
          <Input label="Square Footage" type="number" value={unitForm.square_footage} onChange={(e) => setUnitForm({ ...unitForm, square_footage: e.target.value })} placeholder="850" />
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => setUnitModalOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={saveUnit}>Add Unit</Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}
