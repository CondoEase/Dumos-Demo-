import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-surface border border-border rounded-lg p-6 ${className}`}>
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: 'warning' | 'danger' | 'accent'
}) {
  const accentClass = accent === 'warning'
    ? 'text-warning'
    : accent === 'danger'
    ? 'text-danger'
    : accent === 'accent'
    ? 'text-accent'
    : 'text-primary'

  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <p className="text-sm text-text-secondary font-sans">{label}</p>
      <p className={`text-3xl font-serif font-semibold mt-1 ${accentClass}`}>{value}</p>
      {sub && <p className="text-xs text-text-secondary mt-1">{sub}</p>}
    </div>
  )
}
