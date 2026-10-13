import { useState, useEffect } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { schoolStore } from '@/lib/schoolData'
import type { CollegeDepartment, CollegeSubject } from '@/types/school'

export function ManageSubjects() {
  const [departments, setDepartments] = useState<CollegeDepartment[]>(() => schoolStore.getDepartments())
  const [subjects, setSubjects] = useState<CollegeSubject[]>(() => {
    const storeSubs = schoolStore.getSubjects()
    const storeUnits = schoolStore.getCourseUnits()
    const fromUnits: CollegeSubject[] = storeUnits
      .filter((u) => !storeSubs.some((s) => s.code.toLowerCase() === u.code.toLowerCase() || s.name.toLowerCase() === u.title.toLowerCase()))
      .map((u) => ({
        id: u.id,
        code: u.code,
        name: u.title,
        description: u.description || `${u.program} • ${u.department}`,
        department_id: 'dept-curriculum',
        department_name: u.department,
        fee: 75,
        duration: u.course_duration || '3 Months Certificate',
        icon: '💻',
        badge: 'Active Course',
        category: 'Tech & Programming',
        color_hex: '#1e3a8a',
        created_at: u.created_at,
      }))
    return [...storeSubs, ...fromUnits]
  })

  // Synchronize on store update
  useEffect(() => {
    const refresh = () => {
      setDepartments(schoolStore.getDepartments())
      const storeSubs = schoolStore.getSubjects()
      const storeUnits = schoolStore.getCourseUnits()
      const fromUnits: CollegeSubject[] = storeUnits
        .filter((u) => !storeSubs.some((s) => s.code.toLowerCase() === u.code.toLowerCase() || s.name.toLowerCase() === u.title.toLowerCase()))
        .map((u) => ({
          id: u.id,
          code: u.code,
          name: u.title,
          description: u.description || `${u.program} • ${u.department}`,
          department_id: 'dept-curriculum',
          department_name: u.department,
          fee: 75,
          duration: u.course_duration || '3 Months Certificate',
          icon: '💻',
          badge: 'Active Course',
          category: 'Tech & Programming',
          color_hex: '#1e3a8a',
          created_at: u.created_at,
        }))
      setSubjects([...storeSubs, ...fromUnits])
    }
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    window.addEventListener('gc-courses-updated', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('gc-courses-updated', refresh)
    }
  }, [])

  const [activeTab, setActiveTab] = useState<'departments' | 'subjects'>('departments')

  // Department Modal State
  const [showDeptModal, setShowDeptModal] = useState(false)
  const [editingDept, setEditingDept] = useState<CollegeDepartment | null>(null)
  const [deptCode, setDeptCode] = useState('')
  const [deptName, setDeptName] = useState('')
  const [hodName, setHodName] = useState('')
  const [programsInput, setProgramsInput] = useState('')
  const [deptError, setDeptError] = useState<string | null>(null)

  // Open Edit Department
  const handleOpenEditDept = (dept: CollegeDepartment) => {
    setEditingDept(dept)
    setDeptCode(dept.code)
    setDeptName(dept.name)
    setHodName(dept.hod_name || '')
    setProgramsInput((dept.programs || []).join(', '))
    setDeptError(null)
  }

  // Add or Update Department
  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeptError(null)
    if (!deptCode.trim() || !deptName.trim()) {
      setDeptError('Department Code and Name are required.')
      return
    }

    try {
      if (editingDept) {
        // Update existing department
        await schoolStore.updateDepartment(editingDept.id, {
          code: deptCode.trim().toUpperCase(),
          name: deptName.trim(),
          hod_name: hodName.trim() || 'Appointed HOD',
          programs: programsInput
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean),
        })
        setDepartments(schoolStore.getDepartments())
        setEditingDept(null)
      } else {
        // Add new department
        const newDept: CollegeDepartment = {
          id: `dept-${Date.now()}`,
          code: deptCode.trim().toUpperCase(),
          name: deptName.trim(),
          hod_name: hodName.trim() || 'Appointed HOD',
          programs: programsInput
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean),
          created_at: new Date().toISOString(),
        }

        await schoolStore.addDepartment(newDept)
        setDepartments(schoolStore.getDepartments())
        setShowDeptModal(false)
      }
      setDeptCode('')
      setDeptName('')
      setHodName('')
      setProgramsInput('')
    } catch (err: any) {
      setDeptError(err.message || 'Failed to save department.')
    }
  }

  // Delete Department
  const handleDeleteDepartment = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      await schoolStore.deleteDepartment(id)
      setDepartments(schoolStore.getDepartments())
    }
  }
  const [editingSub, setEditingSub] = useState<CollegeSubject | null>(null)
  const [editFee, setEditFee] = useState<number>(0)
  const [editDuration, setEditDuration] = useState<string>('')
  const [editDescription, setEditDescription] = useState<string>('')
  const [editBadge, setEditBadge] = useState<string>('')
  const [editName, setEditName] = useState<string>('')
  const [editDeptId, setEditDeptId] = useState<string>('')
  const [editColor, setEditColor] = useState<string>('#1e3a8a')

  // Subject Creation State
  const [showSubModal, setShowSubModal] = useState(false)
  const [subCode, setSubCode] = useState('')
  const [subName, setSubName] = useState('')
  const [subDeptId, setSubDeptId] = useState('')
  const [subFee, setSubFee] = useState<number>(60)
  const [subDuration, setSubDuration] = useState('8 Weeks (2 Months)')
  const [subBadge, setSubBadge] = useState('Certified')
  const [subDescription, setSubDescription] = useState('')
  const subColor = '#2563eb'
  const [subError, setSubError] = useState<string | null>(null)

  // Add Subject / Short Course
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubError(null)
    if (!subCode.trim() || !subName.trim()) {
      setSubError('Subject Code and Title are required.')
      return
    }

    const parentDept = departments.find((d) => d.id === subDeptId) || departments[0]

    try {
      const newSub: CollegeSubject = {
        id: `sub-${Date.now()}`,
        code: subCode.trim().toUpperCase(),
        name: subName.trim(),
        department_id: parentDept?.id || 'dept-general',
        department_name: parentDept?.name || 'General Studies',
        fee: Number(subFee) || 60,
        duration: subDuration || '8 Weeks (2 Months)',
        badge: subBadge || 'Certified',
        description: subDescription,
        color_hex: subColor,
        created_at: new Date().toISOString(),
      }

      await schoolStore.addSubject(newSub)
      setSubjects(schoolStore.getSubjects())
      setShowSubModal(false)
      setSubCode('')
      setSubName('')
      setSubDescription('')
    } catch (err: any) {
      setSubError(err.message || 'Failed to add subject.')
    }
  }

  // Open Edit Subject Modal
  const handleOpenEditSubject = (sub: CollegeSubject) => {
    setEditingSub(sub)
    setEditName(sub.name)
    setEditFee(sub.fee || 60)
    setEditDuration(sub.duration || '8 Weeks (2 Months)')
    setEditDescription(sub.description || '')
    setEditBadge(sub.badge || 'Certified')
    setEditDeptId(sub.department_id)
    setEditColor(sub.color_hex || '#1e3a8a')
  }

  // Save Subject / Course Edits
  const handleSaveEditSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSub) return

    const parentDept = departments.find((d) => d.id === editDeptId) || departments.find((d) => d.id === editingSub.department_id)

    const updated: Partial<CollegeSubject> = {
      name: editName,
      fee: Number(editFee),
      duration: editDuration,
      description: editDescription,
      badge: editBadge,
      department_id: parentDept?.id || editingSub.department_id,
      department_name: parentDept?.name || editingSub.department_name,
      color_hex: editColor,
    }

    await schoolStore.updateSubject(editingSub.id, updated)
    setSubjects(schoolStore.getSubjects())
    setEditingSub(null)
  }

  // Delete Subject
  const handleDeleteSubject = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete Subject "${name}"?`)) {
      await schoolStore.deleteSubject(id)
      setSubjects(schoolStore.getSubjects())
    }
  }

  return (
    <PageWrapper
      title="Academic Departments & Subject Disciplines"
      subtitle="Establish institutional academic departments, certified programs, and subject disciplines that teachers use to build course units."
    >
      {/* Tab Switcher */}
      <div className="card mb-6" style={{ padding: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'departments' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('departments')}
          >
            🏛️ Academic Departments ({departments.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'subjects' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('subjects')}
          >
            🧪 Curriculum Subjects & Disciplines ({subjects.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Departments */}
      {activeTab === 'departments' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>College Academic Departments</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0.2rem 0 0' }}>
                Departments house certified programs and course units created by faculty.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowDeptModal(true)}
            >
              + Introduce New Department
            </button>
          </div>

          {departments.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px', margin: '2rem auto' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏛️</div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>No Departments Introduced Yet</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                Introduce academic departments (e.g. Computer Science, Business Management) so faculty can select them when creating course units.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowDeptModal(true)}
              >
                + Introduce First Department
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {departments.map((dept) => (
                <div key={dept.id} className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-primary" style={{ fontWeight: 800 }}>{dept.code}</span>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{dept.name}</h4>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.78rem', fontWeight: 700 }}
                        onClick={() => handleOpenEditDept(dept)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}
                        onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                    👨‍🏫 Head of Department (HOD): <strong>{dept.hod_name}</strong>
                  </div>

                  <div style={{ background: 'var(--color-bg-secondary)', padding: '0.75rem', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                      Certified Programs ({dept.programs?.length || 0})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem' }}>
                      {dept.programs?.map((prog, idx) => (
                        <span key={idx}>• {prog}</span>
                      ))}
                      {(!dept.programs || dept.programs.length === 0) && (
                        <span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>No specific programs listed</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Subjects & Short Courses */}
      {activeTab === 'subjects' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Online Programs, Tuition Fees & Curriculum</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: '0.2rem 0 0' }}>
                Admin controls: Update international course pricing ($ USD), duration, descriptions, and department allocations.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowSubModal(true)}
              disabled={departments.length === 0}
            >
              + Introduce New Course
            </button>
          </div>

          {departments.length === 0 && (
            <div className="card mb-4" style={{ padding: '1rem', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
              ⚠️ Please introduce at least one Academic Department first before configuring Course Disciplines.
            </div>
          )}

          {subjects.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px', margin: '2rem auto' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🧪</div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>No Courses Configured</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                Add online programs (e.g. Full-Stack Web Dev, Python Analytics, IELTS Prep, English Mastery) to set custom fees.
              </p>
            </div>
          ) : (
            <div className="card" style={{ padding: '1.25rem' }}>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Course / Discipline</th>
                      <th>Department</th>
                      <th>Tuition Fee ($ USD)</th>
                      <th>Duration</th>
                      <th>Badge / Tag</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((sub) => (
                      <tr key={sub.id}>
                        <td><strong>{sub.code}</strong></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.2rem' }}>{sub.icon || '📘'}</span>
                            <div>
                              <strong style={{ color: 'var(--color-text)' }}>{sub.name}</strong>
                              {sub.description && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {sub.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td><span className="badge badge-info">{sub.department_name}</span></td>
                        <td>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#16a34a' }}>
                            ${(sub.fee || 60).toLocaleString()}
                          </span>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                            KES {Math.round((sub.fee || 60) * 130).toLocaleString()}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                            {sub.duration || '8 Weeks (2 Months)'}
                          </span>
                        </td>
                        <td>
                          <span className="badge" style={{ background: '#f1f5f9', color: '#1e3a8a', border: '1px solid #cbd5e1' }}>
                            {sub.badge || 'Certified'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => handleOpenEditSubject(sub)}
                              title="Edit Tuition Price & Course Details"
                            >
                              ✏️ Edit Price & Details
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteSubject(sub.id, sub.name)}
                              title="Delete Course"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Department Modal */}
      {(showDeptModal || editingDept) && (
        <div className="modal-overlay" onClick={() => { setShowDeptModal(false); setEditingDept(null); }}>
          <div className="modal-content modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingDept ? `✏️ Edit Department: ${editingDept.name}` : '🏛️ Introduce Academic Department'}</h3>
              <button type="button" className="modal-close" onClick={() => { setShowDeptModal(false); setEditingDept(null); }}>✕</button>
            </div>
            <form onSubmit={handleSaveDepartment}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {deptError && <div style={{ color: '#dc2626', fontSize: '0.85rem' }}>⚠️ {deptError}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="label">Dept Code *</label>
                    <input type="text" required className="input" placeholder="e.g. ICT" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Department Name *</label>
                    <input type="text" required className="input" placeholder="e.g. Department of Computer Science & ICT" value={deptName} onChange={(e) => setDeptName(e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="label">Head of Department (HOD)</label>
                  <input type="text" className="input" placeholder="e.g. Mr. James Mwangi" value={hodName} onChange={(e) => setHodName(e.target.value)} />
                </div>

                <div>
                  <label className="label">Certified Programs (Comma-separated)</label>
                  <textarea rows={2} className="input" placeholder="e.g. Computer Packages, Full-Stack Web, Python Analytics" value={programsInput} onChange={(e) => setProgramsInput(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowDeptModal(false); setEditingDept(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingDept ? '💾 Update Department' : 'Save Department'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Short Course Modal */}
      {showSubModal && (
        <div className="modal-overlay" onClick={() => setShowSubModal(false)}>
          <div className="modal-content modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Introduce New Short Course & Set Fee</h3>
              <button type="button" className="modal-close" onClick={() => setShowSubModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddSubject}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {subError && <div style={{ color: '#dc2626', fontSize: '0.85rem' }}>⚠️ {subError}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="label">Code *</label>
                    <input type="text" required className="input" placeholder="e.g. BAR-101" value={subCode} onChange={(e) => setSubCode(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Course Title *</label>
                    <input type="text" required className="input" placeholder="e.g. Professional Barista Mastery" value={subName} onChange={(e) => setSubName(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="label">Tuition Fee ($ USD) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="input"
                      value={subFee}
                      onChange={(e) => setSubFee(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="label">Course Duration</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. 4 to 6 Weeks"
                      value={subDuration}
                      onChange={(e) => setSubDuration(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="label">Badge / Highlighting Tag</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Certified, Popular"
                      value={subBadge}
                      onChange={(e) => setSubBadge(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Select Parent Department *</label>
                    <select className="input" value={subDeptId} onChange={(e) => setSubDeptId(e.target.value)}>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Course Description</label>
                  <textarea
                    rows={2}
                    className="input"
                    placeholder="Brief description of practical training..."
                    value={subDescription}
                    onChange={(e) => setSubDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSubModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">✓ Save Course & Fee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Short Course & Price Modal */}
      {editingSub && (
        <div className="modal-overlay" onClick={() => setEditingSub(null)}>
          <div className="modal-content modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ margin: 0 }}>Edit Course Fee & Curriculum Details</h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Code: {editingSub.code} • Updating price and duration</div>
              </div>
              <button type="button" className="modal-close" onClick={() => setEditingSub(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveEditSubject}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="label">Course Name *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Tuition Fee ($ USD) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="input"
                      value={editFee}
                      onChange={(e) => setEditFee(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="label">Course Duration</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. 8 Weeks (2 Months)"
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Badge / Highlighting Tag</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. High Demand, Most Popular"
                      value={editBadge}
                      onChange={(e) => setEditBadge(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Parent Department</label>
                    <select
                      className="input"
                      value={editDeptId}
                      onChange={(e) => setEditDeptId(e.target.value)}
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Course Description & Practical Skills</label>
                  <textarea
                    rows={3}
                    className="input"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingSub(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">✓ Update Course & Fee</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
