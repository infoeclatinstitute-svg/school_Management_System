import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { schoolStore } from '@/lib/schoolData'
import type { DisciplineRecord } from '@/types/school'

export function DisciplineTracker() {
  const { profile } = useAuth()
  const [students] = useState(() => schoolStore.getStudents())
  const [records, setRecords] = useState<DisciplineRecord[]>(() => schoolStore.getDiscipline())
  const [showModal, setShowModal] = useState(false)
  const [newRecord, setNewRecord] = useState({
    student_id: '',
    student_name: '',
    admission_number: '',
    class_name: '',
    type: 'Merit' as 'Merit' | 'Demerit' | 'Commendation' | 'Warning' | 'Suspension',
    points: 5,
    title: '',
    description: '',
    recorded_by: profile?.full_name || 'Dean of Students',
  })

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRecord.title || !newRecord.student_name) return

    const std = students.find((s) => s.admission_number.toLowerCase() === newRecord.admission_number.toLowerCase() || s.id === newRecord.student_id)

    const record: DisciplineRecord = {
      id: `disc-${Date.now()}`,
      student_id: std ? std.id : `std-${Date.now()}`,
      student_name: std ? std.full_name : newRecord.student_name,
      admission_number: std ? std.admission_number : (newRecord.admission_number || `GC-${new Date().getFullYear()}-001`),
      class_name: std ? std.class_name : (newRecord.class_name || 'Short Course Trainee'),
      type: newRecord.type,
      points: Number(newRecord.points),
      incident_date: new Date().toISOString().split('T')[0],
      title: newRecord.title,
      description: newRecord.description,
      recorded_by: newRecord.recorded_by || profile?.full_name || 'Dean of Students',
      status: 'Closed',
      action_taken: 'Recorded in student dossier',
    }

    const updated = [record, ...records]
    setRecords(updated)
    setShowModal(false)
    setNewRecord({ ...newRecord, student_name: '', admission_number: '', class_name: '', title: '', description: '' })
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Discipline & Student Conduct Registry</h1>
          <p className="page-subtitle">
            Merits, leadership awards, special commendations, and behavioral incident logs.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            + Log Incident / Award Merit
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Merits & Commendations</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#16a34a', marginTop: '0.25rem' }}>
            {records.filter((r) => r.type === 'Merit' || r.type === 'Commendation').length} Awards
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.2rem' }}>Recognizing student excellence</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ea580c' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Cautions & Demerits</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ea580c', marginTop: '0.25rem' }}>
            {records.filter((r) => r.type === 'Warning' || r.type === 'Demerit').length} Incidents
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
            {records.length > 0 ? 'All resolved with guardians' : 'No disciplinary infractions'}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Overall School Conduct Rating</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#3b82f6', marginTop: '0.25rem' }}>
            {records.length > 0 ? 'Grade A (96%)' : '100% Exemplary'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.2rem' }}>High institutional discipline standard</div>
        </div>
      </div>

      {/* Records Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Student</th>
                <th>Class</th>
                <th>Type</th>
                <th>Points</th>
                <th>Incident / Award Summary</th>
                <th>Recorded By</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontSize: '0.85rem' }}>{r.incident_date}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.student_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{r.admission_number}</div>
                  </td>
                  <td><span className="badge badge-info">{r.class_name}</span></td>
                  <td>
                    <span className={`badge ${r.type === 'Commendation' || r.type === 'Merit' ? 'badge-success' : 'badge-warning'}`}>
                      {r.type}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: r.points > 0 ? '#16a34a' : '#ea580c' }}>
                    {r.points > 0 ? `+${r.points}` : r.points}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
                      {r.description}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{r.recorded_by}</td>
                  <td><span className="badge badge-neutral">{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Record Conduct Entry</h3>
              <button type="button" className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddRecord}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {students.length > 0 && (
                  <div>
                    <label className="label">Quick Select Enrolled Student (Optional)</label>
                    <select
                      className="input"
                      value={newRecord.student_id}
                      onChange={(e) => {
                        const s = students.find((std) => std.id === e.target.value)
                        if (s) {
                          setNewRecord({
                            ...newRecord,
                            student_id: s.id,
                            admission_number: s.admission_number,
                            student_name: s.full_name,
                            class_name: s.class_name,
                          })
                        }
                      }}
                    >
                      <option value="">-- Select from Enrolled Students or Type Below --</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.admission_number} — {s.full_name} ({s.class_name})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="label">Student Name *</label>
                    <input
                      type="text"
                      required
                      className="input"
                      placeholder="Enter student name"
                      value={newRecord.student_name}
                      onChange={(e) => setNewRecord({ ...newRecord, student_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Admission Number</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. GC-2026-001"
                      value={newRecord.admission_number}
                      onChange={(e) => setNewRecord({ ...newRecord, admission_number: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="label">Entry Type</label>
                    <select
                      className="input"
                      value={newRecord.type}
                      onChange={(e) => setNewRecord({ ...newRecord, type: e.target.value as any })}
                    >
                      <option value="Merit">⭐ Merit Award</option>
                      <option value="Commendation">🏆 Special Commendation</option>
                      <option value="Warning">⚠️ Warning Notice</option>
                      <option value="Demerit">❌ Demerit Points</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Discipline Points (±)</label>
                    <input
                      type="number"
                      className="input"
                      value={newRecord.points}
                      onChange={(e) => setNewRecord({ ...newRecord, points: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Incident / Award Title *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="e.g. Science Fair Project Gold Medal"
                    value={newRecord.title}
                    onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Detailed Remarks / Description</label>
                  <textarea
                    rows={3}
                    className="input"
                    placeholder="Provide context regarding the merit or caution..."
                    value={newRecord.description}
                    onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save to Registry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
