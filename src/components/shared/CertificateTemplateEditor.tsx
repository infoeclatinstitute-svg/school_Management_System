import { useState, useRef, useEffect } from 'react'
import {
  CertificateTemplateConfig,
  createDefaultAutomatedTemplate,
  getActiveCertificateTemplate,
  saveCertificateTemplate,
  deleteCertificateTemplate,
} from '@/lib/certificateTemplate'
import { schoolStore } from '@/lib/schoolData'
import { CheckIcon, SparklesIcon } from '@/components/icons/AppIcons'

interface CertificateTemplateEditorProps {
  onSaved?: (template: CertificateTemplateConfig) => void
  onClose?: () => void
}

export function CertificateTemplateEditor({ onSaved, onClose }: CertificateTemplateEditorProps) {
  const [template, setTemplate] = useState<CertificateTemplateConfig | null>(() => getActiveCertificateTemplate())
  const [activeFieldKey, setActiveFieldKey] = useState<string>('studentName')
  const [isDragging, setIsDragging] = useState(false)
  const [dragField, setDragField] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isProcessingUpload, setIsProcessingUpload] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sample or live preview student
  const students = schoolStore.getStudents()
  const [sampleIndex, setSampleIndex] = useState(0)

  const sampleStudent = students[sampleIndex] || {
    full_name: 'Sophia Vance Al-Mansoor',
    admission_number: 'GC-2026-ENG042',
    class_name: 'Full-Stack Software Engineering & Cloud Architecture',
    certificate_grade: 'Distinction (Grade A+)',
    certificate_number: 'GC-CERT-2026-7892',
  }

  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Handle image upload from file or drag-and-drop
  const handleImageFile = (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, SVG, WebP).')
      return
    }

    setIsProcessingUpload(true)
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      if (!dataUrl) {
        setIsProcessingUpload(false)
        return
      }

      // Detect intrinsic dimensions to compute aspect ratio and orientation
      const img = new Image()
      img.onload = () => {
        const aspect = img.naturalWidth / img.naturalHeight
        const isLandscape = aspect >= 1.15
        const autoTemplate = createDefaultAutomatedTemplate(
          dataUrl,
          file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          aspect,
          isLandscape ? 'landscape' : 'portrait'
        )

        setTemplate(autoTemplate)
        setIsProcessingUpload(false)
      }
      img.onerror = () => {
        // Fallback to standard A4 landscape
        const autoTemplate = createDefaultAutomatedTemplate(dataUrl, 'Institutional Certificate', 1.414, 'landscape')
        setTemplate(autoTemplate)
        setIsProcessingUpload(false)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0])
    }
  }

  // Live Canvas Dragging to Reposition Fields directly with Mouse / Touch
  const handleMouseDown = (fieldKey: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveFieldKey(fieldKey)
    setDragField(fieldKey)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragField || !canvasRef.current || !template) return

      const rect = canvasRef.current.getBoundingClientRect()
      const clientX = e.clientX
      const clientY = e.clientY

      let newX = ((clientX - rect.left) / rect.width) * 100
      let newY = ((clientY - rect.top) / rect.height) * 100

      // Clamp within canvas bounds (5% to 95%)
      newX = Math.max(4, Math.min(96, Math.round(newX * 10) / 10))
      newY = Math.max(4, Math.min(96, Math.round(newY * 10) / 10))

      setTemplate((prev) => {
        if (!prev) return prev
        if (dragField === 'qrCode') {
          return {
            ...prev,
            fields: {
              ...prev.fields,
              qrCode: { ...prev.fields.qrCode, x: newX, y: newY },
            },
          }
        }

        const currentField = prev.fields[dragField as keyof typeof prev.fields]
        if (!currentField || typeof currentField !== 'object') return prev

        return {
          ...prev,
          fields: {
            ...prev.fields,
            [dragField]: { ...currentField, x: newX, y: newY },
          },
        }
      })
    }

    const handleMouseUp = () => {
      if (dragField) {
        setDragField(null)
      }
    }

    if (dragField) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragField, template])

  const handleSave = async () => {
    if (!template) return
    await saveCertificateTemplate(template)
    setSaveSuccess(true)
    if (onSaved) onSaved(template)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const handleResetAuto = () => {
    if (!template) return
    const auto = createDefaultAutomatedTemplate(
      template.backgroundImageUrl,
      template.name,
      template.aspectRatio,
      template.orientation
    )
    setTemplate(auto)
  }

  const handleRevertDefault = async () => {
    if (confirm('Revert back to the standard Global College gold diploma?')) {
      await deleteCertificateTemplate()
      setTemplate(null)
      if (onClose) onClose()
    }
  }

  // Verification QR link
  const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/#verify?cert=${encodeURIComponent(sampleStudent.certificate_number || 'GC-CERT-SAMPLE')}`

  return (
    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      {/* Header bar */}
      <div
        style={{
          padding: '1.25rem 1.75rem',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.3rem' }}>📜</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
              Institutional Certificate Studio & Automation
            </h2>
          </div>
          <p style={{ margin: '4px 0 0', color: '#93c5fd', fontSize: '0.84rem' }}>
            Upload your institution's certificate design. The system automatically populates student names, credentials, dates & verification QR codes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {template && (
            <>
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleResetAuto}
                style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }}
                title="Automatically re-align all fields to standard diploma coordinates"
              >
                <SparklesIcon size={14} />
                <span>Auto-Align Layout</span>
              </button>

              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleSave}
                style={{ background: '#10b981', borderColor: '#059669', color: '#ffffff', fontWeight: 800 }}
              >
                {saveSuccess ? <CheckIcon size={14} color="#ffffff" /> : null}
                <span>{saveSuccess ? 'Activated!' : 'Save & Activate Template'}</span>
              </button>
            </>
          )}

          {onClose && (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={onClose}
              style={{ color: '#ffffff' }}
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* Main Studio Body */}
      <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: template ? '1fr 340px' : '1fr', gap: '1.5rem' }}>
        {/* Left Column: Canvas Preview or Upload Dropzone */}
        <div>
          {!template ? (
            /* Upload Dropzone */
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? '#2563eb' : '#cbd5e1'}`,
                background: isDragging ? '#eff6ff' : '#f8fafc',
                borderRadius: '16px',
                padding: '3.5rem 2rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleImageFile(e.target.files[0])
                  }
                }}
              />

              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: '#dbeafe',
                  color: '#1e40af',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                  fontSize: '2rem',
                }}
              >
                {isProcessingUpload ? '⏳' : '📤'}
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                {isProcessingUpload ? 'Analyzing & Automating Certificate...' : 'Upload Your Certificate Template'}
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 1.25rem', lineHeight: 1.5 }}>
                Drop your official certificate design (PNG, JPEG, WebP, SVG). The system will automatically detect the layout and position the student's name, qualifications, and verification QR code.
              </p>

              <button
                type="button"
                className="btn btn-primary"
                style={{ pointerEvents: 'none', fontWeight: 700, padding: '0.65rem 1.5rem' }}
              >
                Select Certificate Image
              </button>

              <div style={{ marginTop: '1.5rem', fontSize: '0.78rem', color: '#94a3b8' }}>
                Tip: Works with any Canva, Adobe Illustrator, Photoshop, or scanned institutional diploma.
              </div>
            </div>
          ) : (
            /* Live Interactive Certificate Canvas */
            <div>
              {/* Sample Student / Preview Switcher Toolbar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.85rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  fontSize: '0.82rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, color: '#475569' }}>Preview With:</span>
                  <select
                    className="input"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.82rem', height: '32px' }}
                    value={sampleIndex}
                    onChange={(e) => setSampleIndex(Number(e.target.value))}
                  >
                    {students.length > 0 ? (
                      students.map((s, idx) => (
                        <option key={s.id || idx} value={idx}>
                          {s.full_name} ({s.admission_number})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value={0}>Sophia Vance Al-Mansoor (Software Engineering)</option>
                        <option value={1}>David Kimani Mwangi (Data Science)</option>
                        <option value={2}>Amara Chioma Okafor (Creative Design)</option>
                      </>
                    )}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ fontSize: '0.78rem' }}
                  >
                    🔄 Replace Image
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleImageFile(e.target.files[0])
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={handleRevertDefault}
                    style={{ fontSize: '0.78rem', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}
                  >
                    Revert to Default Diploma
                  </button>
                </div>
              </div>

              {/* Certificate Canvas Area */}
              <div
                style={{
                  background: '#334155',
                  padding: '16px',
                  borderRadius: '12px',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
                  overflowX: 'auto',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <div
                  ref={canvasRef}
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '860px',
                    aspectRatio: `${template.aspectRatio} / 1`,
                    backgroundImage: `url(${template.backgroundImageUrl})`,
                    backgroundSize: '100% 100%',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    boxShadow: '0 10px 35px rgba(0,0,0,0.5)',
                    borderRadius: '4px',
                    userSelect: 'none',
                    overflow: 'hidden',
                  }}
                >
                  {/* Student Name */}
                  {template.fields.studentName.enabled && (
                    <div
                      onMouseDown={(e) => handleMouseDown('studentName', e)}
                      style={{
                        position: 'absolute',
                        left: `${template.fields.studentName.x}%`,
                        top: `${template.fields.studentName.y}%`,
                        transform: 'translate(-50%, -50%)',
                        fontSize: `clamp(14px, ${template.fields.studentName.fontSize * 0.09}vw, ${template.fields.studentName.fontSize}px)`,
                        color: template.fields.studentName.color,
                        fontWeight: template.fields.studentName.fontWeight || 'bold',
                        fontFamily: template.fields.studentName.fontFamily || 'serif',
                        letterSpacing: template.fields.studentName.letterSpacing || 'normal',
                        textAlign: template.fields.studentName.textAlign || 'center',
                        cursor: 'move',
                        padding: '2px 8px',
                        border: activeFieldKey === 'studentName' ? '2px dashed #2563eb' : '1px dashed transparent',
                        borderRadius: '4px',
                        background: activeFieldKey === 'studentName' ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                        whiteSpace: 'nowrap',
                      }}
                      title="Click and drag to reposition student name"
                    >
                      {sampleStudent.full_name}
                    </div>
                  )}

                  {/* Admission Number */}
                  {template.fields.admissionNumber.enabled && (
                    <div
                      onMouseDown={(e) => handleMouseDown('admissionNumber', e)}
                      style={{
                        position: 'absolute',
                        left: `${template.fields.admissionNumber.x}%`,
                        top: `${template.fields.admissionNumber.y}%`,
                        transform: 'translate(-50%, -50%)',
                        fontSize: `clamp(9px, ${template.fields.admissionNumber.fontSize * 0.09}vw, ${template.fields.admissionNumber.fontSize}px)`,
                        color: template.fields.admissionNumber.color,
                        fontWeight: template.fields.admissionNumber.fontWeight || '600',
                        fontFamily: template.fields.admissionNumber.fontFamily || 'sans-serif',
                        cursor: 'move',
                        padding: '2px 6px',
                        border: activeFieldKey === 'admissionNumber' ? '2px dashed #2563eb' : '1px dashed transparent',
                        borderRadius: '4px',
                        background: activeFieldKey === 'admissionNumber' ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                        whiteSpace: 'nowrap',
                      }}
                      title="Click and drag to reposition admission number"
                    >
                      {template.fields.admissionNumber.prefix || ''}{sampleStudent.admission_number}
                    </div>
                  )}

                  {/* Course / Qualification Title */}
                  {template.fields.courseTitle.enabled && (
                    <div
                      onMouseDown={(e) => handleMouseDown('courseTitle', e)}
                      style={{
                        position: 'absolute',
                        left: `${template.fields.courseTitle.x}%`,
                        top: `${template.fields.courseTitle.y}%`,
                        transform: 'translate(-50%, -50%)',
                        fontSize: `clamp(11px, ${template.fields.courseTitle.fontSize * 0.09}vw, ${template.fields.courseTitle.fontSize}px)`,
                        color: template.fields.courseTitle.color,
                        fontWeight: template.fields.courseTitle.fontWeight || 'bold',
                        fontFamily: template.fields.courseTitle.fontFamily || 'serif',
                        letterSpacing: template.fields.courseTitle.letterSpacing || 'normal',
                        textAlign: template.fields.courseTitle.textAlign || 'center',
                        cursor: 'move',
                        padding: '2px 8px',
                        border: activeFieldKey === 'courseTitle' ? '2px dashed #2563eb' : '1px dashed transparent',
                        borderRadius: '4px',
                        background: activeFieldKey === 'courseTitle' ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                        maxWidth: '85%',
                        lineHeight: 1.25,
                      }}
                      title="Click and drag to reposition course title"
                    >
                      {sampleStudent.class_name || 'Vocational & Applied Technical Certification'}
                    </div>
                  )}

                  {/* Academic Grade / Honors */}
                  {template.fields.grade.enabled && (
                    <div
                      onMouseDown={(e) => handleMouseDown('grade', e)}
                      style={{
                        position: 'absolute',
                        left: `${template.fields.grade.x}%`,
                        top: `${template.fields.grade.y}%`,
                        transform: 'translate(-50%, -50%)',
                        fontSize: `clamp(9px, ${template.fields.grade.fontSize * 0.09}vw, ${template.fields.grade.fontSize}px)`,
                        color: template.fields.grade.color,
                        fontWeight: template.fields.grade.fontWeight || '700',
                        fontFamily: template.fields.grade.fontFamily || 'sans-serif',
                        cursor: 'move',
                        padding: '2px 6px',
                        border: activeFieldKey === 'grade' ? '2px dashed #2563eb' : '1px dashed transparent',
                        borderRadius: '4px',
                        background: activeFieldKey === 'grade' ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                        whiteSpace: 'nowrap',
                      }}
                      title="Click and drag to reposition grade"
                    >
                      {template.fields.grade.prefix || ''}{sampleStudent.certificate_grade || 'Distinction (Grade A)'}
                    </div>
                  )}

                  {/* Issue Date */}
                  {template.fields.issueDate.enabled && (
                    <div
                      onMouseDown={(e) => handleMouseDown('issueDate', e)}
                      style={{
                        position: 'absolute',
                        left: `${template.fields.issueDate.x}%`,
                        top: `${template.fields.issueDate.y}%`,
                        transform: 'translate(-50%, -50%)',
                        fontSize: `clamp(9px, ${template.fields.issueDate.fontSize * 0.09}vw, ${template.fields.issueDate.fontSize}px)`,
                        color: template.fields.issueDate.color,
                        fontWeight: template.fields.issueDate.fontWeight || '600',
                        fontFamily: template.fields.issueDate.fontFamily || 'sans-serif',
                        cursor: 'move',
                        padding: '2px 6px',
                        border: activeFieldKey === 'issueDate' ? '2px dashed #2563eb' : '1px dashed transparent',
                        borderRadius: '4px',
                        background: activeFieldKey === 'issueDate' ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                        whiteSpace: 'nowrap',
                      }}
                      title="Click and drag to reposition issue date"
                    >
                      {template.fields.issueDate.prefix || ''}{currentDate}
                    </div>
                  )}

                  {/* Certificate Serial Number */}
                  {template.fields.certificateNo.enabled && (
                    <div
                      onMouseDown={(e) => handleMouseDown('certificateNo', e)}
                      style={{
                        position: 'absolute',
                        left: `${template.fields.certificateNo.x}%`,
                        top: `${template.fields.certificateNo.y}%`,
                        transform: 'translate(-50%, -50%)',
                        fontSize: `clamp(8px, ${template.fields.certificateNo.fontSize * 0.09}vw, ${template.fields.certificateNo.fontSize}px)`,
                        color: template.fields.certificateNo.color,
                        fontWeight: template.fields.certificateNo.fontWeight || '600',
                        fontFamily: template.fields.certificateNo.fontFamily || 'monospace',
                        cursor: 'move',
                        padding: '2px 6px',
                        border: activeFieldKey === 'certificateNo' ? '2px dashed #2563eb' : '1px dashed transparent',
                        borderRadius: '4px',
                        background: activeFieldKey === 'certificateNo' ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                        whiteSpace: 'nowrap',
                      }}
                      title="Click and drag to reposition certificate number"
                    >
                      {template.fields.certificateNo.prefix || ''}{sampleStudent.certificate_number || 'GC-CERT-2026-7892'}
                    </div>
                  )}

                  {/* Verification QR Code */}
                  {template.fields.qrCode.enabled && (
                    <div
                      onMouseDown={(e) => handleMouseDown('qrCode', e)}
                      style={{
                        position: 'absolute',
                        left: `${template.fields.qrCode.x}%`,
                        top: `${template.fields.qrCode.y}%`,
                        transform: 'translate(-50%, -50%)',
                        cursor: 'move',
                        padding: '3px',
                        border: activeFieldKey === 'qrCode' ? '2px dashed #2563eb' : '1px solid rgba(0,0,0,0.2)',
                        borderRadius: '6px',
                        background: '#ffffff',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                      }}
                      title={`Click and drag to reposition verification QR code (${verifyUrl})`}
                    >
                      <svg viewBox="0 0 25 25" width={template.fields.qrCode.size} height={template.fields.qrCode.size} fill="#090d16">
                        <rect x="1" y="1" width="7" height="7" fill="#090d16" />
                        <rect x="2" y="2" width="5" height="5" fill="#ffffff" />
                        <rect x="3" y="3" width="3" height="3" fill="#090d16" />

                        <rect x="17" y="1" width="7" height="7" fill="#090d16" />
                        <rect x="18" y="2" width="5" height="5" fill="#ffffff" />
                        <rect x="19" y="3" width="3" height="3" fill="#090d16" />

                        <rect x="1" y="17" width="7" height="7" fill="#090d16" />
                        <rect x="2" y="18" width="5" height="5" fill="#ffffff" />
                        <rect x="3" y="19" width="3" height="3" fill="#090d16" />

                        <rect x="10" y="2" width="2" height="2" />
                        <rect x="14" y="2" width="1" height="3" />
                        <rect x="10" y="6" width="3" height="1" />
                        <rect x="10" y="9" width="5" height="5" fill="#090d16" />
                        <rect x="11" y="10" width="3" height="3" fill="#ffffff" />
                        <rect x="12" y="11" width="1" height="1" fill="#090d16" />

                        <rect x="1" y="10" width="2" height="4" />
                        <rect x="5" y="11" width="2" height="2" />
                        <rect x="7" y="9" width="1" height="4" />

                        <rect x="17" y="10" width="3" height="2" />
                        <rect x="21" y="11" width="2" height="3" />
                        <rect x="18" y="14" width="4" height="1" />

                        <rect x="10" y="16" width="3" height="2" />
                        <rect x="14" y="18" width="2" height="4" />
                        <rect x="10" y="20" width="3" height="2" />

                        <rect x="17" y="18" width="2" height="2" />
                        <rect x="20" y="17" width="3" height="2" />
                        <rect x="18" y="21" width="4" height="2" />
                      </svg>
                      <div style={{ fontSize: '7px', fontWeight: 800, color: '#15803d', marginTop: '1px', letterSpacing: '0.04em' }}>
                        VERIFIED QR
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '0.65rem', textAlign: 'center', fontSize: '0.78rem', color: '#64748b' }}>
                💡 Click any element on the certificate canvas and drag it to reposition. Use the sidebar controls for font and color settings.
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Fine-Tuning Field Controls (Shown when template is active) */}
        {template && (
          <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '1.25rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
              Field Customization
            </h4>

            {/* Field selector tabs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '1rem' }}>
              {[
                { key: 'studentName', label: '👤 Student Name' },
                { key: 'courseTitle', label: '🎓 Course Title' },
                { key: 'admissionNumber', label: '🔢 Admission No' },
                { key: 'grade', label: '⭐ Grade/Honors' },
                { key: 'issueDate', label: '📅 Issue Date' },
                { key: 'certificateNo', label: '📜 Serial No' },
                { key: 'qrCode', label: '🛡️ QR Code' },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setActiveFieldKey(f.key)}
                  style={{
                    fontSize: '0.75rem',
                    padding: '4px 8px',
                    background: activeFieldKey === f.key ? '#1e3a8a' : '#f1f5f9',
                    color: activeFieldKey === f.key ? '#ffffff' : '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Field-Specific Controls */}
            {activeFieldKey === 'qrCode' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={template.fields.qrCode.enabled}
                    onChange={(e) =>
                      setTemplate({
                        ...template,
                        fields: {
                          ...template.fields,
                          qrCode: { ...template.fields.qrCode, enabled: e.target.checked },
                        },
                      })
                    }
                  />
                  <span style={{ fontWeight: 700 }}>Enable Cryptographic QR Code</span>
                </label>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>QR Size: {template.fields.qrCode.size}px</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="110"
                    value={template.fields.qrCode.size}
                    onChange={(e) =>
                      setTemplate({
                        ...template,
                        fields: {
                          ...template.fields,
                          qrCode: { ...template.fields.qrCode, size: Number(e.target.value) },
                        },
                      })
                    }
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Horizontal (X): {template.fields.qrCode.x}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="95"
                    value={template.fields.qrCode.x}
                    onChange={(e) =>
                      setTemplate({
                        ...template,
                        fields: {
                          ...template.fields,
                          qrCode: { ...template.fields.qrCode, x: Number(e.target.value) },
                        },
                      })
                    }
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Vertical (Y): {template.fields.qrCode.y}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="95"
                    value={template.fields.qrCode.y}
                    onChange={(e) =>
                      setTemplate({
                        ...template,
                        fields: {
                          ...template.fields,
                          qrCode: { ...template.fields.qrCode, y: Number(e.target.value) },
                        },
                      })
                    }
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            ) : (
              (() => {
                const fKey = activeFieldKey as keyof typeof template.fields
                const field = template.fields[fKey]
                if (!field || typeof field !== 'object' || !('fontSize' in field)) return null

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.82rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={field.enabled}
                        onChange={(e) =>
                          setTemplate({
                            ...template,
                            fields: {
                              ...template.fields,
                              [fKey]: { ...field, enabled: e.target.checked },
                            },
                          })
                        }
                      />
                      <span style={{ fontWeight: 700 }}>Enable this field</span>
                    </label>

                    {/* Font Size */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>Font Size: {field.fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="52"
                        value={field.fontSize}
                        onChange={(e) =>
                          setTemplate({
                            ...template,
                            fields: {
                              ...template.fields,
                              [fKey]: { ...field, fontSize: Number(e.target.value) },
                            },
                          })
                        }
                        style={{ width: '100%' }}
                      />
                    </div>

                    {/* Font Color */}
                    <div>
                      <span style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Color</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="color"
                          value={field.color}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              fields: {
                                ...template.fields,
                                [fKey]: { ...field, color: e.target.value },
                              },
                            })
                          }
                          style={{ width: '38px', height: '32px', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                        />
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {['#0f172a', '#1e3a8a', '#b45309', '#15803d', '#991b1b', '#ffffff'].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() =>
                                setTemplate({
                                  ...template,
                                  fields: {
                                    ...template.fields,
                                    [fKey]: { ...field, color: c },
                                  },
                                })
                              }
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: c,
                                border: '1px solid #cbd5e1',
                                cursor: 'pointer',
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Font Family */}
                    <div>
                      <span style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Typography Style</span>
                      <select
                        className="input"
                        style={{ width: '100%', fontSize: '0.8rem', height: '32px' }}
                        value={field.fontFamily || 'serif'}
                        onChange={(e) =>
                          setTemplate({
                            ...template,
                            fields: {
                              ...template.fields,
                              [fKey]: { ...field, fontFamily: e.target.value },
                            },
                          })
                        }
                      >
                        <option value='"Cormorant Garamond", Georgia, serif'>Classic Roman Serif (Cormorant)</option>
                        <option value='"Cinzel Decorative", Cinzel, serif'>Regal Monumental (Cinzel Decorative)</option>
                        <option value='"Cinzel", Georgia, serif'>Engraved Capital (Cinzel)</option>
                        <option value='system-ui, -apple-system, sans-serif'>Clean Executive (Sans-Serif)</option>
                        <option value='monospace, Courier, monospace'>Archival Fixed (Monospace)</option>
                      </select>
                    </div>

                    {/* Prefix */}
                    <div>
                      <span style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Text Prefix / Label</span>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g. Admission No: "
                        value={field.prefix || ''}
                        onChange={(e) =>
                          setTemplate({
                            ...template,
                            fields: {
                              ...template.fields,
                              [fKey]: { ...field, prefix: e.target.value },
                            },
                          })
                        }
                        style={{ width: '100%', fontSize: '0.8rem', height: '32px' }}
                      />
                    </div>

                    {/* Position Sliders */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>Horizontal Position (X): {field.x}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="95"
                        value={field.x}
                        onChange={(e) =>
                          setTemplate({
                            ...template,
                            fields: {
                              ...template.fields,
                              [fKey]: { ...field, x: Number(e.target.value) },
                            },
                          })
                        }
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>Vertical Position (Y): {field.y}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="95"
                        value={field.y}
                        onChange={(e) =>
                          setTemplate({
                            ...template,
                            fields: {
                              ...template.fields,
                              [fKey]: { ...field, y: Number(e.target.value) },
                            },
                          })
                        }
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                )
              })()
            )}

            {/* Bottom Save Button */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                style={{ width: '100%', background: '#10b981', borderColor: '#059669', color: '#ffffff', fontWeight: 800 }}
              >
                {saveSuccess ? '✓ Template Activated Everywhere!' : 'Save & Activate Template'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
