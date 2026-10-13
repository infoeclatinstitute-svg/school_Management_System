import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { YouTubeEmbed } from '@/components/shared/YouTubeEmbed'
import { Button } from '@/components/ui/Button'
import { extractYouTubeId } from '@/lib/utils'
import type { Course } from '@/lib/database.types'

interface QuestionItem {
  id: string
  question: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctIndex: number
}

export function LessonUploader() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get('courseId')

  // Form states
  const [title, setTitle] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [description, setDescription] = useState('')
  const [resourceFile, setResourceFile] = useState<File | null>(null)

  // Multi-Question Quiz state
  const [questions, setQuestions] = useState<QuestionItem[]>([
    {
      id: 'q-1',
      question: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctIndex: 0,
    },
  ])

  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Fetch target course
  const { data: course } = useQuery({
    queryKey: ['target-course', courseId],
    queryFn: async () => {
      if (!courseId) return null
      const { data } = await supabase.from('courses').select('*').eq('id', courseId).single()
      return data as Course
    },
    enabled: !!courseId,
  })

  // Add Question helper
  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q-${Date.now()}-${prev.length + 1}`,
        question: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctIndex: 0,
      },
    ])
  }

  // Remove Question helper
  const removeQuestion = (id: string) => {
    if (questions.length <= 1) return
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  // Update Question field helper
  const updateQuestion = (id: string, field: keyof QuestionItem, value: string | number) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseId) {
      setError('Missing course ID parameter.')
      return
    }
    if (!title.trim() || !youtubeUrl.trim()) {
      setError('Lesson Title and Video Stream URL are required.')
      return
    }

    // Validate all questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question.trim() || !q.optionA.trim() || !q.optionB.trim() || !q.optionC.trim() || !q.optionD.trim()) {
        setError(`Please fill in all details for Question #${i + 1}.`)
        return
      }
    }

    setError(null)
    setUploading(true)

    try {
      // 1. Create Lesson record
      const { data: lesson, error: lessonErr } = await supabase
        .from('lessons')
        .insert({
          course_id: courseId,
          title: title.trim(),
          youtube_url: youtubeUrl.trim(),
          description: description.trim() || null,
        })
        .select()
        .single()

      if (lessonErr || !lesson) throw lessonErr

      // 2. Create Quiz records (bulk insert for all questions)
      const quizRecords = questions.map((q) => ({
        lesson_id: lesson.id,
        question: q.question.trim(),
        options: [q.optionA.trim(), q.optionB.trim(), q.optionC.trim(), q.optionD.trim()],
        correct_option_index: q.correctIndex,
      }))

      const { error: quizErr } = await supabase.from('quizzes').insert(quizRecords)
      if (quizErr) throw quizErr

      // 3. Upload Resource file (PDF, HTML, DOCX, ZIP) if provided
      if (resourceFile && profile?.id) {
        const filePath = `${lesson.id}/${Date.now()}_${resourceFile.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`
        const fileType = resourceFile.name.endsWith('.html') || resourceFile.name.endsWith('.htm')
          ? 'text/html'
          : resourceFile.type || 'application/octet-stream'

        // Upload to Storage bucket (bucket name: 'lesson-resources')
        const { error: storageErr } = await supabase.storage
          .from('lesson-resources')
          .upload(filePath, resourceFile, {
            contentType: fileType,
            upsert: true,
          })

        if (storageErr) {
          console.warn('Storage upload notice:', storageErr.message)
        }

        const { data: publicUrlData } = supabase.storage
          .from('lesson-resources')
          .getPublicUrl(filePath)

        // Insert into database table (table name: 'lesson_resources' with underscore)
        const { error: resDbErr } = await supabase.from('lesson_resources').insert({
          lesson_id: lesson.id,
          file_name: resourceFile.name,
          file_url: publicUrlData.publicUrl,
          file_type: fileType,
          uploaded_by: profile.id,
        })

        if (resDbErr) {
          throw new Error(`Failed to save file resource record: ${resDbErr.message}`)
        }
      }

      setUploading(false)
      navigate(`/student/courses/${courseId}`)
    } catch (err: unknown) {
      setUploading(false)
      const message = err instanceof Error ? err.message : 'Upload failed. Please check parameters.'
      setError(message)
    }
  }

  if (profile?.role !== 'admin') {
    return (
      <PageWrapper title="Access Restricted">
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '2rem auto' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
            Administrator Access Only
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            Only College Administrators are authorized to upload video lessons and learning material files.
          </p>
          <Button variant="primary" onClick={() => navigate('/admin')}>
            ← Return to Dashboard
          </Button>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper
      title="Upload Video Lesson & Multi-Question Quiz"
      subtitle={course ? `Course: ${course.title}` : 'Add a new module to your course'}
    >
      <Link to="/teacher/courses" className="lesson-back-link mb-4">
        ← Back to My Courses
      </Link>

      <form onSubmit={handleSubmit} style={{ maxWidth: 800, margin: '0 auto' }}>
        {error && (
          <div className="alert alert-danger mb-4">
            <span className="alert-icon">⚠️</span>
            <div>{error}</div>
          </div>
        )}

        {/* Section 1: Lesson Video Details */}
        <div className="card mb-6">
          <div className="card-header">
            <h3 style={{ margin: 0 }}>📹 1. Lesson Video Details</h3>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label" htmlFor="lessonTitle">Lesson / Module Title *</label>
              <input
                id="lessonTitle"
                type="text"
                placeholder="e.g. Module 1: Database Management Systems & Architecture"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="ytUrl">Video Stream URL (MP4, Cloudflare R2, or Stream Link) *</label>
              <input
                id="ytUrl"
                type="url"
                placeholder="https://.../lesson.mp4 or video stream URL"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                required
              />
              <span className="form-hint">Paste any cloud stream URL, direct MP4 video link, or secure video stream.</span>
            </div>

            {/* Video Preview */}
            {youtubeUrl.trim() && (
              <div className="mt-4">
                <label className="form-label">Video Stream Preview:</label>
                <YouTubeEmbed url={youtubeUrl} />
              </div>
            )}

            <div className="form-group mt-4">
              <label className="form-label" htmlFor="lessonDesc">Lesson Overview / Notes (Optional)</label>
              <textarea
                id="lessonDesc"
                placeholder="Brief summary of what this lesson covers..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Section 2: PDF & HTML Resource Attachment (Optional) */}
        <div className="card mb-6">
          <div className="card-header">
            <h3 style={{ margin: 0 }}>📄 2. Lesson Resources (HTML, PDF, Documents)</h3>
          </div>
          <div className="card-body">
            <div className="file-dropzone">
              <input
                type="file"
                accept=".pdf, .html, .htm, text/html, application/pdf, .zip, .docx"
                id="filePicker"
                style={{ display: 'none' }}
                onChange={(e) => setResourceFile(e.target.files?.[0] || null)}
              />
              <label htmlFor="filePicker" style={{ cursor: 'pointer', display: 'block' }}>
                <div style={{ fontSize: 32, marginBottom: 'var(--space-2)' }}>🌐 📄 📎</div>
                <div className="font-bold text-sm">
                  {resourceFile ? `Selected: ${resourceFile.name}` : 'Click to attach HTML files, PDF notes, or interactive lab materials'}
                </div>
                <div className="text-xs text-muted mt-1">Accepts HTML (.html, .htm), PDF, DOCX, ZIP files up to 20MB</div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Multi-Question Quiz Builder */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 style={{ margin: 0, fontSize: 'var(--text-xl)', color: 'var(--color-primary)' }}>
                ❓ 3. Module Knowledge Check ({questions.length} Question{questions.length > 1 ? 's' : ''})
              </h3>
              <p className="text-xs text-muted">
                Add as many quiz questions as you want. Students must complete all questions to pass the module.
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={addQuestion}>
              + Add Another Question
            </Button>
          </div>

          <div className="flex flex-col gap-6">
            {questions.map((q, qIndex) => (
              <div
                key={q.id}
                className="card"
                style={{ border: '2px solid var(--color-secondary)' }}
              >
                <div className="card-header flex justify-between items-center" style={{ background: '#eaecf8' }}>
                  <h4 style={{ margin: 0, color: 'var(--color-primary)', fontSize: 'var(--text-base)' }}>
                    Question #{qIndex + 1}
                  </h4>
                  {questions.length > 1 && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => removeQuestion(q.id)}
                    >
                      Remove Question
                    </Button>
                  )}
                </div>

                <div className="card-body">
                  <div className="form-group">
                    <label className="form-label">Question Text *</label>
                    <input
                      type="text"
                      placeholder={`e.g. Question ${qIndex + 1} details...`}
                      value={q.question}
                      onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-2" style={{ gap: 'var(--space-4)' }}>
                    <div className="form-group">
                      <label className="form-label">Option A *</label>
                      <input
                        type="text"
                        placeholder="First option"
                        value={q.optionA}
                        onChange={(e) => updateQuestion(q.id, 'optionA', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Option B *</label>
                      <input
                        type="text"
                        placeholder="Second option"
                        value={q.optionB}
                        onChange={(e) => updateQuestion(q.id, 'optionB', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Option C *</label>
                      <input
                        type="text"
                        placeholder="Third option"
                        value={q.optionC}
                        onChange={(e) => updateQuestion(q.id, 'optionC', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Option D *</label>
                      <input
                        type="text"
                        placeholder="Fourth option"
                        value={q.optionD}
                        onChange={(e) => updateQuestion(q.id, 'optionD', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group mt-4 mb-0">
                    <label className="form-label">Select Correct Answer *</label>
                    <div className="flex gap-4 flex-wrap">
                      {['Option A', 'Option B', 'Option C', 'Option D'].map((optLabel, optIdx) => (
                        <label key={optIdx} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="radio"
                            name={`correctOpt-${q.id}`}
                            checked={q.correctIndex === optIdx}
                            onChange={() => updateQuestion(q.id, 'correctIndex', optIdx)}
                            style={{ width: 'auto' }}
                          />
                          <span>{optLabel}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-center">
            <Button type="button" variant="outline" onClick={addQuestion}>
              + Add Question #{questions.length + 1}
            </Button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 mb-8">
          <Button type="button" variant="ghost" onClick={() => navigate('/teacher/courses')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="lg" loading={uploading}>
            Publish Lesson & {questions.length} Question Quiz 🚀
          </Button>
        </div>
      </form>
    </PageWrapper>
  )
}
