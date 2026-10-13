import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { schoolStore } from '@/lib/schoolData'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { generateActivationCode, isAccessExpired, daysUntil } from '@/lib/utils'
import type { Profile, ActivationCode } from '@/lib/database.types'

export function ActivationManager() {
  const { profile: adminProfile } = useAuth()
  const queryClient = useQueryClient()

  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null)
  const [durationDays, setDurationDays] = useState<number>(30)
  const [generatedCodeResult, setGeneratedCodeResult] = useState<string | null>(null)
  const [filterMode, setFilterMode] = useState<'all' | 'expired' | 'active'>('all')

  // Fetch all student profiles strictly from active schoolStore
  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ['admin-activation-students'],
    queryFn: async () => {
      return schoolStore.getStudents().map((s) => ({
        id: s.id,
        full_name: s.full_name,
        admission_number: s.admission_number,
        role: 'student' as const,
        first_login_at: null,
        access_expires_at:
          s.status === 'Active'
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        is_active: s.status === 'Active',
        created_at: s.enrollment_date || new Date().toISOString(),
      })) as Profile[]
    },
  })

  // Fetch all activation code history
  const { data: codeHistory } = useQuery({
    queryKey: ['admin-code-history'],
    queryFn: async () => {
      const { data } = await supabase
        .from('activation_codes')
        .select('*, student:profiles!student_id(full_name, admission_number)')
        .order('created_at', { ascending: false })
      return (data || []) as (ActivationCode & { student: Profile })[]
    },
  })

  // Direct Activation Mutation
  const directActivateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent) return
      const currentExpiry = selectedStudent.access_expires_at ? new Date(selectedStudent.access_expires_at) : new Date()
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date()
      const newExpiry = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000)

      const { error } = await supabase
        .from('profiles')
        .update({ access_expires_at: newExpiry.toISOString() })
        .eq('id', selectedStudent.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-activation-students'] })
      setSelectedStudent(null)
    },
  })

  // Generate Code Mutation
  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent || !adminProfile?.id) return
      const code = generateActivationCode()

      const { error } = await supabase.from('activation_codes').insert({
        code,
        student_id: selectedStudent.id,
        duration_days: durationDays,
        created_by: adminProfile.id,
      })

      if (error) throw error
      return code
    },
    onSuccess: (code) => {
      queryClient.invalidateQueries({ queryKey: ['admin-code-history'] })
      setGeneratedCodeResult(code || null)
    },
  })

  const filteredStudents = students?.filter((s) => {
    const expired = isAccessExpired(s.access_expires_at)
    if (filterMode === 'expired') return expired
    if (filterMode === 'active') return !expired
    return true
  })

  return (
    <PageWrapper
      title="30-Day Student Access & Code Generator"
      subtitle="Directly renew student learning access or generate unique single-use activation codes."
    >
      {/* Filter Tabs */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="tabs mb-0">
            <button
              className={`tab-btn ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              All Students ({students?.length || 0})
            </button>
            <button
              className={`tab-btn ${filterMode === 'expired' ? 'active' : ''}`}
              onClick={() => setFilterMode('expired')}
            >
              ⏳ Expired Access ({students?.filter((s) => isAccessExpired(s.access_expires_at)).length || 0})
            </button>
            <button
              className={`tab-btn ${filterMode === 'active' ? 'active' : ''}`}
              onClick={() => setFilterMode('active')}
            >
              ✅ Active Access ({students?.filter((s) => !isAccessExpired(s.access_expires_at)).length || 0})
            </button>
          </div>
        </div>
      </div>

      {/* Roster Table */}
      {loadingStudents ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
          <Spinner size="lg" />
        </div>
      ) : filteredStudents && filteredStudents.length > 0 ? (
        <div className="card mb-8">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Admission No.</th>
                  <th>Student Name</th>
                  <th>Access Expiry Date</th>
                  <th>Days Remaining</th>
                  <th>Status</th>
                  <th>Action Controls</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((st) => {
                  const expired = isAccessExpired(st.access_expires_at)
                  const daysLeft = st.access_expires_at ? daysUntil(st.access_expires_at) : 0

                  return (
                    <tr key={st.id}>
                      <td className="font-mono text-xs font-bold">{st.admission_number}</td>
                      <td className="font-bold">{st.full_name}</td>
                      <td className="text-xs">
                        {st.access_expires_at ? new Date(st.access_expires_at).toLocaleDateString() : 'Not set'}
                      </td>
                      <td className="font-bold">{daysLeft} Days</td>
                      <td>
                        {expired ? (
                          <span className="badge badge-danger">⏳ Access Expired</span>
                        ) : (
                          <span className="badge badge-success">✅ Active</span>
                        )}
                      </td>
                      <td>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedStudent(st)
                            setGeneratedCodeResult(null)
                          }}
                        >
                          🔑 Activate / Code
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="empty-state card mb-8">
          <div className="empty-state-icon">🔑</div>
          <div className="empty-state-title">No Students Found</div>
          <div className="empty-state-desc">No student records match the selected filter.</div>
        </div>
      )}

      {/* Code History Table */}
      <div>
        <h2 style={{ fontSize: 'var(--text-xl)', color: 'var(--color-primary)', marginBottom: 'var(--space-4)' }}>
          📜 Activation Code History
        </h2>
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Activation Code</th>
                  <th>Student</th>
                  <th>Duration</th>
                  <th>Created</th>
                  <th>Used Status</th>
                </tr>
              </thead>
              <tbody>
                {codeHistory?.map((ch) => (
                  <tr key={ch.id}>
                    <td className="font-mono font-bold text-sm" style={{ color: 'var(--color-secondary)' }}>
                      {ch.code}
                    </td>
                    <td>{ch.student?.full_name || 'Student'}</td>
                    <td>{ch.duration_days} Days</td>
                    <td className="text-xs text-muted">{new Date(ch.created_at).toLocaleDateString()}</td>
                    <td>
                      {ch.used_at ? (
                        <span className="badge badge-muted">Used on {new Date(ch.used_at).toLocaleDateString()}</span>
                      ) : (
                        <span className="badge badge-success">Unused / Valid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Activate Modal */}
      {selectedStudent && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedStudent(null)
            setGeneratedCodeResult(null)
          }}
          title={`🔑 Activate Access for ${selectedStudent.full_name}`}
          size="md"
        >
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div className="text-xs text-muted">
              Admission: <strong>{selectedStudent.admission_number}</strong>
            </div>
          </div>

          {!generatedCodeResult ? (
            <div>
              <div className="form-group">
                <label className="form-label" htmlFor="durDays">Access Extension Duration</label>
                <select
                  id="durDays"
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                >
                  <option value={30}>30 Days (Standard Term Access)</option>
                  <option value={60}>60 Days (2 Months)</option>
                  <option value={90}>90 Days (Full Term / 3 Months)</option>
                  <option value={365}>365 Days (Full Year Access)</option>
                </select>
              </div>

              <div className="flex flex-col gap-3 mt-6">
                <Button
                  variant="primary"
                  fullWidth
                  loading={directActivateMutation.isPending}
                  onClick={() => directActivateMutation.mutate()}
                >
                  ⚡ Direct Activate Immediately
                </Button>

                <div className="text-center text-xs text-muted">OR</div>

                <Button
                  variant="accent"
                  fullWidth
                  loading={generateCodeMutation.isPending}
                  onClick={() => generateCodeMutation.mutate()}
                >
                  🎟️ Generate Activation Code for Student
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center p-4">
              <div className="text-sm text-muted mb-2">Generated Activation Code:</div>
              <div
                className="font-mono text-2xl font-bold mb-4 p-4 rounded"
                style={{ background: '#dcfce7', color: '#16a34a', letterSpacing: '0.1em' }}
              >
                {generatedCodeResult}
              </div>
              <p className="text-xs text-muted mb-4">
                Give this code to the student. They can enter it on their renewal screen to activate {durationDays} days of access.
              </p>
              <Button
                variant="outline"
                fullWidth
                onClick={() => {
                  navigator.clipboard.writeText(generatedCodeResult)
                  alert('Code copied to clipboard!')
                }}
              >
                📋 Copy Code to Clipboard
              </Button>
            </div>
          )}
        </Modal>
      )}
    </PageWrapper>
  )
}
