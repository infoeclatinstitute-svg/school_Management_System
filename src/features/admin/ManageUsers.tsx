import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { schoolStore } from '@/lib/schoolData'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { RoleBadge } from '@/components/ui/Badge'
import { isAccessExpired, formatDate, daysUntil, sanitizeInput } from '@/lib/utils'
import { hashPassword } from '@/lib/crypto'
import type { Profile, Role, Class } from '@/lib/database.types'

export function ManageUsers() {
  const queryClient = useQueryClient()

  const [activeRoleTab, setActiveRoleTab] = useState<'all' | 'student' | 'teacher' | 'bursar' | 'parent'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Add User Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [fullName, setFullName] = useState('')
  const [admissionNumber, setAdmissionNumber] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('student')
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [modalError, setModalError] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState<{ name: string; id: string; password: string; role: Role } | null>(null)

  // Reset Password Modal State
  const [resettingUser, setResettingUser] = useState<Profile | null>(null)
  const [newResetPassword, setNewResetPassword] = useState('')

  // Manage Student Courses Modal State
  const [managingStudent, setManagingStudent] = useState<Profile | null>(null)
  const [selectedUnitToAdd, setSelectedUnitToAdd] = useState<string>('')
  const [isAddingCourse, setIsAddingCourse] = useState(false)
  const [courseActionMsg, setCourseActionMsg] = useState<string | null>(null)

  // Helper to look up the admin-issued plaintext password for any user
  const getIssuedPassword = (u: Profile): string => {
    try {
      const cleanKey = u.admission_number.toLowerCase().replace(/[^a-z0-9]/g, '')
      const localCredsRaw = localStorage.getItem('gc_v2_local_credentials') || localStorage.getItem('gc_local_credentials')
      if (localCredsRaw) {
        const parsed = JSON.parse(localCredsRaw)
        const entry = parsed[cleanKey] || parsed[u.admission_number.toLowerCase()] || parsed[u.admission_number]
        if (entry?.password) return entry.password
      }
    } catch {}

    if (u.role === 'student') {
      const st = schoolStore.getStudents().find(
        (s) => s.admission_number.toLowerCase() === u.admission_number.toLowerCase() || s.id === u.id
      )
      if (st?.portal_password) return st.portal_password
    }

    if (u.role === 'teacher') {
      const tc = schoolStore.getTeachers().find(
        (t) => (t.staff_id || t.id).toLowerCase() === u.admission_number.toLowerCase() || t.id === u.id
      )
      if (tc?.portal_password) return tc.portal_password
    }

    return 'Not Set (Click Set Password)'
  }

  const handleCopyCredentials = (u: Profile, passOverride?: string) => {
    const pass = passOverride || getIssuedPassword(u)
    const slip = [
      `GLOBAL COLLEGE — OFFICIAL PORTAL CREDENTIALS`,
      `Full Name: ${u.full_name}`,
      `Portal Role: ${u.role.toUpperCase()}`,
      `Login ID / Admission No: ${u.admission_number}`,
      `Password: ${pass}`,
      `Login URL: ${window.location.origin}/login?role=${u.role}`,
    ].join('\n')

    navigator.clipboard?.writeText(slip).catch(() => {})
    setCopiedId(u.id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resettingUser || !newResetPassword.trim()) return

    const cleanPass = sanitizeInput(newResetPassword.trim())
    const cleanAdm = resettingUser.admission_number.trim()
    const cleanKey = cleanAdm.toLowerCase().replace(/[^a-z0-9]/g, '')

    try {
      const stored = localStorage.getItem('gc_v2_local_credentials')
      const parsed = stored ? JSON.parse(stored) : {}
      const passHash = await hashPassword(cleanPass)
      parsed[cleanKey] = {
        ...(parsed[cleanKey] || {}),
        id: resettingUser.id,
        admission_number: cleanAdm,
        full_name: resettingUser.full_name,
        password: cleanPass,
        passwordHash: passHash,
        role: resettingUser.role,
        profile: resettingUser,
        created_at: resettingUser.created_at || new Date().toISOString(),
      }
      localStorage.setItem('gc_v2_local_credentials', JSON.stringify(parsed))
      localStorage.setItem('gc_local_credentials', JSON.stringify(parsed))
    } catch {}

    if (resettingUser.role === 'student') {
      const existingStudent = schoolStore.getStudents().find(
        (s) => s.admission_number.toLowerCase() === cleanAdm.toLowerCase() || s.id === resettingUser.id
      )
      if (existingStudent) {
        await schoolStore.updateStudent(existingStudent.id, { portal_password: cleanPass })
      }
    } else if (resettingUser.role === 'teacher') {
      const existingTeacher = schoolStore.getTeachers().find(
        (t) => (t.staff_id || t.id).toLowerCase() === cleanAdm.toLowerCase() || t.id === resettingUser.id
      )
      if (existingTeacher) {
        await schoolStore.addTeacher({
          ...existingTeacher,
          portal_password: cleanPass,
        })
      }
    }

    setSuccessBanner({
      name: resettingUser.full_name,
      id: cleanAdm,
      password: cleanPass,
      role: resettingUser.role,
    })
    setResettingUser(null)
    setNewResetPassword('')
    queryClient.invalidateQueries({ queryKey: ['admin-manage-users'] })
  }

  // Default institutional programs fallback (empty — only dynamic Admin-created courses are listed)
  const DEFAULT_PROGRAMS: Class[] = []

  // Fetch all profiles strictly from active SIS students, Faculty teachers, and local credentials
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-manage-users'],
    queryFn: async () => {
      try {
        await schoolStore.syncWithCloud(true)
      } catch {}

      const mergedMap = new Map<string, Profile>()

      // 1. Merge SIS Students from schoolStore
      schoolStore.getStudents().forEach((s) => {
        const key = s.admission_number.toLowerCase().trim()
        if (!mergedMap.has(key)) {
          mergedMap.set(key, {
            id: s.id,
            full_name: s.full_name,
            admission_number: s.admission_number,
            role: 'student',
            first_login_at: null,
            access_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            is_active: s.status === 'Active',
            created_at: s.enrollment_date || new Date().toISOString(),
          })
        }
      })

      // 2. Merge Faculty Teachers from schoolStore
      schoolStore.getTeachers().forEach((t) => {
        const adm = (t.staff_id || t.id).trim()
        const key = adm.toLowerCase()
        if (!mergedMap.has(key)) {
          mergedMap.set(key, {
            id: t.id,
            full_name: t.name,
            admission_number: adm,
            role: 'teacher',
            first_login_at: null,
            access_expires_at: null,
            is_active: true,
            created_at: t.created_at || new Date().toISOString(),
          })
        }
      })

      // 3. Merge Local Credentials store (for non-student/teacher staff or newly provisioned credentials)
      try {
        const localCredsRaw = localStorage.getItem('gc_v2_local_credentials')
        if (localCredsRaw) {
          const parsed = JSON.parse(localCredsRaw)
          Object.values(parsed).forEach((p: any) => {
            const adm = p.admission_number || p.profile?.admission_number
            const fullNameVal = p.full_name || p.profile?.full_name
            const roleVal = p.role || p.profile?.role || 'student'
            if (adm && fullNameVal) {
              const key = String(adm).toLowerCase().trim()
              if (!mergedMap.has(key)) {
                mergedMap.set(key, {
                  id: p.id || p.profile?.id || `usr-${adm}`,
                  full_name: fullNameVal,
                  admission_number: adm,
                  role: roleVal,
                  first_login_at: null,
                  access_expires_at:
                    p.profile?.access_expires_at ||
                    (roleVal === 'student'
                      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                      : null),
                  is_active: true,
                  created_at: p.created_at || p.profile?.created_at || new Date().toISOString(),
                })
              }
            }
          })
        }
      } catch {}

      return Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      )
    },
  })

  // Fetch classes
  const { data: _classesData } = useQuery({
    queryKey: ['classes-admin-users'],
    queryFn: async () => {
      return [] as Class[]
    },
  })

  const unitsFromStore: Class[] = schoolStore.getCourseUnits().map((u) => ({
    id: u.id,
    name: u.title,
    grade_level: `${u.credit_hours} Credits (${u.course_duration || 'Short Course'})`,
    academic_year: `${new Date().getFullYear()} Virtual Cohort`,
    created_at: u.created_at,
  }))

  const subjectsFromStore: Class[] = schoolStore.getSubjects().map((s) => ({
    id: s.id,
    name: s.name,
    grade_level: s.duration || 'Certificate Program',
    academic_year: `${new Date().getFullYear()} Virtual Cohort`,
    created_at: s.created_at,
  }))

  const dynamicCombined: Class[] = [...unitsFromStore, ...subjectsFromStore]
  for (const def of DEFAULT_PROGRAMS) {
    if (!dynamicCombined.some((c) => c.name.toLowerCase().trim() === def.name.toLowerCase().trim())) {
      dynamicCombined.push(def)
    }
  }

  const availableClasses: Class[] = dynamicCombined

  const toggleSelectClass = (cId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(cId) ? prev.filter((id) => id !== cId) : [...prev, cId]
    )
  }

  const selectAllClasses = () => {
    setSelectedClassIds(availableClasses.map((c) => c.id))
  }

  const clearAllClasses = () => {
    setSelectedClassIds([])
  }

  const openProvisionModal = (targetRole: Role) => {
    const yr = new Date().getFullYear()
    const countForRole = (users?.filter((u) => u.role === targetRole).length || 0) + 1
    const nextNum = String(countForRole).padStart(3, '0')
    setRole(targetRole)
    if (targetRole === 'student') {
      setAdmissionNumber(`GC-${yr}-${nextNum}`)
      setPassword(`Student@${yr}`)
    } else if (targetRole === 'teacher') {
      setAdmissionNumber(`STF-${yr}-${nextNum}`)
      setPassword(`Teacher@${yr}`)
    } else if (targetRole === 'bursar') {
      setAdmissionNumber(`BUR-${yr}-${nextNum}`)
      setPassword(`Bursar@${yr}`)
    } else if (targetRole === 'parent') {
      setAdmissionNumber(`PAR-${yr}-${nextNum}`)
      setPassword(`Parent@${yr}`)
    } else {
      setAdmissionNumber(`ADM-${yr}-${nextNum}`)
      setPassword(`Admin@${yr}`)
    }
    setModalError(null)
    setShowAddModal(true)
  }

  // Add user mutation (resilient multi-tier persistence across cloud store, local store, and Supabase)
  const addUserMutation = useMutation({
    mutationFn: async () => {
      if (!fullName.trim() || !admissionNumber.trim() || !password.trim()) {
        throw new Error('Please complete all required fields.')
      }

      if (password.trim().length < 4) {
        throw new Error('Password must be at least 4 characters long.')
      }

      const cleanAdm = sanitizeInput(admissionNumber.trim().toUpperCase())
      const cleanName = sanitizeInput(fullName.trim())
      const cleanPass = sanitizeInput(password.trim())
      const cleanKey = cleanAdm.toLowerCase().replace(/[^a-z0-9]/g, '')
      const generatedUserId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `usr-${Date.now()}-${Math.floor(Math.random() * 10000)}`

      const registeredUserId = generatedUserId
      const renewedExpiry =
        role === 'student' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null

      // 1. Direct Profile Object
      const newProfile: Profile = {
        id: registeredUserId,
        full_name: cleanName,
        admission_number: cleanAdm,
        role,
        first_login_at: new Date().toISOString(),
        access_expires_at: renewedExpiry,
        is_active: true,
        created_at: new Date().toISOString(),
      }

      try {
        await supabase.from('profiles').upsert(newProfile)
      } catch (dbErr) {
        console.warn('Supabase profiles upsert fallback:', dbErr)
      }

      // 2. Save local credentials (including full profile object for AuthContext.signIn)
      try {
        const stored = localStorage.getItem('gc_v2_local_credentials')
        const parsed = stored ? JSON.parse(stored) : {}
        const passHash = await hashPassword(cleanPass)
        parsed[cleanKey] = {
          id: registeredUserId,
          admission_number: cleanAdm,
          full_name: cleanName,
          password: cleanPass,
          passwordHash: passHash,
          role,
          class_ids: selectedClassIds,
          profile: newProfile,
          created_at: new Date().toISOString(),
        }
        localStorage.setItem('gc_v2_local_credentials', JSON.stringify(parsed))
        localStorage.setItem('gc_local_credentials', JSON.stringify(parsed))
      } catch (storeErr) {
        console.warn('Local credential storage error:', storeErr)
      }

      // 3. Persist in schoolStore (Cloud-Synced Student Registry or Faculty Teacher Registry)
      if (role === 'student') {
        const selectedProg = availableClasses.find((c) => selectedClassIds.includes(c.id)) || availableClasses[0]
        const selectedSubject = schoolStore.getSubjects().find((s) => s.id === selectedProg?.id || s.name === selectedProg?.name)
        const selectedUnit = schoolStore.getCourseUnits().find((u) => u.id === selectedProg?.id || u.title === selectedProg?.name)
        const progFee = selectedSubject?.fee || selectedUnit?.fee || 60

        await schoolStore.addStudent({
          id: registeredUserId,
          admission_number: cleanAdm,
          full_name: cleanName,
          portal_password: cleanPass,
          gender: 'Not Specified',
          dob: '',
          class_id: selectedProg?.id || 'class-main',
          class_name: selectedProg?.name || 'Vocational Training Program',
          grade_level: selectedProg?.grade_level || 'Vocational Certificate',
          stream: 'Virtual Campus',
          enrollment_date: new Date().toISOString().split('T')[0],
          status: 'Active',
          guardian: {
            name: '',
            relationship: 'Guardian',
            phone: '',
            email: '',
          },
          emergency_contact: '',
          fee_balance: progFee,
          term_fee_total: progFee,
          fee_cleared: false,
          attendance_rate: 100,
          discipline_points: 100,
          merits_count: 0,
          demerits_count: 0,
        })

        // Also register selected course units for the student
        for (const cId of selectedClassIds) {
          const matchingUnit = schoolStore.getCourseUnits().find((u) => u.id === cId)
          if (matchingUnit) {
            try {
              await schoolStore.addCourseToStudentProgram(cleanAdm, matchingUnit.id)
            } catch {}
          }
        }
      } else if (role === 'teacher') {
        const selectedCourseNames = availableClasses
          .filter((c) => selectedClassIds.includes(c.id))
          .map((c) => c.name)
        await schoolStore.addTeacher({
          id: registeredUserId,
          staff_id: cleanAdm,
          name: cleanName,
          title: 'Faculty Lecturer',
          email: `${cleanKey}@globalcollege.edu`,
          department: selectedCourseNames[0] || 'Academic Faculty',
          specialty: selectedCourseNames.join(', ') || 'General Studies & Practical Labs',
          portal_password: cleanPass,
          class_ids: selectedClassIds,
          created_at: new Date().toISOString(),
        })
      }

      // 4. Enroll in class enrollments if selected
      if (selectedClassIds.length > 0 && (role === 'student' || role === 'teacher')) {
        const enrollments = selectedClassIds.map((cId) => ({
          student_id: registeredUserId,
          class_id: cId,
        }))
        try {
          await supabase.from('class_enrollments').insert(enrollments)
        } catch {}
      }
    },
    onSuccess: () => {
      setSuccessBanner({
        name: fullName.trim(),
        id: admissionNumber.trim().toUpperCase(),
        password: password.trim(),
        role,
      })
      queryClient.invalidateQueries({ queryKey: ['admin-manage-users'] })
      setShowAddModal(false)
      setFullName('')
      setAdmissionNumber('')
      setPassword('')
      setSelectedClassIds([])
      setModalError(null)
    },
    onError: (err: Error) => {
      setModalError(err.message)
    },
  })

  const handleDeleteUser = async (u: Profile) => {
    if (window.confirm(`Are you sure you want to completely remove "${u.full_name}" (${u.admission_number})? All associated academic, fee, and registration records will be permanently deleted.`)) {
      // Remove from local credentials
      try {
        const stored = localStorage.getItem('gc_v2_local_credentials') || localStorage.getItem('gc_local_credentials')
        if (stored) {
          const parsed = JSON.parse(stored)
          const cleanKey = u.admission_number.toLowerCase().replace(/[^a-z0-9]/g, '')
          delete parsed[cleanKey]
          delete parsed[u.admission_number.toLowerCase()]
          localStorage.setItem('gc_v2_local_credentials', JSON.stringify(parsed))
          localStorage.setItem('gc_local_credentials', JSON.stringify(parsed))
        }
      } catch {}

      if (u.role === 'student') {
        await schoolStore.deleteStudent(u.id)
        if (u.admission_number) {
          await schoolStore.deleteStudent(u.admission_number)
        }
      } else if (u.role === 'teacher') {
        await schoolStore.deleteTeacher(u.id)
        if (u.admission_number) {
          await schoolStore.deleteTeacher(u.admission_number)
        }
        try {
          await supabase.from('profiles').delete().eq('id', u.id)
        } catch {}
      } else {
        try {
          await supabase.from('profiles').delete().eq('id', u.id)
        } catch {}
      }
      queryClient.invalidateQueries({ queryKey: ['admin-manage-users'] })
    }
  }

  const filteredUsers = users?.filter((u) => {
    const matchesTab = activeRoleTab === 'all' ? true : u.role === activeRoleTab
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.admission_number.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesTab && matchesSearch
  })

  return (
    <PageWrapper
      title="User & Login Credentials Management"
      subtitle="Generate official Admission Numbers, Staff IDs, and Passwords to provide to Students, Lecturers, Bursars, and Parents."
      action={
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={() => openProvisionModal('student')}>
            + Issue Student Login
          </Button>
          <Button variant="secondary" onClick={() => openProvisionModal('teacher')}>
            + Issue Teacher Login
          </Button>
          <Button variant="secondary" onClick={() => openProvisionModal('bursar')}>
            + Issue Bursar / Parent Login
          </Button>
        </div>
      }
    >
      {successBanner && (
        <div
          className="alert alert-success mb-6"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <strong>
              ✅ Official {successBanner.role.toUpperCase()} Login Credentials Provisioned!
            </strong>
            <div style={{ fontSize: '0.88rem', marginTop: '4px' }}>
              Name: <strong>{successBanner.name}</strong> &nbsp;|&nbsp; Login ID:{' '}
              <code style={{ fontWeight: 800, background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                {successBanner.id}
              </code>{' '}
              &nbsp;|&nbsp; Password:{' '}
              <code style={{ fontWeight: 800, background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                {successBanner.password}
              </code>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#166534', marginTop: '4px' }}>
              Share these exact login details with the user so they can sign in at <code>/login</code>.
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={() =>
                handleCopyCredentials(
                  {
                    id: 'temp',
                    full_name: successBanner.name,
                    admission_number: successBanner.id,
                    role: successBanner.role,
                    first_login_at: null,
                    access_expires_at: null,
                    is_active: true,
                    created_at: '',
                  },
                  successBanner.password
                )
              }
            >
              📋 Copy Login Slip
            </Button>
            <Button variant="ghost" onClick={() => setSuccessBanner(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Search & Tabs */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="search-wrapper mb-4">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search users by full name or admission / staff ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="tabs mb-0" style={{ flexWrap: 'wrap' }}>
            <button
              className={`tab-btn ${activeRoleTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveRoleTab('all')}
            >
              All Users ({users?.length || 0})
            </button>
            <button
              className={`tab-btn ${activeRoleTab === 'student' ? 'active' : ''}`}
              onClick={() => setActiveRoleTab('student')}
            >
              🎓 Students ({users?.filter((u) => u.role === 'student').length || 0})
            </button>
            <button
              className={`tab-btn ${activeRoleTab === 'teacher' ? 'active' : ''}`}
              onClick={() => setActiveRoleTab('teacher')}
            >
              👩‍🏫 Teachers ({users?.filter((u) => u.role === 'teacher').length || 0})
            </button>
            <button
              className={`tab-btn ${activeRoleTab === 'bursar' ? 'active' : ''}`}
              onClick={() => setActiveRoleTab('bursar')}
            >
              💳 Bursars ({users?.filter((u) => u.role === 'bursar').length || 0})
            </button>
            <button
              className={`tab-btn ${activeRoleTab === 'parent' ? 'active' : ''}`}
              onClick={() => setActiveRoleTab('parent')}
            >
              👪 Parents ({users?.filter((u) => u.role === 'parent').length || 0})
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
          <Spinner size="lg" />
        </div>
      ) : filteredUsers && filteredUsers.length > 0 ? (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Login ID / Admission No.</th>
                  <th>Full Name</th>
                  <th>Role</th>
                  <th>Admin-Issued Password</th>
                  <th>Status / Access</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isExpired = u.role === 'student' && isAccessExpired(u.access_expires_at)
                  const daysLeft = u.access_expires_at ? daysUntil(u.access_expires_at) : null
                  const issuedPassword = getIssuedPassword(u)

                  return (
                    <tr key={u.id}>
                      <td className="font-mono text-xs font-bold">{u.admission_number}</td>
                      <td>{u.full_name}</td>
                      <td>
                        <RoleBadge role={u.role} />
                      </td>
                      <td>
                        <code
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: '#0f172a',
                          }}
                        >
                          {issuedPassword}
                        </code>
                      </td>
                      <td>
                        {u.role === 'student' ? (
                          isExpired ? (
                            <span className="badge badge-danger">⏳ Expired (0 Days)</span>
                          ) : (
                            <span className="badge badge-success">
                              ✅ Active ({daysLeft} days left)
                            </span>
                          )
                        ) : (
                          <span className="badge badge-muted">Unlimited</span>
                        )}
                      </td>
                      <td className="text-xs text-muted">{formatDate(u.created_at)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="btn btn-xs"
                          style={{
                            background: copiedId === u.id ? '#dcfce7' : '#eff6ff',
                            color: copiedId === u.id ? '#166534' : '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            fontWeight: 700,
                            marginRight: '6px',
                          }}
                          onClick={() => handleCopyCredentials(u)}
                          title="Copy Login ID & Password to share with user"
                        >
                          {copiedId === u.id ? '✓ Copied!' : '📋 Copy Login'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs"
                          style={{
                            background: '#fef3c7',
                            color: '#92400e',
                            border: '1px solid #fde68a',
                            fontWeight: 700,
                            marginRight: '6px',
                          }}
                          onClick={() => {
                            setResettingUser(u)
                            setNewResetPassword(issuedPassword.startsWith('Not Set') ? `${u.role.charAt(0).toUpperCase() + u.role.slice(1)}@${new Date().getFullYear()}` : issuedPassword)
                          }}
                          title="Set or reset this user's password"
                        >
                          🔑 Set Password
                        </button>
                        {u.role === 'student' && (
                          <button
                            type="button"
                            className="btn btn-xs btn-primary"
                            style={{ fontWeight: 700, marginRight: '6px' }}
                            onClick={() => {
                              setManagingStudent(u)
                              setSelectedUnitToAdd('')
                              setCourseActionMsg(null)
                            }}
                            title="Assign / Add Course Unit to this student program"
                          >
                            📚 Courses
                          </button>
                        )}
                        {u.role !== 'admin' && (
                          <button
                            type="button"
                            className="btn btn-xs"
                            style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
                            onClick={() => handleDeleteUser(u)}
                            title="Completely remove user and cascade delete all associated records"
                          >
                            🗑️ Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="empty-state card">
          <div className="empty-state-icon">👤</div>
          <div className="empty-state-title">No Users Found</div>
          <div className="empty-state-desc">
            No user profiles match your search filter. Click one of the buttons above to issue login credentials.
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="🔐 Issue Official Portal Login Credentials"
        size="md"
      >
        {modalError && (
          <div className="alert alert-danger mb-4">
            <span className="alert-icon">⚠️</span>
            <div>{modalError}</div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            addUserMutation.mutate()
          }}
        >
          <div className="form-group">
            <label className="form-label" htmlFor="roleSelect">Portal Role *</label>
            <select
              id="roleSelect"
              className="form-input"
              value={role}
              onChange={(e) => {
                const nextRole = e.target.value as Role
                openProvisionModal(nextRole)
              }}
            >
              <option value="student">🎓 Student (Students Portal)</option>
              <option value="teacher">👩‍🏫 Faculty Lecturer / Teacher Portal</option>
              <option value="bursar">💳 Bursar &amp; Finance Officer Portal</option>
              <option value="parent">👪 Parent &amp; Sponsor Portal</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="fullName">Full Name *</label>
            <input
              id="fullName"
              type="text"
              placeholder="Enter full name of student, staff, or parent"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="admNo">
              {role === 'student'
                ? 'Student Admission Number (Login ID) *'
                : role === 'parent'
                ? 'Parent Login ID *'
                : 'Staff ID / Username (Login ID) *'}
            </label>
            <input
              id="admNo"
              type="text"
              placeholder={role === 'student' ? `e.g. EI-${new Date().getFullYear()}-001` : 'e.g. STF-2026-001'}
              value={admissionNumber}
              onChange={(e) => setAdmissionNumber(e.target.value)}
              required
            />
            <span className="form-hint">Provide this exact Login ID to the user.</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="tempPass">Admin-Issued Password *</label>
            <input
              id="tempPass"
              type="text"
              placeholder={`Min 4 characters (e.g. Student@${new Date().getFullYear()})`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span className="form-hint">Provide this exact Password to the user so they can sign in.</span>
          </div>

          {(role === 'student' || role === 'teacher') && (
            <div className="form-group">
              <div className="flex justify-between items-center mb-2">
                <label className="form-label" style={{ margin: 0 }}>
                  {role === 'student' ? 'Assign Enrolled Classes / Courses' : 'Assign Teaching Classes / Cohorts'}
                  {selectedClassIds.length > 0 && (
                    <span className="badge badge-primary ml-2" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                      {selectedClassIds.length} Selected
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllClasses}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Select All
                  </button>
                  <span style={{ color: '#94a3b8' }}>•</span>
                  <button
                    type="button"
                    onClick={clearAllClasses}
                    style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div
                style={{
                  border: '1.5px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  background: '#f8fafc',
                }}
              >
                {availableClasses.map((c) => {
                  const isSelected = selectedClassIds.includes(c.id)
                  return (
                    <label
                      key={c.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        background: isSelected ? '#eff6ff' : '#ffffff',
                        border: isSelected ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectClass(c.id)}
                        style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: isSelected ? 700 : 600, color: isSelected ? '#1e3a8a' : '#0f172a' }}>
                          {c.name}
                        </div>
                        {c.grade_level && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {c.grade_level} {c.academic_year ? `• ${c.academic_year}` : ''}
                          </div>
                        )}
                      </div>
                      {isSelected && <span style={{ color: '#2563eb', fontWeight: 900 }}>✓</span>}
                    </label>
                  )
                })}
              </div>
              <span className="form-hint">You can select multiple classes/courses for this account.</span>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={addUserMutation.isPending}>
              Issue Login Credentials →
            </Button>
          </div>
        </form>
      </Modal>

      {/* Set / Reset User Password Modal */}
      {resettingUser && (
        <Modal
          isOpen={!!resettingUser}
          onClose={() => setResettingUser(null)}
          title={`🔑 Set Login Password: ${resettingUser.full_name}`}
          size="md"
        >
          <form onSubmit={handleSaveResetPassword}>
            <div className="form-group">
              <label className="form-label">Login ID / Admission Number</label>
              <input type="text" value={resettingUser.admission_number} disabled />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="newPassInput">New Admin-Issued Password *</label>
              <input
                id="newPassInput"
                type="text"
                value={newResetPassword}
                onChange={(e) => setNewResetPassword(e.target.value)}
                placeholder="Enter new password for this user"
                required
              />
              <span className="form-hint">
                Once saved, share this password with {resettingUser.full_name} so they can sign in immediately.
              </span>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="ghost" onClick={() => setResettingUser(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save &amp; Issue Password →
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Manage Student Courses Modal */}
      {managingStudent && (
        <Modal
          isOpen={!!managingStudent}
          onClose={() => setManagingStudent(null)}
          title={`📚 Student Course Program: ${managingStudent.full_name}`}
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #1e3a8a, #0f172a)',
                color: '#ffffff',
                padding: '1.25rem',
                borderRadius: '10px',
              }}
            >
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#93c5fd', fontWeight: 700 }}>
                Student Profile &amp; Program Registration
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.25rem 0', color: '#ffffff' }}>
                {managingStudent.full_name} ({managingStudent.admission_number})
              </h3>
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                Admins can directly assign certified short courses, practical modules, and certification units to this student program.
              </div>
            </div>

            {courseActionMsg && (
              <div className="alert alert-success">
                <span>{courseActionMsg}</span>
              </div>
            )}

            {/* Currently Enrolled Units */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                Currently Enrolled Courses ({(schoolStore.getRegisteredUnitsForStudent(managingStudent.admission_number) || []).length})
              </h4>
              {schoolStore.getRegisteredUnitsForStudent(managingStudent.admission_number).length === 0 ? (
                <div style={{ padding: '1rem', background: 'var(--color-bg-secondary)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  Student has no enrolled courses currently assigned. Select a course below to assign to their program.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {schoolStore.getRegisteredUnitsForStudent(managingStudent.admission_number).map((unit) => (
                    <div
                      key={unit.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem 1rem',
                        background: 'var(--color-bg-secondary)',
                        borderRadius: '8px',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                          <span className="badge badge-primary" style={{ marginRight: '6px' }}>{unit.code}</span>
                          {unit.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          {unit.credit_hours} Credits • Lecturer: {unit.teacher_name} • {unit.course_duration || 'Short Course'}
                        </div>
                      </div>
                      <span className="badge badge-success" style={{ fontWeight: 700 }}>✓ Active in Program</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Course to Student Program */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                ➕ Add Additional Course to Student Program
              </h4>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  className="form-input"
                  style={{ flex: 1, minWidth: '220px' }}
                  value={selectedUnitToAdd}
                  onChange={(e) => setSelectedUnitToAdd(e.target.value)}
                >
                  <option value="">-- Select Course Unit to Assign --</option>
                  {schoolStore.getCourseUnits().filter((u) => u.is_published !== false).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.code} - {u.title} ({u.credit_hours} Credits)
                    </option>
                  ))}
                </select>
                <Button
                  variant="primary"
                  disabled={!selectedUnitToAdd || isAddingCourse}
                  loading={isAddingCourse}
                  onClick={async () => {
                    if (!selectedUnitToAdd || !managingStudent) return
                    setIsAddingCourse(true)
                    try {
                      await schoolStore.addCourseToStudentProgram(managingStudent.admission_number, selectedUnitToAdd)
                      const assigned = schoolStore.getCourseUnits().find((c) => c.id === selectedUnitToAdd)
                      setCourseActionMsg(`✅ Successfully added "${assigned?.title || selectedUnitToAdd}" to ${managingStudent.full_name}'s program!`)
                      setSelectedUnitToAdd('')
                      queryClient.invalidateQueries({ queryKey: ['admin-manage-users'] })
                    } catch (err: any) {
                      alert('Error assigning course: ' + err.message)
                    } finally {
                      setIsAddingCourse(false)
                    }
                  }}
                >
                  ➕ Assign to Program
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="secondary" onClick={() => setManagingStudent(null)}>
                Done / Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </PageWrapper>
  )
}
