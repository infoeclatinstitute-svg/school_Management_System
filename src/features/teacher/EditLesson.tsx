import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { YouTubeEmbed } from '@/components/shared/YouTubeEmbed'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { schoolStore } from '@/lib/schoolData'
import { isEditable, getEditTimeRemaining } from '@/lib/utils'
import type { Quiz } from '@/lib/database.types'

function isValidUuid(id?: string): boolean {
  if (!id) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

export function EditLesson() {
  const { id: lessonId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const courseIdParam = searchParams.get('courseId')
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [description, setDescription] = useState('')

  // Quiz states
  const [question, setQuestion] = useState('')
  const [optionA, setOptionA] = useState('')
  const [optionB, setOptionB] = useState('')
  const [optionC, setOptionC] = useState('')
  const [optionD, setOptionD] = useState('')
  const [correctIndex, setCorrectIndex] = useState<number>(0)

  const [error, setError] = useState<string | null>(null)

  // Fetch lesson from SchoolStore or Supabase
  const { data: lessonData, isLoading } = useQuery({
    queryKey: ['edit-lesson-detail', lessonId, courseIdParam],
    queryFn: async () => {
      if (!lessonId) return null

      // 1. Check local curriculum course units in SchoolStore
      const storeUnits = schoolStore.getCourseUnits()
      for (const unit of storeUnits) {
        const found = unit.lessons?.find(
          (l) => l.id === lessonId || l.title.toLowerCase() === lessonId.toLowerCase()
        )
        if (found) {
          return {
            id: found.id,
            title: found.title,
            youtube_url: found.video_url || '',
            description: found.content || '',
            course_id: unit.id,
            course_title: unit.title,
            created_at: unit.created_at || new Date().toISOString(),
            isLocal: true,
            quiz: null as Quiz | null,
          }
        }
      }

      // 2. Check Supabase if valid UUID
      if (isValidUuid(lessonId)) {
        try {
          const { data, error: _error } = await supabase
            .from('lessons')
            .select('*, quiz:quizzes(*)')
            .eq('id', lessonId)
            .maybeSingle()
          if (data) {
            return {
              ...data,
              isLocal: false,
            }
          }
        } catch {}
      }

      // 3. Fallback generic lesson
      return {
        id: lessonId,
        title: 'Instructional Video Lesson',
        youtube_url: 'https://www.youtube.com/watch?v=un50Bs4BvZ8',
        description: '',
        course_id: courseIdParam || 'unit-grd1',
        course_title: 'Vocational Course Unit',
        created_at: new Date().toISOString(),
        isLocal: true,
        quiz: null as Quiz | null,
      }
    },
    enabled: !!lessonId,
  })

  useEffect(() => {
    if (lessonData) {
      setTitle(lessonData.title || '')
      setYoutubeUrl(lessonData.youtube_url || '')
      setDescription(lessonData.description || '')
      if (lessonData.quiz) {
        setQuestion(lessonData.quiz.question || '')
        setOptionA(lessonData.quiz.options?.[0] || '')
        setOptionB(lessonData.quiz.options?.[1] || '')
        setOptionC(lessonData.quiz.options?.[2] || '')
        setOptionD(lessonData.quiz.options?.[3] || '')
        setCorrectIndex(lessonData.quiz.correct_option_index || 0)
      }
    }
  }, [lessonData])

  const canEdit = profile?.role === 'admin' || profile?.role === 'teacher' || (lessonData ? isEditable(lessonData.created_at) : true)

  // Save mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!lessonId) return
      if (!canEdit) throw new Error('24-hour edit window has expired. Contact admin to modify.')

      const cleanTitle = title.trim()
      const cleanUrl = youtubeUrl.trim()
      const cleanDesc = description.trim()

      // 1. Update in SchoolDataStore
      const activeCourseId = courseIdParam || lessonData?.course_id || ''
      await schoolStore.updateLesson(activeCourseId, lessonId, {
        title: cleanTitle,
        video_url: cleanUrl,
        content: cleanDesc,
      })

      // 2. Also update Supabase if UUID
      if (isValidUuid(lessonId)) {
        try {
          await supabase
            .from('lessons')
            .update({
              title: cleanTitle,
              youtube_url: cleanUrl,
              description: cleanDesc || null,
            })
            .eq('id', lessonId)

          if (lessonData?.quiz?.id) {
            await supabase
              .from('quizzes')
              .update({
                question: question.trim(),
                options: [optionA.trim(), optionB.trim(), optionC.trim(), optionD.trim()],
                correct_option_index: correctIndex,
              })
              .eq('id', lessonData.quiz.id)
          }
        } catch {}
      }
    },
    onSuccess: () => {
      navigate('/teacher/courses')
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  if (isLoading) {
    return (
      <PageWrapper title="Loading Lesson...">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
          <Spinner size="lg" />
        </div>
      </PageWrapper>
    )
  }

  if (!lessonData) {
    return (
      <PageWrapper title="Lesson Not Found">
        <div className="alert alert-danger">Lesson not found.</div>
      </PageWrapper>
    )
  }

  const lesson = lessonData

  return (
    <PageWrapper title={`Edit Lesson: ${lesson.title}`}>
      <Link to="/teacher/courses" className="lesson-back-link mb-4">
        ← Back to My Courses
      </Link>

      {/* 24h Lock Banner */}
      <div className="mb-6">
        {canEdit ? (
          <div className="alert alert-success">
            <span className="alert-icon">⏳</span>
            <div>
              <strong>Editable:</strong> You have {getEditTimeRemaining(lesson.created_at)} remaining to make changes before this lesson is locked.
            </div>
          </div>
        ) : (
          <div className="alert alert-warning">
            <span className="alert-icon">🔒</span>
            <div>
              <strong>24-Hour Lock Active:</strong> Uploaded lessons can only be edited within 24 hours. Contact school admin for overrides.
            </div>
          </div>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate() }} style={{ maxWidth: 760, margin: '0 auto' }}>
        {error && (
          <div className="alert alert-danger mb-4">
            <span className="alert-icon">⚠️</span>
            <div>{error}</div>
          </div>
        )}

        <div className="card mb-6">
          <div className="card-header">
            <h3 style={{ margin: 0 }}>📹 Lesson Details</h3>
          </div>
          <div className="card-body">
            <fieldset disabled={!canEdit} style={{ border: 'none', padding: 0, margin: 0 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="editTitle">Lesson Title *</label>
                <input
                  id="editTitle"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="editYt">Video Stream URL (MP4, Cloudflare R2, or Stream Link) *</label>
                <input
                  id="editYt"
                  type="url"
                  placeholder="https://.../lesson.mp4 or video stream URL"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  required
                />
              </div>

              {youtubeUrl.trim() && (
                <div className="mt-4">
                  <label className="form-label">Video Stream Preview:</label>
                  <YouTubeEmbed url={youtubeUrl} />
                </div>
              )}

              <div className="form-group mt-4">
                <label className="form-label" htmlFor="editDesc">Lesson Description</label>
                <textarea
                  id="editDesc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </fieldset>
          </div>
        </div>

        {/* Quiz Edit Section */}
        {lesson.quiz && (
          <div className="card mb-6">
            <div className="card-header">
              <h3 style={{ margin: 0 }}>❓ Quiz Question</h3>
            </div>
            <div className="card-body">
              <fieldset disabled={!canEdit} style={{ border: 'none', padding: 0, margin: 0 }}>
                <div className="form-group">
                  <label className="form-label">Question Text</label>
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-2" style={{ gap: 'var(--space-4)' }}>
                  <div className="form-group">
                    <label className="form-label">Option A</label>
                    <input type="text" value={optionA} onChange={(e) => setOptionA(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Option B</label>
                    <input type="text" value={optionB} onChange={(e) => setOptionB(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Option C</label>
                    <input type="text" value={optionC} onChange={(e) => setOptionC(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Option D</label>
                    <input type="text" value={optionD} onChange={(e) => setOptionD(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group mt-4">
                  <label className="form-label">Correct Option</label>
                  <div className="flex gap-4 flex-wrap">
                    {['Option A', 'Option B', 'Option C', 'Option D'].map((opt, idx) => (
                      <label key={idx} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="editCorrect"
                          checked={correctIndex === idx}
                          onChange={() => setCorrectIndex(idx)}
                          style={{ width: 'auto' }}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </fieldset>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mb-8">
          <Button type="button" variant="ghost" onClick={() => navigate('/teacher/courses')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!canEdit} loading={updateMutation.isPending}>
            Save Changes 💾
          </Button>
        </div>
      </form>
    </PageWrapper>
  )
}
