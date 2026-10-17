import React, { useState, useMemo, useEffect } from 'react'
import type {
  PartnerSchoolTenant,
  TenantStaffMember,
  TenantStudentMember,
  TenantPayrollRecord,
  TenantTimetableEntry,
  TenantAdmissionApplication,
  ApplicationStatus,
} from '@/types/tenantSchool'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'
import { TenantAcademicCalendarView } from './TenantAcademicCalendarView'
import { TenantCampusNoticeboard } from './TenantCampusNoticeboard'
import { TenantProgramsPage } from './TenantProgramsPage'

export type PrincipalSubTab =
  | 'overview'
  | 'staff'
  | 'admissions'
  | 'programs'
  | 'timetable'
  | 'payroll'
  | 'calendar'
  | 'notices'
  | 'governance'

export interface TenantPrincipalDeskProps {
  school: PartnerSchoolTenant
  staffList: TenantStaffMember[]
  studentList: TenantStudentMember[]
  payrollList: TenantPayrollRecord[]
  isLicenseActive?: boolean
  onOpenLicenseModal?: () => void
  onNavigateToBilling?: () => void
  onReloadData: () => void
  onOpenStaffSlip: (staff: TenantStaffMember) => void
  onOpenStaffOfferLetter?: (staff: TenantStaffMember) => void
  onOpenAdmissionSlip: (student: TenantStudentMember) => void
  onOpenDomainSettings: () => void
  onOpenApplyModal?: (programTitle?: string) => void
  initialSubTab?: PrincipalSubTab
}

export function TenantPrincipalDesk({
  school,
  staffList,
  studentList,
  payrollList,
  isLicenseActive = true,
  onOpenLicenseModal,
  onNavigateToBilling,
  onReloadData,
  onOpenStaffSlip,
  onOpenStaffOfferLetter,
  onOpenAdmissionSlip,
  onOpenDomainSettings,
  onOpenApplyModal,
  initialSubTab,
}: TenantPrincipalDeskProps) {
  const primaryColor = school.primary_color || '#881337'
  const accentColor = school.accent_color || '#d4af37'
  const currency = school.currency || 'KES'

  const requireActivation = (actionName: string, callback?: () => void) => {
    if (!isLicenseActive) {
      if (onOpenLicenseModal) onOpenLicenseModal()
      alert(`Institutional product key activation required. ${actionName} is disabled until your campus license is activated.`)
      return false
    }
    if (callback) callback()
    return true
  }

  // Dynamic Current Year and Month
  const currentYear = useMemo(() => new Date().getFullYear(), [])
  const currentMonthYear = useMemo(
    () => new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    []
  )

  const [principalSubTab, setPrincipalSubTab] = useState<PrincipalSubTab>(initialSubTab || 'overview')

  useEffect(() => {
    if (initialSubTab) {
      setPrincipalSubTab(initialSubTab)
    }
  }, [initialSubTab])

  // Dynamic Academic Programs for School
  const schoolPrograms = useMemo(() => {
    return tenantSchoolStore.getProgramsBySchool(school.slug)
  }, [school.slug])

  // Dynamic Class Cohorts
  const availableClasses = useMemo(() => {
    const set = new Set<string>()
    if (Array.isArray(school.classes_list) && school.classes_list.length > 0) {
      school.classes_list.forEach((c) => { if (c && c.trim()) set.add(c.trim()) })
    }
    schoolPrograms.forEach((p) => {
      if (p.title && p.title.trim()) set.add(p.title.trim())
    })
    studentList.forEach((s) => {
      if (s.grade_class && s.grade_class.trim()) {
        set.add(s.grade_class.trim())
      }
    })
    const list = Array.from(set)
    if (list.length > 0) return list

    // Category-specific defaults if no classes or programs are defined yet
    if (school.institution_category === 'university') {
      return ['Undergraduate Year 1', 'Postgraduate Cohort']
    }
    if (school.institution_category === 'school') {
      return ['Grade 1', 'Grade 2']
    }
    return ['Diploma Cohort', 'Certificate Cohort']
  }, [school.classes_list, school.institution_category, schoolPrograms, studentList])

  // Dynamic Departments
  const availableDepartments = useMemo(() => {
    const list = school.departments_list && school.departments_list.length > 0 ? [...school.departments_list] : []
    staffList.forEach((st) => {
      if (st.department && !list.includes(st.department)) {
        list.push(st.department)
      }
    })
    return list.length > 0 ? list : ['Academic Faculty', 'Administration', 'Student Services']
  }, [school.departments_list, staffList])

  // Dynamic Teachers List for Timetable
  const teachersList = useMemo(() => {
    return staffList.filter((s) => s.role === 'teacher')
  }, [staffList])

  // Active Timetable Class
  const [selectedTimetableClass, setSelectedTimetableClass] = useState<string>(
    availableClasses[0] || 'Main Cohort'
  )

  useEffect(() => {
    if (!availableClasses.includes(selectedTimetableClass) && availableClasses.length > 0) {
      setSelectedTimetableClass(availableClasses[0])
    }
  }, [availableClasses, selectedTimetableClass])

  const classTimetable = useMemo(() => {
    return tenantSchoolStore.getTimetableBySchool(school.slug, selectedTimetableClass)
  }, [school.slug, selectedTimetableClass, studentList, staffList])

  // Search & Filters
  const [staffSearchQuery, setStaffSearchQuery] = useState('')
  const [staffRoleFilter, setStaffRoleFilter] = useState<'all' | 'teacher' | 'bursar' | 'admin'>('all')
  const [staffDeptFilter, setStaffDeptFilter] = useState<string>('all')

  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [studentClassFilter, setStudentClassFilter] = useState<string>('all')
  const [studentFeeFilter, setStudentFeeFilter] = useState<'all' | 'cleared' | 'partial' | 'unpaid'>('all')

  const [payrollMonthFilter, setPayrollMonthFilter] = useState<string>('all')
  const [payrollStatusFilter, setPayrollStatusFilter] = useState<'all' | 'draft' | 'approved' | 'disbursed'>('all')

  // Online Admission Applications State & Real-Time Sync
  const [applications, setApplications] = useState<TenantAdmissionApplication[]>(() =>
    tenantSchoolStore.getApplicationsBySchool(school.slug)
  )
  const [admissionsViewMode, setAdmissionsViewMode] = useState<'roster' | 'applications'>('roster')
  const [appSearchQuery, setAppSearchQuery] = useState('')
  const [appStatusFilter, setAppStatusFilter] = useState<string>('all')

  // Application Follow-Up Modal State
  const [followingUpApp, setFollowingUpApp] = useState<TenantAdmissionApplication | null>(null)
  const [followUpStatus, setFollowUpStatus] = useState<ApplicationStatus>('Contacted')
  const [followUpNotes, setFollowUpNotes] = useState('')

  useEffect(() => {
    const handleAppsUpdate = () => {
      setApplications(tenantSchoolStore.getApplicationsBySchool(school.slug))
    }
    window.addEventListener('gc-tenant-applications-updated', handleAppsUpdate)
    return () => window.removeEventListener('gc-tenant-applications-updated', handleAppsUpdate)
  }, [school.slug])

  // Modals
  const [showAddStaffModal, setShowAddStaffModal] = useState(false)
  const [editingStaffMember, setEditingStaffMember] = useState<TenantStaffMember | null>(null)
  const [showAdmitStudentModal, setShowAdmitStudentModal] = useState(false)
  const [editingStudentMember, setEditingStudentMember] = useState<TenantStudentMember | null>(null)
  const [showAddTimetableModal, setShowAddTimetableModal] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<TenantTimetableEntry | null>(null)
  const [showManageClassesModal, setShowManageClassesModal] = useState(false)
  const [showManageDeptsModal, setShowManageDeptsModal] = useState(false)
  const [showEditSchoolModal, setShowEditSchoolModal] = useState(false)

  // Credentials Modals
  const [editingStaffCreds, setEditingStaffCreds] = useState<TenantStaffMember | null>(null)
  const [editStaffUsername, setEditStaffUsername] = useState('')
  const [editStaffPassword, setEditStaffPassword] = useState('')

  const [editingStudentCreds, setEditingStudentCreds] = useState<TenantStudentMember | null>(null)
  const [editStudentUsername, setEditStudentUsername] = useState('')
  const [editStudentPassword, setEditStudentPassword] = useState('')

  // New Class Input State
  const [newClassNameInput, setNewClassNameInput] = useState('')
  // New Department Input State
  const [newDeptNameInput, setNewDeptNameInput] = useState('')

  // School Identity Edit Form State
  const [schoolProfileInput, setSchoolProfileInput] = useState({
    name: school.name || '',
    motto: school.motto || '',
    principal_name: school.principal_name || '',
    principal_title: school.principal_title || 'Principal',
    contact_email: school.contact_email || '',
    contact_phone: school.contact_phone || '',
    address: school.address || '',
  })
  const [schoolProfileSaved, setSchoolProfileSaved] = useState(false)

  // Currency Setting
  const [currencySetting, setCurrencySetting] = useState(currency)
  const [currencySavedMessage, setCurrencySavedMessage] = useState(false)

  // Add/Edit Staff Form State (Zero hardcoded defaults)
  const [staffForm, setStaffForm] = useState({
    full_name: '',
    role: 'teacher' as 'teacher' | 'bursar' | 'admin' | 'principal',
    department: '',
    custom_department: '',
    title: '',
    email: '',
    phone: '',
    username: '',
    temp_password: '',
    assigned_classes: '',
    assigned_subjects: '',
    salary_base: 0,
    salary_housing: 0,
    salary_transport: 0,
    salary_tax: 0,
    salary_pension: 0,
  })

  // Add/Edit Student Form State (Zero hardcoded defaults)
  const [studentForm, setStudentForm] = useState({
    full_name: '',
    grade_class: '',
    custom_class: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_email: '',
    fee_total: 0,
    fee_paid: 0,
  })

  // Add/Edit Timetable Entry State
  const [timetableForm, setTimetableForm] = useState({
    day_of_week: 'Monday' as 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday',
    period_number: 1,
    start_time: '08:00',
    end_time: '08:50',
    subject_name: '',
    teacher_name: '',
    room: '',
  })

  // Disbursal Method for Payroll
  const [disbursalMethod, setDisbursalMethod] = useState<'Bank Wire' | 'Mobile Money' | 'Cheque'>('Bank Wire')

  // Dynamically Computed KPIs
  const totalStudents = studentList.length
  const totalStaff = staffList.length
  const totalTuitionBilled = useMemo(
    () => studentList.reduce((acc, s) => acc + (s.fee_total || 0), 0),
    [studentList]
  )
  const totalTuitionCollected = useMemo(
    () => studentList.reduce((acc, s) => acc + (s.fee_paid || 0), 0),
    [studentList]
  )
  const totalTuitionOutstanding = Math.max(0, totalTuitionBilled - totalTuitionCollected)
  const collectionRate =
    totalTuitionBilled > 0 ? Math.round((totalTuitionCollected / totalTuitionBilled) * 100) : 100

  const studentsClearedCount = useMemo(
    () => studentList.filter((s) => (s.fee_balance || 0) <= 0).length,
    [studentList]
  )
  const _studentsPartialCount = useMemo(
    () => studentList.filter((s) => (s.fee_balance || 0) > 0 && (s.fee_paid || 0) > 0).length,
    [studentList]
  )
  const _studentsUnpaidCount = useMemo(
    () => studentList.filter((s) => (s.fee_paid || 0) === 0 && (s.fee_total || 0) > 0).length,
    [studentList]
  )
  const goodStandingRate =
    totalStudents > 0 ? Math.round((studentsClearedCount / totalStudents) * 100) : 100

  const totalGrossPayroll = useMemo(
    () => payrollList.reduce((acc, p) => acc + (p.gross_salary || 0), 0),
    [payrollList]
  )
  const totalNetPayroll = useMemo(
    () => payrollList.reduce((acc, p) => acc + (p.net_salary || 0), 0),
    [payrollList]
  )
  const totalWithholdingPayroll = useMemo(
    () => payrollList.reduce((acc, p) => acc + (p.tax_deduction || 0) + (p.pension_deduction || 0), 0),
    [payrollList]
  )

  const studentTeacherRatio = useMemo(() => {
    if (teachersList.length === 0) return `${totalStudents}:0`
    return `${Math.round(totalStudents / teachersList.length)}:1`
  }, [totalStudents, teachersList.length])

  // Cohort distribution for analytics
  const cohortDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    availableClasses.forEach((c) => {
      counts[c] = 0
    })
    studentList.forEach((s) => {
      const cls = s.grade_class || 'Unassigned'
      counts[cls] = (counts[cls] || 0) + 1
    })
    return counts
  }, [availableClasses, studentList])

  // Department distribution for analytics
  const departmentDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    availableDepartments.forEach((d) => {
      counts[d] = 0
    })
    staffList.forEach((st) => {
      const dept = st.department || 'General'
      counts[dept] = (counts[dept] || 0) + 1
    })
    return counts
  }, [availableDepartments, staffList])

  // Distinct payroll months
  const availablePayrollMonths = useMemo(() => {
    const months = Array.from(new Set(payrollList.map((p) => p.month_period).filter(Boolean)))
    if (!months.includes(currentMonthYear)) {
      months.unshift(currentMonthYear)
    }
    return months
  }, [payrollList, currentMonthYear])

  // Derived Application Metrics
  const pendingAppsCount = useMemo(() => {
    return applications.filter((a) => a.status === 'Pending Review').length
  }, [applications])

  const filteredApplications = useMemo(() => {
    return applications.filter((a) => {
      const matchesSearch =
        !appSearchQuery ||
        a.full_name.toLowerCase().includes(appSearchQuery.toLowerCase()) ||
        a.application_number.toLowerCase().includes(appSearchQuery.toLowerCase()) ||
        a.program_title.toLowerCase().includes(appSearchQuery.toLowerCase()) ||
        a.phone.toLowerCase().includes(appSearchQuery.toLowerCase()) ||
        a.email.toLowerCase().includes(appSearchQuery.toLowerCase())

      const matchesStatus = appStatusFilter === 'all' || a.status === appStatusFilter
      return matchesSearch && matchesStatus
    })
  }, [applications, appSearchQuery, appStatusFilter])

  // Application Follow-Up Handlers
  const handleOpenFollowUp = (app: TenantAdmissionApplication) => {
    setFollowingUpApp(app)
    setFollowUpStatus(app.status)
    setFollowUpNotes(app.follow_up_notes || '')
  }

  const handleSaveFollowUp = (e: React.FormEvent) => {
    e.preventDefault()
    if (!followingUpApp) return
    tenantSchoolStore.updateApplicationStatus(followingUpApp.id, followUpStatus, followUpNotes.trim())
    setFollowingUpApp(null)
    setApplications(tenantSchoolStore.getApplicationsBySchool(school.slug))
  }

  const handleConvertAndAdmitApplicant = (app: TenantAdmissionApplication) => {
    if (!requireActivation('Admitting online applicant')) return
    setEditingStudentMember(null)
    setStudentForm({
      full_name: app.full_name,
      grade_class: app.program_title || availableClasses[0] || 'Main Cohort',
      custom_class: '',
      guardian_name: app.guardian_name || 'Primary Guardian',
      guardian_phone: app.guardian_phone || app.phone,
      guardian_email: app.email,
      fee_total: 0,
      fee_paid: 0,
    })
    // Update status to Admitted
    tenantSchoolStore.updateApplicationStatus(
      app.id,
      'Admitted',
      `Candidate converted and admitted to cohort ${app.program_title}`
    )
    setShowAdmitStudentModal(true)
    setApplications(tenantSchoolStore.getApplicationsBySchool(school.slug))
  }

  const handleDeleteApp = (app: TenantAdmissionApplication) => {
    if (!requireActivation('Removing applicant')) return
    if (
      window.confirm(
        `Are you sure you want to remove the application for ${app.full_name} (${app.application_number})?`
      )
    ) {
      tenantSchoolStore.deleteApplication(app.id)
      setApplications(tenantSchoolStore.getApplicationsBySchool(school.slug))
    }
  }

  // ==========================================
  // HANDLERS: STAFF HR
  // ==========================================
  const handleOpenAddStaff = () => {
    if (!requireActivation('Faculty & staff onboarding')) return
    setEditingStaffMember(null)
    setStaffForm({
      full_name: '',
      role: 'teacher',
      department: availableDepartments[0] || '',
      custom_department: '',
      title: '',
      email: '',
      phone: '',
      username: '',
      temp_password: '',
      assigned_classes: '',
      assigned_subjects: '',
      salary_base: 0,
      salary_housing: 0,
      salary_transport: 0,
      salary_tax: 0,
      salary_pension: 0,
    })
    setShowAddStaffModal(true)
  }

  const handleOpenEditStaff = (staff: TenantStaffMember) => {
    setEditingStaffMember(staff)
    setStaffForm({
      full_name: staff.full_name,
      role: staff.role,
      department: staff.department,
      custom_department: '',
      title: staff.title || '',
      email: staff.email || '',
      phone: staff.phone || '',
      username: staff.username || '',
      temp_password: staff.temp_password || '',
      assigned_classes: (staff.assigned_classes || []).join(', '),
      assigned_subjects: (staff.assigned_subjects || []).join(', '),
      salary_base: staff.salary_base || 0,
      salary_housing: staff.salary_housing || 0,
      salary_transport: staff.salary_transport || 0,
      salary_tax: staff.salary_tax || 0,
      salary_pension: staff.salary_pension || 0,
    })
    setShowAddStaffModal(true)
  }

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault()
    if (!staffForm.full_name.trim()) return

    const finalDept =
      staffForm.department === '__new__'
        ? staffForm.custom_department.trim() || 'General'
        : staffForm.department.trim() || availableDepartments[0] || 'General'

    // If new department created, also save to school departments list
    if (staffForm.department === '__new__' && staffForm.custom_department.trim()) {
      const updatedDepts = Array.from(new Set([...availableDepartments, staffForm.custom_department.trim()]))
      tenantSchoolStore.updateSchoolBranding(school.slug, { departments_list: updatedDepts })
    }

    const slug = school.slug.toLowerCase()
    const nameSlug = staffForm.full_name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '.')
      .replace(/\.+/g, '.')

    if (editingStaffMember) {
      tenantSchoolStore.updateStaffMember(editingStaffMember.id, {
        full_name: staffForm.full_name.trim(),
        role: staffForm.role,
        department: finalDept,
        title: staffForm.title.trim() || 'Faculty Member',
        email: staffForm.email.trim() || `${nameSlug}@${slug}.edu`,
        phone: staffForm.phone.trim(),
        username: staffForm.username.trim() || editingStaffMember.username,
        temp_password: staffForm.temp_password.trim() || editingStaffMember.temp_password,
        assigned_classes: staffForm.assigned_classes
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        assigned_subjects: staffForm.assigned_subjects
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        salary_base: Number(staffForm.salary_base) || 0,
        salary_housing: Number(staffForm.salary_housing) || 0,
        salary_transport: Number(staffForm.salary_transport) || 0,
        salary_tax: Number(staffForm.salary_tax) || 0,
        salary_pension: Number(staffForm.salary_pension) || 0,
      })
      setShowAddStaffModal(false)
      setEditingStaffMember(null)
      onReloadData()
    } else {
      const generatedUsername = staffForm.username.trim() || `${nameSlug}@${slug}.portal`
      const generatedPassword =
        staffForm.temp_password.trim() ||
        `StaffPass${currentYear}!${Math.floor(100 + Math.random() * 900)}`

      const created = tenantSchoolStore.createStaffMember({
        school_slug: school.slug,
        full_name: staffForm.full_name.trim(),
        role: staffForm.role,
        title: staffForm.title.trim() || 'Faculty Member',
        email: staffForm.email.trim() || `${nameSlug}@${slug}.edu`,
        username: generatedUsername,
        temp_password: generatedPassword,
        phone: staffForm.phone.trim(),
        department: finalDept,
        assigned_classes: staffForm.assigned_classes
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        assigned_subjects: staffForm.assigned_subjects
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        salary_base: Number(staffForm.salary_base) || 0,
        salary_housing: Number(staffForm.salary_housing) || 0,
        salary_transport: Number(staffForm.salary_transport) || 0,
        salary_tax: Number(staffForm.salary_tax) || 0,
        salary_pension: Number(staffForm.salary_pension) || 0,
      })
      setShowAddStaffModal(false)
      onReloadData()
      onOpenStaffSlip(created)
    }
  }

  const handleDeleteStaff = (staff: TenantStaffMember) => {
    if (!requireActivation('Deleting faculty/staff record')) return
    if (window.confirm(`Are you sure you want to remove ${staff.full_name} from the staff directory?`)) {
      tenantSchoolStore.deleteStaffMember(staff.id)
      onReloadData()
    }
  }

  const handleSaveStaffCredentials = (e: React.FormEvent) => {
    e.preventDefault()
    if (!requireActivation('Updating staff credentials')) return
    if (!editingStaffCreds) return
    tenantSchoolStore.updateStaffMember(editingStaffCreds.id, {
      username: editStaffUsername.trim() || editingStaffCreds.username,
      temp_password: editStaffPassword.trim() || editingStaffCreds.temp_password,
    })
    setEditingStaffCreds(null)
    onReloadData()
  }

  // ==========================================
  // HANDLERS: STUDENT SIS & ADMISSIONS
  // ==========================================
  const handleOpenAdmitStudent = () => {
    if (!requireActivation('Student admission enrollment')) return
    setEditingStudentMember(null)
    setStudentForm({
      full_name: '',
      grade_class: availableClasses[0] || '',
      custom_class: '',
      guardian_name: '',
      guardian_phone: '',
      guardian_email: '',
      fee_total: 0,
      fee_paid: 0,
    })
    setShowAdmitStudentModal(true)
  }

  const handleOpenEditStudent = (student: TenantStudentMember) => {
    setEditingStudentMember(student)
    setStudentForm({
      full_name: student.full_name,
      grade_class: student.grade_class,
      custom_class: '',
      guardian_name: student.guardian_name || '',
      guardian_phone: student.guardian_phone || '',
      guardian_email: student.guardian_email || '',
      fee_total: student.fee_total || 0,
      fee_paid: student.fee_paid || 0,
    })
    setShowAdmitStudentModal(true)
  }

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentForm.full_name.trim()) return

    const finalClass =
      studentForm.grade_class === '__new__'
        ? studentForm.custom_class.trim() || 'General Cohort'
        : studentForm.grade_class.trim() || availableClasses[0] || 'General Cohort'

    // If new class created, also persist to classes_list
    if (studentForm.grade_class === '__new__' && studentForm.custom_class.trim()) {
      const updatedClasses = Array.from(new Set([...availableClasses, studentForm.custom_class.trim()]))
      tenantSchoolStore.updateSchoolBranding(school.slug, { classes_list: updatedClasses })
    }

    if (editingStudentMember) {
      tenantSchoolStore.updateStudent(editingStudentMember.id, {
        full_name: studentForm.full_name.trim(),
        grade_class: finalClass,
        guardian_name: studentForm.guardian_name.trim(),
        guardian_phone: studentForm.guardian_phone.trim(),
        guardian_email: studentForm.guardian_email.trim(),
        fee_total: Number(studentForm.fee_total) || 0,
        fee_paid: Number(studentForm.fee_paid) || 0,
      })
      setShowAdmitStudentModal(false)
      setEditingStudentMember(null)
      onReloadData()
    } else {
      const slugPrefix = (school.slug || 'SCH').substring(0, 4).toUpperCase()
      const nextSeq = Math.floor(1000 + Math.random() * 9000)
      const admNo = `${slugPrefix}-${currentYear}-${nextSeq}`
      const username = `${admNo.replace(/[^a-zA-Z0-9]/g, '')}`
      const tempPin = `PIN-${Math.floor(1000 + Math.random() * 9000)}`

      const created = tenantSchoolStore.admitStudent({
        school_slug: school.slug,
        admission_number: admNo,
        full_name: studentForm.full_name.trim(),
        grade_class: finalClass,
        guardian_name: studentForm.guardian_name.trim() || 'Guardian',
        guardian_phone: studentForm.guardian_phone.trim(),
        guardian_email:
          studentForm.guardian_email.trim() || `${admNo.toLowerCase()}@${school.slug}.portal`,
        username,
        temp_password: tempPin,
        fee_total: Number(studentForm.fee_total) || 0,
        fee_paid: Number(studentForm.fee_paid) || 0,
      })

      setShowAdmitStudentModal(false)
      onReloadData()
      onOpenAdmissionSlip(created)
    }
  }

  const handleDeleteStudent = (student: TenantStudentMember) => {
    if (
      window.confirm(
        `Are you sure you want to remove candidate ${student.full_name} (${student.admission_number}) from the admissions register?`
      )
    ) {
      tenantSchoolStore.deleteStudent(student.id)
      onReloadData()
    }
  }

  const handleSaveStudentCredentials = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStudentCreds) return
    tenantSchoolStore.updateStudent(editingStudentCreds.id, {
      username: editStudentUsername.trim() || editingStudentCreds.username,
      temp_password: editStudentPassword.trim() || editingStudentCreds.temp_password,
    })
    setEditingStudentCreds(null)
    onReloadData()
  }

  // ==========================================
  // HANDLERS: TIMETABLE
  // ==========================================
  const handleOpenAddPeriod = () => {
    if (!requireActivation('Scheduling timetable period')) return
    setEditingPeriod(null)
    const nextPeriodNum =
      classTimetable.length > 0
        ? Math.min(8, Math.max(...classTimetable.map((t) => t.period_number)) + 1)
        : 1

    setTimetableForm({
      day_of_week: 'Monday',
      period_number: nextPeriodNum,
      start_time: '08:00',
      end_time: '08:50',
      subject_name: '',
      teacher_name: teachersList[0]?.full_name || '',
      room: '',
    })
    setShowAddTimetableModal(true)
  }

  const handleOpenEditPeriod = (period: TenantTimetableEntry) => {
    if (!requireActivation('Editing timetable period')) return
    setEditingPeriod(period)
    setTimetableForm({
      day_of_week: period.day_of_week,
      period_number: period.period_number,
      start_time: period.start_time,
      end_time: period.end_time,
      subject_name: period.subject_name,
      teacher_name: period.teacher_name,
      room: period.room,
    })
    setShowAddTimetableModal(true)
  }

  const handleSaveTimetableEntry = (e: React.FormEvent) => {
    e.preventDefault()
    if (!requireActivation('Saving timetable period')) return
    if (!timetableForm.subject_name.trim()) return

    if (editingPeriod) {
      tenantSchoolStore.updateTimetableEntry(editingPeriod.id, {
        day_of_week: timetableForm.day_of_week,
        period_number: Number(timetableForm.period_number),
        start_time: timetableForm.start_time,
        end_time: timetableForm.end_time,
        subject_name: timetableForm.subject_name.trim(),
        teacher_name: timetableForm.teacher_name.trim(),
        room: timetableForm.room.trim(),
      })
    } else {
      tenantSchoolStore.addTimetableEntry({
        school_slug: school.slug,
        class_name: selectedTimetableClass,
        day_of_week: timetableForm.day_of_week,
        period_number: Number(timetableForm.period_number),
        start_time: timetableForm.start_time,
        end_time: timetableForm.end_time,
        subject_name: timetableForm.subject_name.trim(),
        teacher_name: timetableForm.teacher_name.trim(),
        room: timetableForm.room.trim(),
      })
    }
    setShowAddTimetableModal(false)
    setEditingPeriod(null)
    onReloadData()
  }

  const handleDeletePeriod = (id: string) => {
    if (!requireActivation('Deleting timetable period')) return
    if (window.confirm('Are you sure you want to delete this period from the schedule?')) {
      tenantSchoolStore.deleteTimetableEntry(id)
      onReloadData()
    }
  }

  // ==========================================
  // HANDLERS: CLASSES & DEPARTMENTS MANAGEMENT
  // ==========================================
  const handleAddClassCohort = (e: React.FormEvent) => {
    e.preventDefault()
    if (!requireActivation('Adding class cohort')) return
    const trimmed = newClassNameInput.trim()
    if (!trimmed) return
    if (!availableClasses.includes(trimmed)) {
      const updated = [...availableClasses, trimmed]
      tenantSchoolStore.updateSchoolBranding(school.slug, { classes_list: updated })
      setNewClassNameInput('')
      onReloadData()
    }
  }

  const handleRemoveClassCohort = (className: string) => {
    if (!requireActivation('Removing class cohort')) return
    if (availableClasses.length <= 1) {
      alert('The school must have at least one active class cohort.')
      return
    }
    if (window.confirm(`Are you sure you want to remove the class cohort "${className}"?`)) {
      const updated = availableClasses.filter((c) => c !== className)
      tenantSchoolStore.updateSchoolBranding(school.slug, { classes_list: updated })
      // Reassign any students with this class so it doesn't resurrect from studentList
      studentList.forEach((s) => {
        if (s.grade_class === className) {
          tenantSchoolStore.updateStudent(s.id, { grade_class: updated[0] || 'Unassigned' })
        }
      })
      if (selectedTimetableClass === className) {
        setSelectedTimetableClass(updated[0] || 'Main Class')
      }
      onReloadData()
    }
  }

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!requireActivation('Adding faculty department')) return
    const trimmed = newDeptNameInput.trim()
    if (!trimmed) return
    if (!availableDepartments.includes(trimmed)) {
      const updated = [...availableDepartments, trimmed]
      tenantSchoolStore.updateSchoolBranding(school.slug, { departments_list: updated })
      setNewDeptNameInput('')
      onReloadData()
    }
  }

  const handleRemoveDepartment = (deptName: string) => {
    if (!requireActivation('Removing department')) return
    if (availableDepartments.length <= 1) {
      alert('The school must have at least one active department.')
      return
    }
    if (window.confirm(`Are you sure you want to remove the department "${deptName}"?`)) {
      const updated = availableDepartments.filter((d) => d !== deptName)
      tenantSchoolStore.updateSchoolBranding(school.slug, { departments_list: updated })
      onReloadData()
    }
  }

  // ==========================================
  // HANDLERS: PAYROLL
  // ==========================================
  const handleDisbursePayroll = () => {
    if (!requireActivation('Disbursing payroll batch')) return
    const targetMonth = payrollMonthFilter === 'all' ? currentMonthYear : payrollMonthFilter
    if (
      window.confirm(
        `Authorize and disburse payroll for ${targetMonth} via ${disbursalMethod} for all approved staff?`
      )
    ) {
      tenantSchoolStore.disbursePayrollBatch(school.slug, targetMonth, disbursalMethod)
      onReloadData()
    }
  }

  const handleGeneratePayrollBatch = () => {
    if (!requireActivation('Generating payroll batch')) return
    const targetMonth = payrollMonthFilter === 'all' ? currentMonthYear : payrollMonthFilter
    tenantSchoolStore.generateMonthlyPayroll(school.slug, targetMonth)
    onReloadData()
  }

  // ==========================================
  // HANDLERS: GOVERNANCE & IDENTITY
  // ==========================================
  const handleSaveSchoolProfile = (e: React.FormEvent) => {
    e.preventDefault()
    if (!requireActivation('Saving campus identity profile')) return
    tenantSchoolStore.updateSchoolBranding(school.slug, {
      name: schoolProfileInput.name.trim() || school.name,
      motto: schoolProfileInput.motto.trim(),
      principal_name: schoolProfileInput.principal_name.trim(),
      principal_title: schoolProfileInput.principal_title.trim(),
      contact_email: schoolProfileInput.contact_email.trim(),
      contact_phone: schoolProfileInput.contact_phone.trim(),
      address: schoolProfileInput.address.trim(),
    })
    setSchoolProfileSaved(true)
    setShowEditSchoolModal(false)
    onReloadData()
    setTimeout(() => setSchoolProfileSaved(false), 3000)
  }

  const handleSaveCurrencySetting = (e: React.FormEvent) => {
    e.preventDefault()
    if (!requireActivation('Updating school currency')) return
    tenantSchoolStore.updateSchoolBranding(school.slug, {
      currency: currencySetting.trim().toUpperCase() || 'KES',
    })
    setCurrencySavedMessage(true)
    onReloadData()
    setTimeout(() => setCurrencySavedMessage(false), 3000)
  }

  // Filtered Staff
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchesSearch =
        !staffSearchQuery ||
        s.full_name.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
        s.role.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
        s.department.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
        (s.username && s.username.toLowerCase().includes(staffSearchQuery.toLowerCase()))

      const matchesRole = staffRoleFilter === 'all' || s.role === staffRoleFilter
      const matchesDept = staffDeptFilter === 'all' || s.department === staffDeptFilter

      return matchesSearch && matchesRole && matchesDept
    })
  }, [staffList, staffSearchQuery, staffRoleFilter, staffDeptFilter])

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return studentList.filter((s) => {
      const matchesSearch =
        !studentSearchQuery ||
        s.full_name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        s.admission_number.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        (s.guardian_name && s.guardian_name.toLowerCase().includes(studentSearchQuery.toLowerCase()))

      const matchesClass = studentClassFilter === 'all' || s.grade_class === studentClassFilter

      let matchesFee = true
      if (studentFeeFilter === 'cleared') matchesFee = (s.fee_balance || 0) <= 0
      if (studentFeeFilter === 'partial')
        matchesFee = (s.fee_balance || 0) > 0 && (s.fee_paid || 0) > 0
      if (studentFeeFilter === 'unpaid')
        matchesFee = (s.fee_paid || 0) === 0 && (s.fee_total || 0) > 0

      return matchesSearch && matchesClass && matchesFee
    })
  }, [studentList, studentSearchQuery, studentClassFilter, studentFeeFilter])

  // Filtered Payroll
  const filteredPayroll = useMemo(() => {
    return payrollList.filter((p) => {
      const matchesMonth = payrollMonthFilter === 'all' || p.month_period === payrollMonthFilter
      const matchesStatus = payrollStatusFilter === 'all' || p.status === payrollStatusFilter
      return matchesMonth && matchesStatus
    })
  }, [payrollList, payrollMonthFilter, payrollStatusFilter])

  // Timetable days
  const daysOfWeek: Array<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'> = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
  ]

  return (
    <div style={{ maxWidth: '1160px', margin: '0 auto', color: '#0f172a' }}>
      {/* Product Key Activation Required Banner (Principal Desk) */}
      {!isLicenseActive && (
        <div
          style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: '1.5px solid #fde68a',
            borderRadius: '20px',
            padding: '1.25rem 1.6rem',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 6px 20px rgba(245, 158, 11, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                flexShrink: 0,
              }}
            >
              🔑
            </div>
            <div>
              <div style={{ fontSize: '0.96rem', fontWeight: 900, color: '#92400e' }}>
                Institutional Product Key Activation Required
              </div>
              <div style={{ fontSize: '0.82rem', color: '#b45309', marginTop: '2px' }}>
                This institutional campus is awaiting license activation. Standard Rate: KES {((school.campus_count || 1) * 2500).toLocaleString()}/month. Administrative creation and editing features on this desk are disabled until activated.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onOpenLicenseModal}
              style={{
                background: '#92400e',
                color: '#ffffff',
                fontWeight: 800,
                padding: '0.65rem 1.35rem',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.84rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(146, 64, 14, 0.3)',
              }}
            >
              <span>🔑 Enter Product Key ➔</span>
            </button>
            {onNavigateToBilling && (
              <button
                type="button"
                onClick={onNavigateToBilling}
                style={{
                  background: '#ffffff',
                  color: '#92400e',
                  fontWeight: 800,
                  padding: '0.65rem 1.1rem',
                  borderRadius: '10px',
                  border: '1.5px solid #fde68a',
                  cursor: 'pointer',
                  fontSize: '0.84rem',
                }}
              >
                Billing &amp; License ➔
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* EXECUTIVE HEADER & TELEMETRY BANNER        */}
      {/* ========================================== */}
      <div
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
          borderRadius: '24px',
          padding: '1.85rem 2.25rem',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          marginBottom: '1.75rem',
          boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.04), 0 4px 12px -2px rgba(15, 23, 42, 0.03)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.25rem',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '1.35rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '58px',
                height: '58px',
                borderRadius: '16px',
                background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
                boxShadow: `0 8px 20px -4px ${primaryColor}40`,
                border: '2px solid rgba(255, 255, 255, 0.2)',
                flexShrink: 0,
              }}
            >
              🏛️
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: primaryColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {school.name}
                </span>
                <span
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  OFFICE OF THE {school.principal_title ? school.principal_title.toUpperCase() : 'PRINCIPAL'}
                </span>
                <span
                  style={{
                    background: `${primaryColor}14`,
                    color: primaryColor,
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                  }}
                >
                  Session: {school.active_period_name}
                </span>
              </div>
              <h2
                style={{
                  fontSize: '1.6rem',
                  fontWeight: 900,
                  margin: '4px 0 0',
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                }}
              >
                {school.principal_name
                  ? `${school.principal_name} — ${school.principal_title || 'Executive Office'}`
                  : `Office of the ${school.principal_title || 'Principal'}`}
              </h2>
              <div style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '3px' }}>
                Institutional Governance, Faculty HR, Student Admissions &amp; Academic Scheduling
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleOpenAddStaff}
              style={{
                background: '#0f172a',
                color: '#ffffff',
                fontWeight: 800,
                padding: '0.6rem 1.15rem',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>👤</span> + Appoint Staff
            </button>
            <button
              type="button"
              onClick={handleOpenAdmitStudent}
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 120%)`,
                color: '#ffffff',
                fontWeight: 800,
                padding: '0.6rem 1.15rem',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: `0 4px 16px -2px ${primaryColor}40`,
                transition: 'all 0.15s ease',
              }}
            >
              <span>🎓</span> + Admit Candidate
            </button>
          </div>
        </div>

        {/* Sub-tab Navigation Pills */}
        <div
          style={{
            display: 'flex',
            gap: '0.35rem',
            flexWrap: 'wrap',
            background: '#f8fafc',
            padding: '5px',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
          }}
        >
          {[
            { id: 'overview', label: 'Command Center', icon: '📊' },
            { id: 'staff', label: `Staff & HR (${staffList.length})`, icon: '👥' },
            { id: 'admissions', label: `Admissions (${studentList.length})`, icon: '🎓' },
            { id: 'programs', label: 'Programs & Courses', icon: '📚' },
            { id: 'timetable', label: 'Class Timetables', icon: '🗓️' },
            { id: 'payroll', label: 'Payroll Oversight', icon: '💼' },
            { id: 'calendar', label: 'Academic Calendar', icon: '📅' },
            { id: 'notices', label: 'Campus Noticeboard', icon: '📢' },
            { id: 'governance', label: 'Governance & Setup', icon: '⚙️' },
          ].map((tab) => {
            const active = principalSubTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPrincipalSubTab(tab.id as PrincipalSubTab)}
                style={{
                  background: active ? primaryColor : 'transparent',
                  color: active ? '#ffffff' : '#475569',
                  border: 'none',
                  padding: '0.55rem 1.05rem',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: active ? 800 : 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: active ? `0 4px 12px ${primaryColor}33` : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tab.icon}</span> {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ========================================== */}
      {/* DYNAMIC KPI OVERVIEW STRIP                 */}
      {/* ========================================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* KPI 1: Enrolled Candidates */}
        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
            borderRadius: '18px',
            padding: '1.25rem 1.4rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.03)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: primaryColor }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ENROLLED CANDIDATES
            </span>
            <span style={{ fontSize: '1rem' }}>🎓</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: '6px 0 2px', letterSpacing: '-0.02em' }}>
            {totalStudents} <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>Active</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>●</span> {goodStandingRate}% In Good Financial Standing ({studentsClearedCount}/{totalStudents})
          </div>
        </div>

        {/* KPI 2: Certified Faculty */}
        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
            borderRadius: '18px',
            padding: '1.25rem 1.4rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.03)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#0f172a' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              APPOINTED FACULTY
            </span>
            <span style={{ fontSize: '1rem' }}>👥</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: '6px 0 2px', letterSpacing: '-0.02em' }}>
            {totalStaff} <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>Staff</span>
          </div>
          <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
            {teachersList.length} Teachers • Ratio: {studentTeacherRatio}
          </div>
        </div>

        {/* KPI 3: Tuition Recovery */}
        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
            borderRadius: '18px',
            padding: '1.25rem 1.4rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.03)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#16a34a' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              TUITION RECOVERY
            </span>
            <span style={{ fontSize: '1rem' }}>📈</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: primaryColor, margin: '6px 0 2px', letterSpacing: '-0.02em' }}>
            {collectionRate}%
          </div>
          <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}>
            {currency} {totalTuitionCollected.toLocaleString()} collected • {currency} {totalTuitionOutstanding.toLocaleString()} due
          </div>
        </div>

        {/* KPI 4: Monthly Payroll Commitment */}
        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
            borderRadius: '18px',
            padding: '1.25rem 1.4rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.03)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#d97706' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              MONTHLY PAYROLL
            </span>
            <span style={{ fontSize: '1rem' }}>💼</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: '6px 0 2px', letterSpacing: '-0.02em' }}>
            {currency} {totalGrossPayroll.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.76rem', color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>●</span> Net Payable: {currency} {totalNetPayroll.toLocaleString()}
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* SUBTAB 1: EXECUTIVE COMMAND CENTER         */}
      {/* ========================================== */}
      {principalSubTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Pending Applications Alert Banner */}
          {pendingAppsCount > 0 && (
            <div
              style={{
                background: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)',
                border: '1.5px solid #f59e0b',
                borderRadius: '16px',
                padding: '1rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#f59e0b',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    fontWeight: 900,
                  }}
                >
                  📥
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#92400e', fontSize: '0.95rem' }}>
                    {pendingAppsCount} Prospective Candidate Application{pendingAppsCount > 1 ? 's' : ''} Awaiting Review
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#b45309' }}>
                    New candidates have submitted online admission applications through your school portal.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPrincipalSubTab('admissions')
                  setAdmissionsViewMode('applications')
                }}
                style={{
                  background: '#d97706',
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '0.55rem 1.1rem',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)',
                }}
              >
                Review Applications &rarr;
              </button>
            </div>
          )}

          {/* Institutional Health & Operational Summary */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '1.75rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                  Institutional Operations &amp; Academic Health
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                  Real-time operational summary across enrolled classes, academic departments, and treasury status.
                </p>
              </div>
              <span
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  color: primaryColor,
                  background: `${primaryColor}14`,
                  padding: '4px 12px',
                  borderRadius: '9999px',
                }}
              >
                ● System Live &amp; Synchronized
              </span>
            </div>

            {/* Visual Cohort & Department Distribution */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
              {/* Cohort Enrollment Breakdown */}
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                    🎓 Enrollment by Class Cohort
                  </h4>
                  <button
                    type="button"
                    onClick={() => setPrincipalSubTab('admissions')}
                    style={{ background: 'none', border: 'none', color: primaryColor, fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}
                  >
                    View All →
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {Object.entries(cohortDistribution).map(([className, count]) => {
                    const pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0
                    return (
                      <div key={className}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '3px' }}>
                          <span>{className}</span>
                          <span style={{ color: '#64748b' }}>{count} students ({pct}%)</span>
                        </div>
                        <div style={{ height: '7px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: primaryColor, borderRadius: '9999px' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Departmental Staffing Breakdown */}
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                    👥 Faculty by Academic Department
                  </h4>
                  <button
                    type="button"
                    onClick={() => setPrincipalSubTab('staff')}
                    style={{ background: 'none', border: 'none', color: primaryColor, fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Manage HR →
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {Object.entries(departmentDistribution).map(([deptName, count]) => {
                    const pct = totalStaff > 0 ? Math.round((count / totalStaff) * 100) : 0
                    return (
                      <div key={deptName}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '3px' }}>
                          <span>{deptName}</span>
                          <span style={{ color: '#64748b' }}>{count} staff ({pct}%)</span>
                        </div>
                        <div style={{ height: '7px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: '#0f172a', borderRadius: '9999px' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Management Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <div
              onClick={() => setPrincipalSubTab('staff')}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '1.25rem',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>👥</div>
              <h4 style={{ margin: '0 0 4px', fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                Faculty &amp; Staff Administration
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>
                Hire new instructors, provision custom portal usernames and secure passwords, and issue appointment slips.
              </p>
            </div>

            <div
              onClick={() => setPrincipalSubTab('admissions')}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '1.25rem',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🎓</div>
              <h4 style={{ margin: '0 0 4px', fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                Student Admissions &amp; SIS
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>
                Register students, assign class cohorts, manage fee balances, and print official letters of admission.
              </p>
            </div>

            <div
              onClick={() => setPrincipalSubTab('timetable')}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '1.25rem',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🗓️</div>
              <h4 style={{ margin: '0 0 4px', fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                Master Class Timetables
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>
                Define weekly period rosters, allocate lecture venues and laboratories, and assign subject instructors.
              </p>
            </div>

            <div
              onClick={() => setPrincipalSubTab('payroll')}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '1.25rem',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>💼</div>
              <h4 style={{ margin: '0 0 4px', fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                Executive Treasury &amp; Payroll
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>
                Review monthly gross and statutory withholding schedules and execute batch wire disbursements.
              </p>
            </div>

            <div
              onClick={() => setPrincipalSubTab('programs')}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '1.25rem',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📚</div>
              <h4 style={{ margin: '0 0 4px', fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                Academic Programs &amp; Courses
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>
                Curate degree, diploma &amp; certificate offerings, manage curriculum structures, course codes, and department allocations.
              </p>
            </div>

            <div
              onClick={() => setPrincipalSubTab('calendar')}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '1.25rem',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📅</div>
              <h4 style={{ margin: '0 0 4px', fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                Academic Calendar &amp; Schedule
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>
                Schedule semester term dates, examination weeks, senate recesses, registration deadlines, and campus events.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* SUBTAB 2: STAFF DIRECTORY & HR            */}
      {/* ========================================== */}
      {principalSubTab === 'staff' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '1.75rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                Staff Directory &amp; Portal Accounts
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Provision accounts, configure credentials, view salary structures, and issue appointment slips.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowManageDeptsModal(true)}
                style={{
                  background: '#f8fafc',
                  color: '#0f172a',
                  fontWeight: 700,
                  padding: '0.5rem 0.95rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                ⚙️ Departments ({availableDepartments.length})
              </button>
              <button
                type="button"
                onClick={handleOpenAddStaff}
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '0.5rem 1.15rem',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                + Appoint Staff Member
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              marginBottom: '1.25rem',
              background: '#f8fafc',
              padding: '0.85rem',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              placeholder="Search by name, role, username..."
              value={staffSearchQuery}
              onChange={(e) => setStaffSearchQuery(e.target.value)}
              style={{
                flex: 1,
                minWidth: '220px',
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                background: '#ffffff',
              }}
            />
            <select
              value={staffRoleFilter}
              onChange={(e) => setStaffRoleFilter(e.target.value as any)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: '#ffffff',
              }}
            >
              <option value="all">All Roles</option>
              <option value="teacher">Teachers / Faculty</option>
              <option value="bursar">Bursars / Finance</option>
              <option value="admin">Administrators</option>
            </select>
            <select
              value={staffDeptFilter}
              onChange={(e) => setStaffDeptFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: '#ffffff',
              }}
            >
              <option value="all">All Departments</option>
              {availableDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Staff Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Staff Member</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Role</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Department</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Login Username</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>Net Salary</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Official Slip</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                      No staff members match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{s.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {s.title || 'Faculty Member'} • Joined {s.joined_date || currentYear}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            background:
                              s.role === 'teacher' ? '#ecfdf5' : s.role === 'bursar' ? '#fefce8' : '#eff6ff',
                            color:
                              s.role === 'teacher' ? '#065f46' : s.role === 'bursar' ? '#854d0e' : '#1e40af',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            textTransform: 'capitalize',
                          }}
                        >
                          {s.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>{s.department}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: primaryColor }}>{s.username}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 900, color: '#0f172a' }}>
                        {currency} {s.net_salary.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => onOpenStaffSlip(s)}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              padding: '0.35rem 0.55rem',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                            title="Print Portal Login Slip"
                          >
                            🖨️ Login Slip
                          </button>
                          {onOpenStaffOfferLetter && (
                            <button
                              type="button"
                              onClick={() => onOpenStaffOfferLetter(s)}
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                padding: '0.35rem 0.55rem',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              title="Print Formal Offer of Employment Contract"
                            >
                              📜 Offer Letter
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStaffCreds(s)
                              setEditStaffUsername(s.username || '')
                              setEditStaffPassword(s.temp_password || '')
                            }}
                            style={{
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                            title="Reset portal username & password"
                          >
                            🔑 Pass
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditStaff(s)}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              color: '#0f172a',
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(s)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dc2626',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Delete
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
      )}

      {/* ========================================== */}
      {/* SUBTAB 3: STUDENT SIS & ADMISSIONS         */}
      {/* ========================================== */}
      {principalSubTab === 'admissions' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '1.75rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                Student Admissions &amp; Enrollment Registry
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Admit candidates, allocate class cohorts, generate official Admission Letters, and track clearances.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowManageClassesModal(true)}
                style={{
                  background: '#f8fafc',
                  color: '#0f172a',
                  fontWeight: 700,
                  padding: '0.5rem 0.95rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                ⚙️ Classes ({availableClasses.length})
              </button>
              <button
                type="button"
                onClick={handleOpenAdmitStudent}
                style={{
                  background: primaryColor,
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '0.5rem 1.15rem',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                + Admit New Candidate
              </button>
            </div>
          </div>

          {/* Segmented View Switcher: Enrolled Roster vs Online Applications */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              padding: '5px',
              background: '#f1f5f9',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              width: 'fit-content',
            }}
          >
            <button
              type="button"
              onClick={() => setAdmissionsViewMode('roster')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.55rem 1.1rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: admissionsViewMode === 'roster' ? 800 : 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
                background: admissionsViewMode === 'roster' ? '#ffffff' : 'transparent',
                color: admissionsViewMode === 'roster' ? primaryColor : '#64748b',
                boxShadow: admissionsViewMode === 'roster' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>🎓</span> Enrolled Students Roster
              <span
                style={{
                  background: admissionsViewMode === 'roster' ? `${primaryColor}18` : '#e2e8f0',
                  color: admissionsViewMode === 'roster' ? primaryColor : '#475569',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                }}
              >
                {studentList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAdmissionsViewMode('applications')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.55rem 1.1rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: admissionsViewMode === 'applications' ? 800 : 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
                background: admissionsViewMode === 'applications' ? '#ffffff' : 'transparent',
                color: admissionsViewMode === 'applications' ? primaryColor : '#64748b',
                boxShadow: admissionsViewMode === 'applications' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>📥</span> Online Applications &amp; Inquiries
              <span
                style={{
                  background: pendingAppsCount > 0 ? '#ef4444' : admissionsViewMode === 'applications' ? `${primaryColor}18` : '#e2e8f0',
                  color: pendingAppsCount > 0 ? '#ffffff' : admissionsViewMode === 'applications' ? primaryColor : '#475569',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                }}
              >
                {pendingAppsCount > 0 ? `${pendingAppsCount} pending` : applications.length}
              </span>
            </button>
          </div>

          {/* VIEW 1: ENROLLED STUDENTS ROSTER */}
          {admissionsViewMode === 'roster' && (
            <>
          {/* Search & Filters */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              marginBottom: '1.25rem',
              background: '#f8fafc',
              padding: '0.85rem',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              placeholder="Search by student name, adm number, guardian..."
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              style={{
                flex: 1,
                minWidth: '220px',
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                background: '#ffffff',
              }}
            />
            <select
              value={studentClassFilter}
              onChange={(e) => setStudentClassFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: '#ffffff',
              }}
            >
              <option value="all">All Classes</option>
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
            <select
              value={studentFeeFilter}
              onChange={(e) => setStudentFeeFilter(e.target.value as any)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: '#ffffff',
              }}
            >
              <option value="all">All Clearance States</option>
              <option value="cleared">Fully Cleared (0 Balance)</option>
              <option value="partial">Partial Payment</option>
              <option value="unpaid">Zero Paid</option>
            </select>
          </div>

          {/* Student Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Adm Number</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Student Name</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Class Cohort</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Guardian Contact</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>Fee Balance</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Official Slip</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                      No students match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 800, color: primaryColor }}>
                        {s.admission_number}
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>
                        {s.full_name}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>{s.grade_class}</td>
                      <td style={{ padding: '0.75rem', color: '#64748b' }}>
                        {s.guardian_name} {s.guardian_phone ? `• ${s.guardian_phone}` : ''}
                      </td>
                      <td
                        style={{
                          padding: '0.75rem',
                          textAlign: 'right',
                          fontWeight: 800,
                          color: (s.fee_balance || 0) > 0 ? '#dc2626' : '#16a34a',
                        }}
                      >
                        {currency} {(s.fee_balance || 0).toLocaleString()}
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                          {(s.fee_balance || 0) <= 0 ? '✓ Cleared' : `Paid ${currency} ${(s.fee_paid || 0).toLocaleString()}`}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onOpenAdmissionSlip(s)}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          📜 Letter
                        </button>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStudentCreds(s)
                              setEditStudentUsername(s.username || s.admission_number)
                              setEditStudentPassword(s.temp_password || '')
                            }}
                            style={{
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                            title="Reset portal password or PIN"
                          >
                            🔑 PIN
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditStudent(s)}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              color: '#0f172a',
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(s)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dc2626',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* VIEW 2: ONLINE APPLICATIONS & INQUIRIES DESK */}
      {admissionsViewMode === 'applications' && (
        <>
          {/* Application Telemetry KPI Mini Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.85rem',
              marginBottom: '1.25rem',
            }}
          >
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '1rem',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                Total Inquiries
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 0' }}>
                {applications.length}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>From online apply form</div>
            </div>

            <div
              style={{
                background: '#fffbeb',
                borderRadius: '12px',
                padding: '1rem',
                border: '1.5px solid #fef3c7',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase' }}>
                Pending Review
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#d97706', margin: '4px 0 0' }}>
                {pendingAppsCount}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#b45309' }}>Requires follow-up</div>
            </div>

            <div
              style={{
                background: '#eff6ff',
                borderRadius: '12px',
                padding: '1rem',
                border: '1.5px solid #dbeafe',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase' }}>
                In Contact Pipeline
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#2563eb', margin: '4px 0 0' }}>
                {applications.filter((a) => a.status === 'Contacted' || a.status === 'Interview Scheduled').length}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#1e40af' }}>Contacted or interviewed</div>
            </div>

            <div
              style={{
                background: '#f0fdf4',
                borderRadius: '12px',
                padding: '1rem',
                border: '1.5px solid #dcfce7',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>
                Admitted to Cohort
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#16a34a', margin: '4px 0 0' }}>
                {applications.filter((a) => a.status === 'Admitted').length}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#15803d' }}>Official conversion</div>
            </div>
          </div>

          {/* Search & Status Filter */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              marginBottom: '1.25rem',
              background: '#f8fafc',
              padding: '0.85rem',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              placeholder="Search by candidate name, application ref #, phone, email, program..."
              value={appSearchQuery}
              onChange={(e) => setAppSearchQuery(e.target.value)}
              style={{
                flex: 1,
                minWidth: '240px',
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                background: '#ffffff',
              }}
            />
            <select
              value={appStatusFilter}
              onChange={(e) => setAppStatusFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: '#ffffff',
              }}
            >
              <option value="all">All Statuses ({applications.length})</option>
              <option value="Pending Review">Pending Review ({applications.filter((a) => a.status === 'Pending Review').length})</option>
              <option value="Contacted">Contacted ({applications.filter((a) => a.status === 'Contacted').length})</option>
              <option value="Interview Scheduled">Interview Scheduled ({applications.filter((a) => a.status === 'Interview Scheduled').length})</option>
              <option value="Admitted">Admitted ({applications.filter((a) => a.status === 'Admitted').length})</option>
              <option value="Rejected">Rejected ({applications.filter((a) => a.status === 'Rejected').length})</option>
            </select>
          </div>

          {/* Applications Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Application #</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Candidate Name</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Program &amp; Intake</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Direct Contact</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Guardian</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Status</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                      {applications.length === 0 ? (
                        <div>
                          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📬</div>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>No Online Applications Yet</div>
                          <div style={{ fontSize: '0.84rem', marginTop: '4px' }}>
                            When prospective students submit the online application form from your portal, they will land here automatically.
                          </div>
                        </div>
                      ) : (
                        'No applications match your search query.'
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => {
                    const statusColors: Record<ApplicationStatus, { bg: string; text: string; border: string }> = {
                      'Pending Review': { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
                      Contacted: { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd' },
                      'Interview Scheduled': { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' },
                      Admitted: { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
                      Rejected: { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
                    }
                    const st = statusColors[app.status] || { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' }
                    const cleanPhone = (app.phone || '').replace(/[^0-9]/g, '')

                    return (
                      <tr key={app.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem', verticalAlign: 'top' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              color: primaryColor,
                              fontSize: '0.78rem',
                              background: `${primaryColor}12`,
                              padding: '3px 7px',
                              borderRadius: '6px',
                            }}
                          >
                            {app.application_number}
                          </span>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                            {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'Recent'}
                          </div>
                        </td>

                        <td style={{ padding: '0.75rem', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{app.full_name}</div>
                          {app.previous_qualification && (
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              Prior: {app.previous_qualification}
                            </div>
                          )}
                          {app.notes && (
                            <div
                              style={{
                                fontSize: '0.72rem',
                                color: '#475569',
                                marginTop: '4px',
                                background: '#f8fafc',
                                padding: '4px 6px',
                                borderRadius: '4px',
                                maxWidth: '220px',
                              }}
                            >
                              &ldquo;{app.notes}&rdquo;
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '0.75rem', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>{app.program_title}</div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            Intake: <strong>{app.desired_intake || 'Upcoming'}</strong>
                          </div>
                        </td>

                        <td style={{ padding: '0.75rem', verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8rem' }}>
                              {app.phone}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                              <a
                                href={`tel:${app.phone}`}
                                style={{
                                  background: '#f1f5f9',
                                  color: '#0f172a',
                                  textDecoration: 'none',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                📞 Call
                              </a>
                              {cleanPhone && (
                                <a
                                  href={`https://wa.me/${cleanPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    background: '#25d36618',
                                    color: '#128c7e',
                                    textDecoration: 'none',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                >
                                  💬 WhatsApp
                                </a>
                              )}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                              {app.email}
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '0.75rem', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            {app.guardian_name || 'Self / Not specified'}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {app.guardian_phone || ''}
                          </div>
                        </td>

                        <td style={{ padding: '0.75rem', verticalAlign: 'top' }}>
                          <span
                            style={{
                              background: st.bg,
                              color: st.text,
                              border: `1px solid ${st.border}`,
                              padding: '3px 8px',
                              borderRadius: '9999px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              display: 'inline-block',
                            }}
                          >
                            {app.status}
                          </span>
                          {app.follow_up_notes && (
                            <div
                              style={{
                                fontSize: '0.7rem',
                                color: '#475569',
                                marginTop: '4px',
                                maxWidth: '180px',
                                fontStyle: 'italic',
                              }}
                            >
                              Note: {app.follow_up_notes}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '0.75rem', textAlign: 'center', verticalAlign: 'top' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenFollowUp(app)}
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                color: '#0f172a',
                                padding: '0.35rem 0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              title="Follow-up with candidate"
                            >
                              📞 Follow-up
                            </button>
                            {app.status !== 'Admitted' && (
                              <button
                                type="button"
                                onClick={() => handleConvertAndAdmitApplicant(app)}
                                style={{
                                  background: `${primaryColor}14`,
                                  border: `1px solid ${primaryColor}40`,
                                  color: primaryColor,
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: '6px',
                                  fontSize: '0.74rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                }}
                                title="Admit candidate directly to school register"
                              >
                                🎓 Admit
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteApp(app)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#dc2626',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )}

      {/* ========================================== */}
      {/* SUBTAB 4: MASTER CLASS TIMETABLE           */}
      {/* ========================================== */}
      {principalSubTab === 'timetable' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '1.75rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                Master Class Timetable &amp; Schedule
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Weekly class periods, assigned instructors, and laboratory/lecture room allocations.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Select Class:</span>
              <select
                value={selectedTimetableClass}
                onChange={(e) => setSelectedTimetableClass(e.target.value)}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  background: '#f8fafc',
                }}
              >
                {availableClasses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowManageClassesModal(true)}
                style={{
                  background: '#f8fafc',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                ⚙️ Manage Classes
              </button>
              <button
                type="button"
                onClick={handleOpenAddPeriod}
                style={{
                  background: primaryColor,
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.45rem 0.95rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                + Add Period
              </button>
            </div>
          </div>

          {/* Timetable List Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Day</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Period</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Time</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Subject</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Faculty Instructor</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Room / Lab</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {classTimetable.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                        No timetable periods scheduled yet for {selectedTimetableClass}
                      </div>
                      <p style={{ margin: '6px 0 1.25rem', fontSize: '0.84rem', color: '#64748b' }}>
                        Create customized weekly periods, assign faculty teachers, and set lecture rooms.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenAddPeriod}
                        style={{
                          background: primaryColor,
                          color: '#ffffff',
                          border: 'none',
                          padding: '0.55rem 1.35rem',
                          borderRadius: '8px',
                          fontSize: '0.84rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        + Add First Period
                      </button>
                    </td>
                  </tr>
                ) : (
                  classTimetable.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 800, color: primaryColor }}>{t.day_of_week}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: '#64748b' }}>Period {t.period_number}</td>
                      <td style={{ padding: '0.75rem', color: '#0f172a', fontWeight: 600 }}>
                        {t.start_time} - {t.end_time}
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>{t.subject_name}</td>
                      <td style={{ padding: '0.75rem', color: '#475569' }}>{t.teacher_name}</td>
                      <td style={{ padding: '0.75rem', color: '#64748b' }}>{t.room}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditPeriod(t)}
                            style={{
                              background: '#f1f5f9',
                              color: '#0f172a',
                              border: '1px solid #cbd5e1',
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePeriod(t.id)}
                            style={{
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            🗑️ Delete
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
      )}

      {/* ========================================== */}
      {/* SUBTAB 5: EXECUTIVE PAYROLL SIGN-OFF       */}
      {/* ========================================== */}
      {principalSubTab === 'payroll' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '1.75rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                Executive Payroll Authorization &amp; Disbursement
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Review monthly payroll registers compiled by the Bursar and execute electronic batch disbursements.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={disbursalMethod}
                onChange={(e) => setDisbursalMethod(e.target.value as any)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  background: '#f8fafc',
                }}
              >
                <option value="Bank Wire">Bank Wire Transfer</option>
                <option value="Mobile Money">Mobile Money (M-Pesa/Airtel)</option>
                <option value="Cheque">Direct Clearing Cheque</option>
              </select>
              <button
                type="button"
                onClick={handleDisbursePayroll}
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.55rem 1.15rem',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                ✓ Authorize &amp; Disburse Batch
              </button>
            </div>
          </div>

          {/* Dynamic Financial Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>GROSS SALARIES COMMITMENT</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                {currency} {totalGrossPayroll.toLocaleString()}
              </div>
            </div>
            <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: '12px', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 700 }}>STATUTORY WITHHOLDING (TAX &amp; PENSION)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#991b1b', marginTop: '2px' }}>
                {currency} {totalWithholdingPayroll.toLocaleString()}
              </div>
            </div>
            <div style={{ background: '#ecfdf5', padding: '1rem', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>NET PAYABLE TO STAFF</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#065f46', marginTop: '2px' }}>
                {currency} {totalNetPayroll.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Month & Status Filters */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              marginBottom: '1.25rem',
              background: '#f8fafc',
              padding: '0.85rem',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Filter Month:</span>
            <select
              value={payrollMonthFilter}
              onChange={(e) => setPayrollMonthFilter(e.target.value)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: '#ffffff',
              }}
            >
              <option value="all">All Available Periods</option>
              {availablePayrollMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={payrollStatusFilter}
              onChange={(e) => setPayrollStatusFilter(e.target.value as any)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: '#ffffff',
              }}
            >
              <option value="all">All Payment Statuses</option>
              <option value="disbursed">Disbursed Only</option>
              <option value="draft">Pending Authorization Only</option>
            </select>

            <button
              type="button"
              onClick={handleGeneratePayrollBatch}
              style={{
                marginLeft: 'auto',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + Generate Batch for {payrollMonthFilter === 'all' ? currentMonthYear : payrollMonthFilter}
            </button>
          </div>

          {/* Payroll Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Staff Member</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Department</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Period</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>Gross Pay</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>Net Disbursed</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayroll.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                      No payroll records found for the selected period. Click "+ Generate Batch" to compile.
                    </td>
                  </tr>
                ) : (
                  filteredPayroll.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>{p.staff_name}</td>
                      <td style={{ padding: '0.75rem', color: '#64748b' }}>{p.department}</td>
                      <td style={{ padding: '0.75rem', color: '#475569', fontWeight: 600 }}>{p.month_period}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {currency} {p.gross_salary.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 900, color: '#0f172a' }}>
                        {currency} {p.net_salary.toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span
                          style={{
                            background: p.status === 'disbursed' ? '#dcfce7' : '#fef3c7',
                            color: p.status === 'disbursed' ? '#15803d' : '#b45309',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                          }}
                        >
                          {p.status === 'disbursed' ? `✓ Disbursed (${p.payment_method || 'Wire'})` : '⏳ Pending Sign-off'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* SUBTAB: ACADEMIC PROGRAMS & COURSES        */}
      {/* ========================================== */}
      {principalSubTab === 'programs' && (
        <TenantProgramsPage
          school={school}
          isAdmin={true}
          onOpenAdmissions={(programTitle) => {
            if (onOpenApplyModal) {
              onOpenApplyModal(programTitle)
            } else {
              setPrincipalSubTab('admissions')
            }
          }}
        />
      )}

      {/* ========================================== */}
      {/* SUBTAB 6: ACADEMIC CALENDAR & SESSIONS     */}
      {/* ========================================== */}
      {principalSubTab === 'calendar' && (
        <TenantAcademicCalendarView
          school={school}
          isAdmin={true}
          primaryColor={primaryColor}
          accentColor={accentColor}
          onSchoolUpdate={onReloadData}
        />
      )}

      {/* ========================================== */}
      {/* SUBTAB 7: CAMPUS NOTICEBOARD & SENATE      */}
      {/* ========================================== */}
      {principalSubTab === 'notices' && (
        <TenantCampusNoticeboard
          school={school}
          isAdmin={true}
          primaryColor={primaryColor}
          accentColor={accentColor}
        />
      )}

      {/* ========================================== */}
      {/* SUBTAB 8: GOVERNANCE, IDENTITY & SETUP    */}
      {/* ========================================== */}
      {principalSubTab === 'governance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '1.75rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                  Institutional Governance &amp; Campus Identity
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                  Manage school profile, accreditation details, academic cohort structure, and domain configurations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSchoolProfileInput({
                    name: school.name || '',
                    motto: school.motto || '',
                    principal_name: school.principal_name || '',
                    principal_title: school.principal_title || 'Principal',
                    contact_email: school.contact_email || '',
                    contact_phone: school.contact_phone || '',
                    address: school.address || '',
                  })
                  setShowEditSchoolModal(true)
                }}
                style={{
                  background: primaryColor,
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '0.5rem 1.15rem',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                }}
              >
                ✏️ Edit Institution Profile
              </button>
            </div>

            {schoolProfileSaved && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#ecfdf5', color: '#065f46', borderRadius: '10px', fontWeight: 800, fontSize: '0.84rem' }}>
                ✓ Institutional details updated and published across portals!
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {/* Institution Identity Card */}
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Official Identity &amp; Leadership
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                  {school.name}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px', fontStyle: 'italic' }}>
                  "{school.motto || 'Excellence in Education'}"
                </div>
                <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#475569' }}>
                  <strong>{school.principal_title || 'Principal'}:</strong> {school.principal_name || 'Executive Office'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '3px' }}>
                  <strong>Official Contact:</strong> {school.contact_email} • {school.contact_phone}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '3px' }}>
                  <strong>Campus Address:</strong> {school.address || `${school.city}, ${school.country}`}
                </div>
              </div>

              {/* Operating Currency Switcher */}
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Institutional Operating Currency
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                  Active Currency: <strong style={{ color: primaryColor }}>{currency}</strong>
                </div>
                <p style={{ margin: '4px 0 10px', fontSize: '0.78rem', color: '#64748b' }}>
                  Governs currency codes displayed on Tuition Statements, Payroll Registers, and Financial Slips.
                </p>
                <form onSubmit={handleSaveCurrencySetting} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={currencySetting}
                    onChange={(e) => setCurrencySetting(e.target.value)}
                    style={{
                      padding: '0.45rem 0.65rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                    }}
                  >
                    <option value="KES">KES (Kenyan Shilling)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="GBP">GBP (British Pound)</option>
                    <option value="UGX">UGX (Ugandan Shilling)</option>
                    <option value="TZS">TZS (Tanzanian Shilling)</option>
                    <option value="NGN">NGN (Nigerian Naira)</option>
                    <option value="GHS">GHS (Ghanaian Cedi)</option>
                    <option value="ZAR">ZAR (South African Rand)</option>
                    <option value="RWF">RWF (Rwandan Franc)</option>
                  </select>
                  <button
                    type="submit"
                    style={{
                      background: primaryColor,
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Save Currency
                  </button>
                </form>
                {currencySavedMessage && (
                  <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#16a34a', fontWeight: 800 }}>
                    ✓ Currency updated to {currencySetting}!
                  </div>
                )}
              </div>

              {/* Custom Domain & DNS Card */}
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Custom Domain &amp; Network
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                  {school.custom_domain || (typeof window !== 'undefined' ? `${window.location.host}/s/${school.slug}` : `/s/${school.slug}`)}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                  Status: <span style={{ color: '#16a34a', fontWeight: 800 }}>● Active &amp; SSL Secured</span>
                </div>
                <button
                  type="button"
                  onClick={onOpenDomainSettings}
                  style={{
                    marginTop: '12px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ⚙️ Configure Custom DNS &amp; Domain
                </button>
              </div>

              {/* Cloud LMS Subscription & Licensure */}
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Cloud LMS Subscription
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: primaryColor, marginTop: '4px', textTransform: 'capitalize' }}>
                  {school.subscription_tier || 'Enterprise'} Edition
                </div>
                <div style={{ fontSize: '0.82rem', color: '#0f172a', marginTop: '3px' }}>
                  <strong>KES {((school.campus_count || 1) * 2500).toLocaleString()} / month</strong> ({school.campus_count || 1} Campus @ KES 2,500/mo)
                </div>
                <div
                  style={{
                    fontSize: '0.76rem',
                    color: school.subscription_status === 'active' ? '#16a34a' : '#b45309',
                    fontWeight: 800,
                    marginTop: '8px',
                  }}
                >
                  {school.subscription_status === 'active'
                    ? '✓ Subscription Active & Product Key Authorized'
                    : '⚠️ Active Campus Licensing'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: ADD / EDIT STAFF                   */}
      {/* ========================================== */}
      {showAddStaffModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '640px',
              width: '100%',
              padding: '2rem',
              maxHeight: 'calc(100dvh - 2rem)',
              overflowY: 'auto',
              border: `2px solid ${primaryColor}`,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                {editingStaffMember ? '✏️ Edit Faculty / Staff Details' : '+ Appoint & Register Staff Member'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddStaffModal(false)
                  setEditingStaffMember(null)
                }}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStaff}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter full legal name"
                    value={staffForm.full_name}
                    onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>
                    System Role *
                  </label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as any })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  >
                    <option value="teacher">Teacher / Faculty Instructor</option>
                    <option value="bursar">Bursar / Finance Officer</option>
                    <option value="admin">Executive Administrator</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>
                    Department *
                  </label>
                  <select
                    value={staffForm.department}
                    onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  >
                    {availableDepartments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                    <option value="__new__">+ Add New Department...</option>
                  </select>
                  {staffForm.department === '__new__' && (
                    <input
                      type="text"
                      required
                      placeholder="Enter new department name"
                      value={staffForm.custom_department}
                      onChange={(e) => setStaffForm({ ...staffForm, custom_department: e.target.value })}
                      style={{ width: '100%', marginTop: '6px', padding: '0.55rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>
                    Official Designation / Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Subject Instructor, Department Head"
                    value={staffForm.title}
                    onChange={(e) => setStaffForm({ ...staffForm, title: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +254 700 000 000"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="Leave blank to auto-create"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Portal Login Credentials Section */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Portal Login Credentials (Auto-created if left blank)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, marginBottom: '4px' }}>
                      Login Username
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. username@portal"
                      value={staffForm.username}
                      onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, marginBottom: '4px' }}>
                      Temporary Password
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Generate or leave blank"
                      value={staffForm.temp_password}
                      onChange={(e) => setStaffForm({ ...staffForm, temp_password: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>
              </div>

              {/* Compensation Breakdown */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                    Monthly Compensation ({currency})
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#16a34a' }}>
                    Net Disbursable: {currency}{' '}
                    {(
                      Number(staffForm.salary_base || 0) +
                      Number(staffForm.salary_housing || 0) +
                      Number(staffForm.salary_transport || 0) -
                      Number(staffForm.salary_tax || 0) -
                      Number(staffForm.salary_pension || 0)
                    ).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.65rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '2px' }}>Base</label>
                    <input
                      type="number"
                      min="0"
                      value={staffForm.salary_base}
                      onChange={(e) => setStaffForm({ ...staffForm, salary_base: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '2px' }}>Housing</label>
                    <input
                      type="number"
                      min="0"
                      value={staffForm.salary_housing}
                      onChange={(e) => setStaffForm({ ...staffForm, salary_housing: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '2px' }}>Transport</label>
                    <input
                      type="number"
                      min="0"
                      value={staffForm.salary_transport}
                      onChange={(e) => setStaffForm({ ...staffForm, salary_transport: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '2px' }}>Tax Withholding</label>
                    <input
                      type="number"
                      min="0"
                      value={staffForm.salary_tax}
                      onChange={(e) => setStaffForm({ ...staffForm, salary_tax: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, marginBottom: '2px' }}>Pension Withholding</label>
                    <input
                      type="number"
                      min="0"
                      value={staffForm.salary_pension}
                      onChange={(e) => setStaffForm({ ...staffForm, salary_pension: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStaffModal(false)
                    setEditingStaffMember(null)
                  }}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: primaryColor, color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  {editingStaffMember ? 'Update Staff Member' : 'Appoint & Issue Slip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: ADMIT / EDIT STUDENT                */}
      {/* ========================================== */}
      {showAdmitStudentModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '640px',
              width: '100%',
              padding: '2rem',
              maxHeight: 'calc(100dvh - 2rem)',
              overflowY: 'auto',
              border: `2px solid ${primaryColor}`,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                {editingStudentMember ? '✏️ Edit Candidate Information' : '+ Admit Candidate & Issue Admission Letter'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAdmitStudentModal(false)
                  setEditingStudentMember(null)
                }}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStudent}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>
                    Candidate Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter student full name"
                    value={studentForm.full_name}
                    onChange={(e) => setStudentForm({ ...studentForm, full_name: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>
                    Class / Form Cohort *
                  </label>
                  <select
                    value={studentForm.grade_class}
                    onChange={(e) => setStudentForm({ ...studentForm, grade_class: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  >
                    {availableClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                    <option value="__new__">+ Add New Class Cohort...</option>
                  </select>
                  {studentForm.grade_class === '__new__' && (
                    <input
                      type="text"
                      required
                      placeholder="Enter new class cohort name"
                      value={studentForm.custom_class}
                      onChange={(e) => setStudentForm({ ...studentForm, custom_class: e.target.value })}
                      style={{ width: '100%', marginTop: '6px', padding: '0.55rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>
                    Guardian Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Parent or sponsor name"
                    value={studentForm.guardian_name}
                    onChange={(e) => setStudentForm({ ...studentForm, guardian_name: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>
                    Guardian Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +254 700 000 000"
                    value={studentForm.guardian_phone}
                    onChange={(e) => setStudentForm({ ...studentForm, guardian_phone: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>
                  Guardian Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. parent@example.com (or leave blank to auto-create)"
                  value={studentForm.guardian_email}
                  onChange={(e) => setStudentForm({ ...studentForm, guardian_email: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Tuition & Fee Schedule */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                    Tuition &amp; Fees Schedule ({currency})
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 900, color: Number(studentForm.fee_total) - Number(studentForm.fee_paid) > 0 ? '#dc2626' : '#16a34a' }}>
                    Balance: {currency}{' '}
                    {Math.max(0, Number(studentForm.fee_total) - Number(studentForm.fee_paid)).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '4px' }}>
                      Total Term Tuition ({currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={studentForm.fee_total}
                      onChange={(e) => setStudentForm({ ...studentForm, fee_total: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '4px' }}>
                      Initial Payment Collected ({currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={studentForm.fee_paid}
                      onChange={(e) => setStudentForm({ ...studentForm, fee_paid: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAdmitStudentModal(false)
                    setEditingStudentMember(null)
                  }}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: primaryColor, color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  {editingStudentMember ? 'Update Candidate' : 'Admit & Generate Letter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: ADD / EDIT TIMETABLE PERIOD         */}
      {/* ========================================== */}
      {showAddTimetableModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              maxHeight: 'calc(100dvh - 2rem)',
              overflowY: 'auto',
              boxSizing: 'border-box',
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '540px',
              width: '100%',
              padding: '2rem',
              border: `2px solid ${primaryColor}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                {editingPeriod ? '✏️ Edit Timetable Period' : `+ Add Period for ${selectedTimetableClass}`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddTimetableModal(false)
                  setEditingPeriod(null)
                }}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTimetableEntry}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Day of Week</label>
                  <select
                    value={timetableForm.day_of_week}
                    onChange={(e) => setTimetableForm({ ...timetableForm, day_of_week: e.target.value as any })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  >
                    {daysOfWeek.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Period #</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={timetableForm.period_number}
                    onChange={(e) => setTimetableForm({ ...timetableForm, period_number: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Start Time</label>
                  <input
                    type="time"
                    value={timetableForm.start_time}
                    onChange={(e) => setTimetableForm({ ...timetableForm, start_time: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>End Time</label>
                  <input
                    type="time"
                    value={timetableForm.end_time}
                    onChange={(e) => setTimetableForm({ ...timetableForm, end_time: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Subject Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics, Physical Sciences, Literature"
                  value={timetableForm.subject_name}
                  onChange={(e) => setTimetableForm({ ...timetableForm, subject_name: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Faculty Teacher</label>
                  <select
                    value={timetableForm.teacher_name}
                    onChange={(e) => setTimetableForm({ ...timetableForm, teacher_name: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  >
                    <option value="">Select Instructor</option>
                    {teachersList.map((t) => (
                      <option key={t.id} value={t.full_name}>
                        {t.full_name} ({t.department})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Room / Laboratory</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Room 101, Science Lab 2"
                    value={timetableForm.room}
                    onChange={(e) => setTimetableForm({ ...timetableForm, room: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTimetableModal(false)
                    setEditingPeriod(null)
                  }}
                  style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontSize: '0.82rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none', background: primaryColor, color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.82rem' }}
                >
                  {editingPeriod ? 'Update Period' : 'Save Period'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: MANAGE CLASS COHORTS                */}
      {/* ========================================== */}
      {showManageClassesModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              border: `2px solid ${primaryColor}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                  🎓 Manage Class Cohorts
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                  Add or retire academic classes for {school.name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManageClassesModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {schoolPrograms.length > 0 && (
              <div style={{ marginBottom: '1rem', background: '#eff6ff', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '0.78rem', color: '#1e40af' }}>
                  <strong>{schoolPrograms.length} Academic Programs</strong> configured in catalog.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const programTitles = schoolPrograms.map((p) => p.title.trim()).filter(Boolean)
                    const combined = Array.from(new Set([...(school.classes_list || []), ...programTitles]))
                    tenantSchoolStore.updateSchoolBranding(school.slug, { classes_list: combined })
                    onReloadData()
                  }}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  ⚡ Sync All to Classes
                </button>
              </div>
            )}

            {/* Add New Class Form */}
            <form onSubmit={handleAddClassCohort} style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem' }}>
              <input
                type="text"
                placeholder="Enter class cohort (e.g. Diploma in Software Eng - Year 1)..."
                value={newClassNameInput}
                onChange={(e) => setNewClassNameInput(e.target.value)}
                style={{ flex: 1, padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem' }}
              />
              <button
                type="submit"
                style={{ background: primaryColor, color: '#ffffff', border: 'none', padding: '0.55rem 1rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
              >
                + Add Class
              </button>
            </form>

            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {availableClasses.map((className) => {
                const count = studentList.filter((s) => s.grade_class === className).length
                return (
                  <div
                    key={className}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.65rem 0.85rem',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>{className}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{count} enrolled students</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveClassCohort(className)}
                      style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setShowManageClassesModal(false)}
                style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: MANAGE DEPARTMENTS                  */}
      {/* ========================================== */}
      {showManageDeptsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              border: `2px solid ${primaryColor}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                  👥 Manage Academic Departments
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                  Add or retire faculties and divisions for {school.name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManageDeptsModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Add New Dept Form */}
            <form onSubmit={handleAddDepartment} style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem' }}>
              <input
                type="text"
                placeholder="e.g. Sciences, Humanities, Business..."
                value={newDeptNameInput}
                onChange={(e) => setNewDeptNameInput(e.target.value)}
                style={{ flex: 1, padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.84rem' }}
              />
              <button
                type="submit"
                style={{ background: primaryColor, color: '#ffffff', border: 'none', padding: '0.55rem 1rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
              >
                + Add Dept
              </button>
            </form>

            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {availableDepartments.map((deptName) => {
                const count = staffList.filter((s) => s.department === deptName).length
                return (
                  <div
                    key={deptName}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.65rem 0.85rem',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>{deptName}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{count} appointed faculty members</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDepartment(deptName)}
                      style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setShowManageDeptsModal(false)}
                style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: EDIT INSTITUTION PROFILE           */}
      {/* ========================================== */}
      {showEditSchoolModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              maxHeight: 'calc(100dvh - 2rem)',
              overflowY: 'auto',
              boxSizing: 'border-box',
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '600px',
              width: '100%',
              padding: '2rem',
              border: `2px solid ${primaryColor}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                🏛️ Edit Institutional Profile
              </h3>
              <button
                type="button"
                onClick={() => setShowEditSchoolModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSchoolProfile}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>
                  Institutional Name *
                </label>
                <input
                  type="text"
                  required
                  value={schoolProfileInput.name}
                  onChange={(e) => setSchoolProfileInput({ ...schoolProfileInput, name: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>
                  Motto / Institutional Tagline
                </label>
                <input
                  type="text"
                  value={schoolProfileInput.motto}
                  onChange={(e) => setSchoolProfileInput({ ...schoolProfileInput, motto: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>
                    Executive Head Name
                  </label>
                  <input
                    type="text"
                    value={schoolProfileInput.principal_name}
                    onChange={(e) => setSchoolProfileInput({ ...schoolProfileInput, principal_name: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>
                    Executive Title
                  </label>
                  <input
                    type="text"
                    value={schoolProfileInput.principal_title}
                    onChange={(e) => setSchoolProfileInput({ ...schoolProfileInput, principal_title: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={schoolProfileInput.contact_phone}
                    onChange={(e) => setSchoolProfileInput({ ...schoolProfileInput, contact_phone: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={schoolProfileInput.contact_email}
                    onChange={(e) => setSchoolProfileInput({ ...schoolProfileInput, contact_email: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>
                  Campus Physical Address
                </label>
                <input
                  type="text"
                  value={schoolProfileInput.address}
                  onChange={(e) => setSchoolProfileInput({ ...schoolProfileInput, address: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowEditSchoolModal(false)}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: primaryColor, color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: RESET STAFF CREDENTIALS            */}
      {/* ========================================== */}
      {editingStaffCreds && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              maxHeight: 'calc(100dvh - 2rem)',
              overflowY: 'auto',
              boxSizing: 'border-box',
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '500px',
              width: '100%',
              padding: 'clamp(1.1rem, 4vw, 2rem)',
              border: `2px solid ${primaryColor}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                  🔑 Issue / Reset Login Credentials
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                  {editingStaffCreds.full_name} ({editingStaffCreds.role.toUpperCase()} • {editingStaffCreds.department})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaffCreds(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStaffCredentials}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>
                  Portal Login Username
                </label>
                <input
                  type="text"
                  required
                  value={editStaffUsername}
                  onChange={(e) => setEditStaffUsername(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800 }}>
                    Temporary / Portal Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditStaffPassword(`StaffPass${currentYear}!${Math.floor(100 + Math.random() * 900)}`)}
                    style={{ background: 'none', border: 'none', color: '#1d4ed8', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    ⚡ Generate Secure Password
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={editStaffPassword}
                  onChange={(e) => setEditStaffPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box', fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingStaffCreds(null)}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: primaryColor, color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Save &amp; Issue Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: RESET STUDENT CREDENTIALS          */}
      {/* ========================================== */}
      {editingStudentCreds && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              maxHeight: 'calc(100dvh - 2rem)',
              overflowY: 'auto',
              boxSizing: 'border-box',
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '500px',
              width: '100%',
              padding: 'clamp(1.1rem, 4vw, 2rem)',
              border: `2px solid ${primaryColor}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                  🔑 Reset Student Login Password / PIN
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                  {editingStudentCreds.full_name} ({editingStudentCreds.admission_number} • {editingStudentCreds.grade_class})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudentCreds(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStudentCredentials}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>
                  Student Admission Number / Login ID
                </label>
                <input
                  type="text"
                  required
                  value={editStudentUsername}
                  onChange={(e) => setEditStudentUsername(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 800 }}>
                    Temporary PIN / Portal Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditStudentPassword(`PIN-${Math.floor(1000 + Math.random() * 9000)}`)}
                    style={{ background: 'none', border: 'none', color: '#1d4ed8', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    ⚡ Regenerate PIN
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={editStudentPassword}
                  onChange={(e) => setEditStudentPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box', fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingStudentCreds(null)}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: primaryColor, color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Save &amp; Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: CANDIDATE APPLICATION FOLLOW-UP    */}
      {/* ========================================== */}
      {followingUpApp && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    color: primaryColor,
                    fontSize: '0.78rem',
                    background: `${primaryColor}14`,
                    padding: '3px 8px',
                    borderRadius: '6px',
                  }}
                >
                  {followingUpApp.application_number}
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '6px 0 0', color: '#0f172a' }}>
                  Candidate Follow-Up &amp; Evaluation
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                  Review candidate credentials, record consultation notes, and update admission status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFollowingUpApp(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontWeight: 900,
                  color: '#64748b',
                }}
              >
                ✕
              </button>
            </div>

            {/* Candidate Dossier Overview */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.82rem' }}>
                <div>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Candidate Name:</span>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>{followingUpApp.full_name}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Applied Program:</span>
                  <div style={{ fontWeight: 800, color: primaryColor }}>{followingUpApp.program_title}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Desired Intake:</span>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{followingUpApp.desired_intake || 'Upcoming'}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Prior Qualification:</span>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{followingUpApp.previous_qualification || 'None specified'}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Guardian:</span>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    {followingUpApp.guardian_name ? `${followingUpApp.guardian_name} (${followingUpApp.guardian_phone || 'No phone'})` : 'Self / Not specified'}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Submitted On:</span>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    {followingUpApp.created_at ? new Date(followingUpApp.created_at).toLocaleString() : 'Recent'}
                  </div>
                </div>
              </div>

              {followingUpApp.notes && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #cbd5e1' }}>
                  <span style={{ color: '#64748b', fontSize: '0.74rem', fontWeight: 700 }}>Applicant Self-Notes:</span>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#334155', fontStyle: 'italic' }}>
                    &ldquo;{followingUpApp.notes}&rdquo;
                  </p>
                </div>
              )}

              {/* Direct Outreach Shortcuts */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.85rem' }}>
                <a
                  href={`tel:${followingUpApp.phone}`}
                  style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    textDecoration: 'none',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  📞 Call {followingUpApp.phone}
                </a>
                {followingUpApp.phone && (
                  <a
                    href={`https://wa.me/${followingUpApp.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: '#25d366',
                      color: '#ffffff',
                      textDecoration: 'none',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    💬 WhatsApp Chat
                  </a>
                )}
                {followingUpApp.email && (
                  <a
                    href={`mailto:${followingUpApp.email}?subject=Admission Inquiry - ${school.name}&body=Dear ${followingUpApp.full_name},%0D%0A%0D%0ARegarding your application (${followingUpApp.application_number}) for ${followingUpApp.program_title}...`}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      textDecoration: 'none',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    ✉️ Send Email
                  </a>
                )}
              </div>
            </div>

            {/* Follow-Up Form */}
            <form onSubmit={handleSaveFollowUp}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                  Application Status
                </label>
                <select
                  value={followUpStatus}
                  onChange={(e) => setFollowUpStatus(e.target.value as ApplicationStatus)}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    boxSizing: 'border-box',
                    background: '#ffffff',
                  }}
                >
                  <option value="Pending Review">⏳ Pending Review</option>
                  <option value="Contacted">📞 Contacted / Discussion in Progress</option>
                  <option value="Interview Scheduled">📅 Interview Scheduled</option>
                  <option value="Admitted">🎓 Admitted / Qualified</option>
                  <option value="Rejected">❌ Rejected / Not Eligible</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                  Principal / Admissions Follow-up Notes
                </label>
                <textarea
                  rows={4}
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="Record outcome of phone calls, interview schedule, candidate eligibility, or scholarship notes..."
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                {followUpStatus !== 'Admitted' ? (
                  <button
                    type="button"
                    onClick={() => {
                      const appToConvert = followingUpApp
                      setFollowingUpApp(null)
                      handleConvertAndAdmitApplicant(appToConvert)
                    }}
                    style={{
                      background: '#15803d',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.6rem 1.1rem',
                      borderRadius: '8px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                    }}
                  >
                    🎓 Convert &amp; Admit to School Register
                  </button>
                ) : (
                  <div />
                )}

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setFollowingUpApp(null)}
                    style={{
                      padding: '0.6rem 1.1rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '0.6rem 1.4rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: primaryColor,
                      color: '#ffffff',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                    }}
                  >
                    Save Follow-up
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
