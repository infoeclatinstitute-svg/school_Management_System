import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import type { SchoolTerm } from '@/lib/database.types'

export function ManageTerms() {
  const queryClient = useQueryClient()

  const [showAddModal, setShowAddModal] = useState(false)
  const [name, setName] = useState('')
  const [academicYear, setAcademicYear] = useState(() => `${new Date().getFullYear()} Intake`)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Fetch intake cycles
  const { data: terms, isLoading } = useQuery({
    queryKey: ['admin-terms'],
    queryFn: async () => {
      try {
        const { data: syncRow } = await supabase
          .from('app_cloud_sync')
          .select('data')
          .eq('key', 'gc_v2_school_terms')
          .maybeSingle()
        if (syncRow?.data && Array.isArray(syncRow.data)) {
          localStorage.setItem('gc_v2_school_terms', JSON.stringify(syncRow.data))
          return syncRow.data as SchoolTerm[]
        }
      } catch {}
      try {
        const raw = localStorage.getItem('gc_v2_school_terms')
        return raw ? (JSON.parse(raw) as SchoolTerm[]) : []
      } catch {
        return []
      }
    },
  })

  // Add intake cycle mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      if (!name || !startDate || !endDate) return
      const current = terms || []
      const newTerm: SchoolTerm = {
        id: `term-${Date.now()}`,
        name: name.trim(),
        academic_year: academicYear.trim() || `${new Date().getFullYear()} Intake`,
        start_date: startDate,
        end_date: endDate,
        half_term_start: null,
        half_term_end: null,
        created_at: new Date().toISOString(),
      }
      const next = [...current, newTerm]
      localStorage.setItem('gc_v2_school_terms', JSON.stringify(next))
      try {
        await supabase
          .from('app_cloud_sync')
          .upsert({ key: 'gc_v2_school_terms', data: next, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      } catch {}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-terms'] })
      setShowAddModal(false)
      setName('')
    },
  })

  // Delete intake cycle mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!window.confirm('Are you sure you want to delete this intake batch schedule?')) return
      const next = (terms || []).filter((t) => t.id !== id)
      localStorage.setItem('gc_v2_school_terms', JSON.stringify(next))
      try {
        await supabase
          .from('app_cloud_sync')
          .upsert({ key: 'gc_v2_school_terms', data: next, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      } catch {}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-terms'] })
    },
  })

  return (
    <PageWrapper
      title="Intake Batches & Cohort Schedules"
      subtitle="Configure 4 to 12-week vocational short course intake dates and practical training cycles."
      action={
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          + Add Intake Batch
        </Button>
      }
    >
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
          <Spinner size="lg" />
        </div>
      ) : terms && terms.length > 0 ? (
        <div className="grid grid-3">
          {terms.map((t) => (
            <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge badge-primary">{t.academic_year}</span>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(t.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                    }}
                    title="Delete intake batch"
                  >
                    🗑️
                  </button>
                </div>
                <h3 className="course-card-title mt-2">{t.name}</h3>
                <div className="text-sm text-muted mt-2">
                  🗓️ {formatDate(t.start_date)} — {formatDate(t.end_date)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state card">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-title">No Intake Batches Configured</div>
          <div className="empty-state-desc">
            Define upcoming monthly short course intakes (e.g. Practical Cohort Morning / Evening) to coordinate student enrollments.
          </div>
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            + Add First Intake Batch
          </Button>
        </div>
      )}

      {/* Add Intake Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="📅 Add Short Course Intake Batch"
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            addMutation.mutate()
          }}
        >
          <div className="form-group">
            <label className="form-label" htmlFor="termName">Intake Batch Name *</label>
            <input
              id="termName"
              type="text"
              placeholder="e.g. Practical Cohort (Morning / Evening)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tYear">Intake Category</label>
            <input
              id="tYear"
              type="text"
              placeholder={`e.g. ${new Date().getFullYear()} Short Course Intake`}
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tStart">Cohort Start Date *</label>
            <input
              id="tStart"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tEnd">Graduation / Completion Date *</label>
            <input
              id="tEnd"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={addMutation.isPending}>
              Save Intake Batch →
            </Button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  )
}
