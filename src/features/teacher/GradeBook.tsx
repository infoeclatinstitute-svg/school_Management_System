import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { schoolStore } from '@/lib/schoolData'
import { getCollegeGrade, getCollegeLabel, getCollegeColor } from '@/lib/database.types'
import type { Course, QuizAttempt, Profile } from '@/lib/database.types'

export function GradeBook() {
  const { profile } = useAuth()

  const [selectedCourseId, setSelectedCourseId] = useState<string>('')

  // Fetch teacher's courses
  const { data: courses = [] } = useQuery({
    queryKey: ['teacher-courses-gb', profile?.id, profile?.full_name],
    queryFn: async () => {
      const storeUnits = schoolStore.getCourseUnits()
      const assignedUnits = (profile?.role === 'admin')
        ? storeUnits
        : storeUnits.filter(
            (u) =>
              u.teacher_id === profile?.id ||
              u.teacher_name?.toLowerCase() === profile?.full_name?.toLowerCase()
          )

      let cloudCourses: Course[] = []
      try {
        if (profile?.id) {
          const { data } = await supabase.from('courses').select('*').eq('teacher_id', profile.id)
          cloudCourses = (data || []) as Course[]
        }
      } catch {
        // Offline resilience
      }

      const merged = new Map<string, { id: string; title: string }>()
      cloudCourses.forEach((c) => merged.set(c.id, { id: c.id, title: c.title }))
      assignedUnits.forEach((u) => {
        if (!merged.has(u.id)) {
          merged.set(u.id, { id: u.id, title: u.title })
        }
      })

      return Array.from(merged.values())
    },
    enabled: !!profile?.id,
  })

  // Fetch full gradebook data for selected course
  const { data: gradebookData, isLoading: loadingGradebook } = useQuery({
    queryKey: ['gradebook-data', selectedCourseId],
    queryFn: async () => {
      if (!selectedCourseId) return null

      // Get lessons in course (Supabase with hybrid fallback)
      let lessons: any[] = []
      try {
        const { data } = await supabase
          .from('lessons')
          .select('*, quiz:quizzes(*)')
          .eq('course_id', selectedCourseId)
          .order('order_index')
        if (data && data.length > 0) lessons = data
      } catch {
        // Fallback
      }

      if (lessons.length === 0) {
        const storeUnit = schoolStore.getCourseUnits().find((u) => u.id === selectedCourseId)
        if (storeUnit?.lessons) {
          lessons = storeUnit.lessons.map((l, i) => ({
            id: l.id,
            title: l.title,
            course_id: selectedCourseId,
            order_index: i,
            quiz: null,
          }))
        }
      }

      // Get enrolled students
      let students: Profile[] = []
      try {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('*, student:profiles!student_id(*)')
          .eq('course_id', selectedCourseId)
        if (enrollments && enrollments.length > 0) {
          students = enrollments.map((e) => e.student as Profile)
        }
      } catch {
        // Fallback
      }

      if (students.length === 0) {
        const storeStudents = schoolStore.getStudents()
        const targetCourse = schoolStore.getCourseUnits().find((u) => u.id === selectedCourseId)
        const matched = storeStudents.filter(
          (s) =>
            s.class_id === selectedCourseId ||
            (targetCourse && s.class_name?.toLowerCase() === targetCourse.title.toLowerCase())
        )
        const activeList = matched.length > 0 ? matched : storeStudents
        students = activeList.map((s) => ({
          id: s.id,
          full_name: s.full_name,
          admission_number: s.admission_number,
          role: 'student',
          first_login_at: null,
          access_expires_at: null,
          is_active: true,
          created_at: s.enrollment_date,
        }))
      }

      const quizIds = lessons.map((l) => l.quiz?.id).filter(Boolean) as string[]

      // Get all quiz attempts for these quizzes
      let attempts: QuizAttempt[] = []
      if (quizIds.length > 0) {
        try {
          const { data: attData } = await supabase
            .from('quiz_attempts')
            .select('*')
            .in('quiz_id', quizIds)
          attempts = attData || []
        } catch {}
      }

      return { lessons, students, attempts }
    },
    enabled: !!selectedCourseId,
  })

  // Export to CSV helper
  const exportCSV = () => {
    if (!gradebookData) return
    const { lessons, students, attempts } = gradebookData

    let csv = 'Admission Number,Student Name,'
    csv += lessons.map((l) => `"${l.title}"`).join(',') + ',Average %,Academic Grade,Classification\n'

    students.forEach((st) => {
      let line = `"${st.admission_number}","${st.full_name}",`
      let totalCorrect = 0

      lessons.forEach((l) => {
        const qid = l.quiz?.id
        if (!qid) {
          line += 'N/A,'
          return
        }
        const stAttempts = attempts.filter((a) => a.student_id === st.id && a.quiz_id === qid)
        if (stAttempts.length === 0) {
          line += 'Unattempted,'
        } else {
          const isPass = stAttempts.some((a) => a.is_correct)
          if (isPass) totalCorrect++
          line += isPass ? '100% (Pass),' : '0% (Fail),'
        }
      })

      const avgPct = lessons.length > 0 ? Math.round((totalCorrect / lessons.length) * 100) : 0
      const grade = getCollegeGrade(avgPct)
      const label = getCollegeLabel(grade)
      line += `${avgPct}%,Grade ${grade},"${label}"\n`
      csv += line
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `global_college_Gradebook_${selectedCourseId}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <PageWrapper
      title="College Gradebook & Academic Performance"
      subtitle="Standard tertiary classification (Distinction, Credit, Pass, Fail) and CSV grade export."
      action={
        selectedCourseId && gradebookData ? (
          <Button variant="outline" onClick={exportCSV}>
            📥 Export CSV Gradebook
          </Button>
        ) : undefined
      }
    >
      {/* Course Select Bar */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="form-group mb-0">
            <label className="form-label" htmlFor="gbCourse">Select Course to View Gradebook *</label>
            <select
              id="gbCourse"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              <option value="">-- Select Course --</option>
              {courses?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Gradebook Table */}
      {selectedCourseId ? (
        loadingGradebook ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
            <Spinner size="lg" />
          </div>
        ) : gradebookData && gradebookData.students.length > 0 ? (
          <div className="card">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Admission No.</th>
                    <th>Student Name</th>
                    {gradebookData.lessons.map((l, i) => (
                      <th key={l.id} title={l.title}>
                        Module {i + 1}
                      </th>
                    ))}
                    <th>Average %</th>
                    <th>Academic Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {gradebookData.students.map((st) => {
                    let totalPassed = 0
                    const lessonResults = gradebookData.lessons.map((l) => {
                      const qid = l.quiz?.id
                      if (!qid) return { status: 'none' }
                      const stAttempts = gradebookData.attempts.filter((a) => a.student_id === st.id && a.quiz_id === qid)
                      if (stAttempts.length === 0) return { status: 'unattempted' }
                      const isPass = stAttempts.some((a) => a.is_correct)
                      if (isPass) totalPassed++
                      return { status: isPass ? 'pass' : 'fail' }
                    })

                    const totalLessons = gradebookData.lessons.length
                    const avgPct = totalLessons > 0 ? Math.round((totalPassed / totalLessons) * 100) : 0
                    const grade = getCollegeGrade(avgPct)
                    const label = getCollegeLabel(grade)
                    const colorHex = getCollegeColor(grade)

                    return (
                      <tr key={st.id}>
                        <td className="font-mono text-xs">{st.admission_number}</td>
                        <td className="font-bold">{st.full_name}</td>
                        {lessonResults.map((r, i) => (
                          <td key={i} style={{ textAlign: 'center' }}>
                            {r.status === 'pass' && <span className="badge badge-success">✅ Passed</span>}
                            {r.status === 'fail' && <span className="badge badge-danger">❌ Failed</span>}
                            {r.status === 'unattempted' && <span className="text-xs text-muted">⚪ Pending</span>}
                            {r.status === 'none' && <span className="text-xs text-muted">N/A</span>}
                          </td>
                        ))}
                        <td className="font-bold text-base">{avgPct}%</td>
                        <td>
                          <span
                            className="badge"
                            style={{ backgroundColor: colorHex, color: 'white', fontWeight: 700 }}
                            title={label}
                          >
                            Grade {grade} ({label.split(' ')[0]})
                          </span>
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
            <div className="empty-state-icon">💯</div>
            <div className="empty-state-title">No Students Enrolled</div>
            <div className="empty-state-desc">
              No student enrollments found for this course yet.
            </div>
          </div>
        )
      ) : (
        <div className="empty-state card">
          <div className="empty-state-icon">📖</div>
          <div className="empty-state-title">Select a Course</div>
          <div className="empty-state-desc">
            Choose a course from the dropdown above to generate the full student gradebook and academic classification summary.
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
