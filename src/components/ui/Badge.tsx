type BadgeVariant = 'success' | 'warning' | 'danger' | 'default' | 'info'

const STATUS_MAP: Record<string, BadgeVariant> = {
  paid: 'success',
  confirmed: 'success',
  resolved: 'success',
  pending: 'info',
  pending_verification: 'info',
  open: 'info',
  in_progress: 'warning',
  overdue: 'danger',
  rejected: 'danger',
  partially_paid: 'warning',
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-orange-100 text-orange-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  default: 'bg-gray-100 text-gray-800',
}

const LABELS: Record<string, string> = {
  paid: 'Paid',
  confirmed: 'Confirmed',
  resolved: 'Resolved',
  pending: 'Pending',
  pending_verification: 'Pending Verification',
  open: 'Open',
  in_progress: 'In Progress',
  overdue: 'Overdue',
  rejected: 'Rejected',
  partially_paid: 'Partially Paid',
}

export function Badge({ status }: { status: string }) {
  const variant = STATUS_MAP[status] ?? 'default'
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${VARIANT_CLASSES[variant]}`}>
      {LABELS[status] ?? status}
    </span>
  )
}
