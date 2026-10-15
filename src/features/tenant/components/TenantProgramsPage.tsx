import React, { useState, useEffect, useId } from 'react'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'
import type { PartnerSchoolTenant, InstitutionProgram } from '@/types/tenantSchool'
import {
  SearchIcon,
  ArrowRightIcon,
  CalendarIcon,
  CreditCardIcon,
  ClockIcon,
} from '@/components/icons/AppIcons'

interface TenantProgramsPageProps {
  school: PartnerSchoolTenant
  isAdmin?: boolean
  onOpenAdmissions?: (programTitle?: string) => void
}

export function TenantProgramsPage({
  school,
  isAdmin = false,
  onOpenAdmissions,
}: TenantProgramsPageProps) {
  const formId = useId()
  const [programs, setPrograms] = useState<InstitutionProgram[]>(() =>
    tenantSchoolStore.getProgramsBySchool(school.slug)
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLevel, setSelectedLevel] = useState<string>('All')
  const [selectedDept, setSelectedDept] = useState<string>('All')

  // Program details view modal
  const [detailProgram, setDetailProgram] = useState<InstitutionProgram | null>(null)

  // Admin Add / Edit Program Modal
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState<InstitutionProgram | null>(null)

  // Editor form fields
  const [editTitle, setEditTitle] = useState('')
  const [editDepartment, setEditDepartment] = useState('')
  const [editLevel, setEditLevel] = useState<InstitutionProgram['level']>('Diploma')
  const [editDuration, setEditDuration] = useState('2 Years (6 Semesters)')
  const [editTuitionFee, setEditTuitionFee] = useState<number>(35000)
  const [editFeeCurrency, setEditFeeCurrency] = useState(school.currency || 'KES')
  const [editIntake, setEditIntake] = useState('January, May & September Intakes')
  const [editRequirements, setEditRequirements] = useState('KCSE Mean Grade C- or Equivalent')
  const [editDescription, setEditDescription] = useState('')
  const [editOutcomes, setEditOutcomes] = useState('')
  const [editFeatured, setEditFeatured] = useState(false)

  // Listen to program store updates
  useEffect(() => {
    const handleUpdate = () => {
      setPrograms(tenantSchoolStore.getProgramsBySchool(school.slug))
    }
    window.addEventListener('gc-tenant-programs-updated', handleUpdate)
    return () => window.removeEventListener('gc-tenant-programs-updated', handleUpdate)
  }, [school.slug])

  const openNewProgramModal = () => {
    setEditingProgram(null)
    setEditTitle('')
    setEditDepartment(school.departments_list?.[0] || 'School of Computing & IT')
    setEditLevel('Diploma')
    setEditDuration('2 Years (6 Semesters)')
    setEditTuitionFee(35000)
    setEditFeeCurrency(school.currency || 'KES')
    setEditIntake('January, May & September Intakes')
    setEditRequirements('KCSE Mean Grade C- or Equivalent Certificate')
    setEditDescription('')
    setEditOutcomes('')
    setEditFeatured(false)
    setIsEditorOpen(true)
  }

  const openEditModal = (prog: InstitutionProgram) => {
    setEditingProgram(prog)
    setEditTitle(prog.title)
    setEditDepartment(prog.department)
    setEditLevel(prog.level)
    setEditDuration(prog.duration)
    setEditTuitionFee(prog.tuition_fee)
    setEditFeeCurrency(prog.fee_currency || school.currency || 'KES')
    setEditIntake(prog.intake_period)
    setEditRequirements(prog.requirements)
    setEditDescription(prog.description)
    setEditOutcomes((prog.career_outcomes || []).join(', '))
    setEditFeatured(prog.featured || false)
    setIsEditorOpen(true)
  }

  const handleSaveProgram = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTitle.trim()) return

    const outcomesArray = editOutcomes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    if (editingProgram) {
      tenantSchoolStore.updateProgram(editingProgram.id, {
        title: editTitle.trim(),
        department: editDepartment.trim(),
        level: editLevel,
        duration: editDuration.trim(),
        tuition_fee: Number(editTuitionFee) || 0,
        fee_currency: editFeeCurrency,
        intake_period: editIntake.trim(),
        requirements: editRequirements.trim(),
        description: editDescription.trim(),
        career_outcomes: outcomesArray,
        featured: editFeatured,
      })
    } else {
      tenantSchoolStore.createProgram({
        school_slug: school.slug,
        title: editTitle.trim(),
        department: editDepartment.trim(),
        level: editLevel,
        duration: editDuration.trim(),
        tuition_fee: Number(editTuitionFee) || 0,
        fee_currency: editFeeCurrency,
        intake_period: editIntake.trim(),
        requirements: editRequirements.trim(),
        description: editDescription.trim(),
        career_outcomes: outcomesArray,
        featured: editFeatured,
      })
    }

    setPrograms(tenantSchoolStore.getProgramsBySchool(school.slug))
    setIsEditorOpen(false)
  }

  const handleDeleteProgram = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to remove "${title}"?`)) {
      tenantSchoolStore.deleteProgram(id)
      setPrograms(tenantSchoolStore.getProgramsBySchool(school.slug))
      if (detailProgram?.id === id) setDetailProgram(null)
    }
  }

  // Filtered Programs
  const filtered = programs.filter((p) => {
    const matchSearch =
      searchQuery === '' ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchLevel = selectedLevel === 'All' || p.level === selectedLevel
    const matchDept = selectedDept === 'All' || p.department === selectedDept
    return matchSearch && matchLevel && matchDept
  })

  const departmentsAvailable = Array.from(
    new Set([...(school.departments_list || []), ...programs.map((p) => p.department)])
  )

  const levelsAvailable = ['All', 'Diploma', 'Certificate', 'Degree', 'High School / Secondary', 'Artisan / Short Course']

  return (
    <div style={{ minHeight: '80vh', paddingBottom: '4rem' }}>
      {/* Hero Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${school.primary_color} 0%, #0f172a 100%)`,
          color: '#ffffff',
          borderRadius: '24px',
          padding: '2.5rem 2rem',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: `0 16px 36px ${school.primary_color}25`,
        }}
      >
        <div style={{ maxWidth: '850px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.6rem' }}>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.16)',
                color: school.accent_color,
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.74rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              🎓 Academic Prospectus &amp; Programs
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>
              • {programs.length} Approved Programs Offered
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 900, margin: '0 0 0.5rem', lineHeight: 1.2 }}>
            Programs Offered at {school.name}
          </h1>

          <p style={{ fontSize: '1rem', opacity: 0.9, margin: '0 0 1.25rem', lineHeight: 1.55 }}>
            Explore industry-aligned courses, diplomas, and certifications designed for practical competence and career leadership.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {onOpenAdmissions && (
              <button
                type="button"
                onClick={() => onOpenAdmissions()}
                style={{
                  background: school.accent_color || '#d4af37',
                  color: '#0f172a',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  padding: '0.7rem 1.4rem',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                Apply for Admission Now <ArrowRightIcon size={16} />
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={openNewProgramModal}
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  fontWeight: 900,
                  fontSize: '0.86rem',
                  padding: '0.7rem 1.25rem',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                + Add New Program (Admin)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          marginBottom: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search programs by name, keyword, or career..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.4rem',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            <div style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
              <SearchIcon size={16} />
            </div>
          </div>

          {departmentsAvailable.length > 0 && (
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                fontWeight: 700,
                background: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <option value="All">All Faculties / Departments</option>
              {departmentsAvailable.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Level Badges */}
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Level:
          </span>
          {levelsAvailable.map((lvl) => {
            const active = selectedLevel === lvl
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => setSelectedLevel(lvl)}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: '999px',
                  border: active ? `2px solid ${school.primary_color}` : '1px solid #e2e8f0',
                  background: active ? school.primary_color : '#f8fafc',
                  color: active ? '#ffffff' : '#475569',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {lvl}
              </button>
            )
          })}
        </div>
      </div>

      {/* Program Cards Grid */}
      {filtered.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '3rem 2rem',
            textAlign: 'center',
            border: '1px dashed #cbd5e1',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📖</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem' }}>
            No programs matching your criteria
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 1rem' }}>
            Try clearing your search filters or check back later for newly scheduled intakes.
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={openNewProgramModal}
              style={{
                background: school.primary_color,
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '0.7rem 1.3rem',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              + Add First Program
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filtered.map((prog) => (
            <div
              key={prog.id}
              style={{
                background: '#ffffff',
                borderRadius: '18px',
                border: prog.featured ? `2px solid ${school.primary_color}` : '1px solid #e2e8f0',
                padding: '1.4rem',
                boxShadow: '0 6px 20px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              <div>
                {/* Header Level & Department */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                  <span
                    style={{
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '3px 9px',
                      borderRadius: '999px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {prog.level}
                  </span>
                  {prog.featured && (
                    <span
                      style={{
                        background: '#fef3c7',
                        color: '#92400e',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        padding: '2px 8px',
                        borderRadius: '999px',
                      }}
                    >
                      ★ FEATURED
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                  {prog.department}
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.65rem', lineHeight: 1.3 }}>
                  {prog.title}
                </h3>

                <p style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.5, margin: '0 0 1rem' }}>
                  {prog.description.length > 130 ? `${prog.description.substring(0, 130)}...` : prog.description}
                </p>

                {/* Key Facts Pill Grid */}
                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1rem', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155' }}>
                    <ClockIcon size={14} color="#64748b" />
                    <span><strong>Duration:</strong> {prog.duration}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155' }}>
                    <CreditCardIcon size={14} color="#64748b" />
                    <span>
                      <strong>Tuition:</strong> {prog.fee_currency} {Number(prog.tuition_fee).toLocaleString()} / term
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155' }}>
                    <CalendarIcon size={14} color="#64748b" />
                    <span><strong>Intake:</strong> {prog.intake_period}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setDetailProgram(prog)}
                  style={{
                    flex: 1,
                    background: '#f1f5f9',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  View Details &amp; Criteria
                </button>

                {onOpenAdmissions && (
                  <button
                    type="button"
                    onClick={() => onOpenAdmissions(prog.title)}
                    style={{
                      background: school.primary_color,
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '0.6rem 0.95rem',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Apply Now
                  </button>
                )}

                {isAdmin && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => openEditModal(prog)}
                      title="Edit Program"
                      style={{
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        borderRadius: '8px',
                        padding: '0.5rem 0.7rem',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProgram(prog.id, prog.title)}
                      title="Delete Program"
                      style={{
                        background: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        padding: '0.5rem 0.7rem',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Program Details View Modal */}
      {detailProgram && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.25rem',
          }}
          onClick={() => setDetailProgram(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '620px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
              maxHeight: 'calc(100dvh - 2rem)',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <span
                  style={{
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    fontSize: '0.74rem',
                    fontWeight: 900,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    textTransform: 'uppercase',
                  }}
                >
                  {detailProgram.level}
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: '0.5rem 0 0.2rem' }}>
                  {detailProgram.title}
                </h2>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>
                  {detailProgram.department}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailProgram(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 900 }}
              >
                ✕
              </button>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', margin: '1rem 0' }} />

            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Program Overview
              </h4>
              <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                {detailProgram.description}
              </p>
            </div>

            <div style={{ background: '#f8fafc', padding: '1.15rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.84rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem', fontWeight: 700 }}>DURATION</span>
                <strong>{detailProgram.duration}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem', fontWeight: 700 }}>TUITION PER TERM</span>
                <strong style={{ color: '#059669' }}>{detailProgram.fee_currency} {Number(detailProgram.tuition_fee).toLocaleString()}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem', fontWeight: 700 }}>INTAKE SCHEDULE</span>
                <strong>{detailProgram.intake_period}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem', fontWeight: 700 }}>QUALIFICATION LEVEL</span>
                <strong>{detailProgram.level}</strong>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Minimum Admission Requirements
              </h4>
              <div style={{ background: '#eff6ff', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #bfdbfe', fontSize: '0.85rem', color: '#1e3a8a', fontWeight: 700 }}>
                ✓ {detailProgram.requirements}
              </div>
            </div>

            {detailProgram.career_outcomes && detailProgram.career_outcomes.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Target Career Paths &amp; Industry Roles
                </h4>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {detailProgram.career_outcomes.map((career) => (
                    <span
                      key={career}
                      style={{
                        background: '#f1f5f9',
                        color: '#334155',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                      }}
                    >
                      💼 {career}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {onOpenAdmissions && (
                <button
                  type="button"
                  onClick={() => {
                    const prog = detailProgram.title
                    setDetailProgram(null)
                    onOpenAdmissions(prog)
                  }}
                  style={{
                    flex: 1,
                    background: school.primary_color,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '0.85rem',
                    fontSize: '0.9rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  Apply for this Program Now →
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetailProgram(null)}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.85rem 1.25rem',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Add / Edit Program Modal */}
      {isEditorOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.25rem',
          }}
          onClick={() => setIsEditorOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '640px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
              maxHeight: 'calc(100dvh - 2rem)',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  {editingProgram ? 'Edit Academic Program' : 'Add New Academic Program'}
                </h2>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Controlled by Admin • Displayed live on prospective students landing page
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 900 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProgram} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label htmlFor={`${formId}-title`} style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Program Title *
                </label>
                <input
                  id={`${formId}-title`}
                  type="text"
                  required
                  placeholder="e.g. Diploma in Cyber Security & Digital Forensics"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label htmlFor={`${formId}-dept`} style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Faculty / Department *
                  </label>
                  <input
                    id={`${formId}-dept`}
                    type="text"
                    required
                    placeholder="e.g. School of Computing & IT"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label htmlFor={`${formId}-level`} style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Qualification Level *
                  </label>
                  <select
                    id={`${formId}-level`}
                    value={editLevel}
                    onChange={(e) => setEditLevel(e.target.value as any)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#ffffff', fontWeight: 700 }}
                  >
                    <option value="Diploma">Diploma</option>
                    <option value="Certificate">Certificate</option>
                    <option value="Higher Diploma">Higher Diploma</option>
                    <option value="Degree">Degree</option>
                    <option value="Postgraduate">Postgraduate</option>
                    <option value="Artisan / Short Course">Artisan / Short Course</option>
                    <option value="High School / Secondary">High School / Secondary</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label htmlFor={`${formId}-duration`} style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Duration *
                  </label>
                  <input
                    id={`${formId}-duration`}
                    type="text"
                    required
                    placeholder="e.g. 2 Years (6 Semesters)"
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label htmlFor={`${formId}-tuition`} style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Tuition Fee ({editFeeCurrency}) *
                  </label>
                  <input
                    id={`${formId}-tuition`}
                    type="number"
                    required
                    placeholder="35000"
                    value={editTuitionFee}
                    onChange={(e) => setEditTuitionFee(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 800 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label htmlFor={`${formId}-intake`} style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Intake Cycles *
                  </label>
                  <input
                    id={`${formId}-intake`}
                    type="text"
                    placeholder="e.g. January, May & September"
                    value={editIntake}
                    onChange={(e) => setEditIntake(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label htmlFor={`${formId}-req`} style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Admission Requirements *
                  </label>
                  <input
                    id={`${formId}-req`}
                    type="text"
                    placeholder="e.g. KCSE Mean Grade C- or Certificate"
                    value={editRequirements}
                    onChange={(e) => setEditRequirements(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor={`${formId}-desc`} style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Program Description &amp; Syllabus Highlights
                </label>
                <textarea
                  id={`${formId}-desc`}
                  rows={3}
                  placeholder="Detail the modules, competencies, practical workshops, and learning outcomes..."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', resize: 'vertical' }}
                />
              </div>

              <div>
                <label htmlFor={`${formId}-careers`} style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Career Outcomes (Comma-separated)
                </label>
                <input
                  id={`${formId}-careers`}
                  type="text"
                  placeholder="e.g. Security Analyst, Network Admin, Penetration Tester"
                  value={editOutcomes}
                  onChange={(e) => setEditOutcomes(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id={`${formId}-featured`}
                  checked={editFeatured}
                  onChange={(e) => setEditFeatured(e.target.checked)}
                />
                <label htmlFor={`${formId}-featured`} style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}>
                  Highlight as Featured Program on Prospectus Banner
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', padding: '0.8rem', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 2, background: school.primary_color, color: '#ffffff', border: 'none', borderRadius: '12px', padding: '0.8rem', fontSize: '0.9rem', fontWeight: 900, cursor: 'pointer' }}
                >
                  {editingProgram ? 'Save Changes' : 'Publish Program Live'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
