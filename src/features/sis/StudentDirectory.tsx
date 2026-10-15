import { useState, useMemo } from 'react'
import { schoolStore } from '@/lib/schoolData'
import { supabase } from '@/lib/supabase'
import type { StudentRecord, PaymentReminder } from '@/types/school'
import { BiometricEnrollModal } from '@/components/biometrics/BiometricEnrollModal'
import { BiometricScannerModal } from '@/components/biometrics/BiometricScannerModal'
import { EyeIcon, KeyIcon } from '@/components/icons/AppIcons'
import { hashPassword } from '@/lib/crypto'
import { sanitizeInput } from '@/lib/utils'
import { INSTITUTION_CONFIG } from '@/config/institution'
import { OFFICIAL_COURSES } from '@/config/officialCourses'

export function StudentDirectory() {
  const [students, setStudents] = useState<StudentRecord[]>(() => schoolStore.getStudents())
  const [departments] = useState(() => schoolStore.getDepartments())
  const [subjects] = useState(() => schoolStore.getSubjects())

  // Dynamic program options derived from active course units, departments, subjects, and official certified registry
  const programOptions = useMemo(() => {
    const fromOfficial = OFFICIAL_COURSES.map((c) => c.title)
    const fromUnits = schoolStore.getCourseUnits().map((u) => u.title)
    const fromPrograms = schoolStore.getCourseUnits().map((u) => u.program).filter(Boolean)
    const fromSubjects = subjects.map((s) => s.name)
    const fromDepts = departments.flatMap((d) => d.programs || [])
    return Array.from(new Set([...fromOfficial, ...fromUnits, ...fromPrograms, ...fromSubjects, ...fromDepts]))
  }, [departments, subjects])

  const [searchTerm, setSearchTerm] = useState('')
  const [classFilter, setClassFilter] = useState('All')
  const [feeFilter, setFeeFilter] = useState('All')
  const [biometricFilter, setBiometricFilter] = useState<'All' | 'Enrolled' | 'Not Enrolled'>('All')
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null)
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [studentToEnroll, setStudentToEnroll] = useState<StudentRecord | null>(null)
  const [showBiometricStation, setShowBiometricStation] = useState(false)
  const [reminderTarget, setReminderTarget] = useState<StudentRecord | null>(null)
  const [bulkReminderSuccess, setBulkReminderSuccess] = useState<string | null>(null)

  // Student Login Credentials State & Modal
  const [credentialsModalData, setCredentialsModalData] = useState<{
    studentName: string
    admissionNumber: string
    password: string
    program: string
    phone?: string
    isNew?: boolean
  } | null>(null)
  const [studentPasswordInput, setStudentPasswordInput] = useState('Student@2026')
  const [studentPhoneInput, setStudentPhoneInput] = useState('')
  const [editPasswordInput, setEditPasswordInput] = useState('')
  const [inlinePassEdit, setInlinePassEdit] = useState('')
  const [copiedNotification, setCopiedNotification] = useState(false)

  // Helper to persist student login credentials
  const saveStudentCredentials = async (adm: string, fullName: string, password: string) => {
    const cleanAdm = sanitizeInput(adm).toLowerCase().replace(/[^a-z0-9]/g, '')
    const cleanFullName = sanitizeInput(fullName)
    const cleanPassword = sanitizeInput(password)
    const renewed = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    const profileObj = {
      id: `usr-${cleanAdm}`,
      full_name: cleanFullName,
      admission_number: sanitizeInput(adm),
      role: 'student' as const,
      first_login_at: new Date().toISOString(),
      access_expires_at: renewed,
      is_active: true,
      created_at: new Date().toISOString(),
    }

    try {
      const raw = localStorage.getItem('gc_v2_local_credentials') || localStorage.getItem('gc_local_credentials') || '{}'
      const creds = JSON.parse(raw)
      const passHash = await hashPassword(cleanPassword)
      creds[cleanAdm] = {
        password: cleanPassword,
        passwordHash: passHash,
        profile: profileObj,
      }
      await schoolStore.saveCredentials(creds)
    } catch {}

    // Persist custom password directly into student record for cloud cross-device sync
    const stds = schoolStore.getStudents()
    const matchedIdx = stds.findIndex(
      (s) =>
        s.admission_number.toLowerCase().trim() === adm.toLowerCase().trim() ||
        s.admission_number.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAdm
    )
    if (matchedIdx !== -1) {
      await schoolStore.updateStudent(stds[matchedIdx].id, { portal_password: password.trim() })
      setStudents(schoolStore.getStudents())
    }

    try {
      supabase.from('profiles').upsert({
        id: profileObj.id,
        full_name: fullName,
        admission_number: adm,
        role: 'student',
        is_active: true,
      })
    } catch {}
  }

  // New Student Form State
  const [newStudent, setNewStudent] = useState<Partial<StudentRecord>>({
    full_name: '',
    admission_number: `EI-${new Date().getFullYear()}-${String(students.length + 1).padStart(3, '0')}`,
    gender: 'Not Specified',
    grade_level: '8 to 12 Weeks (Short Course Certificate)',
    stream: 'Practical Lab Trainee',
    class_name: programOptions[0] || 'Comprehensive Computer Packages & Digital Skills',
    dob: '',
    status: 'Active',
    fee_balance: 60,
    term_fee_total: 60,
    attendance_rate: 0,
    discipline_points: 0,
    merits_count: 0,
    demerits_count: 0,
    guardian: {
      name: '',
      relationship: 'Self',
      phone: '',
      email: '',
      occupation: '',
      address: '',
    },
  })

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.admission_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.guardian?.name ? s.guardian.name.toLowerCase().includes(searchTerm.toLowerCase()) : false) ||
        (s.emergency_contact ? s.emergency_contact.includes(searchTerm) : false)

      const matchClass = classFilter === 'All' || s.class_name.includes(classFilter)
      const matchFee =
        feeFilter === 'All' ||
        (feeFilter === 'Cleared' && s.fee_balance === 0) ||
        (feeFilter === 'Outstanding' && s.fee_balance > 0)

      const matchBiometric =
        biometricFilter === 'All' ||
        (biometricFilter === 'Enrolled' && s.biometric_enrolled) ||
        (biometricFilter === 'Not Enrolled' && !s.biometric_enrolled)

      return matchSearch && matchClass && matchFee && matchBiometric
    })
  }, [students, searchTerm, classFilter, feeFilter, biometricFilter])

  // --- Excel / CSV Export ---
  const handleExportExcel = () => {
    const headers = [
      'Admission Number',
      'Full Name',
      'Gender',
      'Date of Birth',
      'Program / Diploma',
      'Academic Year & Semester',
      'Stream / Specialization',
      'Enrollment Date',
      'Status',
      'Guardian Name',
      'Relationship',
      'Guardian Phone',
      'Guardian Email',
      'Emergency Contact',
      'Fee Billed ($ USD)',
      'Fee Balance ($ USD)',
      'Fee Status',
      'Attendance Rate (%)',
      'Discipline Index (100)',
      'Merits Awarded',
    ]

    const rows = filteredStudents.map((s) => [
      `"${s.admission_number}"`,
      `"${s.full_name}"`,
      `"${s.gender}"`,
      `"${s.dob}"`,
      `"${s.class_name}"`,
      `"${s.grade_level}"`,
      `"${s.stream}"`,
      `"${s.enrollment_date}"`,
      `"${s.status}"`,
      `"${s.guardian.name}"`,
      `"${s.guardian.relationship}"`,
      `"${s.guardian.phone}"`,
      `"${s.guardian.email}"`,
      `"${s.emergency_contact}"`,
      s.term_fee_total,
      s.fee_balance,
      `"${s.fee_cleared ? 'Cleared' : 'Outstanding'}"`,
      `${s.attendance_rate}%`,
      s.discipline_points,
      s.merits_count,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `global_college_Students_Registry_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // --- Add Student ---
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStudent.full_name || !newStudent.admission_number) return

    const billed = Number(newStudent.term_fee_total) || 60
    const balance = newStudent.fee_balance !== undefined ? Number(newStudent.fee_balance) : billed
    const chosenPassword = studentPasswordInput.trim() || `Student@${new Date().getFullYear()}`

    const record: StudentRecord = {
      id: `std-${Date.now()}`,
      admission_number: newStudent.admission_number || `EI-${new Date().getFullYear()}-${String(students.length + 1).padStart(3, '0')}`,
      full_name: newStudent.full_name || '',
      portal_password: chosenPassword,
      gender: (newStudent.gender as 'Male' | 'Female' | 'Not Specified') || 'Not Specified',
      dob: newStudent.dob || '',
      class_id: 'cls-custom',
      class_name: newStudent.class_name || programOptions[0] || 'Comprehensive Computer Packages & Digital Skills',
      grade_level: newStudent.grade_level || '4 to 12 Weeks (Short Course Certificate)',
      stream: newStudent.stream || 'Practical Lab Trainee',
      enrollment_date: new Date().toISOString().split('T')[0],
      status: 'Active',
      guardian: {
        name: newStudent.guardian?.name?.trim() || 'Self-Sponsored Student',
        relationship: newStudent.guardian?.relationship || 'Self',
        phone: studentPhoneInput.trim() || newStudent.guardian?.phone?.trim() || '',
        email: newStudent.guardian?.email?.trim() || '',
      },
      emergency_contact: studentPhoneInput.trim() || newStudent.guardian?.phone?.trim() || '',
      blood_group: newStudent.blood_group || undefined,
      fee_balance: balance,
      term_fee_total: billed,
      fee_cleared: balance === 0,
      attendance_rate: Number(newStudent.attendance_rate) || 0,
      discipline_points: Number(newStudent.discipline_points) || 0,
      merits_count: 0,
      demerits_count: 0,
    }

    await schoolStore.addStudent(record)

    // Save student login credentials for direct portal login
    await saveStudentCredentials(record.admission_number, record.full_name, chosenPassword)

    // Auto-link registered unit so course shows on student LMS immediately
    const matchedUnit = schoolStore.getCourseUnits().find(
      (u) => u.title.toLowerCase() === record.class_name.toLowerCase() || u.program.toLowerCase() === record.class_name.toLowerCase()
    )
    if (matchedUnit) {
      await schoolStore.registerStudentUnits({
        id: `reg-${record.id}`,
        receipt_number: `REG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        student_id: record.id,
        student_name: record.full_name,
        admission_number: record.admission_number,
        program: record.class_name,
        academic_year: `${new Date().getFullYear()}`,
        course_duration: matchedUnit.course_duration || '3 Months Certificate',
        registered_unit_ids: [matchedUnit.id],
        registered_units: [{
          code: matchedUnit.code,
          title: matchedUnit.title,
          credit_hours: matchedUnit.credit_hours || 40,
          teacher_name: matchedUnit.teacher_name || 'Faculty Lecturer',
        }],
        total_credits: matchedUnit.credit_hours || 40,
        fee_clearance_status: 'Cleared',
        registered_by: 'Academic Registrar & Admissions Desk',
        registered_at: new Date().toISOString(),
        exam_card_issued: true,
      })
    }

    setStudents(schoolStore.getStudents())
    setShowAddModal(false)

    // Open Student Login Pass & Credentials Modal
    setCredentialsModalData({
      studentName: record.full_name,
      admissionNumber: record.admission_number,
      password: chosenPassword,
      program: record.class_name,
      phone: studentPhoneInput.trim() || newStudent.guardian?.phone?.trim() || '',
      isNew: true,
    })
  }

  // --- Edit Student ---
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStudent) return

    await schoolStore.updateStudent(editingStudent.id, {
      ...editingStudent,
      fee_cleared: editingStudent.fee_balance === 0,
    })

    if (editPasswordInput.trim()) {
      saveStudentCredentials(editingStudent.admission_number, editingStudent.full_name, editPasswordInput.trim())
    }

    const matchedUnit = schoolStore.getCourseUnits().find(
      (u) => u.title.toLowerCase() === editingStudent.class_name.toLowerCase() || u.program.toLowerCase() === editingStudent.class_name.toLowerCase()
    )
    if (matchedUnit) {
      await schoolStore.registerStudentUnits({
        id: `reg-${editingStudent.id}`,
        receipt_number: `REG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        student_id: editingStudent.id,
        student_name: editingStudent.full_name,
        admission_number: editingStudent.admission_number,
        program: editingStudent.class_name,
        academic_year: `${new Date().getFullYear()}`,
        course_duration: matchedUnit.course_duration || '3 Months Certificate',
        registered_unit_ids: [matchedUnit.id],
        registered_units: [{
          code: matchedUnit.code,
          title: matchedUnit.title,
          credit_hours: matchedUnit.credit_hours || 40,
          teacher_name: matchedUnit.teacher_name || 'Faculty Lecturer',
        }],
        total_credits: matchedUnit.credit_hours || 40,
        fee_clearance_status: 'Cleared',
        registered_by: 'Academic Registrar & Admissions Desk',
        registered_at: new Date().toISOString(),
        exam_card_issued: true,
      })
    }

    setStudents(schoolStore.getStudents())
    if (selectedStudent?.id === editingStudent.id) {
      setSelectedStudent(editingStudent)
    }
    setEditingStudent(null)
    setEditPasswordInput('')
  }

  // --- Delete Student ---
  const handleDeleteStudent = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove student "${name}" from the active registry?`)) {
      schoolStore.deleteStudent(id)
      setStudents(schoolStore.getStudents())
      setSelectedStudent(null)
    }
  }

  const handleClearAllStudents = async () => {
    if (window.confirm('Are you sure you want to remove all students from the active registry? This will clear all stored student records.')) {
      await schoolStore.clearAllStudents()
      setStudents(schoolStore.getStudents())
      setSelectedStudent(null)
    }
  }

  const handleQuickClearFees = async (student: StudentRecord) => {
    try {
      await schoolStore.unlockStudentLessons(student.admission_number, 'Academic Registrar & Admissions Desk')
      setStudents(schoolStore.getStudents())
      if (selectedStudent && selectedStudent.id === student.id) {
        setSelectedStudent({ ...selectedStudent, fee_cleared: true, fee_balance: 0 })
      }
      alert(`✓ Tuition fees 100% cleared and lessons unlocked for ${student.full_name} (${student.admission_number}).`)
    } catch (err: any) {
      alert('Error clearing fees: ' + (err?.message || err))
    }
  }

  // --- Send Single Payment Reminder ---
  const handleDispatchReminder = (student: StudentRecord) => {
    const reminder: PaymentReminder = {
      id: `rem-${Date.now()}`,
      student_id: student.id,
      student_name: student.full_name,
      admission_number: student.admission_number,
      guardian_name: student.guardian.name,
      guardian_phone: student.guardian.phone,
      amount_due: student.fee_balance,
      channel: 'SMS',
      message_text: `Dear ${student.guardian.name}, reminder from Global College Accounts: ${student.full_name} (${student.admission_number}) has an outstanding tuition balance of $${student.fee_balance.toLocaleString()}. Kindly settle via the online student portal. Thank you.`,
      sent_by: 'Bursar & Accounts Desk',
      sent_at: new Date().toLocaleString(),
      status: 'Delivered',
    }

    schoolStore.sendReminder(reminder)
    setReminderTarget(null)
    setBulkReminderSuccess(`SMS payment reminder successfully sent to ${student.guardian.name} (${student.guardian.phone})!`)
    setTimeout(() => setBulkReminderSuccess(null), 5000)
  }

  // --- Send Bulk Payment Reminders ---
  const handleSendBulkReminders = () => {
    const overdueList = students.filter((s) => s.fee_balance > 0)
    if (overdueList.length === 0) {
      alert('All students currently have cleared fees. No reminders to dispatch!')
      return
    }

    overdueList.forEach((student) => {
      schoolStore.sendReminder({
        id: `rem-${Date.now()}-${student.id}`,
        student_id: student.id,
        student_name: student.full_name,
        admission_number: student.admission_number,
        guardian_name: student.guardian.name,
        guardian_phone: student.guardian.phone,
        amount_due: student.fee_balance,
        channel: 'SMS',
        message_text: `Dear ${student.guardian.name}, reminder from Global College Accounts: ${student.full_name} (${student.admission_number}) has an outstanding tuition balance of $${student.fee_balance.toLocaleString()}. Kindly settle via the online student portal. Thank you.`,
        sent_by: 'Bursar & Accounts Desk (Bulk Dispatch)',
        sent_at: new Date().toLocaleString(),
        status: 'Delivered',
      })
    })

    setBulkReminderSuccess(`Bulk SMS Payment Reminders dispatched to ${overdueList.length} guardian contacts!`)
    setTimeout(() => setBulkReminderSuccess(null), 6000)
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Student Information System (SIS)</h1>
          <p className="page-subtitle">
            Comprehensive college student directory, guardian contacts, program enrollments, fee accounts, and biometric security registry.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ background: '#0284c7', borderColor: '#0284c7', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            onClick={() => setShowBiometricStation(true)}
          >
            <span>🖐️</span> Biometric Fee Verification
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportExcel}
            title="Export filtered student list to Microsoft Excel"
          >
            📥 Download Excel (.xlsx / .csv)
          </button>
          <button
            type="button"
            className="btn"
            style={{ background: '#f59e0b', color: '#78350f', fontWeight: 700 }}
            onClick={handleSendBulkReminders}
            title="Dispatch payment SMS reminders to all students with overdue balances"
          >
            📢 Send Overdue Payment Reminders
          </button>
          {students.length > 0 && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ color: '#ef4444', borderColor: '#fca5a5' }}
              onClick={handleClearAllStudents}
              title="Remove all students from the active directory"
            >
              🗑️ Clear All Students
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            + Register New Student
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {bulkReminderSuccess && (
        <div className="card mb-4" style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '0.85rem 1.25rem' }}>
          ✅ {bulkReminderSuccess}
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Enrolled Students</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
            {students.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.2rem' }}>100% Active Attendance</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Fees Cleared Rate</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#16a34a', marginTop: '0.25rem' }}>
            {students.length > 0 ? Math.round((students.filter((s) => s.fee_cleared).length / students.length) * 100) : 100}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
            {students.filter((s) => s.fee_cleared).length} cleared of {students.length}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Biometric Fingerprints</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#0284c7', marginTop: '0.25rem' }}>
            {students.filter((s) => s.biometric_enrolled).length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '0.2rem' }}>
            {students.length > 0 ? Math.round((students.filter((s) => s.biometric_enrolled).length / students.length) * 100) : 0}% Enrolled
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ea580c' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Outstanding Fee Accounts</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#ea580c', marginTop: '0.25rem' }}>
            {students.filter((s) => s.fee_balance > 0).length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
            Total Overdue: ${students.reduce((acc, s) => acc + s.fee_balance, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card mb-6" style={{ padding: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          <div>
            <label className="label" style={{ fontSize: '0.75rem' }}>Search Student, Admission # or Guardian</label>
            <input
              type="text"
              className="input"
              placeholder={`e.g. Abdi Hassan or EI-${new Date().getFullYear()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <label className="label" style={{ fontSize: '0.75rem' }}>Filter by Program</label>
            <select
              className="input"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="All">All Programs & Departments</option>
              {programOptions.map((prog) => (
                <option key={prog} value={prog}>{prog}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" style={{ fontSize: '0.75rem' }}>Fee Clearance Status</label>
            <select
              className="input"
              value={feeFilter}
              onChange={(e) => setFeeFilter(e.target.value)}
            >
              <option value="All">All Fee Statuses</option>
              <option value="Cleared">Fee Cleared (0 Balance)</option>
              <option value="Outstanding">Has Outstanding Balance</option>
            </select>
          </div>

          <div>
            <label className="label" style={{ fontSize: '0.75rem' }}>Biometric Registry</label>
            <select
              className="input"
              value={biometricFilter}
              onChange={(e) => setBiometricFilter(e.target.value as any)}
            >
              <option value="All">All Students</option>
              <option value="Enrolled">🟢 Biometrically Enrolled</option>
              <option value="Not Enrolled">⚪ Not Enrolled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Adm No.</th>
                <th>Student Name</th>
                <th>Program & Year</th>
                <th>Biometrics</th>
                <th>Contact & Sponsor (Optional)</th>
                <th>Attendance</th>
                <th>Fee Status</th>
                <th style={{ textAlign: 'right' }}>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>
                    No student records found. Click "+ Register New Student" to add a student to the directory.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((std) => (
                  <tr key={std.id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{std.admission_number}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{std.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{std.gender} • DOB: {std.dob}</div>
                    </td>
                    <td>
                      <div className="badge badge-info">{std.class_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{std.grade_level}</div>
                    </td>
                    <td>
                      {std.biometric_enrolled ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                            🟢 {std.biometric_finger_name || 'Enrolled'}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-xs btn-secondary"
                          style={{ fontSize: '0.7rem', color: '#0284c7', borderColor: '#bae6fd' }}
                          onClick={() => {
                            setStudentToEnroll(std)
                            setShowEnrollModal(true)
                          }}
                        >
                          🖐️ Enroll
                        </button>
                      )}
                    </td>
                    <td>
                      {std.guardian?.name && std.guardian.name !== 'Self-Sponsored Student' ? (
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{std.guardian.name} ({std.guardian.relationship || 'Sponsor'})</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{std.guardian.phone || std.emergency_contact || 'No phone'}</div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e3a8a' }}>👤 Self-Sponsored</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{std.emergency_contact || std.guardian?.phone || 'Direct Enrolled'}</div>
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, height: '6px', width: '50px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${std.attendance_rate || 0}%`,
                              background: (std.attendance_rate || 0) >= 90 ? '#16a34a' : (std.attendance_rate || 0) > 0 ? '#ea580c' : '#94a3b8',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          {std.attendance_rate && std.attendance_rate > 0 ? `${std.attendance_rate}%` : '0% (New)'}
                        </span>
                      </div>
                    </td>
                    <td>
                      {std.fee_balance === 0 ? (
                        <span className="badge badge-success">✓ Cleared</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span className="badge badge-warning">
                            ${std.fee_balance.toLocaleString()} Due
                          </span>
                          <button
                            type="button"
                            className="btn btn-xs"
                            style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontSize: '0.7rem' }}
                            onClick={() => setReminderTarget(std)}
                          >
                            📢 Remind Payer
                          </button>
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedStudent(std)}
                          title="View Profile Dossier"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <EyeIcon size={14} />
                          <span>Dossier</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#1e3a8a', fontWeight: 700 }}
                          onClick={() => {
                            const cleanAdm = std.admission_number.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
                            let currentPass = std.portal_password || ''
                            if (!currentPass) {
                              try {
                                const raw = localStorage.getItem('gc_v2_local_credentials') || localStorage.getItem('gc_local_credentials')
                                if (raw) {
                                  const parsed = JSON.parse(raw)
                                  if (parsed[cleanAdm]?.password) {
                                    currentPass = parsed[cleanAdm].password
                                  }
                                }
                              } catch {}
                            }
                            if (!currentPass) currentPass = 'Student@2026'

                            setInlinePassEdit('')
                            setCredentialsModalData({
                              studentName: std.full_name,
                              admissionNumber: std.admission_number,
                              password: currentPass,
                              program: std.class_name,
                              phone: std.guardian?.phone || '',
                              isNew: false,
                            })
                          }}
                          title="View / Copy Student Login Credentials"
                        >
                          🔑 Pass
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{
                            background: std.fee_cleared ? '#f0fdf4' : '#fffbeb',
                            border: `1px solid ${std.fee_cleared ? '#86efac' : '#fcd34d'}`,
                            color: std.fee_cleared ? '#16a34a' : '#b45309',
                            fontWeight: 700,
                          }}
                          onClick={() => handleQuickClearFees(std)}
                          title={std.fee_cleared ? 'Tuition Fee 100% Cleared (Click to re-verify)' : 'Click to 100% Clear Tuition Fees & Unlock Lessons'}
                        >
                          {std.fee_cleared ? '⚡ Cleared ✓' : '⚡ Clear Fees'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{
                            background: std.certificate_granted ? '#fef3c7' : '#f8fafc',
                            border: std.certificate_granted ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                            color: std.certificate_granted ? '#b45309' : '#475569',
                            fontWeight: 700,
                          }}
                          onClick={async () => {
                            const willGrant = !std.certificate_granted
                            await schoolStore.grantCertificate(std.id, willGrant)
                            setStudents(schoolStore.getStudents())
                            if (selectedStudent && selectedStudent.id === std.id) {
                              setSelectedStudent({ ...selectedStudent, certificate_granted: willGrant })
                            }
                          }}
                          title={std.certificate_granted ? 'Certificate is GRANTED (Click to revoke)' : 'Click to Grant & Authorize Certificate of Completion'}
                        >
                          {std.certificate_granted ? '🎓 Cert Granted ✓' : '🎓 Grant Cert'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setEditingStudent(std)
                            setEditPasswordInput('')
                          }}
                          title="Edit Student Information"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteStudent(std.id, std.full_name)}
                          title="Delete / Archive Student"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Profile Detailed Modal */}
      {selectedStudent && (
        <div className="modal-overlay" onClick={() => setSelectedStudent(null)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                  }}
                >
                  {selectedStudent.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="modal-title">{selectedStudent.full_name}</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    Admission No: <strong>{selectedStudent.admission_number}</strong> • {selectedStudent.class_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setSelectedStudent(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {/* Bio Details */}
              <div className="card" style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-primary)' }}>
                  👤 Personal & Academic Bio
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div><strong>Gender:</strong> {selectedStudent.gender || 'Not Specified'}</div>
                  <div><strong>Date of Birth:</strong> {selectedStudent.dob || 'Not Specified'}</div>
                  <div><strong>Program:</strong> {selectedStudent.class_name}</div>
                  <div><strong>Course Duration:</strong> {selectedStudent.grade_level || '4 to 12 Weeks Certificate'}</div>
                  <div><strong>Specialization:</strong> {selectedStudent.stream || 'Practical Skills Cohort'}</div>
                  <div><strong>Enrollment Date:</strong> {selectedStudent.enrollment_date}</div>
                  {selectedStudent.blood_group && <div><strong>Blood Group:</strong> {selectedStudent.blood_group}</div>}
                  <div><strong>Status:</strong> <span className="badge badge-success">{selectedStudent.status}</span></div>
                </div>
              </div>

              {/* Guardian / Contact Information */}
              <div className="card" style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-primary)' }}>
                  👨‍👩‍👦 Sponsor / Direct Contact Details
                </h4>
                {selectedStudent.guardian?.name && selectedStudent.guardian.name !== 'Self-Sponsored Student' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <div><strong>Guardian / Sponsor:</strong> {selectedStudent.guardian.name}</div>
                    <div><strong>Relationship:</strong> {selectedStudent.guardian.relationship || 'Sponsor'}</div>
                    <div><strong>Phone Number:</strong> {selectedStudent.guardian.phone || 'Not Provided'}</div>
                    {selectedStudent.guardian.email && <div><strong>Email Address:</strong> {selectedStudent.guardian.email}</div>}
                    {selectedStudent.guardian.occupation && <div><strong>Occupation:</strong> {selectedStudent.guardian.occupation}</div>}
                    {selectedStudent.guardian.address && <div><strong>Residential Address:</strong> {selectedStudent.guardian.address}</div>}
                    {selectedStudent.emergency_contact && <div><strong>Direct Student Phone:</strong> {selectedStudent.emergency_contact}</div>}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <div style={{ color: '#166534', fontWeight: 700 }}>👤 Self-Sponsored Student</div>
                    <div><strong>Student Contact Phone:</strong> {selectedStudent.emergency_contact || selectedStudent.guardian?.phone || 'Not on file'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>No separate parent/guardian required for this independent account.</div>
                  </div>
                )}
              </div>

              {/* Financial & Fee Status — Dynamically calculated from live receipts & invoices */}
              {(() => {
                const studentReceipts = schoolStore.getReceipts().filter(
                  (r) => r.student_id === selectedStudent.id || r.admission_number === selectedStudent.admission_number
                )
                const totalPaid = studentReceipts.reduce((acc, r) => acc + (Number(r.amount) || 0), 0)
                const totalBilled = selectedStudent.term_fee_total || 60
                const currentBalance = Math.max(0, totalBilled - totalPaid)
                const isFullyPaid = currentBalance === 0 && totalPaid > 0

                return (
                  <div className="card" style={{ padding: '1rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-primary)' }}>
                      💳 Tuition & Financial Ledger
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <div><strong>Total Course Billed:</strong> ${totalBilled.toLocaleString()}</div>
                      <div><strong>Total Paid to Date:</strong> <span style={{ fontWeight: 700, color: totalPaid > 0 ? '#16a34a' : 'inherit' }}>${totalPaid.toLocaleString()}</span></div>
                      <div>
                        <strong>Outstanding Balance:</strong>{' '}
                        <span style={{ fontWeight: 700, color: currentBalance > 0 ? '#dc2626' : '#16a34a' }}>
                          ${currentBalance.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <strong>Clearance Status:</strong>{' '}
                        {isFullyPaid ? (
                          <span className="badge badge-success">✓ Fully Cleared</span>
                        ) : totalPaid > 0 ? (
                          <span className="badge badge-warning">Partial Payment (${currentBalance.toLocaleString()} Due)</span>
                        ) : (
                          <span className="badge badge-danger">Unpaid (${currentBalance.toLocaleString()} Due)</span>
                        )}
                      </div>
                      <div>
                        <strong>Exam Clearance Card:</strong>{' '}
                        {isFullyPaid && selectedStudent.biometric_enrolled
                          ? '✓ Issued & Valid'
                          : isFullyPaid && !selectedStudent.biometric_enrolled
                          ? '⚠️ Fees Cleared • Pending Biometric Registration'
                          : '✕ Withheld until tuition fees are settled'}
                      </div>

                      {/* Payment History List */}
                      {studentReceipts.length > 0 ? (
                        <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
                          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.3rem' }}>
                            Receipts on File ({studentReceipts.length}):
                          </div>
                          {studentReceipts.map((rc) => (
                            <div key={rc.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', padding: '0.2rem 0' }}>
                              <span>{rc.receipt_number} ({rc.payment_method})</span>
                              <strong style={{ color: '#16a34a' }}>${rc.amount.toLocaleString()}</strong>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.3rem' }}>
                          No payment receipts recorded yet.
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Conduct & Attendance */}
              <div className="card" style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-primary)' }}>
                  ⭐ Conduct & Lecture Attendance
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div>
                    <strong>Lecture Attendance Rate:</strong>{' '}
                    {selectedStudent.attendance_rate && selectedStudent.attendance_rate > 0
                      ? `${selectedStudent.attendance_rate}%`
                      : '0% (No lecture sessions attended yet)'}
                  </div>
                  <div>
                    <strong>Discipline Index:</strong>{' '}
                    {selectedStudent.discipline_points && selectedStudent.discipline_points > 0
                      ? `${selectedStudent.discipline_points}/100`
                      : '0 Demerits (Clean Record)'}
                  </div>
                  <div><strong>Merit Commendations:</strong> ⭐ {selectedStudent.merits_count || 0} awarded</div>
                  <div><strong>Demerit Points:</strong> ⚠️ {selectedStudent.demerits_count || 0} recorded</div>
                  <div>
                    <strong>Academic Standing:</strong>{' '}
                    <span className="badge badge-info">
                      {!selectedStudent.attendance_rate || selectedStudent.attendance_rate === 0
                        ? 'Newly Admitted'
                        : selectedStudent.status === 'Active'
                        ? 'Active Enrollee'
                        : selectedStudent.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Biometric Security & Fingerprint Registry Card */}
              <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #0284c7' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: '#0284c7' }}>
                  🖐️ Biometric Security & Fee Clearance Registry
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div>
                    <strong>Enrollment Status:</strong>{' '}
                    {selectedStudent.biometric_enrolled ? (
                      <span className="badge badge-success">✓ Active & Enrolled</span>
                    ) : (
                      <span className="badge badge-danger">Not Enrolled</span>
                    )}
                  </div>
                  {selectedStudent.biometric_enrolled ? (
                    <>
                      <div><strong>Primary Finger:</strong> 🖐️ {selectedStudent.biometric_finger_name || 'Right Index'}</div>
                      <div><strong>Enrolled Date:</strong> {selectedStudent.biometric_enrolled_at ? new Date(selectedStudent.biometric_enrolled_at).toLocaleDateString() : 'Active'}</div>
                      <div><strong>Enrolled Officer:</strong> {selectedStudent.biometric_enrolled_by || 'Bursar Desk'}</div>
                      <div>
                        <strong>Template Hash:</strong>{' '}
                        <code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                          {selectedStudent.biometric_template_hash?.slice(0, 24)}...
                        </code>
                      </div>
                    </>
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      No fingerprint recorded yet. Student must enroll biometrics for instant exam sitting clearance and fee payment verification.
                    </div>
                  )}

                  <div style={{ marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      style={{ background: '#0284c7', borderColor: '#0284c7', width: '100%' }}
                      onClick={() => {
                        setStudentToEnroll(selectedStudent)
                        setShowEnrollModal(true)
                      }}
                    >
                      {selectedStudent.biometric_enrolled ? '🖐️ Re-scan & Update Fingerprint' : '🖐️ Enroll Student Fingerprint'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => window.print()}
                >
                  🖨️ Print Dossier
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  onClick={() => {
                    const cleanAdm = selectedStudent.admission_number.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
                    let currentPass = 'Student@2026'
                    try {
                      const raw = localStorage.getItem('gc_v2_local_credentials') || localStorage.getItem('gc_local_credentials')
                      if (raw) {
                        const parsed = JSON.parse(raw)
                        if (parsed[cleanAdm]?.password) {
                          currentPass = parsed[cleanAdm].password
                        }
                      }
                    } catch {}
                    setCredentialsModalData({
                      studentName: selectedStudent.full_name,
                      admissionNumber: selectedStudent.admission_number,
                      password: currentPass,
                      program: selectedStudent.class_name,
                      phone: selectedStudent.guardian?.phone || '',
                      isNew: false,
                    })
                  }}
                >
                  <KeyIcon size={14} />
                  <span>View Login Pass</span>
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{
                    background: selectedStudent.fee_cleared ? '#f0fdf4' : '#fffbeb',
                    color: selectedStudent.fee_cleared ? '#16a34a' : '#b45309',
                    border: `1px solid ${selectedStudent.fee_cleared ? '#86efac' : '#fcd34d'}`,
                    fontWeight: 700,
                  }}
                  onClick={() => handleQuickClearFees(selectedStudent)}
                  title={selectedStudent.fee_cleared ? 'Tuition Fee 100% Cleared (Click to re-verify)' : 'Click to 100% Clear Tuition Fees & Unlock Lessons'}
                >
                  {selectedStudent.fee_cleared ? '⚡ Fees 100% Cleared ✓' : '⚡ Clear Fees & Unlock'}
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{
                    background: selectedStudent.certificate_granted ? '#fef3c7' : '#f8fafc',
                    color: selectedStudent.certificate_granted ? '#b45309' : '#1e3a8a',
                    border: selectedStudent.certificate_granted ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                    fontWeight: 700,
                  }}
                  onClick={async () => {
                    const willGrant = !selectedStudent.certificate_granted
                    await schoolStore.grantCertificate(selectedStudent.id, willGrant)
                    const updatedList = schoolStore.getStudents()
                    setStudents(updatedList)
                    setSelectedStudent({ ...selectedStudent, certificate_granted: willGrant })
                  }}
                >
                  {selectedStudent.certificate_granted ? '🎓 Certificate Granted ✓ (Click to Revoke)' : '🎓 Grant Certificate'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setEditingStudent(selectedStudent)
                    setEditPasswordInput('')
                    setSelectedStudent(null)
                  }}
                >
                  ✏️ Edit Student Info
                </button>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedStudent(null)}
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="modal-overlay" onClick={() => setEditingStudent(null)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Student Record: {editingStudent.full_name}</h3>
              <button type="button" className="modal-close" onClick={() => setEditingStudent(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="label">Full Name *</label>
                    <input
                      type="text"
                      required
                      className="input"
                      value={editingStudent.full_name}
                      onChange={(e) => setEditingStudent({ ...editingStudent, full_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Admission Number *</label>
                    <input
                      type="text"
                      required
                      className="input"
                      value={editingStudent.admission_number}
                      onChange={(e) => setEditingStudent({ ...editingStudent, admission_number: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="label">Gender</label>
                    <select
                      className="input"
                      value={editingStudent.gender}
                      onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value as any })}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Date of Birth</label>
                    <input
                      type="date"
                      className="input"
                      value={editingStudent.dob}
                      onChange={(e) => setEditingStudent({ ...editingStudent, dob: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select
                      className="input"
                      value={editingStudent.status}
                      onChange={(e) => setEditingStudent({ ...editingStudent, status: e.target.value as any })}
                    >
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Alumni">Alumni</option>
                      <option value="Transferred">Transferred</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="label">Program / Diploma Title</label>
                    <select
                      className="input"
                      value={editingStudent.class_name}
                      onChange={(e) => setEditingStudent({ ...editingStudent, class_name: e.target.value })}
                    >
                      {programOptions.map((prog) => (
                        <option key={prog} value={prog}>{prog}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Academic Year / Semester</label>
                    <input
                      type="text"
                      className="input"
                      value={editingStudent.grade_level}
                      onChange={(e) => setEditingStudent({ ...editingStudent, grade_level: e.target.value })}
                    />
                  </div>
                </div>

                {/* Reset Login Password */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.85rem', borderRadius: '6px' }}>
                  <label className="label" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e3a8a' }}>
                    🔑 Reset Student Login Password (Optional)
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Leave blank to keep existing password, or enter new password"
                    value={editPasswordInput}
                    onChange={(e) => setEditPasswordInput(e.target.value)}
                  />
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Updating this password allows the student to log in at <code>/login</code> immediately with the new password.
                  </div>
                </div>

                {/* Guardian Details (Optional) */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
                    Guardian & Sponsor Information (Optional)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label className="label">Guardian Name (Optional)</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Optional"
                        value={editingStudent.guardian?.name || ''}
                        onChange={(e) =>
                          setEditingStudent({
                            ...editingStudent,
                            guardian: { ...editingStudent.guardian, name: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">Guardian Phone (Optional)</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Optional"
                        value={editingStudent.guardian?.phone || ''}
                        onChange={(e) =>
                          setEditingStudent({
                            ...editingStudent,
                            guardian: { ...editingStudent.guardian, phone: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">Guardian Email (Optional)</label>
                      <input
                        type="email"
                        className="input"
                        placeholder="Optional"
                        value={editingStudent.guardian.email}
                        onChange={(e) =>
                          setEditingStudent({
                            ...editingStudent,
                            guardian: { ...editingStudent.guardian, email: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Balances */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
                    Fees & Attendance
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label className="label">Total Course Fee ($ USD)</label>
                      <input
                        type="number"
                        className="input"
                        value={editingStudent.term_fee_total}
                        onChange={(e) =>
                          setEditingStudent({ ...editingStudent, term_fee_total: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">Outstanding Balance ($ USD)</label>
                      <input
                        type="number"
                        className="input"
                        value={editingStudent.fee_balance}
                        onChange={(e) =>
                          setEditingStudent({ ...editingStudent, fee_balance: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">Attendance Rate (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="input"
                        value={editingStudent.attendance_rate}
                        onChange={(e) =>
                          setEditingStudent({ ...editingStudent, attendance_rate: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingStudent(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Payment Reminder Modal */}
      {reminderTarget && (
        <div className="modal-overlay" onClick={() => setReminderTarget(null)}>
          <div className="modal-content modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Send Payment SMS Reminder</h3>
              <button type="button" className="modal-close" onClick={() => setReminderTarget(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                <div><strong>Student:</strong> {reminderTarget.full_name} ({reminderTarget.admission_number})</div>
                <div><strong>Guardian / Sponsor:</strong> {reminderTarget.guardian.name}</div>
                <div><strong>Recipient Phone:</strong> 📲 {reminderTarget.guardian.phone}</div>
                <div><strong>Outstanding Balance:</strong> <span style={{ color: '#ea580c', fontWeight: 700 }}>${reminderTarget.fee_balance.toLocaleString()}</span></div>
              </div>

              <div>
                <label className="label" style={{ fontSize: '0.8rem' }}>SMS Message Preview:</label>
                <div
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid var(--color-border)',
                    borderRadius: '6px',
                    padding: '0.85rem',
                    fontSize: '0.85rem',
                    lineHeight: '1.6',
                    color: '#1e293b',
                    fontFamily: 'monospace',
                  }}
                >
                  Dear {reminderTarget.guardian.name}, reminder from Global College Accounts: {reminderTarget.full_name} ({reminderTarget.admission_number}) has an outstanding tuition balance of ${reminderTarget.fee_balance.toLocaleString()}. Kindly settle via the online student portal before the clearance deadline.
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setReminderTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleDispatchReminder(reminderTarget)}
              >
                📲 Dispatch SMS Reminder Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Register New College Student</h3>
              <button type="button" className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddStudent}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label className="label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="Enter student full name"
                    value={newStudent.full_name}
                    onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="label">Admission Number *</label>
                    <input
                      type="text"
                      required
                      className="input"
                      value={newStudent.admission_number}
                      onChange={(e) => setNewStudent({ ...newStudent, admission_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Gender</label>
                    <select
                      className="input"
                      value={newStudent.gender}
                      onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value as any })}
                    >
                      <option value="Not Specified">Not Specified</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="label">Enrolled Short Course / Program *</label>
                    <select
                      className="input"
                      value={newStudent.class_name}
                      onChange={(e) => setNewStudent({ ...newStudent, class_name: e.target.value })}
                    >
                      {programOptions.map((prog) => (
                        <option key={prog} value={prog}>{prog}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Course Duration</label>
                    <select
                      className="input"
                      value={newStudent.grade_level}
                      onChange={(e) => setNewStudent({ ...newStudent, grade_level: e.target.value })}
                    >
                      <option value="2 Months (Fast-Track Skills)">2 Months (Fast-Track Skills)</option>
                      <option value="3 Months (Certificate Program)">3 Months (Certificate Program)</option>
                      <option value="4 Months (Professional Course)">4 Months (Professional Course)</option>
                      <option value="6 Months (Modular Diploma)">6 Months (Modular Diploma)</option>
                      <option value="Executive Masterclass">Executive Masterclass</option>
                    </select>
                  </div>
                </div>

                {/* Student Login Credentials Section */}
                <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label className="label" style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e3a8a', margin: 0 }}>
                      🔑 Student Portal Login Password *
                    </label>
                    <button
                      type="button"
                      className="btn btn-xs btn-secondary"
                      onClick={() => setStudentPasswordInput(`Global College@${Math.floor(1000 + Math.random() * 9000)}!`)}
                    >
                      🎲 Generate Secure Password
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="Enter student login password (e.g. Student@2026)"
                    value={studentPasswordInput}
                    onChange={(e) => setStudentPasswordInput(e.target.value)}
                  />
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.3rem' }}>
                    The student will log in at <code>/login</code> using Admission Number <strong>{newStudent.admission_number}</strong> and this password.
                  </div>
                </div>

                {/* Student Direct Contact */}
                <div>
                  <label className="label">Student Phone / WhatsApp (Optional)</label>
                  <input
                    type="tel"
                    className="input"
                    placeholder="+254 700 000 000 or international phone"
                    value={studentPhoneInput}
                    onChange={(e) => setStudentPhoneInput(e.target.value)}
                  />
                </div>

                {/* Guardian Details (100% Optional) */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--color-primary)' }}>
                    Guardian / Sponsor Information (Optional)
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0 0 0.5rem' }}>
                    Leave blank for adult, self-sponsored, or corporate professionals.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label className="label">Guardian Name (Optional)</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Optional"
                        value={newStudent.guardian?.name || ''}
                        onChange={(e) =>
                          setNewStudent({
                            ...newStudent,
                            guardian: { ...newStudent.guardian!, name: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">Guardian Phone (Optional)</label>
                      <input
                        type="tel"
                        className="input"
                        placeholder="Optional"
                        value={newStudent.guardian?.phone || ''}
                        onChange={(e) =>
                          setNewStudent({
                            ...newStudent,
                            guardian: { ...newStudent.guardian!, phone: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save, Enroll & Generate Login Pass</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Login Credentials Pass Modal */}
      {credentialsModalData && (
        <div className="modal-overlay" onClick={() => setCredentialsModalData(null)}>
          <div className="modal-content modal-md" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)', color: '#ffffff', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.6rem' }}>🎓</span>
                <div>
                  <h3 className="modal-title" style={{ color: '#ffffff', fontSize: '1.2rem', margin: 0 }}>
                    {credentialsModalData.isNew ? 'Student Enrolled & Login Pass Created' : 'Student Login Credentials & Portal Pass'}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#93c5fd' }}>
                    Official Student LMS & Portal Authentication Pass
                  </div>
                </div>
              </div>
              <button type="button" className="modal-close" style={{ color: '#ffffff' }} onClick={() => setCredentialsModalData(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {credentialsModalData.isNew && (
                <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#065f46', padding: '0.85rem 1rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.3rem' }}>✅</span>
                  <div>
                    <strong>Student Account Activated!</strong> Enrolled into <strong>{credentialsModalData.program}</strong>. The student can log in immediately.
                  </div>
                </div>
              )}

              {/* Credentials Card */}
              <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 800, marginBottom: '0.75rem' }}>
                  GLOBAL COLLEGE • STUDENT PORTAL CREDENTIALS
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>Student Name:</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{credentialsModalData.studentName}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>Admission Number / Username:</span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#1e3a8a', fontFamily: 'monospace' }}>{credentialsModalData.admissionNumber}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>Login Password:</span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#15803d', fontFamily: 'monospace', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                      {credentialsModalData.password}
                    </span>
                  </div>

                  {/* Change/Set Custom Password Field */}
                  <div style={{ background: '#f1f5f9', padding: '0.65rem 0.85rem', borderRadius: '6px', marginTop: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                      ✏️ Change / Set Custom Password for this Student:
                    </label>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input
                        type="text"
                        placeholder="Type custom student password..."
                        value={inlinePassEdit}
                        onChange={(e) => setInlinePassEdit(e.target.value)}
                        className="form-input form-input-sm"
                        style={{ flex: 1, fontFamily: 'monospace', background: '#ffffff' }}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        style={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                        onClick={async () => {
                          if (!inlinePassEdit.trim()) {
                            alert('Please enter a custom password first.')
                            return
                          }
                          const newPass = inlinePassEdit.trim()
                          await saveStudentCredentials(credentialsModalData.admissionNumber, credentialsModalData.studentName, newPass)
                          setCredentialsModalData({ ...credentialsModalData, password: newPass })
                          setInlinePassEdit('')
                          alert(`Custom login password for ${credentialsModalData.studentName} updated to "${newPass}"!`)
                        }}
                      >
                        💾 Save Password
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>Portal URL:</span>
                    <a href={INSTITUTION_CONFIG.portalUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: 700 }}>
                      {INSTITUTION_CONFIG.domain}/login
                    </a>
                  </div>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const text = `🎓 ${INSTITUTION_CONFIG.name.toUpperCase()} STUDENT PORTAL LOGIN\n\nStudent Name: ${credentialsModalData.studentName}\nAdmission Number: ${credentialsModalData.admissionNumber}\nPassword: ${credentialsModalData.password}\nEnrolled Program: ${credentialsModalData.program}\n\nLogin Link: ${INSTITUTION_CONFIG.portalUrl}`
                    navigator.clipboard.writeText(text)
                    setCopiedNotification(true)
                    setTimeout(() => setCopiedNotification(false), 3000)
                  }}
                >
                  {copiedNotification ? '✓ Copied to Clipboard!' : '📋 Copy Login Details'}
                </button>

                {credentialsModalData.phone ? (
                  <a
                    href={`https://api.whatsapp.com/send?phone=${credentialsModalData.phone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(
                      `🎓 *${INSTITUTION_CONFIG.name.toUpperCase()} STUDENT PORTAL LOGIN*\n\nHello *${credentialsModalData.studentName}*,\nYour student account has been set up for *${credentialsModalData.program}*.\n\n*Admission Number / Username:* ${credentialsModalData.admissionNumber}\n*Password:* ${credentialsModalData.password}\n*Portal Link:* ${INSTITUTION_CONFIG.portalUrl}\n\nPlease log in to access your video lessons and live virtual classes.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn"
                    style={{ background: '#25D366', color: '#ffffff', fontWeight: 700, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                  >
                    📲 Send via WhatsApp
                  </a>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => window.print()}
                  >
                    🖨️ Print Login Pass
                  </button>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCredentialsModalData(null)}
              >
                Close Pass
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Biometric Student Enrollment Modal */}
      {showEnrollModal && studentToEnroll && (
        <BiometricEnrollModal
          student={studentToEnroll}
          officerName="Registrar Desk"
          onClose={() => {
            setShowEnrollModal(false)
            setStudentToEnroll(null)
          }}
          onEnrolled={(updated) => {
            setStudents(schoolStore.getStudents())
            if (selectedStudent && selectedStudent.id === updated.id) {
              setSelectedStudent(updated)
            }
          }}
        />
      )}

      {/* Biometric Scanner Terminal Modal */}
      {showBiometricStation && (
        <BiometricScannerModal
          officerName="Registrar Desk"
          onClose={() => setShowBiometricStation(false)}
        />
      )}
    </div>
  )
}
