import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { schoolStore } from '@/lib/schoolData'

export function AccessExpired() {
  const { profile, refreshProfile, signOut } = useAuth()
  const navigate = useNavigate()

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Check if student has been cleared at the Bursar Desk or in schoolStore
  const studentIdentifier = profile?.admission_number || profile?.id || ''
  const studentRecord = schoolStore
    .getStudents()
    .find(
      (s) =>
        (profile?.admission_number && s.admission_number.toLowerCase() === profile.admission_number.toLowerCase()) ||
        s.id === profile?.id
    )

  const studentInvoices = schoolStore
    .getInvoices()
    .filter(
      (inv) =>
        (profile?.admission_number && inv.admission_number.toLowerCase() === profile.admission_number.toLowerCase()) ||
        inv.student_id === profile?.id
    )

  const studentReceipts = schoolStore
    .getReceipts()
    .filter(
      (rcpt) =>
        (profile?.admission_number && rcpt.admission_number.toLowerCase() === profile.admission_number.toLowerCase()) ||
        rcpt.student_id === profile?.id
    )

  const hasClearedInvoice = studentInvoices.some((inv) => inv.status === 'Paid' || inv.balance === 0)
  const hasValidReceipt = studentReceipts.some((r) => (r.amount_paid ?? r.amount) > 0)
  const isBiometricCleared = schoolStore
    .getBiometricClearanceLogs()
    .some((p) => p.admission_number.toLowerCase() === studentIdentifier.toLowerCase())

  const isFeeCleared =
    studentRecord?.fee_cleared === true ||
    (studentRecord && studentRecord.fee_balance === 0) ||
    hasClearedInvoice ||
    hasValidReceipt ||
    isBiometricCleared

  const handleInstantUnlock = useCallback(async () => {
    if (!profile?.id) return
    setError(null)
    try {
      const newExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      await supabase.from('profiles').update({ access_expires_at: newExpiry }).eq('id', profile.id)
      await refreshProfile()
      setSuccess('Bursar fee clearance verified! Lesson access unlocked successfully. 🎉')
      setTimeout(() => {
        navigate('/student')
      }, 1200)
    } catch {
      setError('Unable to sync cloud clearance. Please try again.')
    }
  }, [profile?.id, refreshProfile, navigate])

  // Automatically unlock if cleared
  useEffect(() => {
    if (isFeeCleared && profile?.id) {
      handleInstantUnlock()
    }
  }, [isFeeCleared, profile?.id, handleInstantUnlock])

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !profile?.id) return

    setError(null)
    setLoading(true)

    const cleanCode = code.trim().toUpperCase()

    // Query activation code
    const { data: actCode, error: fetchErr } = await supabase
      .from('activation_codes')
      .select('*')
      .eq('code', cleanCode)
      .eq('student_id', profile.id)
      .is('used_at', null)
      .single()

    if (fetchErr || !actCode) {
      setLoading(false)
      setError('Invalid or already used activation code. Please check with school admin.')
      return
    }

    // Mark code as used
    await supabase.from('activation_codes').update({ used_at: new Date().toISOString() }).eq('id', actCode.id)

    // Extend student's access_expires_at by duration_days
    const currentExpiry = profile.access_expires_at ? new Date(profile.access_expires_at) : new Date()
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date()
    const newExpiry = new Date(baseDate.getTime() + actCode.duration_days * 24 * 60 * 60 * 1000)

    await supabase.from('profiles').update({ access_expires_at: newExpiry.toISOString() }).eq('id', profile.id)

    await refreshProfile()
    setLoading(false)
    setSuccess(`Access successfully renewed for ${actCode.duration_days} days! 🎉`)

    setTimeout(() => {
      navigate('/student')
    }, 1500)
  }

  return (
    <div className="access-wall">
      <div className="access-wall-icon">⏳</div>
      <h1 className="access-wall-title">30-Day Access Window Expired</h1>
      <p style={{ maxWidth: 500, margin: '0 auto var(--space-6)', color: 'var(--color-text-secondary)' }}>
        Your standard 30-day learning portal access period has ended. To continue watching lessons and taking quizzes, enter your renewal activation code below or ask school administration for direct activation.
      </p>

      {error && (
        <div className="alert alert-danger" style={{ maxWidth: 440, margin: '0 auto var(--space-4)' }}>
          <span className="alert-icon">⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ maxWidth: 440, margin: '0 auto var(--space-4)' }}>
          <span className="alert-icon">✅</span>
          <div>{success}</div>
        </div>
      )}

      <form onSubmit={handleRedeemCode} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
        <input
          type="text"
          className="access-code-input"
          placeholder="GC-XXXX-XXXX"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />

        <Button variant="accent" size="lg" loading={loading} type="submit" style={{ minWidth: 240 }}>
          Redeem Activation Code 🔑
        </Button>
      </form>

      <div style={{ marginTop: 'var(--space-8)', display: 'flex', gap: 'var(--space-4)', justifyContent: 'center' }}>
        <Button variant="ghost" onClick={() => signOut().then(() => navigate('/login'))}>
          Sign Out & Return to Login
        </Button>
      </div>

      <div style={{ marginTop: 'var(--space-6)', fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>
        Global College • 100% Online Virtual Campus
      </div>
    </div>
  )
}
