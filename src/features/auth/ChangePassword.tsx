import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { hashPassword } from '@/lib/crypto'
import { sanitizeInput } from '@/lib/utils'

export function ChangePassword() {
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setError(null)
    setLoading(true)

    // Update Auth Password in Supabase if logged in with Supabase Auth
    try {
      await supabase.auth.updateUser({ password: newPassword })
    } catch {}

    // Set first_login_at timestamp and access_expires_at (30 days from now)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)

    if (profile) {
      const updatedProfile = {
        ...profile,
        first_login_at: now.toISOString(),
        access_expires_at: profile.access_expires_at || expiresAt.toISOString(),
      }
      localStorage.setItem('gc_active_profile', JSON.stringify(updatedProfile))
      sessionStorage.setItem('gc_active_profile', JSON.stringify(updatedProfile))

      // Persist in local credentials store
      try {
        const cleanAdm = sanitizeInput(profile.admission_number || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        const cleanPass = sanitizeInput(newPassword)
        const passHash = await hashPassword(cleanPass)
        const raw = localStorage.getItem('gc_v2_local_credentials') || localStorage.getItem('gc_local_credentials') || '{}'
        const creds = JSON.parse(raw)
        creds[cleanAdm] = {
          password: cleanPass,
          passwordHash: passHash,
          profile: updatedProfile,
        }
        localStorage.setItem('gc_v2_local_credentials', JSON.stringify(creds))
        localStorage.setItem('gc_local_credentials', JSON.stringify(creds))
      } catch {}

      try {
        await supabase
          .from('profiles')
          .update({
            first_login_at: now.toISOString(),
            access_expires_at: profile.access_expires_at || expiresAt.toISOString(),
          })
          .eq('id', profile.id)
      } catch {}

      await refreshProfile()
    }

    setLoading(false)

    // Navigate to respective role portal
    if (profile?.role === 'admin') navigate('/admin')
    else if (profile?.role === 'bursar') navigate('/bursar')
    else if (profile?.role === 'teacher') navigate('/teacher')
    else if (profile?.role === 'parent') navigate('/parent')
    else navigate('/student')
  }

  return (
    <div className="change-password-page">
      <div className="change-password-card">
        <div className="change-password-icon">🔑</div>
        <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary)', marginBottom: 'var(--space-2)' }}>
          Set Your New Password
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)', marginBottom: 'var(--space-6)' }}>
          Welcome to Global College LMS! Since this is your first login, please update your temporary password to secure your account.
        </p>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: 'var(--space-4)', textAlign: 'left' }}>
            <span className="alert-icon">⚠️</span>
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="newPass">New Password</label>
            <input
              id="newPass"
              type="password"
              placeholder="Min 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPass">Confirm New Password</label>
            <input
              id="confirmPass"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ marginTop: 'var(--space-6)' }}>
            <Button variant="primary" fullWidth size="lg" loading={loading} type="submit">
              Save Password & Continue →
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
