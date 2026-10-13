import React, { useState, useRef, useEffect, useCallback } from 'react'
import { getEmbeddableDocumentUrl } from '@/lib/utils'

export interface WpsDocumentViewerProps {
  title: string
  fileUrl: string
  fileSize?: string
  subject?: string
  category?: string
  studentName?: string
  studentId?: string
  onClose?: () => void
  initialTheme?: 'light' | 'dark' | 'sepia' | 'cyber'
  isModal?: boolean
}

type DocumentEngine = 'cloud' | 'office' | 'direct'
type AnnotationTool = 'cursor' | 'highlighter' | 'pen' | 'eraser' | 'sticky'

interface StickyNote {
  id: string
  x: number
  y: number
  text: string
  color: string
}

interface DrawStroke {
  tool: 'pen' | 'highlighter'
  points: { x: number; y: number }[]
  color: string
  size: number
}

export function WpsDocumentViewer({
  title,
  fileUrl,
  fileSize: _fileSize,
  subject: _subject,
  category,
  studentName,
  studentId,
  onClose,
  initialTheme = 'light',
  isModal = false,
}: WpsDocumentViewerProps) {
  const [engine, setEngine] = useState<DocumentEngine>('cloud')
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia' | 'cyber'>(initialTheme)
  const [zoom, setZoom] = useState<number>(100)
  const [rotation, setRotation] = useState<number>(0)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [activeRibbonTab, setActiveRibbonTab] = useState<'view' | 'markup' | 'details'>('view')
  const [isBlurred, setIsBlurred] = useState<boolean>(false)
  const [isNetworkOnline, setIsNetworkOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [iframeError, setIframeError] = useState<boolean>(false)

  const [annotationTool, setAnnotationTool] = useState<AnnotationTool>('cursor')
  const [penColor] = useState<string>('#ef4444')
  const [strokes, setStrokes] = useState<DrawStroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<DrawStroke | null>(null)
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([])

  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const touchStartDistRef = useRef<number | null>(null)
  const initialZoomRef = useRef<number>(100)

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      touchStartDistRef.current = dist
      initialZoomRef.current = zoom
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null && touchStartDistRef.current > 0) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const factor = currentDist / touchStartDistRef.current
      const targetZoom = Math.min(300, Math.max(50, Math.round(initialZoomRef.current * factor)))
      setZoom(targetZoom)
    }
  }

  const handleTouchEnd = () => {
    touchStartDistRef.current = null
  }


  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      setIsNetworkOnline(true)
      setIframeError(false)
    }
    const handleOffline = () => setIsNetworkOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  useEffect(() => {
    const handleBlur = () => setIsBlurred(true)
    const handleFocus = () => setIsBlurred(false)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const resolvedUrl = React.useMemo(() => {
    if (!fileUrl) return ''
    const clean = fileUrl.trim()
    if (engine === 'office') {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(clean)}`
    }
    if (engine === 'direct') {
      return getEmbeddableDocumentUrl(clean, 'direct')
    }
    return getEmbeddableDocumentUrl(clean, 'cloud')
  }, [fileUrl, engine])

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes

    allStrokes.forEach((stroke) => {
      if (stroke.points.length < 2) return
      ctx.beginPath()
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.size
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalAlpha = stroke.tool === 'highlighter' ? 0.45 : 0.95

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
      }
      ctx.stroke()
    })
    ctx.globalAlpha = 1.0
  }, [strokes, currentStroke])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
    redrawCanvas()
  }, [redrawCanvas, zoom])

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (annotationTool === 'cursor') return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (annotationTool === 'sticky') {
      const newNote: StickyNote = {
        id: `note_${Date.now()}`,
        x: Math.max(0.05, Math.min(0.85, x / rect.width)),
        y: Math.max(0.05, Math.min(0.85, y / rect.height)),
        text: '',
        color: '#fef08a',
      }
      setStickyNotes((prev) => [...prev, newNote])
      setAnnotationTool('cursor')
      return
    }

    if (annotationTool === 'eraser') {
      setStrokes((prev) =>
        prev.filter((stroke) => {
          return !stroke.points.some((p) => Math.hypot(p.x - x, p.y - y) < 25)
        })
      )
      return
    }

    setCurrentStroke({
      tool: annotationTool,
      points: [{ x, y }],
      color: annotationTool === 'highlighter' ? '#fde047' : penColor,
      size: annotationTool === 'highlighter' ? 18 : 3,
    })
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!currentStroke) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setCurrentStroke((prev) => (prev ? { ...prev, points: [...prev.points, { x, y }] } : null))
    redrawCanvas()
  }

  const handlePointerUp = () => {
    if (currentStroke) {
      setStrokes((prev) => [...prev, currentStroke])
      setCurrentStroke(null)
    }
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  const themeStyles = {
    dark: {
      bg: '#f8fafc',
      surface: '#ffffff',
      toolbarBg: 'linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%)',
      border: '#e2e8f0',
      text: '#0f172a',
      muted: '#64748b',
      activeTab: '#1d4ed8',
    },
    light: {
      bg: '#f8fafc',
      surface: '#ffffff',
      toolbarBg: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
      border: '#cbd5e1',
      text: '#0f172a',
      muted: '#475569',
      activeTab: '#1d4ed8',
    },
    sepia: {
      bg: '#231b14',
      surface: '#2d2218',
      toolbarBg: 'linear-gradient(180deg, #382c20 0%, #291f16 100%)',
      border: '#4a3b2b',
      text: '#f5ecd8',
      muted: '#bfa78a',
      activeTab: '#d97706',
    },
    cyber: {
      bg: '#040711',
      surface: '#091024',
      toolbarBg: 'linear-gradient(180deg, #0d1a38 0%, #060c1d 100%)',
      border: '#059669',
      text: '#34d399',
      muted: '#38bdf8',
      activeTab: '#059669',
    },
  }[theme]

  return (
    <div
      ref={containerRef}
      style={{
        position: isModal ? 'fixed' : 'relative',
        inset: isModal ? 0 : 'auto',
        zIndex: isModal ? 99999 : 1,
        width: isModal ? '100vw' : '100%',
        height: isModal ? '100vh' : '100%',
        minHeight: isModal ? '100vh' : isMobile ? 'calc(100dvh - 54px)' : '720px',
        display: 'flex',
        flexDirection: 'column',
        background: themeStyles.bg,
        color: themeStyles.text,
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: 'var(--font-body, system-ui, sans-serif)',
      }}
    >
      {/* 1. WPS OFFICE APPLICATION TOP RIBBON */}
      <header
        style={{
          background: themeStyles.toolbarBg,
          borderBottom: `1px solid ${themeStyles.border}`,
          padding: '6px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          flexShrink: 0,
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          zIndex: 40,
        }}
      >
        {/* Topmost Title & Quick Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'nowrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                fontWeight: 900,
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
                flexShrink: 0,
              }}
            >
              📄
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    background: 'rgba(37, 99, 235, 0.2)',
                    color: '#60a5fa',
                    border: '1px solid rgba(37, 99, 235, 0.4)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                  }}
                >
                  WPS PRO READER
                </span>
                {category && (
                  <span style={{ fontSize: '0.72rem', color: themeStyles.muted, fontWeight: 600 }}>
                    • {category}
                  </span>
                )}
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: isMobile ? '0.88rem' : '1.02rem',
                  fontWeight: 800,
                  color: themeStyles.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={title}
              >
                {title}
              </h3>
            </div>
          </div>

          {/* Right Header Controls (Engine Switcher + Close Button) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value as DocumentEngine)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: themeStyles.text,
                border: `1px solid ${themeStyles.border}`,
                borderRadius: '8px',
                padding: '4px 8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Switch Rendering Engine"
            >
              <option value="cloud">Google Cloud Engine</option>
              <option value="office">MS Office Engine</option>
              <option value="direct">High-Res Direct Stream</option>
            </select>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Close Document"
              >
                ✕ Close
              </button>
            )}
          </div>
        </div>

        {/* Ribbon Tools & Actions Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
            paddingTop: '4px',
            borderTop: `1px solid ${themeStyles.border}`,
          }}
        >
          {/* Ribbon Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setActiveRibbonTab('view')}
              style={{
                background: activeRibbonTab === 'view' ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
                color: activeRibbonTab === 'view' ? '#60a5fa' : themeStyles.muted,
                border: activeRibbonTab === 'view' ? '1px solid rgba(37, 99, 235, 0.4)' : '1px solid transparent',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🔍 View & Zoom
            </button>
            <button
              type="button"
              onClick={() => setActiveRibbonTab('markup')}
              style={{
                background: activeRibbonTab === 'markup' ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
                color: activeRibbonTab === 'markup' ? '#60a5fa' : themeStyles.muted,
                border: activeRibbonTab === 'markup' ? '1px solid rgba(37, 99, 235, 0.4)' : '1px solid transparent',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ✏️ Annotate & Notes
            </button>
            <button
              type="button"
              onClick={() => setActiveRibbonTab('details')}
              style={{
                background: activeRibbonTab === 'details' ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
                color: activeRibbonTab === 'details' ? '#60a5fa' : themeStyles.muted,
                border: activeRibbonTab === 'details' ? '1px solid rgba(37, 99, 235, 0.4)' : '1px solid transparent',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              📋 Outline & DRM
            </button>
          </div>

          {/* Contextual Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {activeRibbonTab === 'view' && (
              <>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(50, z - 15))}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    color: themeStyles.text,
                    border: `1px solid ${themeStyles.border}`,
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                  title="Zoom Out"
                >
                  −
                </button>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, minWidth: '45px', textAlign: 'center' }}>
                  {zoom}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(200, z + 15))}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    color: themeStyles.text,
                    border: `1px solid ${themeStyles.border}`,
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(100)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    color: themeStyles.text,
                    border: `1px solid ${themeStyles.border}`,
                    borderRadius: '6px',
                    padding: '2px 7px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Fit 100%
                </button>

                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    color: themeStyles.text,
                    border: `1px solid ${themeStyles.border}`,
                    borderRadius: '6px',
                    padding: '2px 7px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Rotate Document 90°"
                >
                  ⟳ Rotate
                </button>

                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as any)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    color: themeStyles.text,
                    border: `1px solid ${themeStyles.border}`,
                    borderRadius: '6px',
                    padding: '2px 6px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <option value="light">Clean Light (Institutional)</option>
                  <option value="sepia">Eye-Care Sepia</option>
                  <option value="dark">Slate Cinema</option>
                </select>
              </>
            )}

            {activeRibbonTab === 'markup' && (
              <>
                <button
                  type="button"
                  onClick={() => setAnnotationTool('cursor')}
                  style={{
                    background: annotationTool === 'cursor' ? '#2563eb' : 'rgba(255,255,255,0.08)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  👆 Select
                </button>
                <button
                  type="button"
                  onClick={() => setAnnotationTool('highlighter')}
                  style={{
                    background: annotationTool === 'highlighter' ? '#eab308' : 'rgba(255,255,255,0.08)',
                    color: annotationTool === 'highlighter' ? '#000000' : '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🖍️ Highlight
                </button>
                <button
                  type="button"
                  onClick={() => setAnnotationTool('pen')}
                  style={{
                    background: annotationTool === 'pen' ? '#ef4444' : 'rgba(255,255,255,0.08)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ✏️ Pen Draw
                </button>
                <button
                  type="button"
                  onClick={() => setAnnotationTool('sticky')}
                  style={{
                    background: annotationTool === 'sticky' ? '#8b5cf6' : 'rgba(255,255,255,0.08)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  📌 Sticky Note
                </button>
                <button
                  type="button"
                  onClick={() => setAnnotationTool('eraser')}
                  style={{
                    background: annotationTool === 'eraser' ? '#dc2626' : 'rgba(255,255,255,0.08)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  🧹 Eraser
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStrokes([])
                    setStickyNotes([])
                  }}
                  style={{
                    background: 'transparent',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '6px',
                    padding: '2px 6px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Clear All
                </button>
              </>
            )}

            {activeRibbonTab === 'details' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem' }}>
                <span>🔒 Student ID: {studentId || 'Authenticated Student'}</span>
                <span>• 🛡️ Anti-Piracy DRM Signature Active</span>
              </div>
            )}

            <button
              type="button"
              onClick={toggleFullscreen}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: themeStyles.text,
                border: `1px solid ${themeStyles.border}`,
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
              }}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? '⤦ Exit' : '⛶ Fullscreen'}
            </button>
          </div>
        </div>
      </header>

      {/* 2. DOCUMENT WORKSPACE VIEWPORT (WITH 2-FINGER TOUCH PINCH-TO-ZOOM) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '0',
          background: themeStyles.bg,
          touchAction: 'pan-x pan-y pinch-zoom',
        }}
      >
        {isBlurred && (
          <div
            onClick={() => setIsBlurred(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999999,
              background: 'rgba(9, 13, 22, 0.98)',
              backdropFilter: 'blur(30px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              color: '#ffffff',
              textAlign: 'center',
              padding: '2rem',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '3.5rem' }}>🔒</div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f87171', margin: 0 }}>
              Screen Capture Shield Active
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', maxWidth: '440px', margin: 0, lineHeight: 1.5 }}>
              Window focus lost or screen capture detected. Click anywhere to resume reading.
            </p>
          </div>
        )}

        {/* Dynamic Watermark */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 30,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around',
            opacity: 0.05,
            overflow: 'hidden',
            userSelect: 'none',
          }}
        >
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              style={{
                transform: 'rotate(-25deg)',
                fontSize: isMobile ? '0.8rem' : '1.1rem',
                fontWeight: 900,
                color: '#64748b',
                letterSpacing: '0.15em',
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              GLOBAL COLLEGE • {studentName?.toUpperCase() || 'REGISTERED STUDENT'} ({studentId || 'GC-ID'}) • DRM CONFIDENTIAL
            </div>
          ))}
        </div>

        {/* Offline Fallback */}
        {!isNetworkOnline || iframeError ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
              padding: '3rem 1.5rem',
              textAlign: 'center',
              color: themeStyles.text,
              zIndex: 35,
            }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem', animation: 'bounce 2s infinite' }}>📡</div>
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#f87171',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                marginBottom: '0.75rem',
              }}
            >
              ● Offline Mode
            </div>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 0.5rem' }}>
              Document Reader Offline
            </h4>
            <p style={{ fontSize: '0.88rem', color: themeStyles.muted, maxWidth: '440px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
              This protected lecture document requires an active connection. Please connect to WiFi or cellular data to stream.
            </p>
            <button
              type="button"
              onClick={() => {
                if (navigator.onLine) {
                  setIsNetworkOnline(true)
                  setIframeError(false)
                } else {
                  alert('Device is still offline. Please check your network connection.')
                }
              }}
              className="btn btn-primary btn-sm"
              style={{ fontWeight: 800, padding: '0.65rem 1.4rem', borderRadius: '10px' }}
            >
              🔄 Retry Connection
            </button>
          </div>
        ) : (
          <div
            style={{
              width: zoom <= 100 ? '100%' : `${zoom}%`,
              minWidth: '100%',
              height: '100%',
              minHeight: '100%',
              flex: 1,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              transform: `rotate(${rotation}deg)`,
              transition: 'transform 0.2s ease, width 0.15s ease',
              background: '#000000',
            }}
          >
            {/* Solid Opaque Corner Shield covering top-right pop-out square/arrow icon */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '68px',
                height: '60px',
                zIndex: 60,
                background: themeStyles.surface || '#090d16',
                borderBottomLeftRadius: '12px',
                borderLeft: `1px solid ${themeStyles.border}`,
                borderBottom: `1px solid ${themeStyles.border}`,
                cursor: 'default',
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '-2px 2px 8px rgba(0, 0, 0, 0.4)',
              }}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
            >
              <span style={{ fontSize: '0.72rem', opacity: 0.4, color: themeStyles.muted }} title="Protected Reader">🔒</span>
            </div>

            {/* Canvas Overlay */}
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                zIndex: 35,
                pointerEvents: annotationTool === 'cursor' ? 'none' : 'auto',
                touchAction: annotationTool === 'cursor' ? 'auto' : 'none',
                cursor:
                  annotationTool === 'highlighter' || annotationTool === 'pen'
                    ? 'crosshair'
                    : annotationTool === 'eraser'
                    ? 'cell'
                    : annotationTool === 'sticky'
                    ? 'copy'
                    : 'default',
              }}
            />

            {/* Sticky Notes */}
            {stickyNotes.map((note) => (
              <div
                key={note.id}
                style={{
                  position: 'absolute',
                  left: `${note.x * 100}%`,
                  top: `${note.y * 100}%`,
                  zIndex: 42,
                  background: note.color,
                  color: '#1e293b',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                  maxWidth: '220px',
                  minWidth: '150px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: '1px solid rgba(0,0,0,0.15)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>📌 Study Note</span>
                  <button
                    type="button"
                    onClick={() => setStickyNotes((prev) => prev.filter((n) => n.id !== note.id))}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: '0 2px', opacity: 0.7 }}
                    title="Delete Note"
                  >
                    ✕
                  </button>
                </div>
                <textarea
                  value={note.text}
                  onChange={(e) => {
                    const val = e.target.value
                    setStickyNotes((prev) =>
                      prev.map((n) => (n.id === note.id ? { ...n, text: val } : n))
                    )
                  }}
                  placeholder="Type revision note..."
                  style={{
                    width: '100%',
                    minHeight: '48px',
                    border: 'none',
                    background: 'transparent',
                    resize: 'vertical',
                    fontSize: '0.78rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    color: '#1e293b',
                  }}
                />
              </div>
            ))}

            {/* Document Iframe or Fallback Viewer */}
            {resolvedUrl ? (
              <iframe
                src={resolvedUrl}
                title={title}
                sandbox="allow-scripts allow-same-origin allow-forms"
                onError={() => setIframeError(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: '100%',
                  flex: 1,
                  border: 'none',
                  background: '#000000',
                  display: 'block',
                }}
                allow="autoplay; encrypted-media; fullscreen"
              />
            ) : (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2.5rem',
                  textAlign: 'center',
                  background: '#ffffff',
                  color: '#0f172a',
                }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                <h4 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '0 0 0.5rem', color: '#1e3a8a' }}>
                  {title}
                </h4>
                <p style={{ fontSize: '0.9rem', color: '#64748b', maxWidth: '480px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
                  This official academic lecture module notes and interactive curriculum guide are streamed under DRM protection for enrolled students.
                </p>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem 1.5rem', fontSize: '0.82rem', color: '#334155', maxWidth: '460px' }}>
                  <div><strong>Student ID:</strong> {studentId || 'Enrolled Student'}</div>
                  <div><strong>Student Name:</strong> {studentName || 'Authenticated Learner'}</div>
                  <div style={{ marginTop: '0.5rem', color: '#16a34a', fontWeight: 700 }}>✓ Verified Curriculum Material Access Granted</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. FOOTER STATUS BAR */}
      <footer
        style={{
          background: themeStyles.surface,
          borderTop: `1px solid ${themeStyles.border}`,
          padding: '4px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.72rem',
          color: themeStyles.muted,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🔒 WPS Secure Streaming Engine</span>
          <span>• 📜 Global College Learning Portal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Zoom: {zoom}%</span>
          {rotation > 0 && <span>• Rotation: {rotation}°</span>}
        </div>
      </footer>
    </div>
  )
}
