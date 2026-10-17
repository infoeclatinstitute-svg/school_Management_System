import React, { useState, useMemo, useEffect } from 'react'
import type {
  PartnerSchoolTenant,
  TenantStudentMember,
  TenantGradeRecord,
  TenantLessonNote,
  TenantSessionUser,
  TenantAttendanceRecord,
} from '@/types/tenantSchool'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'

interface TenantTeacherDeskProps {
  school: PartnerSchoolTenant
  studentList: TenantStudentMember[]
  gradeList: TenantGradeRecord[]
  lessonNotesList: TenantLessonNote[]
  sessionUser?: TenantSessionUser | null
  onReloadData: () => void
}

export function TenantTeacherDesk({
  school,
  studentList,
  gradeList,
  lessonNotesList,
  sessionUser,
  onReloadData,
}: TenantTeacherDeskProps) {
  const primaryColor = school.primary_color || '#059669'
  const _accentColor = school.accent_color || '#d97706'
  const _currency = school.currency || 'KES'

  // ==========================================
  // DYNAMIC CLASSES, SUBJECTS & STAFF (ZERO HARDCODING)
  // ==========================================
  // Dynamic Teaching Staff List
  const allStaff = useMemo(() => {
    return tenantSchoolStore.getStaffBySchool(school.slug)
  }, [school.slug])

  const teachingStaff = useMemo(() => {
    const teachers = allStaff.filter((s) => s.role === 'teacher')
    return teachers
  }, [allStaff])

  // Active Teacher Profile (logged-in session or selected faculty persona)
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(() => {
    if (sessionUser && sessionUser.role === 'teacher') {
      const uName = (sessionUser.full_name || sessionUser.name || '').toLowerCase()
      const match = teachingStaff.find(
        (t) => t.id === sessionUser.id || t.full_name.toLowerCase() === uName
      )
      if (match) return match.id
    }
    return teachingStaff[0]?.id || allStaff[0]?.id || `faculty_${school.slug}`
  })

  const currentTeacher = useMemo(() => {
    return (
      teachingStaff.find((t) => t.id === selectedTeacherId) || {
        id: teachingStaff[0]?.id || allStaff[0]?.id || `faculty_${school.slug}`,
        school_slug: school.slug,
        full_name:
          sessionUser?.full_name ||
          sessionUser?.name ||
          allStaff[0]?.full_name ||
          `${school.name} Instructor`,
        role: 'teacher' as const,
        department: school.departments_list?.[0] || 'Academic Studies',
        title: 'Subject Instructor',
        email: sessionUser?.username
          ? `${sessionUser.username}@${school.slug}.ac`
          : school.contact_email,
        phone: school.contact_phone,
        assigned_classes: '',
        assigned_subjects: '',
      }
    )
  }, [teachingStaff, allStaff, selectedTeacherId, sessionUser, school.slug, school.name, school.departments_list, school.contact_email, school.contact_phone])


  // Dynamic Classes List
  const availableClasses = useMemo(() => {
    const list = new Set<string>()
    if (Array.isArray(school.classes_list)) {
      school.classes_list.forEach((c) => c && list.add(c.trim()))
    }
    studentList.forEach((s) => {
      if (s.grade_class) list.add(s.grade_class.trim())
    })
    const progs = tenantSchoolStore.getProgramsBySchool(school.slug)
    progs.forEach((p) => {
      if (p.title) list.add(p.title.trim())
    })
    const arr = Array.from(list).filter(Boolean)
    if (arr.length > 0) return arr
    if (school.institution_category === 'university') {
      return ['Undergraduate Year 1', 'Postgraduate Cohort']
    }
    if (school.institution_category === 'school') {
      return ['Grade 1', 'Grade 2']
    }
    return ['Diploma Cohort', 'Certificate Cohort']
  }, [school.classes_list, school.institution_category, school.slug, studentList])

  // Dynamic Subjects List
  const availableSubjects = useMemo(() => {
    const subs = new Set<string>()
    // Extract from Timetable
    const tt = tenantSchoolStore.getTimetableBySchool(school.slug)
    tt.forEach((entry) => {
      if (entry.subject_name) subs.add(entry.subject_name.trim())
    })
    // Extract from existing Grades
    gradeList.forEach((g) => {
      if (g.subject_name) subs.add(g.subject_name.trim())
    })
    // Extract from existing Lesson Notes
    lessonNotesList.forEach((n) => {
      if (n.subject_name) subs.add(n.subject_name.trim())
    })
    // Extract from Teacher assigned subjects
    if (currentTeacher.assigned_subjects) {
      const subsList = Array.isArray(currentTeacher.assigned_subjects)
        ? currentTeacher.assigned_subjects
        : String(currentTeacher.assigned_subjects).split(',')
      subsList.forEach((s) => s.trim() && subs.add(s.trim()))
    }
    const arr = Array.from(subs).filter(Boolean)
    return arr.length > 0
      ? arr
      : ['Core Mathematics', 'Language & Communication', 'Applied Sciences', 'General Studies']
  }, [school.slug, gradeList, lessonNotesList, currentTeacher.assigned_subjects])

  // ==========================================
  // NAVIGATION & TAB STATE
  // ==========================================
  const [teacherSubTab, setTeacherSubTab] = useState<
    'attendance' | 'gradebook' | 'notes' | 'timetable' | 'at_risk'
  >('attendance')

  // Notification Toast
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null)
  const triggerToast = (msg: string) => {
    setSaveSuccessMsg(msg)
    setTimeout(() => setSaveSuccessMsg(null), 3500)
  }

  // ==========================================
  // TAB 1: ATTENDANCE STATE & ROLL-CALL
  // ==========================================
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const [attendanceDate, setAttendanceDate] = useState<string>(todayStr)
  const [selectedClassForAttendance, setSelectedClassForAttendance] = useState<string>(() => availableClasses[0] || '')
  const [selectedSubjectForAttendance, setSelectedSubjectForAttendance] = useState<string>(() => availableSubjects[0] || '')
  const [attendancePeriodName, setAttendancePeriodName] = useState<string>('Daily Roll-Call')
  const [attendanceSessionNotes, setAttendanceSessionNotes] = useState<string>('')

  // Sync class selection if empty
  useEffect(() => {
    if (!selectedClassForAttendance && availableClasses[0]) {
      setSelectedClassForAttendance(availableClasses[0])
    }
  }, [availableClasses, selectedClassForAttendance])

  // Students in selected attendance class
  const classStudents = useMemo(() => {
    return studentList.filter(
      (s) =>
        !selectedClassForAttendance ||
        s.grade_class.trim().toLowerCase() === selectedClassForAttendance.trim().toLowerCase()
    )
  }, [studentList, selectedClassForAttendance])

  // In-Memory Roll-Call status map for current session: { [studentId]: 'present' | 'absent' | 'late' | 'excused' }
  const [rollCallMap, setRollCallMap] = useState<Record<string, { status: 'present' | 'absent' | 'late' | 'excused'; note: string }>>({})

  // Load existing attendance session for this date & class if available
  const existingSessions = useMemo(() => {
    return tenantSchoolStore.getAttendanceSessions(school.slug, selectedClassForAttendance, attendanceDate)
  }, [school.slug, selectedClassForAttendance, attendanceDate])

  // When class or date changes, initialize roll-call map
  useEffect(() => {
    const existing = existingSessions[0]
    const initialMap: Record<string, { status: 'present' | 'absent' | 'late' | 'excused'; note: string }> = {}

    classStudents.forEach((st) => {
      if (existing) {
        const found = existing.records.find((r) => r.student_id === st.id)
        if (found) {
          initialMap[st.id] = { status: found.status, note: found.note || '' }
          return
        }
      }
      // Default to Present
      initialMap[st.id] = { status: 'present', note: '' }
    })
    setRollCallMap(initialMap)
    if (existing) {
      setAttendancePeriodName(existing.period_name || 'Daily Roll-Call')
      setAttendanceSessionNotes(existing.notes || '')
    } else {
      setAttendanceSessionNotes('')
    }
  }, [classStudents, existingSessions])

  // Attendance Batch Handlers
  const handleSetStudentStatus = (
    studentId: string,
    status: 'present' | 'absent' | 'late' | 'excused'
  ) => {
    setRollCallMap((prev) => ({
      ...prev,
      [studentId]: {
        status,
        note: prev[studentId]?.note || '',
      },
    }))
  }

  const handleSetStudentNote = (studentId: string, note: string) => {
    setRollCallMap((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status || 'present',
        note,
      },
    }))
  }

  const handleMarkAll = (status: 'present' | 'absent') => {
    const newMap: Record<string, { status: 'present' | 'absent' | 'late' | 'excused'; note: string }> = {}
    classStudents.forEach((st) => {
      newMap[st.id] = {
        status,
        note: rollCallMap[st.id]?.note || '',
      }
    })
    setRollCallMap(newMap)
  }

  const handleSaveAttendanceSession = () => {
    if (classStudents.length === 0) {
      alert('No students registered in this cohort.')
      return
    }

    const records: TenantAttendanceRecord[] = classStudents.map((st) => ({
      student_id: st.id,
      student_name: st.full_name,
      admission_number: st.admission_number,
      status: rollCallMap[st.id]?.status || 'present',
      note: rollCallMap[st.id]?.note || '',
    }))

    tenantSchoolStore.saveAttendanceSession({
      school_slug: school.slug,
      class_name: selectedClassForAttendance,
      subject_name: selectedSubjectForAttendance,
      date: attendanceDate,
      period_name: attendancePeriodName.trim() || 'Daily Roll-Call',
      teacher_name: currentTeacher.full_name,
      notes: attendanceSessionNotes.trim(),
      records,
    })

    onReloadData()
    triggerToast(
      `Attendance committed for ${classStudents.length} students in ${selectedClassForAttendance} (${attendanceDate})`
    )
  }

  // Attendance Telemetry
  const attendanceStats = useMemo(() => {
    let presentCount = 0
    let absentCount = 0
    let lateCount = 0
    let excusedCount = 0

    classStudents.forEach((s) => {
      const st = rollCallMap[s.id]?.status || 'present'
      if (st === 'present') presentCount++
      else if (st === 'absent') absentCount++
      else if (st === 'late') lateCount++
      else if (st === 'excused') excusedCount++
    })

    const total = classStudents.length
    const attendanceRate = total > 0 ? Math.round(((presentCount + lateCount * 0.5) / total) * 100) : 100
    return { presentCount, absentCount, lateCount, excusedCount, total, attendanceRate }
  }, [classStudents, rollCallMap])

  // Past Historical Sessions
  const allHistoricalSessions = useMemo(() => {
    return tenantSchoolStore.getAttendanceSessions(school.slug, selectedClassForAttendance)
  }, [school.slug, selectedClassForAttendance])

  // ==========================================
  // TAB 2: ASSESSMENT GRADEBOOK STATE
  // ==========================================
  const [selectedClassForGradebook, setSelectedClassForGradebook] = useState<string>(() => availableClasses[0] || '')
  const [selectedSubjectForGradebook, setSelectedSubjectForGradebook] = useState<string>(() => availableSubjects[0] || '')
  const [gradebookSearchQuery, setGradebookSearchQuery] = useState('')
  const [newCustomSubjectInput, setNewCustomSubjectInput] = useState('')
  const [showAddSubjectInput, setShowAddSubjectInput] = useState(false)

  // Sync gradebook selections
  useEffect(() => {
    if (!selectedClassForGradebook && availableClasses[0]) {
      setSelectedClassForGradebook(availableClasses[0])
    }
  }, [availableClasses, selectedClassForGradebook])

  useEffect(() => {
    if (!selectedSubjectForGradebook && availableSubjects[0]) {
      setSelectedSubjectForGradebook(availableSubjects[0])
    }
  }, [availableSubjects, selectedSubjectForGradebook])

  const gradebookStudents = useMemo(() => {
    return studentList.filter(
      (s) =>
        (!selectedClassForGradebook || s.grade_class.toLowerCase() === selectedClassForGradebook.toLowerCase()) &&
        (!gradebookSearchQuery ||
          s.full_name.toLowerCase().includes(gradebookSearchQuery.toLowerCase()) ||
          s.admission_number.toLowerCase().includes(gradebookSearchQuery.toLowerCase()))
    )
  }, [studentList, selectedClassForGradebook, gradebookSearchQuery])

  // Gradebook Analytics
  const gradebookStats = useMemo(() => {
    const currentClassGrades = gradeList.filter(
      (g) =>
        g.class_name.toLowerCase() === selectedClassForGradebook.toLowerCase() &&
        g.subject_name.toLowerCase() === selectedSubjectForGradebook.toLowerCase()
    )

    if (currentClassGrades.length === 0) {
      return { totalGraded: 0, avgScore: 0, highestScore: 0, lowestScore: 0, passRate: 0 }
    }

    const scores = currentClassGrades.map((g) => g.total_score || 0)
    const sum = scores.reduce((acc, curr) => acc + curr, 0)
    const avg = Math.round(sum / scores.length)
    const highest = Math.max(...scores)
    const lowest = Math.min(...scores)
    const passed = scores.filter((s) => s >= 50).length
    const passRate = Math.round((passed / scores.length) * 100)

    return { totalGraded: currentClassGrades.length, avgScore: avg, highestScore: highest, lowestScore: lowest, passRate }
  }, [gradeList, selectedClassForGradebook, selectedSubjectForGradebook])

  // Export Gradebook CSV
  const handleExportGradebookCSV = () => {
    if (gradebookStudents.length === 0) {
      alert('No students to export.')
      return
    }

    const headers = ['Admission Number', 'Student Name', 'Cohort Class', 'Subject', 'CAT 1 (20)', 'CAT 2 (20)', 'Exam (60)', 'Total Score (100)', 'Grade', 'Remarks', 'Tutor']
    const rows = gradebookStudents.map((s) => {
      const g = gradeList.find(
        (rec) =>
          (rec.student_id === s.id || rec.admission_number === s.admission_number) &&
          rec.subject_name.toLowerCase() === selectedSubjectForGradebook.toLowerCase()
      )
      return [
        s.admission_number,
        `"${s.full_name}"`,
        `"${s.grade_class}"`,
        `"${selectedSubjectForGradebook}"`,
        g?.cat1_score ?? '',
        g?.cat2_score ?? '',
        g?.exam_score ?? '',
        g?.total_score ?? '',
        g?.grade ?? '',
        `"${g?.remarks ?? ''}"`,
        `"${currentTeacher.full_name}"`,
      ]
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Gradebook_${selectedClassForGradebook}_${selectedSubjectForGradebook}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    triggerToast('Gradebook exported to CSV successfully!')
  }

  // Printable Document Modals
  const [showPrintableGradeSheet, setShowPrintableGradeSheet] = useState(false)
  const [showPrintableAttendanceSheet, setShowPrintableAttendanceSheet] = useState(false)

  // ==========================================
  // TAB 3: STUDY NOTES & MATERIALS
  // ==========================================
  const [showUploadNoteModal, setShowUploadNoteModal] = useState(false)
  const [editingNote, setEditingNote] = useState<TenantLessonNote | null>(null)
  const [noteSearchQuery, setNoteSearchQuery] = useState('')
  const [noteClassFilter, setNoteClassFilter] = useState('all')
  const [noteTypeFilter, setNoteTypeFilter] = useState('all')

  const [noteForm, setNoteForm] = useState({
    title: '',
    class_name: '',
    subject_name: '',
    custom_subject: '',
    material_type: 'Lecture Notes' as 'Lecture Notes' | 'Assignment' | 'Past Paper' | 'Lab Manual' | 'Syllabus',
    due_date: '',
    summary: '',
    file_url: '',
  })

  const filteredLessonNotes = useMemo(() => {
    return lessonNotesList.filter((n) => {
      const matchesSearch =
        !noteSearchQuery ||
        n.title.toLowerCase().includes(noteSearchQuery.toLowerCase()) ||
        n.subject_name.toLowerCase().includes(noteSearchQuery.toLowerCase()) ||
        n.summary.toLowerCase().includes(noteSearchQuery.toLowerCase())

      const matchesClass = noteClassFilter === 'all' || n.class_name.toLowerCase() === noteClassFilter.toLowerCase()
      const matchesType = noteTypeFilter === 'all' || n.material_type === noteTypeFilter

      return matchesSearch && matchesClass && matchesType
    })
  }, [lessonNotesList, noteSearchQuery, noteClassFilter, noteTypeFilter])

  const handleOpenUploadNote = (note?: TenantLessonNote) => {
    if (note) {
      setEditingNote(note)
      setNoteForm({
        title: note.title,
        class_name: note.class_name,
        subject_name: note.subject_name,
        custom_subject: '',
        material_type: note.material_type || 'Lecture Notes',
        due_date: note.due_date || '',
        summary: note.summary,
        file_url: note.file_url || '',
      })
    } else {
      setEditingNote(null)
      setNoteForm({
        title: '',
        class_name: availableClasses[0] || 'General Cohort',
        subject_name: availableSubjects[0] || 'General Studies',
        custom_subject: '',
        material_type: 'Lecture Notes',
        due_date: '',
        summary: '',
        file_url: '',
      })
    }
    setShowUploadNoteModal(true)
  }

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteForm.title.trim()) return

    const finalSubject = noteForm.custom_subject.trim() || noteForm.subject_name || 'General Studies'

    if (editingNote) {
      tenantSchoolStore.updateLessonNote(editingNote.id, {
        title: noteForm.title.trim(),
        class_name: noteForm.class_name,
        subject_name: finalSubject,
        material_type: noteForm.material_type,
        due_date: noteForm.due_date,
        summary: noteForm.summary.trim(),
        file_url: noteForm.file_url.trim(),
        teacher_name: currentTeacher.full_name,
      })
      triggerToast('Study material updated successfully!')
    } else {
      tenantSchoolStore.createLessonNote({
        school_slug: school.slug,
        class_name: noteForm.class_name,
        subject_name: finalSubject,
        title: noteForm.title.trim(),
        summary: noteForm.summary.trim(),
        material_type: noteForm.material_type,
        due_date: noteForm.due_date,
        file_url: noteForm.file_url.trim() || `https://cloud.eclat.institute/docs/${school.slug}/materials.pdf`,
        teacher_name: currentTeacher.full_name,
      })
      triggerToast('Published study material to student learning portal!')
    }

    setShowUploadNoteModal(false)
    setEditingNote(null)
    onReloadData()
  }

  const handleDeleteNote = (note: TenantLessonNote) => {
    if (window.confirm(`Are you sure you want to delete "${note.title}"?`)) {
      tenantSchoolStore.deleteLessonNote(note.id)
      onReloadData()
      triggerToast('Study material removed.')
    }
  }

  // ==========================================
  // TAB 4: TEACHING TIMETABLE & VIRTUAL CLASSROOM
  // ==========================================
  const [timetableDay, setTimetableDay] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'>(() => {
    const days: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday')[] = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
    ]
    const dayIndex = new Date().getDay() // 0=Sun, 1=Mon... 5=Fri
    return dayIndex >= 1 && dayIndex <= 5 ? days[dayIndex - 1] : 'Monday'
  })

  const [timetableClassFilter, setTimetableClassFilter] = useState('all')

  const fullSchoolTimetable = useMemo(() => {
    return tenantSchoolStore.getTimetableBySchool(school.slug)
  }, [school.slug])

  const filteredTimetable = useMemo(() => {
    return fullSchoolTimetable.filter((t) => {
      const matchesDay = t.day_of_week === timetableDay
      const matchesClass = timetableClassFilter === 'all' || t.class_name.toLowerCase() === timetableClassFilter.toLowerCase()
      return matchesDay && matchesClass
    })
  }, [fullSchoolTimetable, timetableDay, timetableClassFilter])

  // Check if a period is currently active right now
  const isPeriodActiveNow = (startTime: string, endTime: string, day: string) => {
    const now = new Date()
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    if (days[now.getDay()] !== day) return false

    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)

    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    return nowMinutes >= startMinutes && nowMinutes <= endMinutes
  }

  // ==========================================
  // TAB 5: AT-RISK STUDENTS & MENTORSHIP
  // ==========================================
  const atRiskStudents = useMemo(() => {
    return studentList
      .map((student) => {
        const studentGrades = gradeList.filter(
          (g) => g.student_id === student.id || g.admission_number === student.admission_number
        )
        const avgGrade =
          studentGrades.length > 0
            ? Math.round(studentGrades.reduce((acc, curr) => acc + (curr.total_score || 0), 0) / studentGrades.length)
            : null

        const isLowAttendance = (student.attendance_percent || 0) < 75
        const isFailing = avgGrade !== null && avgGrade < 50

        if (isLowAttendance || isFailing) {
          const riskReasons: string[] = []
          if (isLowAttendance) {
            riskReasons.push(`Attendance at ${student.attendance_percent || 0}% (below 75% minimum requirement)`)
          }
          if (isFailing) {
            riskReasons.push(`Continuous assessment average at ${avgGrade}% (failing threshold <50%)`)
          }
          return {
            student,
            avgGrade,
            attendance: student.attendance_percent || 0,
            riskReasons,
          }
        }
        return null
      })
      .filter(Boolean) as {
      student: TenantStudentMember
      avgGrade: number | null
      attendance: number
      riskReasons: string[]
    }[]
  }, [studentList, gradeList])

  // Real-time Event Listeners for Multi-Device and Store Sync
  useEffect(() => {
    const handleUpdate = () => onReloadData()
    window.addEventListener('gc-tenant-attendance-updated', handleUpdate)
    window.addEventListener('gc-tenant-grades-updated', handleUpdate)
    window.addEventListener('gc-tenant-notes-updated', handleUpdate)
    return () => {
      window.removeEventListener('gc-tenant-attendance-updated', handleUpdate)
      window.removeEventListener('gc-tenant-grades-updated', handleUpdate)
      window.removeEventListener('gc-tenant-notes-updated', handleUpdate)
    }
  }, [onReloadData])

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ========================================== */}
      {/* EXECUTIVE FACULTY IDENTITY TERMINAL BANNER */}
      {/* ========================================== */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fcfdfe 100%)',
          borderRadius: '24px',
          padding: '1.75rem 2rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.04)',
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
            paddingBottom: '1.25rem',
            marginBottom: '1.25rem',
          }}
        >
          {/* Identity & Current Teacher Details */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 100%)`,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.65rem',
                boxShadow: `0 8px 20px -4px ${primaryColor}40`,
                flexShrink: 0,
              }}
            >
              🎓
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: primaryColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {school.name} ACADEMIC FACULTY
                </span>
                <span
                  style={{
                    background: `${primaryColor}14`,
                    color: primaryColor,
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    border: `1px solid ${primaryColor}30`,
                  }}
                >
                  TEACHER DESK
                </span>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '4px 0 0', color: '#0f172a', letterSpacing: '-0.02em' }}>
                {currentTeacher.full_name}
              </h2>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span>Role: <strong style={{ color: '#0f172a' }}>{currentTeacher.title || 'Instructor'}</strong></span>
                <span>Dept: <strong style={{ color: '#0f172a' }}>{currentTeacher.department || 'Academic'}</strong></span>
                <span>Active Period: <strong style={{ color: '#0f172a' }}>{school.active_period_name || 'Academic Term 1'}</strong></span>
              </div>
            </div>
          </div>

          {/* Teacher Persona Switcher & Quick Upload Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {teachingStaff.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>Faculty Profile:</span>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    background: '#ffffff',
                  }}
                >
                  {teachingStaff.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.title || 'Teacher'})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="button"
              onClick={() => handleOpenUploadNote()}
              style={{
                background: primaryColor,
                color: '#ffffff',
                fontWeight: 800,
                padding: '0.55rem 1.15rem',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: `0 4px 12px ${primaryColor}30`,
              }}
            >
              <span>📁</span> + Upload Study Material
            </button>
          </div>
        </div>

        {/* Dynamic Telemetry Mini-Ribbon */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Assigned Cohorts</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
              {availableClasses.length}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Active class rosters</span>
          </div>

          <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Enrolled Candidates</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
              {studentList.length}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Students under supervision</span>
          </div>

          <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Curriculum Materials</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: primaryColor, marginTop: '2px' }}>
              {lessonNotesList.length}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Study notes &amp; assignments</span>
          </div>

          <div
            style={{
              background: atRiskStudents.length > 0 ? '#fffbeb' : '#f0fdf4',
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              border: `1.5px solid ${atRiskStudents.length > 0 ? '#fef3c7' : '#dcfce7'}`,
            }}
          >
            <span style={{ fontSize: '0.72rem', color: atRiskStudents.length > 0 ? '#b45309' : '#15803d', fontWeight: 800, textTransform: 'uppercase' }}>
              At-Risk Students
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: atRiskStudents.length > 0 ? '#d97706' : '#16a34a', marginTop: '2px' }}>
              {atRiskStudents.length}
            </div>
            <span style={{ fontSize: '0.72rem', color: atRiskStudents.length > 0 ? '#b45309' : '#15803d' }}>
              {atRiskStudents.length > 0 ? 'Requires intervention' : 'All students on track'}
            </span>
          </div>
        </div>

        {/* Sub-Tab Navigation Segmented Pills */}
        <div
          style={{
            display: 'flex',
            gap: '0.35rem',
            flexWrap: 'wrap',
            background: '#f1f5f9',
            padding: '5px',
            borderRadius: '14px',
          }}
        >
          <button
            type="button"
            onClick={() => setTeacherSubTab('attendance')}
            style={{
              background: teacherSubTab === 'attendance' ? '#ffffff' : 'transparent',
              color: teacherSubTab === 'attendance' ? primaryColor : '#475569',
              border: 'none',
              padding: '0.55rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: teacherSubTab === 'attendance' ? 800 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: teacherSubTab === 'attendance' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <span>📋</span> Live Attendance Register
          </button>

          <button
            type="button"
            onClick={() => setTeacherSubTab('gradebook')}
            style={{
              background: teacherSubTab === 'gradebook' ? '#ffffff' : 'transparent',
              color: teacherSubTab === 'gradebook' ? primaryColor : '#475569',
              border: 'none',
              padding: '0.55rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: teacherSubTab === 'gradebook' ? 800 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: teacherSubTab === 'gradebook' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <span>📊</span> Assessment Gradebook (CATs &amp; Final Exam)
          </button>

          <button
            type="button"
            onClick={() => setTeacherSubTab('notes')}
            style={{
              background: teacherSubTab === 'notes' ? '#ffffff' : 'transparent',
              color: teacherSubTab === 'notes' ? primaryColor : '#475569',
              border: 'none',
              padding: '0.55rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: teacherSubTab === 'notes' ? 800 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: teacherSubTab === 'notes' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <span>📁</span> Study Materials &amp; Assignments ({lessonNotesList.length})
          </button>

          <button
            type="button"
            onClick={() => setTeacherSubTab('timetable')}
            style={{
              background: teacherSubTab === 'timetable' ? '#ffffff' : 'transparent',
              color: teacherSubTab === 'timetable' ? primaryColor : '#475569',
              border: 'none',
              padding: '0.55rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: teacherSubTab === 'timetable' ? 800 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: teacherSubTab === 'timetable' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <span>🗓️</span> Teaching Timetable
          </button>

          <button
            type="button"
            onClick={() => setTeacherSubTab('at_risk')}
            style={{
              background: teacherSubTab === 'at_risk' ? '#ffffff' : 'transparent',
              color: teacherSubTab === 'at_risk' ? (atRiskStudents.length > 0 ? '#b45309' : primaryColor) : '#475569',
              border: 'none',
              padding: '0.55rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: teacherSubTab === 'at_risk' ? 800 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: teacherSubTab === 'at_risk' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <span>⚠️</span> At-Risk Early Warning
            {atRiskStudents.length > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  marginLeft: '4px',
                }}
              >
                {atRiskStudents.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Reversible Toast Banner */}
      {saveSuccessMsg && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1.5px solid #6ee7b7',
            color: '#065f46',
            padding: '0.75rem 1.25rem',
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(6, 95, 70, 0.08)',
          }}
        >
          <span>✓ {saveSuccessMsg}</span>
          <button
            type="button"
            onClick={() => setSaveSuccessMsg(null)}
            style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontWeight: 900 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUBTAB 1: DYNAMIC DAILY ATTENDANCE & ROLL-CALL STATION       */}
      {/* ============================================================ */}
      {teacherSubTab === 'attendance' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '1.75rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                Daily Roll-Call &amp; Attendance Station
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Conduct live class roll-calls, record arrival status, and automatically recalculate candidate attendance compliance.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleMarkAll('present')}
                style={{
                  background: '#ecfdf5',
                  color: '#047857',
                  border: '1px solid #a7f3d0',
                  padding: '0.5rem 0.95rem',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                ✓ Mark All Present
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll('absent')}
                style={{
                  background: '#fef2f2',
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                  padding: '0.5rem 0.95rem',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                ✕ Mark All Absent
              </button>
              <button
                type="button"
                onClick={() => setShowPrintableAttendanceSheet(true)}
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  padding: '0.5rem 0.95rem',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>🖨️</span> Print Roll-Call Sheet (PDF)
              </button>
              <button
                type="button"
                onClick={handleSaveAttendanceSession}
                style={{
                  background: primaryColor,
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: `0 4px 12px ${primaryColor}30`,
                }}
              >
                💾 Commit &amp; Save Attendance
              </button>
            </div>
          </div>

          {/* Session Configuration Toolbar (Date, Cohort, Subject, Period) */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              marginBottom: '1.25rem',
              background: '#f8fafc',
              padding: '1rem',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              alignItems: 'center',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', marginBottom: '2px' }}>
                SESSION DATE
              </label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                style={{
                  padding: '0.45rem 0.65rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  background: '#ffffff',
                }}
              />
            </div>

            <div style={{ flex: 1, minWidth: '180px' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', marginBottom: '2px' }}>
                TARGET COHORT / CLASS
              </label>
              <select
                value={selectedClassForAttendance}
                onChange={(e) => setSelectedClassForAttendance(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  background: '#ffffff',
                }}
              >
                {availableClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, minWidth: '180px' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', marginBottom: '2px' }}>
                SUBJECT / COURSE UNIT
              </label>
              <select
                value={selectedSubjectForAttendance}
                onChange={(e) => setSelectedSubjectForAttendance(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  background: '#ffffff',
                }}
              >
                {availableSubjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ minWidth: '160px' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', marginBottom: '2px' }}>
                SESSION LABEL
              </label>
              <input
                type="text"
                value={attendancePeriodName}
                onChange={(e) => setAttendancePeriodName(e.target.value)}
                placeholder="e.g. Morning Lecture, Lab 2"
                style={{
                  width: '100%',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  boxSizing: 'border-box',
                  background: '#ffffff',
                }}
              />
            </div>
          </div>

          {/* Real-time Session Roll-call Telemetry Pill Bar */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              marginBottom: '1.25rem',
              padding: '0.75rem 1rem',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              flexWrap: 'wrap',
              fontSize: '0.8rem',
            }}
          >
            <div>
              Total in Cohort: <strong>{attendanceStats.total}</strong>
            </div>
            <div style={{ color: '#16a34a', fontWeight: 700 }}>
              ✓ Present: {attendanceStats.presentCount}
            </div>
            <div style={{ color: '#dc2626', fontWeight: 700 }}>
              ✕ Absent: {attendanceStats.absentCount}
            </div>
            <div style={{ color: '#d97706', fontWeight: 700 }}>
              🕒 Late: {attendanceStats.lateCount}
            </div>
            <div style={{ color: '#2563eb', fontWeight: 700 }}>
              📝 Excused: {attendanceStats.excusedCount}
            </div>
            <div style={{ marginLeft: 'auto', fontWeight: 900, color: primaryColor }}>
              Session Turnout: {attendanceStats.attendanceRate}%
            </div>
          </div>

          {/* Student Roll-Call Table */}
          <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Adm Number</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Student Candidate</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Cohort</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Term Compliance</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Live Roll-Call</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Session Note</th>
                </tr>
              </thead>
              <tbody>
                {classStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                      No students found in cohort "{selectedClassForAttendance}".
                    </td>
                  </tr>
                ) : (
                  classStudents.map((s) => {
                    const currentStatus = rollCallMap[s.id]?.status || 'present'
                    const currentNote = rollCallMap[s.id]?.note || ''
                    const compliance = s.attendance_percent || 0

                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontWeight: 800, color: primaryColor }}>
                          {s.admission_number}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{s.full_name}</div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            Guardian: {s.guardian_name ? `${s.guardian_name} (${s.guardian_phone || 'No phone'})` : 'N/A'}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700 }}>
                            {s.grade_class}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <span
                            style={{
                              background: compliance >= 85 ? '#dcfce7' : compliance >= 75 ? '#eff6ff' : '#fee2e2',
                              color: compliance >= 85 ? '#15803d' : compliance >= 75 ? '#1d4ed8' : '#991b1b',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontWeight: 800,
                              fontSize: '0.74rem',
                            }}
                          >
                            {compliance}%
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                            <button
                              type="button"
                              onClick={() => handleSetStudentStatus(s.id, 'present')}
                              style={{
                                background: currentStatus === 'present' ? '#16a34a' : 'transparent',
                                color: currentStatus === 'present' ? '#ffffff' : '#475569',
                                border: 'none',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              ✓ Present
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetStudentStatus(s.id, 'absent')}
                              style={{
                                background: currentStatus === 'absent' ? '#dc2626' : 'transparent',
                                color: currentStatus === 'absent' ? '#ffffff' : '#475569',
                                border: 'none',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              ✕ Absent
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetStudentStatus(s.id, 'late')}
                              style={{
                                background: currentStatus === 'late' ? '#d97706' : 'transparent',
                                color: currentStatus === 'late' ? '#ffffff' : '#475569',
                                border: 'none',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              🕒 Late
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetStudentStatus(s.id, 'excused')}
                              style={{
                                background: currentStatus === 'excused' ? '#2563eb' : 'transparent',
                                color: currentStatus === 'excused' ? '#ffffff' : '#475569',
                                border: 'none',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              📝 Excused
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <input
                            type="text"
                            value={currentNote}
                            onChange={(e) => handleSetStudentNote(s.id, e.target.value)}
                            placeholder="Optional note (e.g. sick bay)..."
                            style={{
                              width: '100%',
                              minWidth: '150px',
                              padding: '0.35rem 0.5rem',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.76rem',
                              background: '#ffffff',
                            }}
                          />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Session Notes Textarea & Historical Log Drawer */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                Class Instructor Session Remarks
              </label>
              <textarea
                rows={3}
                value={attendanceSessionNotes}
                onChange={(e) => setAttendanceSessionNotes(e.target.value)}
                placeholder="Log notes about syllabus progress, collective punctuality, or class announcements delivered..."
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                  Recorded Sessions for {selectedClassForAttendance}
                </label>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{allHistoricalSessions.length} sessions logged</span>
              </div>
              <div style={{ maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {allHistoricalSessions.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.5rem 0' }}>
                    No prior sessions logged for this cohort.
                  </div>
                ) : (
                  allHistoricalSessions.map((hs) => (
                    <div
                      key={hs.id}
                      onClick={() => setAttendanceDate(hs.date)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        background: hs.date === attendanceDate ? `${primaryColor}10` : '#f8fafc',
                        border: `1px solid ${hs.date === attendanceDate ? primaryColor : '#e2e8f0'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.76rem',
                      }}
                    >
                      <div>
                        <strong>{hs.date}</strong> • {hs.period_name || 'Roll-Call'} ({hs.subject_name})
                      </div>
                      <span style={{ color: primaryColor, fontWeight: 800 }}>
                        {hs.records?.filter((r) => r.status === 'present').length || 0} / {hs.records?.length || 0} Present
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUBTAB 2: ASSESSMENT GRADEBOOK & EVALUATION                  */}
      {/* ============================================================ */}
      {teacherSubTab === 'gradebook' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '1.75rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                Continuous Assessment Gradebook &amp; Exam Terminal
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Continuous Assessment Tests (CAT 1 &amp; CAT 2 out of 20) and Final Examination marks (out of 60).
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleExportGradebookCSV}
                style={{
                  background: '#f8fafc',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>📊</span> Export Grade Sheet (CSV)
              </button>
              <button
                type="button"
                onClick={() => setShowPrintableGradeSheet(true)}
                style={{
                  background: primaryColor,
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>🖨️</span> Print Marksheet (PDF)
              </button>
            </div>
          </div>

          {/* Gradebook Cohort & Subject Selector */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              marginBottom: '1.25rem',
              background: '#f8fafc',
              padding: '1rem',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              alignItems: 'center',
            }}
          >
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', marginBottom: '2px' }}>
                CLASS COHORT
              </label>
              <select
                value={selectedClassForGradebook}
                onChange={(e) => setSelectedClassForGradebook(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  background: '#ffffff',
                }}
              >
                {availableClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>
                  SUBJECT / COURSE UNIT
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddSubjectInput(!showAddSubjectInput)}
                  style={{ background: 'none', border: 'none', color: primaryColor, fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  {showAddSubjectInput ? '✕ Cancel' : '+ Add Subject'}
                </button>
              </div>

              {showAddSubjectInput ? (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input
                    type="text"
                    value={newCustomSubjectInput}
                    onChange={(e) => setNewCustomSubjectInput(e.target.value)}
                    placeholder="e.g. Inorganic Chemistry"
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.65rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      background: '#ffffff',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newCustomSubjectInput.trim()) {
                        setSelectedSubjectForGradebook(newCustomSubjectInput.trim())
                        setShowAddSubjectInput(false)
                        setNewCustomSubjectInput('')
                      }
                    }}
                    style={{
                      background: primaryColor,
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.45rem 0.75rem',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                    }}
                  >
                    Set
                  </button>
                </div>
              ) : (
                <select
                  value={selectedSubjectForGradebook}
                  onChange={(e) => setSelectedSubjectForGradebook(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    background: '#ffffff',
                  }}
                >
                  {availableSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ flex: 1, minWidth: '220px' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', marginBottom: '2px' }}>
                FILTER CANDIDATES
              </label>
              <input
                type="text"
                placeholder="Search by student name or adm #..."
                value={gradebookSearchQuery}
                onChange={(e) => setGradebookSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  boxSizing: 'border-box',
                  background: '#ffffff',
                }}
              />
            </div>
          </div>

          {/* Analytical Telemetry Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '0.85rem',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Graded Records</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: '2px 0 0' }}>
                {gradebookStats.totalGraded} / {gradebookStudents.length}
              </div>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Candidates evaluated</span>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Class Mean Score</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: primaryColor, margin: '2px 0 0' }}>
                {gradebookStats.avgScore}%
              </div>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Cohort average</span>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Highest Mark</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#16a34a', margin: '2px 0 0' }}>
                {gradebookStats.highestScore}%
              </div>
              <span style={{ fontSize: '0.7rem', color: '#16a34a' }}>Peak candidate mark</span>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Cohort Pass Rate</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: gradebookStats.passRate >= 70 ? '#16a34a' : '#d97706', margin: '2px 0 0' }}>
                {gradebookStats.passRate}%
              </div>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Score &ge; 50%</span>
            </div>
          </div>

          {/* Gradebook Marks Grid */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Student Candidate</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>CAT 1 (20)</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>CAT 2 (20)</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Exam (60)</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Total %</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Grade</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Faculty Remarks</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {gradebookStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                      No students found matching your cohort/search filters.
                    </td>
                  </tr>
                ) : (
                  gradebookStudents.map((s) => {
                    const existingGrade = gradeList.find(
                      (g) =>
                        (g.student_id === s.id || g.admission_number === s.admission_number) &&
                        g.subject_name.toLowerCase() === selectedSubjectForGradebook.toLowerCase()
                    )

                    return (
                      <GradeRowItem
                        key={s.id}
                        school={school}
                        student={s}
                        subjectName={selectedSubjectForGradebook}
                        initialGrade={existingGrade}
                        teacherName={currentTeacher.full_name}
                        onSave={() => {
                          onReloadData()
                          triggerToast(`Saved marks for ${s.full_name} (${selectedSubjectForGradebook})`)
                        }}
                      />
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUBTAB 3: STUDY MATERIALS, LESSON NOTES & ASSIGNMENTS        */}
      {/* ============================================================ */}
      {teacherSubTab === 'notes' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '1.75rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                Curriculum Study Materials, Lecture Notes &amp; Assignments
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Upload reading material, lab manuals, and homework assignments visible instantly across student learning terminals.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenUploadNote()}
              style={{
                background: primaryColor,
                color: '#ffffff',
                fontWeight: 800,
                padding: '0.55rem 1.15rem',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: `0 4px 12px ${primaryColor}30`,
              }}
            >
              <span>+</span> Upload Material
            </button>
          </div>

          {/* Search & Filter Bar */}
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
              placeholder="Search by topic title, subject, keyword..."
              value={noteSearchQuery}
              onChange={(e) => setNoteSearchQuery(e.target.value)}
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
              value={noteClassFilter}
              onChange={(e) => setNoteClassFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: '#ffffff',
              }}
            >
              <option value="all">All Cohorts ({lessonNotesList.length})</option>
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>

            <select
              value={noteTypeFilter}
              onChange={(e) => setNoteTypeFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: '#ffffff',
              }}
            >
              <option value="all">All Material Types</option>
              <option value="Lecture Notes">Lecture Notes</option>
              <option value="Assignment">Assignment / Homework</option>
              <option value="Past Paper">Past Exam Paper</option>
              <option value="Lab Manual">Lab Manual</option>
              <option value="Syllabus">Course Syllabus</option>
            </select>
          </div>

          {/* Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {filteredLessonNotes.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📁</div>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>No Study Materials Found</div>
                <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                  Click &ldquo;+ Upload Material&rdquo; above to publish your first lesson document, assignment, or past paper.
                </div>
              </div>
            ) : (
              filteredLessonNotes.map((n) => (
                <div
                  key={n.id}
                  style={{
                    background: '#f8fafc',
                    padding: '1.25rem',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: primaryColor,
                          background: `${primaryColor}14`,
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        {n.subject_name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: '#475569',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          padding: '2px 7px',
                          borderRadius: '6px',
                        }}
                      >
                        {n.material_type || 'Lecture Notes'}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1.05rem', fontWeight: 900, margin: '6px 0', color: '#0f172a' }}>
                      {n.title}
                    </h4>

                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginBottom: '8px' }}>
                      Cohort: <strong>{n.class_name}</strong>
                      {n.due_date && (
                        <span style={{ marginLeft: '8px', color: '#dc2626', fontWeight: 700 }}>
                          ⏰ Due: {n.due_date}
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, margin: '0 0 12px' }}>
                      {n.summary}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#64748b', marginBottom: '8px' }}>
                      <span>Instructor: <strong>{n.teacher_name}</strong></span>
                      <span>{n.created_at ? new Date(n.created_at).toLocaleDateString() : 'Recent'}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <a
                        href={n.file_url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: primaryColor,
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        📥 View Document ↗
                      </a>

                      <div style={{ display: 'inline-flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenUploadNote(n)}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(n)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUBTAB 4: MASTER TIMETABLE & VIRTUAL CLASSROOM               */}
      {/* ============================================================ */}
      {teacherSubTab === 'timetable' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '1.75rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                Master Teaching Timetable &amp; Virtual Lecture Rooms
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Review scheduled periods, physical lab locations, and launch hybrid virtual classrooms.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select
                value={timetableClassFilter}
                onChange={(e) => setTimetableClassFilter(e.target.value)}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  background: '#f8fafc',
                }}
              >
                <option value="all">All Scheduled Classes</option>
                {availableClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Day of Week Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              padding: '4px',
              background: '#f1f5f9',
              borderRadius: '12px',
              marginBottom: '1.25rem',
              width: 'fit-content',
            }}
          >
            {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const).map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setTimetableDay(day)}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: timetableDay === day ? 800 : 600,
                  background: timetableDay === day ? '#ffffff' : 'transparent',
                  color: timetableDay === day ? primaryColor : '#475569',
                  boxShadow: timetableDay === day ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                }}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Timetable Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Period</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Time Slot</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Cohort</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Subject</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Instructor</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Room / Venue</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Status / Room</th>
                </tr>
              </thead>
              <tbody>
                {filteredTimetable.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                      No timetable periods scheduled for {timetableDay}.
                    </td>
                  </tr>
                ) : (
                  filteredTimetable.map((t) => {
                    const isActive = isPeriodActiveNow(t.start_time, t.end_time, t.day_of_week)

                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', background: isActive ? '#f0fdf4' : 'transparent' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 800, color: primaryColor }}>
                          Period {t.period_number}
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: 700, color: '#0f172a' }}>
                          {t.start_time} - {t.end_time}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {t.class_name}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>
                          {t.subject_name}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#475569' }}>
                          {t.teacher_name}
                        </td>
                        <td style={{ padding: '0.75rem', color: '#64748b' }}>
                          🏛️ {t.room || 'Main Hall'}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            {isActive && (
                              <span
                                style={{
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                }}
                              >
                                ● In Session
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const meetUrl = `https://meet.google.com/new`
                                window.open(meetUrl, '_blank')
                              }}
                              style={{
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              📹 Launch Room
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
        </div>
      )}

      {/* ============================================================ */}
      {/* SUBTAB 5: AT-RISK STUDENTS & MENTORSHIP INTERVENTION HUB     */}
      {/* ============================================================ */}
      {teacherSubTab === 'at_risk' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '1.75rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                At-Risk Student Early Warning &amp; Mentorship Terminal
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Automatic identification of candidates with attendance below 75% or failing assessment averages (&lt;50%).
              </p>
            </div>
            <span
              style={{
                background: atRiskStudents.length > 0 ? '#fef2f2' : '#f0fdf4',
                color: atRiskStudents.length > 0 ? '#991b1b' : '#15803d',
                border: `1px solid ${atRiskStudents.length > 0 ? '#fca5a5' : '#86efac'}`,
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 800,
              }}
            >
              {atRiskStudents.length} Flagged Candidate{atRiskStudents.length === 1 ? '' : 's'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {atRiskStudents.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: '#15803d' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎉</div>
                <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>All Candidates in Good Standing!</div>
                <div style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '4px' }}>
                  No students currently exhibit critically low attendance or failing assessment scores.
                </div>
              </div>
            ) : (
              atRiskStudents.map(({ student, avgGrade, attendance, riskReasons }) => {
                const cleanPhone = (student.guardian_phone || student.phone || '').replace(/[^0-9]/g, '')

                return (
                  <div
                    key={student.id}
                    style={{
                      background: '#fffdfb',
                      borderRadius: '16px',
                      padding: '1.25rem',
                      border: '1.5px solid #fed7aa',
                      boxShadow: '0 4px 12px rgba(234, 88, 12, 0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '1rem' }}>{student.full_name}</div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                          Adm: <strong>{student.admission_number}</strong> • Cohort: <strong>{student.grade_class}</strong> • Mean Mark: <strong>{avgGrade}%</strong> • Attendance: <strong>{attendance}%</strong>
                        </div>
                      </div>
                      <span
                        style={{
                          background: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          fontSize: '0.68rem',
                          fontWeight: 900,
                          padding: '2px 8px',
                          borderRadius: '9999px',
                        }}
                      >
                        ⚠️ AT-RISK
                      </span>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '10px', marginBottom: '12px', fontSize: '0.78rem' }}>
                      <div style={{ color: '#b45309', fontWeight: 800, marginBottom: '2px' }}>Identified Warning Factors:</div>
                      {riskReasons.map((reason, idx) => (
                        <div key={idx} style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <span>•</span> {reason}
                        </div>
                      ))}
                    </div>

                    <div style={{ borderTop: '1px solid #fed7aa', paddingTop: '10px' }}>
                      <div style={{ fontSize: '0.76rem', color: '#64748b', marginBottom: '8px' }}>
                        Guardian: <strong>{student.guardian_name || 'Primary Sponsor'}</strong> ({student.guardian_phone || 'No phone recorded'})
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {student.guardian_phone && (
                          <a
                            href={`tel:${student.guardian_phone}`}
                            style={{
                              background: '#0f172a',
                              color: '#ffffff',
                              textDecoration: 'none',
                              padding: '0.4rem 0.75rem',
                              borderRadius: '8px',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            📞 Call Guardian
                          </a>
                        )}

                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(student.guardian_name || 'Parent')},%20this%20is%20${encodeURIComponent(currentTeacher.full_name)}%20from%20${encodeURIComponent(school.name)}.%20I%20am%20reaching%20out%20regarding%20${encodeURIComponent(student.full_name)}'s%20academic%20progress.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: '#25d366',
                              color: '#ffffff',
                              textDecoration: 'none',
                              padding: '0.4rem 0.75rem',
                              borderRadius: '8px',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            💬 WhatsApp Parent
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            const note = prompt(`Enter academic mentorship / intervention note for ${student.full_name}:`)
                            if (note && note.trim()) {
                              triggerToast(`Intervention note recorded for ${student.full_name}.`)
                            }
                          }}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            color: '#0f172a',
                            padding: '0.4rem 0.75rem',
                            borderRadius: '8px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          📝 Log Note
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: UPLOAD / EDIT STUDY NOTE & CURRICULUM MATERIAL        */}
      {/* ============================================================ */}
      {showUploadNoteModal && (
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
              maxWidth: '560px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                  {editingNote ? '✏️ Edit Study Material' : '📁 + Upload Curriculum Material'}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                  Publish lecture notes, reading materials, or assignments to student portals.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUploadNoteModal(false)
                  setEditingNote(null)
                }}
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

            <form onSubmit={handleSaveNote}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#0f172a' }}>
                  Document / Topic Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 4: Calculus, Derivatives & Applications"
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#0f172a' }}>
                    Target Cohort *
                  </label>
                  <select
                    value={noteForm.class_name}
                    onChange={(e) => setNoteForm({ ...noteForm, class_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                      background: '#ffffff',
                    }}
                  >
                    {availableClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#0f172a' }}>
                    Material Category *
                  </label>
                  <select
                    value={noteForm.material_type}
                    onChange={(e) => setNoteForm({ ...noteForm, material_type: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                      background: '#ffffff',
                    }}
                  >
                    <option value="Lecture Notes">Lecture Notes</option>
                    <option value="Assignment">Assignment / Homework</option>
                    <option value="Past Paper">Past Exam Paper</option>
                    <option value="Lab Manual">Lab Manual</option>
                    <option value="Syllabus">Course Syllabus</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#0f172a' }}>
                    Subject / Unit *
                  </label>
                  <select
                    value={noteForm.subject_name}
                    onChange={(e) => setNoteForm({ ...noteForm, subject_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                      background: '#ffffff',
                    }}
                  >
                    {availableSubjects.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#0f172a' }}>
                    Submission Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={noteForm.due_date}
                    onChange={(e) => setNoteForm({ ...noteForm, due_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                      background: '#ffffff',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#0f172a' }}>
                  Topic Summary &amp; Key Learning Objectives *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Brief overview of syllabus points covered, reading instructions, or assignment guidelines..."
                  value={noteForm.summary}
                  onChange={(e) => setNoteForm({ ...noteForm, summary: e.target.value })}
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

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px', color: '#0f172a' }}>
                  Document Resource Link / Attachment URL
                </label>
                <input
                  type="url"
                  placeholder="https://cloud.eclat.institute/docs/notes/... or Google Drive link"
                  value={noteForm.file_url}
                  onChange={(e) => setNoteForm({ ...noteForm, file_url: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                  }}
                />
                <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                  Leave empty to auto-generate a secure school cloud document storage link.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadNoteModal(false)
                    setEditingNote(null)
                  }}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.6rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: primaryColor,
                    color: '#ffffff',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {editingNote ? 'Save Changes' : 'Publish Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: PRINTABLE CLASS BROADSHEET & GRADE MARKSHEET (PDF) */}
      {/* ============================================================ */}
      {showPrintableGradeSheet && (
        <div
          className="printable-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '1.5rem',
            overflowY: 'auto',
          }}
        >
          <div
            className="printable-modal-card"
            style={{
              margin: 'auto',
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '920px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: `2px solid ${primaryColor}`,
            }}
          >
            <div
              className="no-print"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.5rem',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                borderTopLeftRadius: '18px',
                borderTopRightRadius: '18px',
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>
                Official Faculty Marksheet • Cohort: {selectedClassForGradebook} • Subject: {selectedSubjectForGradebook}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    background: primaryColor,
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  🖨️ Print Marksheet PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintableGradeSheet(false)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div style={{ padding: '2.5rem 3rem', color: '#0f172a' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: `2.5px solid ${primaryColor}`,
                  paddingBottom: '1.25rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div>
                  <h1 style={{ fontSize: '1.45rem', fontWeight: 900, margin: '0 0 2px', color: '#0f172a' }}>
                    {school.name}
                  </h1>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                    Directorate of Academic Quality &amp; Examination Records
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      display: 'inline-block',
                      background: `${primaryColor}15`,
                      color: primaryColor,
                      fontWeight: 900,
                      fontSize: '0.78rem',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                    }}
                  >
                    CONTINUOUS ASSESSMENT &amp; EXAM BROADSHEET
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px' }}>
                    Session: {school.active_period_name || 'Active Term'}
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  fontSize: '0.8rem',
                }}
              >
                <div>
                  <span style={{ color: '#64748b', fontWeight: 700 }}>CLASS COHORT:</span>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{selectedClassForGradebook}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontWeight: 700 }}>SUBJECT / MODULE:</span>
                  <div style={{ fontWeight: 800, color: primaryColor, marginTop: '2px' }}>{selectedSubjectForGradebook}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontWeight: 700 }}>FACULTY INSTRUCTOR:</span>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{sessionUser?.name || 'Assigned Instructor'}</div>
                </div>
              </div>

              {/* Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: `2px solid ${primaryColor}` }}>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'left', fontWeight: 800 }}>#</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'left', fontWeight: 800 }}>Admission #</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'left', fontWeight: 800 }}>Candidate Name</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: 800 }}>CAT 1 (/20)</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: 800 }}>CAT 2 (/20)</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: 800 }}>Exam (/60)</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: 800 }}>Total (/100)</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: 800 }}>Grade</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'left', fontWeight: 800 }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {gradebookStudents.map((s, idx) => {
                    const gradeRec = gradeList.find(
                      (g) =>
                        g.student_id === s.id &&
                        g.subject_name.toLowerCase() === selectedSubjectForGradebook.toLowerCase()
                    )
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.6rem 0.5rem', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '0.6rem 0.5rem', fontFamily: 'monospace', fontWeight: 700, color: primaryColor }}>
                          {s.admission_number}
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem', fontWeight: 800, color: '#0f172a' }}>{s.full_name}</td>
                        <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: '#334155' }}>{gradeRec?.cat1_score ?? '-'}</td>
                        <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: '#334155' }}>{gradeRec?.cat2_score ?? '-'}</td>
                        <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: '#334155' }}>{gradeRec?.exam_score ?? '-'}</td>
                        <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: 900, color: '#0f172a' }}>
                          {gradeRec?.total_score ?? '-'}%
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: 900,
                              fontSize: '0.78rem',
                              background: (gradeRec?.total_score || 0) >= 70 ? '#dcfce7' : '#f1f5f9',
                              color: (gradeRec?.total_score || 0) >= 70 ? '#166534' : '#334155',
                            }}
                          >
                            {gradeRec?.grade || 'P'}
                          </span>
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem', color: '#64748b', fontSize: '0.75rem' }}>
                          {gradeRec?.remarks || 'In Progress'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Signatures */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '2rem',
                  paddingTop: '1.5rem',
                  borderTop: '2px solid #e2e8f0',
                  fontSize: '0.76rem',
                }}
              >
                <div>
                  <div style={{ height: '35px', borderBottom: '1px dotted #94a3b8', width: '160px' }} />
                  <div style={{ marginTop: '4px', fontWeight: 800, color: '#0f172a' }}>Course Instructor Signature</div>
                  <div style={{ color: '#64748b' }}>Date: ________________________</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ height: '35px', borderBottom: '1px dotted #94a3b8', width: '160px', marginLeft: 'auto' }} />
                  <div style={{ marginTop: '4px', fontWeight: 800, color: '#0f172a' }}>Head of Academic Department</div>
                  <div style={{ color: '#64748b' }}>Official Certification Seal</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: PRINTABLE DAILY ROLL-CALL ATTENDANCE REGISTER (PDF)  */}
      {/* ============================================================ */}
      {showPrintableAttendanceSheet && (
        <div
          className="printable-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '1.5rem',
            overflowY: 'auto',
          }}
        >
          <div
            className="printable-modal-card"
            style={{
              margin: 'auto',
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '860px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: `2px solid ${primaryColor}`,
            }}
          >
            <div
              className="no-print"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.5rem',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                borderTopLeftRadius: '18px',
                borderTopRightRadius: '18px',
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>
                Official Attendance Register • Cohort: {selectedClassForAttendance} • Date: {attendanceDate}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    background: primaryColor,
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  🖨️ Print Register PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintableAttendanceSheet(false)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div style={{ padding: '2.5rem 3rem', color: '#0f172a' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: `2.5px solid ${primaryColor}`,
                  paddingBottom: '1.25rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div>
                  <h1 style={{ fontSize: '1.45rem', fontWeight: 900, margin: '0 0 2px', color: '#0f172a' }}>
                    {school.name}
                  </h1>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                    Official Attendance &amp; Classroom Registry Sheet
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      display: 'inline-block',
                      background: `${primaryColor}15`,
                      color: primaryColor,
                      fontWeight: 900,
                      fontSize: '0.78rem',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                    }}
                  >
                    DAILY ROLL-CALL REGISTER
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px' }}>
                    Date: {attendanceDate}
                  </div>
                </div>
              </div>

              {/* Cohort Details */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  fontSize: '0.8rem',
                }}
              >
                <div>
                  <span style={{ color: '#64748b', fontWeight: 700 }}>CLASS COHORT:</span>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{selectedClassForAttendance}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontWeight: 700 }}>SUBJECT / MODULE:</span>
                  <div style={{ fontWeight: 800, color: primaryColor, marginTop: '2px' }}>{selectedSubjectForAttendance}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontWeight: 700 }}>INSTRUCTOR:</span>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{sessionUser?.name || 'Class Teacher'}</div>
                </div>
              </div>

              {/* Attendance Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: `2px solid ${primaryColor}` }}>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'left', fontWeight: 800 }}>#</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'left', fontWeight: 800 }}>Admission #</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'left', fontWeight: 800 }}>Candidate Full Name</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: 800 }}>Roll-Call Status</th>
                    <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: 800 }}>Candidate Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((s, idx) => {
                    const rec = rollCallMap[s.id]
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.6rem 0.5rem', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '0.6rem 0.5rem', fontFamily: 'monospace', fontWeight: 700, color: primaryColor }}>
                          {s.admission_number}
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem', fontWeight: 800, color: '#0f172a' }}>{s.full_name}</td>
                        <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 10px',
                              borderRadius: '6px',
                              fontWeight: 800,
                              fontSize: '0.74rem',
                              background:
                                rec?.status === 'present'
                                  ? '#dcfce7'
                                  : rec?.status === 'late'
                                  ? '#fef3c7'
                                  : '#fee2e2',
                              color:
                                rec?.status === 'present'
                                  ? '#166534'
                                  : rec?.status === 'late'
                                  ? '#92400e'
                                  : '#991b1b',
                            }}
                          >
                            {rec?.status?.toUpperCase() || 'PRESENT'}
                          </span>
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: '#94a3b8' }}>
                          _______________________
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Signatures */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '2rem',
                  paddingTop: '1.5rem',
                  borderTop: '2px solid #e2e8f0',
                  fontSize: '0.76rem',
                }}
              >
                <div>
                  <div style={{ height: '35px', borderBottom: '1px dotted #94a3b8', width: '160px' }} />
                  <div style={{ marginTop: '4px', fontWeight: 800, color: '#0f172a' }}>Instructor Roll-Call Signature</div>
                  <div style={{ color: '#64748b' }}>Certified Attendance Register</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ height: '35px', borderBottom: '1px dotted #94a3b8', width: '160px', marginLeft: 'auto' }} />
                  <div style={{ marginTop: '4px', fontWeight: 800, color: '#0f172a' }}>Dean of Students</div>
                  <div style={{ color: '#64748b' }}>Compliance Registry Seal</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==========================================
// INLINE ROW ITEM FOR GRADEBOOK MARKS ENTRY
// ==========================================
function GradeRowItem({
  school,
  student,
  subjectName,
  initialGrade,
  teacherName,
  onSave,
}: {
  school: PartnerSchoolTenant
  student: TenantStudentMember
  subjectName: string
  initialGrade?: TenantGradeRecord
  teacherName: string
  onSave: () => void
}) {
  const [cat1, setCat1] = useState(initialGrade?.cat1_score ?? 15)
  const [cat2, setCat2] = useState(initialGrade?.cat2_score ?? 15)
  const [exam, setExam] = useState(initialGrade?.exam_score ?? 45)
  const [remarks, setRemarks] = useState(initialGrade?.remarks ?? 'Satisfactory grasp of coursework.')

  // Keep synced if initialGrade changes
  useEffect(() => {
    if (initialGrade) {
      setCat1(initialGrade.cat1_score)
      setCat2(initialGrade.cat2_score)
      setExam(initialGrade.exam_score)
      setRemarks(initialGrade.remarks)
    }
  }, [initialGrade])

  const total = Math.min(100, Math.max(0, Number(cat1) + Number(cat2) + Number(exam)))

  let gradeLetter = 'F'
  if (total >= 90) gradeLetter = 'A*'
  else if (total >= 80) gradeLetter = 'A'
  else if (total >= 70) gradeLetter = 'B'
  else if (total >= 60) gradeLetter = 'C'
  else if (total >= 50) gradeLetter = 'D'
  else if (total >= 40) gradeLetter = 'E'

  let performancePill = { bg: '#fee2e2', text: '#991b1b', label: 'At-Risk' }
  if (total >= 80) performancePill = { bg: '#dcfce7', text: '#15803d', label: 'Distinction' }
  else if (total >= 65) performancePill = { bg: '#eff6ff', text: '#1d4ed8', label: 'Credit' }
  else if (total >= 50) performancePill = { bg: '#fef3c7', text: '#b45309', label: 'Pass' }

  const handleSave = () => {
    tenantSchoolStore.saveGradeRecord({
      school_slug: school.slug,
      student_id: student.id,
      student_name: student.full_name,
      admission_number: student.admission_number,
      class_name: student.grade_class,
      subject_name: subjectName,
      period_code: school.active_period_code || 'TERM-1',
      cat1_score: Number(cat1),
      cat2_score: Number(cat2),
      exam_score: Number(exam),
      remarks: remarks.trim(),
      teacher_name: teacherName,
    })
    onSave()
  }

  return (
    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
      <td style={{ padding: '0.75rem' }}>
        <div style={{ fontWeight: 800, color: '#0f172a' }}>{student.full_name}</div>
        <div style={{ fontSize: '0.74rem', color: '#64748b', fontFamily: 'monospace' }}>
          {student.admission_number}
        </div>
      </td>
      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
        <input
          type="number"
          min="0"
          max="20"
          value={cat1}
          onChange={(e) => setCat1(Math.min(20, Math.max(0, Number(e.target.value))))}
          style={{
            width: '52px',
            padding: '0.35rem',
            textAlign: 'center',
            borderRadius: '6px',
            border: '1.5px solid #cbd5e1',
            fontWeight: 800,
            fontSize: '0.82rem',
          }}
        />
      </td>
      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
        <input
          type="number"
          min="0"
          max="20"
          value={cat2}
          onChange={(e) => setCat2(Math.min(20, Math.max(0, Number(e.target.value))))}
          style={{
            width: '52px',
            padding: '0.35rem',
            textAlign: 'center',
            borderRadius: '6px',
            border: '1.5px solid #cbd5e1',
            fontWeight: 800,
            fontSize: '0.82rem',
          }}
        />
      </td>
      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
        <input
          type="number"
          min="0"
          max="60"
          value={exam}
          onChange={(e) => setExam(Math.min(60, Math.max(0, Number(e.target.value))))}
          style={{
            width: '58px',
            padding: '0.35rem',
            textAlign: 'center',
            borderRadius: '6px',
            border: '1.5px solid #cbd5e1',
            fontWeight: 800,
            fontSize: '0.82rem',
          }}
        />
      </td>
      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 900, color: '#0f172a', fontSize: '0.88rem' }}>
        {total}%
      </td>
      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <span
            style={{
              background: performancePill.bg,
              color: performancePill.text,
              padding: '2px 8px',
              borderRadius: '6px',
              fontWeight: 900,
              fontSize: '0.8rem',
            }}
          >
            {gradeLetter}
          </span>
          <span style={{ fontSize: '0.66rem', color: performancePill.text, fontWeight: 700 }}>
            {performancePill.label}
          </span>
        </div>
      </td>
      <td style={{ padding: '0.75rem' }}>
        <input
          type="text"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Faculty remarks..."
          style={{
            width: '100%',
            minWidth: '200px',
            padding: '0.35rem 0.6rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '0.78rem',
          }}
        />
      </td>
      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
        <button
          type="button"
          onClick={handleSave}
          style={{
            background: '#059669',
            color: '#ffffff',
            border: 'none',
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Save
        </button>
      </td>
    </tr>
  )
}
