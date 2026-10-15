import React, { useState } from 'react'
import type {
  PartnerSchoolTenant,
  TenantStudentMember,
  TenantGradeRecord,
  TenantLessonNote,
} from '@/types/tenantSchool'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'

interface TenantTeacherDeskProps {
  school: PartnerSchoolTenant
  studentList: TenantStudentMember[]
  gradeList: TenantGradeRecord[]
  lessonNotesList: TenantLessonNote[]
  onReloadData: () => void
}

export function TenantTeacherDesk({
  school,
  studentList,
  gradeList,
  lessonNotesList,
  onReloadData,
}: TenantTeacherDeskProps) {
  const primaryColor = school.primary_color || '#881337'

  const [teacherSubTab, setTeacherSubTab] = useState<'attendance' | 'gradebook' | 'notes' | 'timetable'>('attendance')

  // Filters
  const [selectedClassForAttendance, setSelectedClassForAttendance] = useState('Grade 10 Senior')
  const [selectedClassForGradebook, setSelectedClassForGradebook] = useState('Grade 10 Senior')
  const [selectedSubjectForGradebook, setSelectedSubjectForGradebook] = useState('Pure Mathematics (MATH-101)')

  // Modals & Forms
  const [showUploadNoteModal, setShowUploadNoteModal] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null)

  const [newNoteInput, setNewNoteInput] = useState({
    class_name: 'Grade 10 Senior',
    subject_name: 'Pure Mathematics (MATH-101)',
    title: '',
    summary: '',
      file_url: 'https://cloud.eclat.institute/docs/notes/study-guide.pdf',
  })

  // Students in selected attendance class
  const classStudents = studentList.filter(
    (s) => !selectedClassForAttendance || s.grade_class.toLowerCase() === selectedClassForAttendance.toLowerCase()
  )

  // Teacher's Timetable
  const teacherTimetable = tenantSchoolStore.getTimetableBySchool(school.slug, selectedClassForAttendance)

  // Handle Mark All Present
  const handleMarkAllPresent = () => {
    classStudents.forEach((s) => {
      const updated = Math.min(100, +(s.attendance_percent + 0.2).toFixed(1))
      tenantSchoolStore.updateStudent(s.id, { attendance_percent: updated })
    })
    onReloadData()
    setSaveSuccessMsg(`Marked all ${classStudents.length} students in ${selectedClassForAttendance} as Present!`)
    setTimeout(() => setSaveSuccessMsg(null), 3000)
  }

  // Handle Upload Note
  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNoteInput.title.trim()) return

    tenantSchoolStore.createLessonNote({
      school_slug: school.slug,
      class_name: newNoteInput.class_name,
      subject_name: newNoteInput.subject_name,
      title: newNoteInput.title,
      summary: newNoteInput.summary,
      file_url: newNoteInput.file_url,
      teacher_name: 'Senior Faculty Instructor',
    })

    setShowUploadNoteModal(false)
    setNewNoteInput({
      class_name: 'Grade 10 Senior',
      subject_name: 'Pure Mathematics (MATH-101)',
      title: '',
      summary: '',
        file_url: 'https://cloud.eclat.institute/docs/notes/study-guide.pdf',
    })
    onReloadData()
    setSaveSuccessMsg('Published study notes to student learning portal!')
    setTimeout(() => setSaveSuccessMsg(null), 3000)
  }

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
      {/* Top Banner & Executive Title */}
      <div
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #fcfdfe 100%)',
          borderRadius: '24px',
          padding: '2rem 2.25rem',
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
            paddingBottom: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #059669 0%, #0f172a 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.65rem',
                boxShadow: '0 8px 20px -4px rgba(5, 150, 105, 0.35)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                flexShrink: 0,
              }}
            >
              🎓
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {school.name} ACADEMIC FACULTY
                </span>
                <span
                  style={{
                    background: '#d1fae5',
                    color: '#065f46',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    border: '1px solid #a7f3d0',
                  }}
                >
                  TEACHER DESK
                </span>
              </div>
              <h2 style={{ fontSize: '1.65rem', fontWeight: 900, margin: '4px 0 0', color: '#0f172a', letterSpacing: '-0.02em' }}>
                Teacher &amp; Academic Records Terminal
              </h2>
              <div style={{ fontSize: '0.86rem', color: '#64748b', marginTop: '4px' }}>
                Active Teaching Period: <strong style={{ color: '#0f172a' }}>{school.active_period_name}</strong> • Enrolled Candidates: <strong style={{ color: '#0f172a' }}>{studentList.length}</strong>
              </div>
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setShowUploadNoteModal(true)}
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#ffffff',
                fontWeight: 800,
                padding: '0.65rem 1.25rem',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px -2px rgba(5, 150, 105, 0.4)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>📁</span> + Upload Study Note
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
            padding: '6px',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
          }}
        >
          <button
            type="button"
            onClick={() => setTeacherSubTab('attendance')}
            style={{
              background: teacherSubTab === 'attendance' ? '#059669' : 'transparent',
              color: teacherSubTab === 'attendance' ? '#ffffff' : '#475569',
              border: 'none',
              padding: '0.55rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: teacherSubTab === 'attendance' ? 800 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: teacherSubTab === 'attendance' ? '0 4px 12px rgba(5, 150, 105, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>📋</span> Live Attendance Register
          </button>
          <button
            type="button"
            onClick={() => setTeacherSubTab('gradebook')}
            style={{
              background: teacherSubTab === 'gradebook' ? '#059669' : 'transparent',
              color: teacherSubTab === 'gradebook' ? '#ffffff' : '#475569',
              border: 'none',
              padding: '0.55rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: teacherSubTab === 'gradebook' ? 800 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: teacherSubTab === 'gradebook' ? '0 4px 12px rgba(5, 150, 105, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>📊</span> Assessment Gradebook (CAT 1, 2, Exam)
          </button>
          <button
            type="button"
            onClick={() => setTeacherSubTab('notes')}
            style={{
              background: teacherSubTab === 'notes' ? '#059669' : 'transparent',
              color: teacherSubTab === 'notes' ? '#ffffff' : '#475569',
              border: 'none',
              padding: '0.55rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: teacherSubTab === 'notes' ? 800 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: teacherSubTab === 'notes' ? '0 4px 12px rgba(5, 150, 105, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>📁</span> Study Materials ({lessonNotesList.length})
          </button>
          <button
            type="button"
            onClick={() => setTeacherSubTab('timetable')}
            style={{
              background: teacherSubTab === 'timetable' ? '#059669' : 'transparent',
              color: teacherSubTab === 'timetable' ? '#ffffff' : '#475569',
              border: 'none',
              padding: '0.55rem 1.15rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: teacherSubTab === 'timetable' ? 800 : 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: teacherSubTab === 'timetable' ? '0 4px 12px rgba(5, 150, 105, 0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🗓️</span> Teaching Timetable
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
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
            marginBottom: '1.25rem',
          }}
        >
          ✓ {saveSuccessMsg}
        </div>
      )}

      {/* SUBTAB 1: ATTENDANCE */}
      {teacherSubTab === 'attendance' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>Class Roll Call &amp; Attendance</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Take daily roll call for students. Status automatically updates attendance percentages.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Filter Cohort:</span>
              <select
                value={selectedClassForAttendance}
                onChange={(e) => setSelectedClassForAttendance(e.target.value)}
                style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', background: '#f8fafc' }}
              >
                <option value="Grade 10 Senior">Grade 10 Senior</option>
                <option value="Grade 11 Senior">Grade 11 Senior</option>
                <option value="Form 3 Alpha">Form 3 Alpha</option>
                <option value="Diploma Year 1">Diploma Year 1</option>
              </select>
              <button
                type="button"
                onClick={handleMarkAllPresent}
                style={{ background: '#ecfdf5', color: '#047857', border: '1.5px solid #a7f3d0', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
              >
                ✓ Mark All Present
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Adm No.</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Student Name</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Class</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Term Attendance</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>Today's Roll Call</th>
                </tr>
              </thead>
              <tbody>
                {classStudents.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: primaryColor }}>{s.admission_number}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>{s.full_name}</td>
                    <td style={{ padding: '0.75rem', color: '#64748b' }}>{s.grade_class}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span
                        style={{
                          background: s.attendance_percent >= 90 ? '#dcfce7' : '#fef3c7',
                          color: s.attendance_percent >= 90 ? '#15803d' : '#b45309',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                        }}
                      >
                        {s.attendance_percent}% Present
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = Math.min(100, +(s.attendance_percent + 0.2).toFixed(1))
                            tenantSchoolStore.updateStudent(s.id, { attendance_percent: updated })
                            onReloadData()
                          }}
                          style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          ✓ Present
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = Math.max(0, +(s.attendance_percent - 0.5).toFixed(1))
                            tenantSchoolStore.updateStudent(s.id, { attendance_percent: updated })
                            onReloadData()
                          }}
                          style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          ✕ Absent
                        </button>
                        <button
                          type="button"
                          onClick={() => alert(`Logged late arrival for ${s.full_name}`)}
                          style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer' }}
                        >
                          🕒 Late
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

      {/* SUBTAB 2: GRADEBOOK */}
      {teacherSubTab === 'gradebook' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>Assessment Gradebook &amp; Exam Marks</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Enter Continuous Assessment Tests (CAT 1 &amp; CAT 2) and Final Exam marks out of 60.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <select
                value={selectedClassForGradebook}
                onChange={(e) => setSelectedClassForGradebook(e.target.value)}
                style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700 }}
              >
                <option value="Grade 10 Senior">Grade 10 Senior</option>
                <option value="Grade 11 Senior">Grade 11 Senior</option>
                <option value="Form 3 Alpha">Form 3 Alpha</option>
              </select>
              <select
                value={selectedSubjectForGradebook}
                onChange={(e) => setSelectedSubjectForGradebook(e.target.value)}
                style={{ padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700 }}
              >
                <option value="Pure Mathematics (MATH-101)">Pure Mathematics (MATH-101)</option>
                <option value="English &amp; Communication (ENG-101)">English &amp; Communication (ENG-101)</option>
                <option value="Computer Science (CS-101)">Computer Science (CS-101)</option>
                <option value="Applied Physics (PHY-101)">Applied Physics (PHY-101)</option>
                <option value="General Chemistry (CHEM-101)">General Chemistry (CHEM-101)</option>
              </select>
            </div>
          </div>

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
                {studentList
                  .filter((s) => s.grade_class === selectedClassForGradebook)
                  .map((s) => {
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
                        onSave={() => {
                          onReloadData()
                          setSaveSuccessMsg(`Updated marks for ${s.full_name} in ${selectedSubjectForGradebook}!`)
                          setTimeout(() => setSaveSuccessMsg(null), 3000)
                        }}
                      />
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: NOTES */}
      {teacherSubTab === 'notes' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>Class Study Materials &amp; Lecture Notes</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Course syllabi, lecture notes, and assignments available directly in student portals.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowUploadNoteModal(true)}
              style={{ background: '#059669', color: '#ffffff', fontWeight: 800, padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              + Upload Study Note
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {lessonNotesList.map((n) => (
              <div key={n.id} style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px' }}>
                    {n.subject_name}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{n.class_name}</span>
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 900, margin: '6px 0', color: '#0f172a' }}>{n.title}</h4>
                <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, margin: '0 0 12px' }}>{n.summary}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '8px', fontSize: '0.76rem', color: '#64748b' }}>
                  <span>Tutor: {n.teacher_name}</span>
                  <a href={n.file_url || '#'} target="_blank" rel="noreferrer" style={{ color: primaryColor, fontWeight: 800, textDecoration: 'none' }}>
                    Download Document ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 4: TIMETABLE */}
      {teacherSubTab === 'timetable' && (
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: '0 0 1rem', color: '#0f172a' }}>
            Faculty Teaching Schedule &amp; Lab Periods
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Day</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Period</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Time</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Subject</th>
                  <th style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>Assigned Room</th>
                </tr>
              </thead>
              <tbody>
                {teacherTimetable.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 800, color: '#059669' }}>{t.day_of_week}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: '#64748b' }}>Period {t.period_number}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>{t.start_time} - {t.end_time}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 800, color: '#0f172a' }}>{t.subject_name}</td>
                    <td style={{ padding: '0.75rem', color: '#64748b' }}>{t.room}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: UPLOAD STUDY NOTE */}
      {showUploadNoteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto', boxSizing: 'border-box', background: '#ffffff', borderRadius: '20px', maxWidth: '540px', width: '100%', padding: 'clamp(1.1rem, 4vw, 2rem)', border: '2px solid #059669' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 1rem', color: '#0f172a' }}>+ Upload Course Material / Notes</h3>
            <form onSubmit={handleCreateNote}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Document / Topic Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Chemistry: Hydrocarbons & Alkyl Halides"
                  value={newNoteInput.title}
                  onChange={(e) => setNewNoteInput({ ...newNoteInput, title: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Class</label>
                  <select
                    value={newNoteInput.class_name}
                    onChange={(e) => setNewNoteInput({ ...newNoteInput, class_name: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  >
                    <option value="Grade 10 Senior">Grade 10 Senior</option>
                    <option value="Grade 11 Senior">Grade 11 Senior</option>
                    <option value="Form 3 Alpha">Form 3 Alpha</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Subject</label>
                  <input
                    type="text"
                    required
                    value={newNoteInput.subject_name}
                    onChange={(e) => setNewNoteInput({ ...newNoteInput, subject_name: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, marginBottom: '4px' }}>Topic Summary &amp; Key Takeaways</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Brief summary of syllabus coverage..."
                  value={newNoteInput.summary}
                  onChange={(e) => setNewNoteInput({ ...newNoteInput, summary: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowUploadNoteModal(false)}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: '#059669', color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Publish Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// Inline Row Item for Gradebook marks entry
function GradeRowItem({
  school,
  student,
  subjectName,
  initialGrade,
  onSave,
}: {
  school: PartnerSchoolTenant
  student: TenantStudentMember
  subjectName: string
  initialGrade?: TenantGradeRecord
  onSave: () => void
}) {
  const [cat1, setCat1] = useState(initialGrade?.cat1_score ?? 16)
  const [cat2, setCat2] = useState(initialGrade?.cat2_score ?? 17)
  const [exam, setExam] = useState(initialGrade?.exam_score ?? 50)
  const [remarks, setRemarks] = useState(initialGrade?.remarks ?? 'Solid performance in class exercises.')

  const total = Math.min(100, Math.max(0, cat1 + cat2 + exam))
  let gradeLetter = 'F'
  if (total >= 90) gradeLetter = 'A*'
  else if (total >= 80) gradeLetter = 'A'
  else if (total >= 70) gradeLetter = 'B'
  else if (total >= 60) gradeLetter = 'C'
  else if (total >= 50) gradeLetter = 'D'
  else if (total >= 40) gradeLetter = 'E'

  const handleSave = () => {
    tenantSchoolStore.saveGradeRecord({
      school_slug: school.slug,
      student_id: student.id,
      student_name: student.full_name,
      admission_number: student.admission_number,
      class_name: student.grade_class,
      subject_name: subjectName,
      period_code: 'TERM-1',
      cat1_score: Number(cat1),
      cat2_score: Number(cat2),
      exam_score: Number(exam),
      remarks,
      teacher_name: 'Senior Subject Instructor',
    })
    onSave()
  }

  return (
    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
      <td style={{ padding: '0.75rem' }}>
        <div style={{ fontWeight: 800, color: '#0f172a' }}>{student.full_name}</div>
        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{student.admission_number}</div>
      </td>
      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
        <input
          type="number"
          min="0"
          max="20"
          value={cat1}
          onChange={(e) => setCat1(Number(e.target.value))}
          style={{ width: '48px', padding: '0.35rem', textAlign: 'center', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700 }}
        />
      </td>
      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
        <input
          type="number"
          min="0"
          max="20"
          value={cat2}
          onChange={(e) => setCat2(Number(e.target.value))}
          style={{ width: '48px', padding: '0.35rem', textAlign: 'center', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700 }}
        />
      </td>
      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
        <input
          type="number"
          min="0"
          max="60"
          value={exam}
          onChange={(e) => setExam(Number(e.target.value))}
          style={{ width: '54px', padding: '0.35rem', textAlign: 'center', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700 }}
        />
      </td>
      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 900, color: '#0f172a' }}>
        {total}%
      </td>
      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
        <span
          style={{
            background: gradeLetter.startsWith('A') ? '#dcfce7' : gradeLetter === 'B' ? '#eff6ff' : '#fef3c7',
            color: gradeLetter.startsWith('A') ? '#15803d' : gradeLetter === 'B' ? '#1d4ed8' : '#b45309',
            padding: '2px 8px',
            borderRadius: '6px',
            fontWeight: 900,
            fontSize: '0.8rem',
          }}
        >
          {gradeLetter}
        </span>
      </td>
      <td style={{ padding: '0.75rem' }}>
        <input
          type="text"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          style={{ width: '100%', minWidth: '180px', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
        />
      </td>
      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
        <button
          type="button"
          onClick={handleSave}
          style={{ background: '#059669', color: '#ffffff', border: 'none', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
        >
          Save
        </button>
      </td>
    </tr>
  )
}
