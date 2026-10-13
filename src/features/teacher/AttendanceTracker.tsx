import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import type { Class, AttendanceStatus, Profile } from '@/lib/database.types'

export function AttendanceTracker() {
  const { profile } = useAuth()

  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [attendanceState, setAttendanceState] = useState<Record<string, AttendanceStatus>>({})
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  // Fetch classes
  const { data: classes, isLoading: loadingClasses } = useQuery({
    queryKey: ['attendance-classes'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('*').order('name')
      return (data || []) as Class[]
    },
  })

  // Fetch students in selected class
  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ['class-students-att', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return []
      const { data, error } = await supabase
        .from('class_enrollments')
        .select('*, student:profiles!student_id(*)')
        .eq('class_id', selectedClassId)
      if (error) throw error
      return (data || []).map((d) => d.student as Profile)
    },
    enabled: !!selectedClassId,
  })

  // Fetch existing attendance for class & date
  const { data: existingAttendance } = useQuery({
    queryKey: ['existing-att', selectedClassId, selectedDate],
    queryFn: async () => {
      if (!selectedClassId || !selectedDate) return []
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', selectedClassId)
        .eq('date', selectedDate)
      return data || []
    },
    enabled: !!selectedClassId && !!selectedDate,
  })

  // Pre-fill state when existing attendance loads
  const handleClassChange = (cid: string) => {
    setSelectedClassId(cid)
    setAttendanceState({})
    setSaveStatus(null)
  }

  // Handle status toggle for a student
  const setStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceState((prev) => ({ ...prev, [studentId]: status }))
  }

  // Save attendance mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClassId || !selectedDate || !profile?.id || !students) return

      const records = students.map((s) => ({
        student_id: s.id,
        class_id: selectedClassId,
        date: selectedDate,
        status: attendanceState[s.id] || existingAttendance?.find((e) => e.student_id === s.id)?.status || 'present',
        marked_by: profile.id,
      }))

      const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'student_id,class_id,date' })
      if (error) throw error
    },
    onSuccess: () => {
      setSaveStatus('Attendance recorded successfully! ✅')
    },
  })

  return (
    <PageWrapper
      title="Daily Class Attendance Tracker"
      subtitle="Mark student attendance for your assigned grade classes."
    >
      {/* Date & Class Select Bar */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="grid grid-2" style={{ gap: 'var(--space-4)' }}>
            <div className="form-group mb-0">
              <label className="form-label" htmlFor="attClass">Select Class / Grade Group *</label>
              <select
                id="attClass"
                value={selectedClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                disabled={loadingClasses}
              >
                <option value="">-- Select Class --</option>
                {classes?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group mb-0">
              <label className="form-label" htmlFor="attDate">Attendance Date *</label>
              <input
                id="attDate"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {saveStatus && (
        <div className="alert alert-success mb-6">
          <span className="alert-icon">✅</span>
          <div>{saveStatus}</div>
        </div>
      )}

      {/* Student Attendance List */}
      {selectedClassId ? (
        loadingStudents ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
            <Spinner size="lg" />
          </div>
        ) : students && students.length > 0 ? (
          <div className="card mb-6">
            <div className="card-header flex justify-between items-center">
              <h3 style={{ margin: 0 }}>Class Roster ({students.length} Students)</h3>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const allP: Record<string, AttendanceStatus> = {}
                    students.forEach((s) => (allP[s.id] = 'present'))
                    setAttendanceState(allP)
                  }}
                >
                  Mark All Present ✅
                </Button>
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Admission No.</th>
                    <th>Student Full Name</th>
                    <th style={{ textAlign: 'center' }}>Attendance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((st) => {
                    const currentStatus =
                      attendanceState[st.id] ||
                      existingAttendance?.find((e) => e.student_id === st.id)?.status ||
                      'present'

                    return (
                      <tr key={st.id}>
                        <td className="font-mono text-xs">{st.admission_number}</td>
                        <td className="font-bold">{st.full_name}</td>
                        <td>
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              className={`btn btn-sm ${currentStatus === 'present' ? 'btn-primary' : 'btn-ghost'}`}
                              onClick={() => setStudentStatus(st.id, 'present')}
                            >
                              ✅ Present
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${currentStatus === 'absent' ? 'btn-danger' : 'btn-ghost'}`}
                              onClick={() => setStudentStatus(st.id, 'absent')}
                            >
                              ❌ Absent
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${currentStatus === 'late' ? 'btn-accent' : 'btn-ghost'}`}
                              onClick={() => setStudentStatus(st.id, 'late')}
                            >
                              ⏰ Late
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="card-footer flex justify-end">
              <Button
                variant="primary"
                size="lg"
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                Save Attendance Record 💾
              </Button>
            </div>
          </div>
        ) : (
          <div className="empty-state card">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">No Students Enrolled in this Class</div>
            <div className="empty-state-desc">
              Contact admin to enroll students into this class group.
            </div>
          </div>
        )
      ) : (
        <div className="empty-state card">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">Select a Class</div>
          <div className="empty-state-desc">
            Choose a grade class from the dropdown above to load the student roster and mark attendance.
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
