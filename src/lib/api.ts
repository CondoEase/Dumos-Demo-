import { supabase } from './supabase'
import type { ApiResponse } from '../types'

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const authHeader = await getAuthHeader()

  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...(options.headers ?? {}),
    },
  })

  const json = await res.json()

  if (!res.ok) {
    return { data: null, error: json.error ?? `HTTP ${res.status}` }
  }

  return json as ApiResponse<T>
}

export async function apiGet<T>(path: string): Promise<ApiResponse<T>> {
  return apiFetch<T>(path, { method: 'GET' })
}

export async function apiPost<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  return apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) })
}

export async function apiPut<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  return apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) })
}

export function formatCents(cents: number): string {
  return `Rs. ${(cents / 100).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-LK', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatPeriod(period: string): string {
  const [year, month] = period.split('-')
  const date = new Date(Number(year), Number(month) - 1)
  return date.toLocaleDateString('en-LK', { year: 'numeric', month: 'long' })
}
