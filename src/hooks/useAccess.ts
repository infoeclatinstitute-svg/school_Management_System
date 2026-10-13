import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { isAccessExpired } from '@/lib/utils'
import { schoolStore, schoolEventBus } from '@/lib/schoolData'
import { supabase } from '@/lib/supabase'

/**
 * Checks if the current student's access has expired.
 * If expired and NOT fee-cleared at Bursar Desk, redirects to /access-expired.
 * Teachers, admins, bursars, and fee-cleared students are NEVER blocked.
 */
export function useAccess() {
  const { profile } = useAuth()
  const [, setSyncTick] = useState(0)

  useEffect(() => {
    let isMounted = true
    const handleSync = () => {
      if (isMounted) setSyncTick((t) => t + 1)
    }

    const unsubStudent = schoolEventBus.subscribe('STUDENT_UPDATED', handleSync)
    const unsubPayment = schoolEventBus.subscribe('PAYMENT_RECORDED', handleSync)
    window.addEventListener('storage', handleSync)
    window.addEventListener('gc-data-synced', handleSync)

    return () => {
      isMounted = false
      unsubStudent()
      unsubPayment()
      window.removeEventListener('storage', handleSync)
      window.removeEventListener('gc-data-synced', handleSync)
    }
  }, [])

  // Determine if student has active fee clearance or payments from Bursar desk
  const studentIdentifier = profile?.admission_number || profile?.id || ''
  const cleanId = studentIdentifier.toLowerCase().trim()
  const cleanAlpha = cleanId.replace(/[^a-z0-9]/g, '')
  const profileNameAlpha = (profile?.full_name || '').toLowerCase().replace(/[^a-z0-9]/g, '')

  const studentRecord = schoolStore
    .getStudents()
    .find((s) => {
      const sAdm = s.admission_number.toLowerCase().trim()
      const sAdmAlpha = sAdm.replace(/[^a-z0-9]/g, '')
      const sNameAlpha = s.full_name.toLowerCase().replace(/[^a-z0-9]/g, '')
      return (
        s.id === profile?.id ||
        sAdm === cleanId ||
        (cleanAlpha.length > 0 && sAdmAlpha === cleanAlpha) ||
        (profileNameAlpha.length > 3 && sNameAlpha === profileNameAlpha)
      )
    })

  const studentInvoices = schoolStore
    .getInvoices()
    .filter((inv) => {
      const iAdm = inv.admission_number.toLowerCase().trim()
      const iAdmAlpha = iAdm.replace(/[^a-z0-9]/g, '')
      return (
        inv.student_id === profile?.id ||
        iAdm === cleanId ||
        (cleanAlpha.length > 0 && iAdmAlpha === cleanAlpha)
      )
    })

  const studentReceipts = schoolStore
    .getReceipts()
    .filter((rcpt) => {
      const rAdm = rcpt.admission_number.toLowerCase().trim()
      const rAdmAlpha = rAdm.replace(/[^a-z0-9]/g, '')
      return (
        rcpt.student_id === profile?.id ||
        rAdm === cleanId ||
        (cleanAlpha.length > 0 && rAdmAlpha === cleanAlpha)
      )
    })

  const studentUnitRegs = schoolStore
    .getUnitRegistrations()
    .filter((reg) => {
      const uAdm = reg.admission_number.toLowerCase().trim()
      const uAdmAlpha = uAdm.replace(/[^a-z0-9]/g, '')
      return (
        reg.student_id === profile?.id ||
        uAdm === cleanId ||
        (cleanAlpha.length > 0 && uAdmAlpha === cleanAlpha)
      )
    })

  const hasClearedInvoice = studentInvoices.some((inv) => inv.status === 'Paid' || inv.balance === 0)
  const hasValidReceipt = studentReceipts.some((r) => (r.amount_paid ?? r.amount) > 0)
  const hasUnitRegistrationSlip = studentUnitRegs.some((r) => r.fee_clearance_status === 'Cleared' || r.exam_card_issued)
  const isBiometricCleared = schoolStore
    .getBiometricClearanceLogs()
    .some((p) => p.admission_number.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlpha)

  // Any verified Bursar clearance, payment, or enrollment grants active LMS access
  const isFeeCleared =
    studentRecord?.fee_cleared === true ||
    (studentRecord && studentRecord.fee_balance === 0) ||
    hasClearedInvoice ||
    hasValidReceipt ||
    hasUnitRegistrationSlip ||
    isBiometricCleared

  useEffect(() => {
    if (!profile) return
    if (profile.role === 'admin' || profile.role === 'teacher' || (profile.role as any) === 'bursar' || (profile.role as any) === 'parent') return

    // Grant active term access only if student is cleared by Bursar or Admin
    if (isFeeCleared) {
      if (!profile.access_expires_at || isAccessExpired(profile.access_expires_at)) {
        const renewed = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        const updated = { ...profile, access_expires_at: renewed }
        try {
          localStorage.setItem('gc_active_profile', JSON.stringify(updated))
          sessionStorage.setItem('gc_active_profile', JSON.stringify(updated))
        } catch {}
        Promise.resolve(
          supabase
            .from('profiles')
            .update({ access_expires_at: renewed })
            .eq('id', profile.id)
        ).catch(() => {})
      }
    }
  }, [profile, isFeeCleared])

  return {
    isExpired: isFeeCleared ? false : profile ? isAccessExpired(profile.access_expires_at) : false,
    accessExpiresAt: isFeeCleared ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : profile?.access_expires_at ?? null,
    isFeeCleared,
  }
}
