import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { schoolStore } from '@/lib/schoolData'
import { INSTITUTION_CONFIG } from '@/config/institution'
import type { CourseUnit, SyllabusModule, CollegeDepartment, CollegeSubject, FacultyTeacher } from '@/types/school'

export function CreateCourse() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  // Read current departments & faculty from store
  const [departments, setDepartments] = useState<CollegeDepartment[]>(() => schoolStore.getDepartments())
  const [teachersList, setTeachersList] = useState<FacultyTeacher[]>(() => schoolStore.getTeachers())

  // Assigned Faculty Member / Instructor
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachersList[0]?.id || '')
  const [isCustomTeacher, setIsCustomTeacher] = useState(teachersList.length === 0)
  const [customTeacherName, setCustomTeacherName] = useState('')
  const [customTeacherTitle, setCustomTeacherTitle] = useState('Faculty Lecturer & Subject Lead')

  // Course Basic Information
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [feeUsd, setFeeUsd] = useState<number>(0)
  const [category, setCategory] = useState('Tech & Programming')
  const [icon, setIcon] = useState('💻')
  const [courseDuration, setCourseDuration] = useState('3 Months (Certificate Course)')
  const [creditHours, setCreditHours] = useState(40)
  const [description, setDescription] = useState('')
  const [careerOutcomes, setCareerOutcomes] = useState('')

  // Live Virtual Classroom Google Meet / Zoom Integration
  const [liveMeetingUrl, setLiveMeetingUrl] = useState('')
  const [liveScheduleText, setLiveScheduleText] = useState('')

  // Department & Program Handling (Supports existing OR brand-new custom)
  const [isCustomDept, setIsCustomDept] = useState(departments.length === 0)
  const [selectedDeptId, setSelectedDeptId] = useState<string>(departments[0]?.id || '')
  const [customDeptName, setCustomDeptName] = useState('')

  const [isCustomProgram, setIsCustomProgram] = useState(true)
  const [selectedProgram, setSelectedProgram] = useState<string>('')
  const [customProgramName, setCustomProgramName] = useState('')

  // Active department details
  const currentDept = useMemo(() => {
    return departments.find((d) => d.id === selectedDeptId) || departments[0]
  }, [departments, selectedDeptId])

  // Modules Builder State
  const [modules, setModules] = useState<(SyllabusModule & { topics_input?: string })[]>([])

  // Lessons State
  const [lessons, setLessons] = useState<CourseUnit['lessons']>([])

  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Module actions
  const handleAddModule = () => {
    const nextNum = modules.length + 1
    setModules([
      ...modules,
      {
        id: `mod-${Date.now()}-${nextNum}`,
        module_number: nextNum,
        title: `Module ${nextNum}: Advanced Practical Topic`,
        hours: 10,
        topics: ['Core concept analysis', 'Hands-on practical project lab'],
        topics_input: 'Core concept analysis, Hands-on practical project lab',
        learning_outcomes: ['Demonstrate practical mastery and implement lab project'],
        resources: [],
      },
    ])
  }

  const handleUpdateModule = (idx: number, updated: Partial<SyllabusModule & { topics_input?: string }>) => {
    const list = [...modules]
    list[idx] = { ...list[idx], ...updated }
    setModules(list)
  }

  const handleAddModuleResource = (modIdx: number) => {
    const list = [...modules]
    const currentRes = list[modIdx].resources || []
    list[modIdx].resources = [
      ...currentRes,
      {
        id: `res-${Date.now()}-${currentRes.length + 1}`,
        file_name: `Attachment ${currentRes.length + 1} (Notes / Lab PDF)`,
        file_url: '',
        file_type: 'PDF',
      },
    ]
    setModules(list)
  }

  const handleUpdateModuleResource = (modIdx: number, resIdx: number, field: string, val: string) => {
    const list = [...modules]
    if (list[modIdx].resources) {
      list[modIdx].resources![resIdx] = {
        ...list[modIdx].resources![resIdx],
        [field]: val,
      }
      setModules(list)
    }
  }

  const handleDeleteModuleResource = (modIdx: number, resIdx: number) => {
    const list = [...modules]
    if (list[modIdx].resources) {
      list[modIdx].resources = list[modIdx].resources!.filter((_, i) => i !== resIdx)
      setModules(list)
    }
  }

  const handleDeleteModule = (idx: number) => {
    setModules(modules.filter((_, i) => i !== idx))
  }

  // Lesson actions
  const handleAddLesson = () => {
    const nextNum = lessons.length + 1
    setLessons([
      ...lessons,
      {
        id: `les-${Date.now()}-${nextNum}`,
        title: `Lesson ${nextNum}: Practical Application & Live Demo`,
        video_url: '',
        meeting_url: liveMeetingUrl || 'https://meet.google.com/new',
        duration_minutes: 50,
        content: '',
        resources: [],
      },
    ])
  }

  const handleUpdateLesson = (idx: number, updated: Partial<CourseUnit['lessons'][0]>) => {
    const list = [...lessons]
    list[idx] = { ...list[idx], ...updated }
    setLessons(list)
  }

  const handleDeleteLesson = (idx: number) => {
    setLessons(lessons.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!code.trim() || !title.trim()) {
      setError('Course Code (e.g. CYB-101) and Course Title are required.')
      return
    }

    const deptNameFinal = isCustomDept
      ? customDeptName.trim()
      : (currentDept ? currentDept.name : 'Department of Computing & Tech')

    if (!deptNameFinal) {
      setError('Please provide an Academic Department name.')
      return
    }

    const programFinal = isCustomProgram
      ? (customProgramName.trim() || `${title.trim()} Program`)
      : (selectedProgram || (currentDept?.programs?.[0] || 'Short Course Certificate Program'))

    setIsSubmitting(true)

    try {
      // 1. If custom department was introduced, persist it
      let finalDeptId = selectedDeptId
      if (isCustomDept && customDeptName.trim()) {
        const newDeptCode = (code.trim().split('-')[0] || 'DEPT').toUpperCase()
        const newDept: CollegeDepartment = {
          id: `dept-${Date.now()}`,
          code: newDeptCode,
          name: customDeptName.trim(),
          hod_name: profile?.full_name || 'Department Faculty Lead',
          programs: [programFinal],
          created_at: new Date().toISOString(),
        }
        await schoolStore.addDepartment(newDept)
        finalDeptId = newDept.id
        setDepartments(schoolStore.getDepartments())
      }

      // 2. Determine assigned faculty teacher
      let assignedTeacherId = selectedTeacherId
      let assignedTeacherName = teachersList.find((t) => t.id === selectedTeacherId)?.name || profile?.full_name || 'Faculty Lecturer'

      if (isCustomTeacher && customTeacherName.trim()) {
        const newTch: FacultyTeacher = {
          id: `tch-${Date.now()}`,
          name: customTeacherName.trim(),
          title: customTeacherTitle.trim() || 'Faculty Lecturer',
          email: `${customTeacherName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@${INSTITUTION_CONFIG.domain || 'globalcollege.edu'}`,
          department: deptNameFinal,
          specialty: title.trim(),
          created_at: new Date().toISOString(),
        }
        await schoolStore.addTeacher(newTch)
        assignedTeacherId = newTch.id
        assignedTeacherName = newTch.name
        setTeachersList(schoolStore.getTeachers())
      }

      // 3. Build CourseUnit record
      const cleanModules: SyllabusModule[] = modules.map((m) => {
        const raw = m.topics_input !== undefined ? m.topics_input : (m.topics || []).join(', ')
        const parsedTopics = raw.split(',').map((t) => t.trim()).filter(Boolean)
        return {
          id: m.id,
          module_number: m.module_number,
          title: m.title,
          hours: m.hours,
          topics: parsedTopics.length > 0 ? parsedTopics : ['Core Lecture', 'Practical Lab'],
          learning_outcomes: m.learning_outcomes,
          resources: m.resources || [],
        }
      })

      const cleanCode = code.trim().toUpperCase()
      const newUnit: CourseUnit = {
        id: `unit-${Date.now()}`,
        code: cleanCode,
        title: title.trim(),
        department: deptNameFinal,
        program: programFinal,
        course_duration: courseDuration,
        credit_hours: Number(creditHours) || 40,
        teacher_id: assignedTeacherId,
        teacher_name: assignedTeacherName,
        description: description.trim() || `Comprehensive online course in ${title.trim()}.`,
        live_meeting_url: liveMeetingUrl.trim(),
        live_schedule_text: liveScheduleText.trim(),
        fee: Number(feeUsd) || 60,
        syllabus_modules: cleanModules,
        lessons,
        is_published: true,
        created_at: new Date().toISOString(),
      }

      // 4. Save CourseUnit to store
      await schoolStore.addCourseUnit(newUnit)

      // 5. Also register as a CollegeSubject (for Pricing, Bursar & Frontpage Catalog)
      const careersList = careerOutcomes
        ? careerOutcomes.split(',').map((c) => c.trim()).filter(Boolean)
        : [title.trim() + ' Specialist', 'Certified Professional']

      const newSubject: CollegeSubject = {
        id: `sub-${Date.now()}`,
        code: cleanCode,
        name: title.trim(),
        description: description.trim() || `Certified ${courseDuration} course program.`,
        department_id: finalDeptId,
        department_name: deptNameFinal,
        fee: Number(feeUsd) || 75,
        duration: courseDuration,
        icon: icon || '💻',
        badge: 'New Course',
        category: category,
        careers: careersList,
        color_hex: '#1e3a8a',
        created_at: new Date().toISOString(),
      }

      await schoolStore.addSubject(newSubject)

      // 5. Cloud Supabase Insertion
      try {
        await supabase.from('courses').insert({
          title: newUnit.title,
          description: newUnit.description || '',
          teacher_id: profile?.id,
          is_published: true,
        })
      } catch (cloudErr) {
        console.warn('Cloud sync fallback to local store:', cloudErr)
      }

      // Broadcast storage event for live frontpage & catalog updates
      window.dispatchEvent(new Event('storage'))
      window.dispatchEvent(new CustomEvent('gc-courses-updated'))

      navigate('/teacher/courses')
    } catch (err: any) {
      setError(err.message || 'Failed to create course. Please verify input fields.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Allow both admin and teacher roles
  if (profile?.role !== 'admin' && profile?.role !== 'teacher') {
    return (
      <PageWrapper title="Access Restricted">
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '2rem auto' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
            Faculty & Admin Access Only
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            Only Faculty Instructors and College Administrators can introduce or publish courses.
          </p>
          <Button variant="primary" onClick={() => navigate('/')}>
            ← Return Home
          </Button>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper
      title="Create & Introduce New Course"
      subtitle="Introduce brand-new certified short courses, define tuition fees, build syllabus modules, and publish video lectures."
    >
      <Link to="/teacher/courses" className="lesson-back-link mb-4">
        ← Back to Course Catalog
      </Link>

      <form onSubmit={handleSubmit} style={{ maxWidth: '960px', margin: '0 auto' }}>
        {error && (
          <div className="card mb-4" style={{ background: '#fee2e2', border: '1.5px solid #f87171', color: '#991b1b', padding: '1rem 1.25rem', borderRadius: '10px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '1.3rem' }}>⚠️</span>
            <div>{error}</div>
          </div>
        )}

        {/* 1. Core Course Identification & Pricing */}
        <div className="card mb-6" style={{ padding: '1.75rem', borderRadius: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '1.4rem' }}>✨</span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--color-primary)' }}>
              1. Course Identity & Tuition Fee
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label className="label">Course Code *</label>
              <input
                type="text"
                required
                className="input"
                placeholder="e.g. CYB-101"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Course Title *</label>
              <input
                type="text"
                required
                className="input"
                placeholder="e.g. Cybersecurity & Ethical Hacking Masterclass"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Tuition Fee ($ USD) *</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#16a34a' }}>$</span>
                <input
                  type="number"
                  min="1"
                  required
                  className="input"
                  style={{ paddingLeft: '1.75rem', fontWeight: 800, color: '#16a34a' }}
                  value={feeUsd}
                  onChange={(e) => setFeeUsd(Number(e.target.value))}
                />
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                Installment: 2x ${(feeUsd / 2).toFixed(2)}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 100px', gap: '1rem', marginBottom: '1.25rem' }}>
            {/* Category */}
            <div>
              <label className="label">Course Category *</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {Array.from(new Set([
                  ...departments.map((d) => d.name),
                  'Tech & Programming',
                  'Computer & Digital Skills',
                  'Languages & Communication',
                  'Business Tech & Accounting',
                  'Data Science & Research',
                  'Creative Arts & Design',
                  'Executive Masterclass',
                ])).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Course Duration */}
            <div>
              <label className="label">Course Duration / Period *</label>
              <select className="input" value={courseDuration} onChange={(e) => setCourseDuration(e.target.value)}>
                {[
                  '6 Weeks (Fast-Track Skills)',
                  '2 Months (8 Weeks Comprehensive)',
                  '3 Months (Certificate Course)',
                  '4 Months (Professional Short Course)',
                  '6 Months (Modular Diploma)',
                  '1 Year (Full Diploma)',
                  'Self-Paced Short Course',
                  'Executive Masterclass',
                ].map((dur) => (
                  <option key={dur} value={dur}>
                    {dur}
                  </option>
                ))}
              </select>
            </div>

            {/* Training Hours */}
            <div>
              <label className="label">Training Hours</label>
              <input
                type="number"
                min="5"
                max="300"
                className="input"
                value={creditHours}
                onChange={(e) => setCreditHours(Number(e.target.value))}
              />
            </div>

            {/* Icon Picker */}
            <div>
              <label className="label">Icon</label>
              <select className="input" value={icon} onChange={(e) => setIcon(e.target.value)}>
                <option value="💻">💻</option>
                <option value="🛡️">🛡️</option>
                <option value="🤖">🤖</option>
                <option value="🌐">🌐</option>
                <option value="🗣️">🗣️</option>
                <option value="📱">📱</option>
                <option value="📊">📊</option>
                <option value="🎨">🎨</option>
                <option value="💼">💼</option>
                <option value="🇩🇪">🇩🇪</option>
                <option value="🇫🇷">🇫🇷</option>
                <option value="🇰🇪">🇰🇪</option>
                <option value="🌴">🌴</option>
              </select>
            </div>
          </div>

          {/* 2. Department & Program / Cohort (Dynamic) */}
          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '1.2rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <strong style={{ fontSize: '0.92rem', color: '#1e3a8a' }}>🏛️ Department & Program Cohort Track</strong>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCustomDept(!isCustomDept)}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}
                >
                  {isCustomDept ? '← Choose Existing Dept' : '➕ Type New Dept'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomProgram(!isCustomProgram)}
                  style={{ background: 'none', border: 'none', color: '#059669', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}
                >
                  {isCustomProgram ? '← Choose Existing Program' : '➕ Type New Program Track'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Department Input / Dropdown */}
              <div>
                <label className="label" style={{ fontSize: '0.78rem' }}>
                  {isCustomDept ? 'New Custom Academic Department *' : 'Select Academic Department *'}
                </label>
                {isCustomDept ? (
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="e.g. Department of Cybersecurity & Cloud Defense"
                    value={customDeptName}
                    onChange={(e) => setCustomDeptName(e.target.value)}
                  />
                ) : (
                  <select
                    className="input"
                    value={selectedDeptId}
                    onChange={(e) => {
                      setSelectedDeptId(e.target.value)
                      const target = departments.find((d) => d.id === e.target.value)
                      if (target?.programs?.length) {
                        setSelectedProgram(target.programs[0])
                      }
                    }}
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Program Track Input / Dropdown */}
              <div>
                <label className="label" style={{ fontSize: '0.78rem' }}>
                  {isCustomProgram ? 'New Certified Program / Track Name *' : 'Select Program / Track'}
                </label>
                {isCustomProgram ? (
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="e.g. Executive Cybersecurity & Ethical Hacking Track"
                    value={customProgramName}
                    onChange={(e) => setCustomProgramName(e.target.value)}
                  />
                ) : (
                  <select className="input" value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)}>
                    {currentDept?.programs?.map((p, i) => (
                      <option key={i} value={p}>{p}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* 3. Assigned Faculty Lecturer / Course Instructor (Admin Assigned) */}
          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '1.2rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>👨‍🏫</span>
                <strong style={{ fontSize: '0.92rem', color: '#1e3a8a' }}>Assigned Faculty Instructor / Lecturer *</strong>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomTeacher(!isCustomTeacher)}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}
              >
                {isCustomTeacher ? '← Select Existing Faculty' : '➕ Type New Instructor Name'}
              </button>
            </div>

            {isCustomTeacher ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1rem' }}>
                <div>
                  <label className="label" style={{ fontSize: '0.78rem' }}>New Faculty Lecturer Full Name *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="e.g. Dr. Sarah Chen, Ph.D. or Eng. David Mwangi"
                    value={customTeacherName}
                    onChange={(e) => setCustomTeacherName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label" style={{ fontSize: '0.78rem' }}>Academic Title / Role</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Senior Cybersecurity & Cloud Defense Lecturer"
                    value={customTeacherTitle}
                    onChange={(e) => setCustomTeacherTitle(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="label" style={{ fontSize: '0.78rem' }}>Select Verified Faculty Member</label>
                <select
                  className="input"
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                >
                  {teachersList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.title} ({t.department})
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  The course will appear on this teacher's Faculty Dashboard, Gradebook, and Attendance tracker.
                </span>
              </div>
            )}
          </div>

          {/* 4. Google Meet / Live Virtual Classroom Integration */}
          <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '10px', padding: '1.2rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.3rem' }}>🎥</span>
              <strong style={{ fontSize: '0.92rem', color: '#1e3a8a' }}>Live Virtual Classroom (Google Meet / Zoom Embedding)</strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '1rem' }}>
              <div>
                <label className="label" style={{ fontSize: '0.78rem' }}>Google Meet / Zoom Live Classroom URL *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. https://meet.google.com/abc-defg-hij or Zoom Link"
                  value={liveMeetingUrl}
                  onChange={(e) => setLiveMeetingUrl(e.target.value)}
                />
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                  Students will receive a direct 1-click Join button on their dashboard & lesson player.
                </span>
              </div>

              <div>
                <label className="label" style={{ fontSize: '0.78rem' }}>Live Virtual Class Timetable Schedule</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Mon, Wed & Fri: 7:30 PM - 9:30 PM EAT"
                  value={liveScheduleText}
                  onChange={(e) => setLiveScheduleText(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Description & Career Prospects */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="label">Course Description & Objectives</label>
              <textarea
                rows={3}
                className="input"
                placeholder="Overview of syllabus, hands-on labs, and key technical learning goals..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Target Career Roles & Skills (Comma separated)</label>
              <textarea
                rows={3}
                className="input"
                placeholder="e.g. Cybersecurity Analyst, Security Auditor, Ethical Hacker, IT Security Officer"
                value={careerOutcomes}
                onChange={(e) => setCareerOutcomes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 4. Modular Syllabus Breakdown & Resource Attachments */}
        <div className="card mb-6" style={{ padding: '1.75rem', borderRadius: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.3rem' }}>📑</span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--color-primary)' }}>
                  2. Modules with Downloadable Notes & Resources
                </h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0 0' }}>
                Structure weekly practical modules, embed PDF lecture notes, lab guides, and Google Drive links.
              </p>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddModule}>
              + Add Module
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {modules.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📚</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>No modules added yet</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.75rem' }}>Click "+ Add Module" above to define your syllabus topics, contact hours, and lecture materials.</div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddModule}>
                  + Add First Module
                </button>
              </div>
            ) : modules.map((mod, idx) => (
              <div
                key={mod.id}
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1.2rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ background: '#2563eb', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                      Module {mod.module_number}
                    </span>
                    <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{mod.title}</strong>
                  </div>
                  {modules.length > 1 && (
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                      onClick={() => handleDeleteModule(idx)}
                    >
                      🗑️ Remove Module
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '0.75rem', marginBottom: '0.65rem' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Module Title"
                    value={mod.title}
                    onChange={(e) => handleUpdateModule(idx, { title: e.target.value })}
                  />
                  <input
                    type="number"
                    className="input"
                    placeholder="Contact Hours"
                    value={mod.hours}
                    onChange={(e) => handleUpdateModule(idx, { hours: Number(e.target.value) })}
                  />
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label className="label" style={{ fontSize: '0.74rem' }}>Key Topics (Comma separated)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Topic 1, Topic 2, Practical lab..."
                    value={mod.topics_input !== undefined ? mod.topics_input : mod.topics.join(', ')}
                    onChange={(e) => {
                      const val = e.target.value
                      handleUpdateModule(idx, {
                        topics_input: val,
                        topics: val.split(',').map((t) => t.trim()).filter(Boolean),
                      })
                    }}
                  />
                </div>

                {/* Module Resources & Attachments */}
                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                      📄 Module Attachments (PDFs, Notes, Google Drive, Lab Code)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddModuleResource(idx)}
                      style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700 }}
                    >
                      + Add Resource File / URL
                    </button>
                  </div>

                  {mod.resources && mod.resources.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {mod.resources.map((res, rIdx) => (
                        <div key={res.id || rIdx} style={{ display: 'grid', gridTemplateColumns: '2fr 3fr 30px', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            type="text"
                            className="input"
                            style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
                            placeholder="File Title (e.g. Week 1 Slides PDF)"
                            value={res.file_name}
                            onChange={(e) => handleUpdateModuleResource(idx, rIdx, 'file_name', e.target.value)}
                          />
                          <input
                            type="text"
                            className="input"
                            style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
                            placeholder="Resource URL (PDF link, Google Drive, or Cloudflare R2)"
                            value={res.file_url}
                            onChange={(e) => handleUpdateModuleResource(idx, rIdx, 'file_url', e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteModuleResource(idx, rIdx)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      No attachments added to this module yet. Click above to attach lecture notes or PDF workbooks.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Video Lectures & Online Lab Materials */}
        <div className="card mb-6" style={{ padding: '1.75rem', borderRadius: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.3rem' }}>🎬</span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--color-primary)' }}>
                  3. Video Lectures & Online Lab Materials
                </h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0 0' }}>
                Add direct MP4, Vimeo, Cloudflare R2, or cloud stream links for student streaming.
              </p>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddLesson}>
              + Add Video Lecture
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {lessons.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🎬</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>No lessons added yet</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.75rem' }}>Click "+ Add Video Lecture" above to link lecture videos, live meet sessions, or practical demos.</div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddLesson}>
                  + Add First Lecture
                </button>
              </div>
            ) : lessons.map((les, idx) => (
              <div
                key={les.id}
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1.2rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ background: '#059669', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                      Lesson {idx + 1}
                    </span>
                    <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{les.title}</strong>
                  </div>
                  {lessons.length > 1 && (
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                      onClick={() => handleDeleteLesson(idx)}
                    >
                      🗑️ Remove
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 2.5fr 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Lesson Title"
                    value={les.title}
                    onChange={(e) => handleUpdateLesson(idx, { title: e.target.value })}
                  />
                  <input
                    type="text"
                    className="input"
                    placeholder="Video Stream URL, MP4 or Cloudflare Link"
                    value={les.video_url || ''}
                    onChange={(e) => handleUpdateLesson(idx, { video_url: e.target.value })}
                  />
                  <input
                    type="number"
                    className="input"
                    placeholder="Minutes"
                    value={les.duration_minutes}
                    onChange={(e) => handleUpdateLesson(idx, { duration_minutes: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <input
                    type="text"
                    className="input"
                    placeholder="Google Meet Live Link for this specific lesson (optional)"
                    value={les.meeting_url || ''}
                    onChange={(e) => handleUpdateLesson(idx, { meeting_url: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingBottom: '3rem' }}>
          <Link to="/teacher/courses" className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem', fontWeight: 700 }}>
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={isSubmitting}
            style={{ padding: '0.75rem 2rem', fontWeight: 800, fontSize: '1rem', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)' }}
          >
            {isSubmitting ? 'Publishing Course...' : '🚀 Publish Course to Campus & Student Portal'}
          </button>
        </div>
      </form>
    </PageWrapper>
  )
}
