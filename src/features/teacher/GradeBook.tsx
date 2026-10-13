import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { getCollegeGrade, getCollegeLabel, getCollegeColor } from '@/lib/database.types'
import type { Course, QuizAttempt, Profile } from '@/lib/database.types'

export function GradeBook() {
  const { profile } = useAuth()

  const [selectedCourseId, setSelectedCourseId] = useState<string>('')

  // Fetch teacher's courses
  const { data: courses } = useQuery({
    queryKey: ['teacher-courses-gb', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data } = await supabase.from('courses').select('*').eq('teacher_id', profile.id)
      return (data || []) as Course[]
    },
    enabled: !!profile?.id,
  })

  // Fetch full gradebook data for selected course
  const { data: gradebookData, isLoading: loadingGradebook } = useQuery({
    queryKey: ['gradebook-data', selectedCourseId],
    queryFn: async () => {
      if (!selectedCourseId) return null

      // Get lessons in course
      const { data: lessons } = await supabase
        .from('lessons')
        .select('*, quiz:quizzes(*)')
        .eq('course_id', selectedCourseId)
        .order('order_index')

      if (!lessons) return null

      // Get enrolled students
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('*, student:profiles!student_id(*)')
        .eq('course_id', selectedCourseId)

      const students = (enrollments || []).map((e) => e.student as Profile)
      const quizIds = lessons.map((l) => l.quiz?.id).filter(Boolean) as string[]

      // Get all quiz attempts for these quizzes
      let attempts: QuizAttempt[] = []
      if (quizIds.length > 0) {
        const { data: attData } = await supabase
          .from('quiz_attempts')
          .select('*')
          .in('quiz_id', quizIds)
        attempts = attData || []
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
