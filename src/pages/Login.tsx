import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

type Mode = 'signin' | 'signup'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function switchMode(m: Mode) {
    setMode(m)
    setError('')
    setMessage('')
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError || !data.user) {
      setError(signInError?.message ?? 'Login failed')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    setLoading(false)
    if (profile?.role === 'admin') {
      navigate('/admin/dashboard')
    } else {
      navigate('/resident/dashboard')
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Upsert profile with resident role
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        phone: phone || null,
        role: 'resident',
        is_active: true,
      })
    }

    setLoading(false)
    setMessage('Account created! Check your email to confirm, then sign in.')
    setMode('signin')
    setPassword('')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="bg-surface border border-border rounded-xl shadow-sm w-full max-w-sm">
        {/* Logo */}
        <div className="text-center px-8 pt-8 pb-6 border-b border-border">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-white font-serif text-xl font-bold mb-3">C</div>
          <h1 className="text-2xl font-serif font-semibold text-primary">CondoEase</h1>
          <p className="text-text-secondary text-sm mt-1">Apartment Maintenance Management</p>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-border">
          <button
            onClick={() => switchMode('signin')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              mode === 'signin'
                ? 'text-primary border-b-2 border-primary -mb-px'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => switchMode('signup')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              mode === 'signup'
                ? 'text-primary border-b-2 border-primary -mb-px'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Sign Up
          </button>
        </div>

        <div className="px-8 py-6">
          {message && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
              {message}
            </div>
          )}

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              {error && (
                <p className="text-sm text-danger bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</p>
              )}
              <Button type="submit" loading={loading} className="w-full" size="lg">
                Sign In
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
                placeholder="e.g. John Silva"
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <Input
                label="Phone (optional)"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                placeholder="07X XXX XXXX"
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="At least 6 characters"
              />
              {error && (
                <p className="text-sm text-danger bg-red-50 px-3 py-2 rounded-lg border border-red-100">{error}</p>
              )}
              <Button type="submit" loading={loading} className="w-full" size="lg">
                Create Account
              </Button>
              <p className="text-xs text-text-secondary text-center">
                An admin will assign your unit after registration.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
