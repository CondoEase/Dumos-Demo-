export type UserRole = 'admin' | 'resident'

export interface Profile {
  id: string
  full_name: string
  phone: string | null
  email: string
  role: UserRole
  unit_id: string | null
  is_active: boolean
  created_at: string
}

export interface Unit {
  id: string
  unit_number: string
  block: string | null
  floor: string | null
  square_footage: number
  owner_profile_id: string | null
  tenant_profile_id: string | null
  created_at: string
  owner?: Profile
  tenant?: Profile
}

export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'partially_paid'

export interface Invoice {
  id: string
  unit_id: string
  period: string
  amount_due_cents: number
  due_date: string
  status: InvoiceStatus
  created_at: string
  unit?: Unit
}

export type PaymentMethod = 'payhere' | 'bank_slip'
export type PaymentStatus = 'pending_verification' | 'confirmed' | 'rejected'

export interface Payment {
  id: string
  invoice_id: string
  amount_cents: number
  method: PaymentMethod
  status: PaymentStatus
  slip_url: string | null
  payhere_ref: string | null
  paid_at: string | null
  created_at: string
}

export interface Receipt {
  id: string
  payment_id: string
  pdf_url: string
  receipt_number: string
  generated_at: string
}

export interface MaintenanceRate {
  id: string
  effective_from: string
  rate_per_sqft: number | null
  flat_rate_cents: number | null
  late_fee_percent: number
  created_at: string
}

export interface Expense {
  id: string
  category: string
  description: string
  amount_cents: number
  date: string
  vendor: string | null
  receipt_url: string | null
  created_at: string
}

export interface Ticket {
  id: string
  unit_id: string
  raised_by: string
  category: string
  description: string
  photo_url: string | null
  status: 'open' | 'in_progress' | 'resolved'
  created_at: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  posted_by: string
  pinned: boolean
  created_at: string
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}
