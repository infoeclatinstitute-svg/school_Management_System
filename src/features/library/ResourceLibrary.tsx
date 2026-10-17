import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { schoolStore, schoolEventBus } from '@/lib/schoolData'
import { supabase } from '@/lib/supabase'
import { getEmbeddableDocumentUrl, getGoogleDrivePreviewUrl } from '@/lib/utils'
import { OFFICIAL_APKPURE_URL, OFFICIAL_APK_URL, OFFICIAL_DESKTOP_URL } from '@/utils/platform'
import { ACADEMIC_HANDBOOKS, COMIC_BOOKS_DATA, AcademicHandbook, ComicBook } from './academicHandbookData'
import type { AcademicResource } from '@/types/school'

export interface AnnotationStroke {
  id: string
  tool: 'pen' | 'highlighter'
  color: string
  width: number
  points: { x: number; y: number }[]
}

export interface StickyNote {
  id: string
  x: number // 0..100 percentage
  y: number // 0..100 percentage
  text: string
  color: string
  isOpen: boolean
}

export const DEFAULT_CATEGORIES = [
  'All',
  '⭐ Starred / Saved Books',
  'Comic Books',
  'Graphic Novels & Manga',
  'Textbooks',
  'Revision Notes',
  'Lab Manuals & Code',
  'Past Papers',
  'Syllabus',
  'Marking Schemes',
]

export function ResourceLibrary() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const isStudent = profile?.role === 'student' || profile?.role === 'parent'

  const [resources, setResources] = useState<AcademicResource[]>(() => schoolStore.getResources())
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState('All')
  const [selectedSub] = useState('All')
  const [showAppRequiredModal, setShowAppRequiredModal] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSyncingCloud, setIsSyncingCloud] = useState(false)

  const handleManualSync = async () => {
    setIsSyncingCloud(true)
    try {
      await schoolStore.syncWithCloud(true)
      setResources(schoolStore.getResources())
      setCustomCategories(schoolStore.getCustomCategories())
    } catch {}
    finally {
      setTimeout(() => setIsSyncingCloud(false), 500)
    }
  }

  // Starred / Saved Favorites State
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('gc_library_bookmarks')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const toggleBookmark = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setBookmarkedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      localStorage.setItem('gc_library_bookmarks', JSON.stringify(next))
      return next
    })
  }

  // Session Read Tracking (prevents repeated view increments on open/close)
  const [readResourcesSession, setReadResourcesSession] = useState<Set<string>>(new Set())

  // Sync live resources and dynamic categories on mount, focus, and cross-device realtime events
  useEffect(() => {
    let isMounted = true

    const handleSync = () => {
      if (!isMounted) return
      setResources(schoolStore.getResources())
      setCustomCategories(schoolStore.getCustomCategories())
    }

    handleSync()
    schoolStore.syncWithCloud(true).then(handleSync).catch(() => {})

    const unsub = schoolEventBus.subscribe('LIBRARY_UPDATED' as any, handleSync)
    window.addEventListener('storage', handleSync)
    window.addEventListener('gc-data-synced', handleSync)
    const handleFocus = () => {
      schoolStore.syncWithCloud(true).then(handleSync).catch(() => {})
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      isMounted = false
      unsub()
      window.removeEventListener('storage', handleSync)
      window.removeEventListener('gc-data-synced', handleSync)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const handleClearAllResources = async () => {
    if (!isAdmin) return
    if (window.confirm('Are you sure you want to delete ALL library resources across all devices?')) {
      await schoolStore.clearAllResources()
      setResources([])
    }
  }

  // Fullscreen In-App Viewer State
  const [readingResource, setReadingResource] = useState<AcademicResource | null>(null)
  const readerTouchStartDistRef = useRef<number | null>(null)
  const readerInitialZoomRef = useRef<number>(100)

  const handleReaderTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      readerTouchStartDistRef.current = dist
      readerInitialZoomRef.current = readerZoom
    }
  }

  const handleReaderTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && readerTouchStartDistRef.current !== null && readerTouchStartDistRef.current > 0) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const factor = currentDist / readerTouchStartDistRef.current
      const targetZoom = Math.min(300, Math.max(50, Math.round(readerInitialZoomRef.current * factor)))
      setReaderZoom(targetZoom)
    }
  }

  const handleReaderTouchEnd = () => {
    readerTouchStartDistRef.current = null
  }

  const [readerTheme, setReaderTheme] = useState<'light' | 'sepia' | 'dark'>('light')
  const [readerZoom, setReaderZoom] = useState<number>(100)
  const [drmWarning, setDrmWarning] = useState<string | null>(null)
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(0)
  const [isBlurred, setIsBlurred] = useState<boolean>(false)
  const isMobile = useIsMobile(768)
  const [showMobileToc, setShowMobileToc] = useState<boolean>(false)
  const [isTocCollapsed, setIsTocCollapsed] = useState<boolean>(false)
  const [isInlineTocOpen, setIsInlineTocOpen] = useState<boolean>(false)

  // WPS Annotation, Drawing & Highlighter Suite State
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [annotations, setAnnotations] = useState<AnnotationStroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<AnnotationStroke | null>(null)
  const [annotationTool, setAnnotationTool] = useState<'cursor' | 'highlighter' | 'pen' | 'eraser' | 'sticky'>('cursor')
  const [highlighterColor, setHighlighterColor] = useState<string>('#fef08a')
  const [penColor, setPenColor] = useState<string>('#ef4444')
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([])
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [isHandbookFullWidth, setIsHandbookFullWidth] = useState<boolean>(true)

  // Sync fullscreen state with browser API
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // Load saved annotations for current resource
  useEffect(() => {
    if (!readingResource) {
      setAnnotations([])
      setStickyNotes([])
      return
    }
    try {
      const savedStrokes = localStorage.getItem(`gc_pdf_annotations_${readingResource.id}`)
      if (savedStrokes) setAnnotations(JSON.parse(savedStrokes))
      else setAnnotations([])

      const savedNotes = localStorage.getItem(`gc_pdf_notes_${readingResource.id}`)
      if (savedNotes) setStickyNotes(JSON.parse(savedNotes))
      else setStickyNotes([])
    } catch {
      setAnnotations([])
      setStickyNotes([])
    }
  }, [readingResource])

  // Redraw canvas whenever annotations or currentStroke change
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const allStrokes = currentStroke ? [...annotations, currentStroke] : annotations

    for (const stroke of allStrokes) {
      if (stroke.points.length < 1) continue
      ctx.save()
      if (stroke.tool === 'highlighter') {
        ctx.strokeStyle = stroke.color
        ctx.lineWidth = stroke.width || 22
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.globalAlpha = 0.45
        ctx.globalCompositeOperation = 'source-over'
      } else {
        ctx.strokeStyle = stroke.color
        ctx.lineWidth = stroke.width || 3
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = 'source-over'
      }

      ctx.beginPath()
      ctx.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height)
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * canvas.width, stroke.points[i].y * canvas.height)
      }
      ctx.stroke()
      ctx.restore()
    }
  }, [annotations, currentStroke])

  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  // Auto-resize canvas on zoom / layout change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width
      canvas.height = rect.height
      redrawCanvas()
    }
  }, [readingResource, readerZoom, redrawCanvas])

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (annotationTool === 'cursor') return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const normX = (e.clientX - rect.left) / rect.width
    const normY = (e.clientY - rect.top) / rect.height

    if (annotationTool === 'sticky') {
      const newNote: StickyNote = {
        id: Date.now().toString(),
        x: Math.min(85, Math.max(5, normX * 100)),
        y: Math.min(90, Math.max(5, normY * 100)),
        text: '',
        color: '#fef08a',
        isOpen: true,
      }
      const updated = [...stickyNotes, newNote]
      setStickyNotes(updated)
      if (readingResource) {
        localStorage.setItem(`gc_pdf_notes_${readingResource.id}`, JSON.stringify(updated))
      }
      setAnnotationTool('cursor')
      return
    }

    if (annotationTool === 'eraser') {
      const threshold = 0.04
      const filtered = annotations.filter((s) => {
        return !s.points.some((p) => Math.hypot(p.x - normX, p.y - normY) < threshold)
      })
      setAnnotations(filtered)
      if (readingResource) {
        localStorage.setItem(`gc_pdf_annotations_${readingResource.id}`, JSON.stringify(filtered))
      }
      return
    }

    const newStroke: AnnotationStroke = {
      id: Date.now().toString(),
      tool: annotationTool === 'highlighter' ? 'highlighter' : 'pen',
      color: annotationTool === 'highlighter' ? highlighterColor : penColor,
      width: annotationTool === 'highlighter' ? 22 : 3,
      points: [{ x: normX, y: normY }],
    }
    setCurrentStroke(newStroke)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!currentStroke || annotationTool === 'cursor') return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const normX = (e.clientX - rect.left) / rect.width
    const normY = (e.clientY - rect.top) / rect.height

    setCurrentStroke((prev) => {
      if (!prev) return null
      return {
        ...prev,
        points: [...prev.points, { x: normX, y: normY }],
      }
    })
  }

  const handlePointerUp = () => {
    if (currentStroke && readingResource) {
      const updated = [...annotations, currentStroke]
      setAnnotations(updated)
      setCurrentStroke(null)
      localStorage.setItem(`gc_pdf_annotations_${readingResource.id}`, JSON.stringify(updated))
    }
  }

  const handleClearAnnotations = () => {
    if (window.confirm('Clear all page highlights and revision notes for this document?')) {
      setAnnotations([])
      setStickyNotes([])
      if (readingResource) {
        localStorage.removeItem(`gc_pdf_annotations_${readingResource.id}`)
        localStorage.removeItem(`gc_pdf_notes_${readingResource.id}`)
      }
    }
  }

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  const handleUpdateStickyNote = (id: string, text: string) => {
    const updated = stickyNotes.map((n) => (n.id === id ? { ...n, text } : n))
    setStickyNotes(updated)
    if (readingResource) {
      localStorage.setItem(`gc_pdf_notes_${readingResource.id}`, JSON.stringify(updated))
    }
  }

  const handleDeleteStickyNote = (id: string) => {
    const updated = stickyNotes.filter((n) => n.id !== id)
    setStickyNotes(updated)
    if (readingResource) {
      localStorage.setItem(`gc_pdf_notes_${readingResource.id}`, JSON.stringify(updated))
    }
  }

  const activeHandbook: AcademicHandbook | null = useMemo(() => {
    if (!readingResource) return null
    if (ACADEMIC_HANDBOOKS[readingResource.id]) return ACADEMIC_HANDBOOKS[readingResource.id]
    const cleanId = readingResource.file_url?.replace('academic://', '')
    if (cleanId && ACADEMIC_HANDBOOKS[cleanId]) return ACADEMIC_HANDBOOKS[cleanId]
    const fuzzyKey = Object.keys(ACADEMIC_HANDBOOKS).find((k) => {
      const stem = k.replace('res-', '').split('-')[0]
      return readingResource.title.toLowerCase().includes(stem) || readingResource.id.includes(stem)
    })
    return fuzzyKey ? ACADEMIC_HANDBOOKS[fuzzyKey] : null
  }, [readingResource])

  const activeComicBook: ComicBook | null = useMemo(() => {
    if (!readingResource) return null
    if (COMIC_BOOKS_DATA[readingResource.id]) return COMIC_BOOKS_DATA[readingResource.id]
    const cleanId = readingResource.file_url?.replace('comic://', '')
    if (cleanId && COMIC_BOOKS_DATA[cleanId]) return COMIC_BOOKS_DATA[cleanId]
    const fuzzyKey = Object.keys(COMIC_BOOKS_DATA).find((k) => {
      const stem = k.replace('comic-', '').split('-')[0]
      return readingResource.title.toLowerCase().includes(stem) || readingResource.id.includes(stem)
    })
    return fuzzyKey ? COMIC_BOOKS_DATA[fuzzyKey] : null
  }, [readingResource])

  // Comic Viewer State
  const [activeIssueIndex, setActiveIssueIndex] = useState<number>(0)
  const [activePanelIndex, setActivePanelIndex] = useState<number>(0)
  const [comicViewLayout, setComicViewLayout] = useState<'webtoon' | 'panel'>('webtoon')
  const [comicTheme, setComicTheme] = useState<'cyber' | 'noir' | 'sepia' | 'dark' | 'light'>('light')

  // Dynamic Custom Categories State (Synced Across Devices)
  const [customCategories, setCustomCategories] = useState<string[]>(() => schoolStore.getCustomCategories())
  const [showAddCatModal, setShowAddCatModal] = useState(false)
  const [newCustomCategoryInput, setNewCustomCategoryInput] = useState('')

  const handleAddCustomCategory = (catName: string) => {
    const trimmed = catName.trim()
    if (!trimmed) return
    schoolStore.addCustomCategory(trimmed).then(() => {
      setCustomCategories(schoolStore.getCustomCategories())
    })
    setNewCustomCategoryInput('')
    setShowAddCatModal(false)
  }

  const handleDeleteCustomCategory = (catName: string) => {
    schoolStore.deleteCustomCategory(catName).then(() => {
      setCustomCategories(schoolStore.getCustomCategories())
    })
    if (selectedCat === catName) setSelectedCat('All')
  }

  const dynamicCategories = useMemo(() => {
    const base = DEFAULT_CATEGORIES
    const resourceCats = Array.from(new Set(resources.map((r) => r.category).filter(Boolean)))
    const combined = Array.from(new Set([...base, ...resourceCats, ...customCategories]))
    return combined
  }, [resources, customCategories])

  // Dynamic Hardware Screen Capture Security (Enables FLAG_SECURE only while reading resources)
  useEffect(() => {
    if (readingResource) {
      import('@/lib/screenSecurity').then((mod) => mod.enableScreenSecurity()).catch(() => {})
    } else {
      import('@/lib/screenSecurity').then((mod) => mod.disableScreenSecurity()).catch(() => {})
    }

    return () => {
      import('@/lib/screenSecurity').then((mod) => mod.disableScreenSecurity()).catch(() => {})
    }
  }, [readingResource])

  // Anti-Screenshot Focus-Loss & Snipping Tool Detection
  useEffect(() => {
    if (!readingResource) return

    const handleWindowBlur = () => {
      setIsBlurred(true)
    }

    const handleWindowFocus = () => {
      setIsBlurred(false)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlurred(true)
      } else {
        setIsBlurred(false)
      }
    }

    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [readingResource])

  // DRM Protection: Keyboard save, print, copy and inspect prevention
  useEffect(() => {
    if (!readingResource) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Intercept Ctrl+S / Cmd+S (Save)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        setDrmWarning('🔒 Protected Academic Viewer: Saving and downloading are restricted.')
        setTimeout(() => setDrmWarning(null), 3000)
        return
      }

      // Intercept Ctrl+P / Cmd+P (Print)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setDrmWarning('🔒 Protected Academic Viewer: Printing is restricted.')
        setTimeout(() => setDrmWarning(null), 3000)
        return
      }

      // Intercept PrintScreen key & Win+Shift+S snipping
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || (e.shiftKey && (e.metaKey || (e as any).key === 'Meta') && e.key.toLowerCase() === 's')) {
        e.preventDefault()
        setIsBlurred(true)
        try {
          navigator.clipboard?.writeText?.('🔒 Protected academic content — Global College')
        } catch {}
        setDrmWarning('🔒 Screenshot capture is restricted by DRM policy.')
        setTimeout(() => setDrmWarning(null), 3000)
        return
      }

      // Intercept Ctrl+C / Cmd+C (Copy)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        setDrmWarning('🔒 Protected Academic Viewer: Copying is restricted.')
        setTimeout(() => setDrmWarning(null), 3000)
        return
      }

      // Intercept F12 / Inspect shortcuts
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key.toLowerCase() === 'i' || e.key.toLowerCase() === 'j' || e.key.toLowerCase() === 'c')) ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u')
      ) {
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [readingResource])

  // Network & In-App Security State
  const [isNetworkOnline, setIsNetworkOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [iframeLoadError, setIframeLoadError] = useState<boolean>(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsNetworkOnline(true)
      setIframeLoadError(false)
    }
    const handleOffline = () => {
      setIsNetworkOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Upload Modal State (for admin only - Clean empty state without pre-filled values)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [resourceToDelete, setResourceToDelete] = useState<AcademicResource | null>(null)
  const [uploadSource, setUploadSource] = useState<'file' | 'gdrive'>('file')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [googleDriveUrl, setGoogleDriveUrl] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState<string>('')
  const [newSubject, setNewSubject] = useState('')
  const [newClassLevel, setNewClassLevel] = useState('')
  const [newYear, setNewYear] = useState<number | string>('')
  const [newDescription, setNewDescription] = useState('')
  const [newTagsInput, setNewTagsInput] = useState('')

  const resetUploadModal = () => {
    setUploadSource('file')
    setSelectedFile(null)
    setGoogleDriveUrl('')
    setNewTitle('')
    setNewCategory('')
    setNewSubject('')
    setNewClassLevel('')
    setNewYear('')
    setNewDescription('')
    setNewTagsInput('')
  }

  const handleOpenUploadModal = () => {
    resetUploadModal()
    setShowUploadModal(true)
  }

  // Enhanced Multi-Word Fuzzy & Semantic Search Engine
  const filteredResources = useMemo(() => {
    const rawSearch = search.trim().toLowerCase()
    const tokens = rawSearch.split(/[\s,+/_-]+/).filter((t) => t.length > 0)

    const scored = resources
      .map((res) => {
        // Category filter
        const matchCat =
          selectedCat === 'All'
            ? true
            : selectedCat === '⭐ Starred / Saved Books'
            ? bookmarkedIds.includes(res.id)
            : res.category.toLowerCase() === selectedCat.toLowerCase() ||
              (selectedCat === 'Lab Manuals & Code' && (res.category.toLowerCase().includes('lab') || res.category.toLowerCase().includes('code'))) ||
              (selectedCat === 'Comic Books' && (res.category.toLowerCase().includes('comic') || res.category.toLowerCase().includes('graphic'))) ||
              (selectedCat === 'Graphic Novels & Manga' && (res.category.toLowerCase().includes('manga') || res.category.toLowerCase().includes('graphic') || res.category.toLowerCase().includes('comic')))

        if (!matchCat) return null

        // Subject filter
        const matchSub = selectedSub === 'All' || res.subject.toLowerCase().includes(selectedSub.toLowerCase())
        if (!matchSub) return null

        // If no search query, return full match with base score
        if (tokens.length === 0) {
          return { res, score: 100 }
        }

        // Calculate search score across multiple fields
        let score = 0
        const titleLower = res.title.toLowerCase()
        const subjectLower = res.subject.toLowerCase()
        const categoryLower = res.category.toLowerCase()
        const authorLower = (res.uploaded_by || '').toLowerCase()
        const classLevelLower = (res.class_level || '').toLowerCase()
        const fileTypeLower = (res.file_type || '').toLowerCase()
        const descLower = (res.description || '').toLowerCase()
        const tagsLower = (res.tags || []).map((t) => t.toLowerCase())
        const corpus = `${titleLower} ${subjectLower} ${categoryLower} ${authorLower} ${classLevelLower} ${fileTypeLower} ${descLower} ${tagsLower.join(' ')} ${res.year || ''}`

        // Exact match boost
        if (titleLower.includes(rawSearch)) score += 100
        else if (corpus.includes(rawSearch)) score += 60

        let matchedTokensCount = 0
        for (const token of tokens) {
          let tokenMatched = false

          if (titleLower.includes(token)) {
            score += 35
            tokenMatched = true
          }
          if (subjectLower.includes(token)) {
            score += 25
            tokenMatched = true
          }
          if (categoryLower.includes(token)) {
            score += 25
            tokenMatched = true
          }
          if (tagsLower.some((t) => t.includes(token))) {
            score += 20
            tokenMatched = true
          }
          if (descLower.includes(token)) {
            score += 15
            tokenMatched = true
          }
          if (authorLower.includes(token) || classLevelLower.includes(token) || fileTypeLower.includes(token)) {
            score += 10
            tokenMatched = true
          }

          // Partial prefix / stem matching (e.g. "prog" -> "programming", "sec" -> "security", "com" -> "comics")
          if (!tokenMatched && token.length >= 3) {
            if (corpus.includes(token.slice(0, 3))) {
              score += 8
              tokenMatched = true
            }
          }

          if (tokenMatched) matchedTokensCount++
        }

        // Require at least one token to match or positive score
        if (matchedTokensCount === 0 && score === 0) return null

        score += matchedTokensCount * 15
        return { res, score }
      })
      .filter((item): item is { res: AcademicResource; score: number } => item !== null)

    if (tokens.length > 0) {
      scored.sort((a, b) => b.score - a.score)
    }

    return scored.map((item) => item.res)
  }, [resources, search, selectedCat, bookmarkedIds])

  const handleOpenReader = (res: AcademicResource) => {
    setActiveChapterIndex(0)
    setIframeLoadError(false)
    setIsNetworkOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)
    setReadingResource(res)

    // Only increment unique student reads once per browser session
    if (!isAdmin && !readResourcesSession.has(res.id)) {
      setReadResourcesSession((prev) => new Set(prev).add(res.id))
      const nextCount = (res.downloads_count || 0) + 1
      const updated = resources.map((r) => (r.id === res.id ? { ...r, downloads_count: nextCount } : r))
      setResources(updated)
      schoolStore.updateResource(res.id, { downloads_count: nextCount }).catch(() => {})
      supabase
        .from('library_resources')
        .update({ downloads_count: nextCount })
        .eq('id', res.id)
        .then(() => {})
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      if (!newTitle.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
        setNewTitle(cleanName)
      }
    }
  }

  const handleDeleteResource = async (id: string) => {
    try {
      await supabase.from('library_resources').delete().eq('id', id)
    } catch {
      // ignore
    }
    await schoolStore.deleteResource(id)
    setResources(schoolStore.getResources())
  }

  const handleUploadResource = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin) {
      alert('Access Restricted: Only Administrators are authorized to upload learning materials and resources.')
      return
    }
    if (!newTitle.trim()) return

    setIsUploading(true)
    try {
      const isGDrive = uploadSource === 'gdrive' && googleDriveUrl.trim().length > 0
      let fileSizeFormatted = selectedFile
        ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
        : 'Academic Document'

      let fileExt = 'PDF'
      let fileBlobUrl = ''

      if (isGDrive) {
        fileBlobUrl = getGoogleDrivePreviewUrl(googleDriveUrl) || googleDriveUrl.trim()
        fileSizeFormatted = 'Academic Document'
        fileExt = newCategory.toLowerCase().includes('comic') || newCategory.toLowerCase().includes('manga') ? 'COMIC' : 'PDF'
      } else if (selectedFile) {
        const rawExt = selectedFile.name.split('.').pop()?.toUpperCase() || 'PDF'
        if (['DOCX', 'DOC'].includes(rawExt)) fileExt = 'DOCX'
        else if (['PPTX', 'PPT'].includes(rawExt)) fileExt = 'PPTX'
        else if (['XLSX', 'XLS', 'CSV'].includes(rawExt)) fileExt = 'SHEET'
        else if (['EPUB', 'MOBI'].includes(rawExt)) fileExt = 'EPUB'
        else if (['CBZ', 'CBR'].includes(rawExt) || newCategory.toLowerCase().includes('comic') || newCategory.toLowerCase().includes('manga')) fileExt = 'COMIC'
        else if (['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'SVG'].includes(rawExt)) fileExt = 'IMAGE'
        else if (['TXT', 'MD', 'JSON', 'PY', 'JS', 'TS', 'HTML', 'CSS'].includes(rawExt)) fileExt = 'TEXT'
        else if (['MP4', 'WEBM', 'MP3', 'WAV'].includes(rawExt)) fileExt = 'MEDIA'
        else fileExt = rawExt

        // 1. Direct Cloud Upload to Supabase Storage bucket 'library-resources'
        let uploadedCloudUrl: string | null = null
        try {
          const safeName = `${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`
          const filePath = `documents/${safeName}`
          const { data: uploadData, error: storageErr } = await supabase.storage
            .from('library-resources')
            .upload(filePath, selectedFile, {
              contentType: selectedFile.type || 'application/octet-stream',
              upsert: true,
            })

          if (!storageErr && uploadData?.path) {
            const { data: publicUrlData } = supabase.storage
              .from('library-resources')
              .getPublicUrl(filePath)
            if (publicUrlData?.publicUrl) {
              uploadedCloudUrl = publicUrlData.publicUrl
            }
          } else if (storageErr) {
            console.warn('Supabase storage upload notice:', storageErr.message)
          }
        } catch (uploadErr) {
          console.warn('Storage bucket upload notice:', uploadErr)
        }

        if (uploadedCloudUrl) {
          fileBlobUrl = uploadedCloudUrl
        } else if (selectedFile.size <= 256 * 1024) {
          // Safe small file fallback (< 256 KB) without risking localStorage QuotaExceededError
          const base64DataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve((reader.result as string) || '')
            reader.readAsDataURL(selectedFile)
          })
          fileBlobUrl = base64DataUrl
        } else {
          // Offline / bucket unavailable fallback for large files: session Object URL
          fileBlobUrl = URL.createObjectURL(selectedFile)
        }
      } else {
        fileBlobUrl = 'https://globalcollege.internal/docs/' + encodeURIComponent(newTitle)
      }

      // Auto-register new custom category if not in list
      const trimmedCat = (newCategory || 'General Studies').trim()
      if (trimmedCat && !DEFAULT_CATEGORIES.includes(trimmedCat) && !customCategories.includes(trimmedCat)) {
        handleAddCustomCategory(trimmedCat)
      }

      const tagsList = newTagsInput.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)

      const item: AcademicResource = {
        id: `res-${Date.now()}`,
        title: newTitle.trim(),
        category: trimmedCat,
        subject: newSubject,
        class_level: newClassLevel,
        file_url: fileBlobUrl,
        file_size: fileSizeFormatted,
        file_type: fileExt,
        downloads_count: 0,
        year: newYear ? Number(newYear) : undefined,
        uploaded_by: profile?.full_name || 'Academic Administrator',
        created_at: new Date().toISOString(),
        description: newDescription.trim() || undefined,
        tags: tagsList.length > 0 ? tagsList : undefined,
      }

      // Save into Supabase library_resources table
      try {
        await supabase.from('library_resources').upsert({
          id: item.id,
          title: item.title,
          category: item.category,
          subject: item.subject,
          class_level: item.class_level,
          file_url: item.file_url,
          file_name: selectedFile?.name || item.title,
          file_size: item.file_size,
          file_type: item.file_type,
          downloads_count: item.downloads_count,
          year: item.year,
          uploaded_by: item.uploaded_by,
          uploaded_by_id: profile?.id || null,
          description: item.description || null,
          tags: item.tags || [],
        }, { onConflict: 'id' })
      } catch (dbErr) {
        console.warn('Supabase DB library insert notice:', dbErr)
      }

      await schoolStore.addResource(item)
      setResources(schoolStore.getResources())
      setShowUploadModal(false)
      resetUploadModal()
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div
      className="page-container"
      style={{
        paddingBottom: isMobile ? 'calc(95px + env(safe-area-inset-bottom, 0px))' : undefined,
      }}
    >
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 className="page-title" style={{ margin: 0 }}>📖 Digital E-Library & Past Papers Hub</h1>
            {!isAdmin && (
              <span className="badge badge-info" style={{ fontWeight: 700 }}>
                🔒 Read-Only Access
              </span>
            )}
          </div>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Curriculum revision resources, interactive comic books, and academic references.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleManualSync}
            disabled={isSyncingCloud}
            title="Fetch latest updates from cloud database"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 700,
              fontSize: '0.84rem',
              borderColor: '#cbd5e1',
              background: isSyncingCloud ? '#f1f5f9' : '#ffffff',
            }}
          >
            <span style={{ display: 'inline-block', transform: isSyncingCloud ? 'rotate(360deg)' : 'none', transition: 'transform 0.5s ease' }}>
              🔄
            </span>
            <span>{isSyncingCloud ? 'Syncing...' : 'Sync Cloud'}</span>
          </button>

          {isAdmin && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAddCatModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem' }}
              >
                🏷️ + Add Custom Category
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenUploadModal}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
              >
                + 📁 Upload Material / Document
              </button>
              {resources.length > 0 && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleClearAllResources}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, fontSize: '0.85rem', color: '#dc2626', borderColor: '#fca5a5' }}
                >
                  🗑️ Clear All
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card mb-6" style={{ padding: '1.25rem', borderRadius: '16px', background: 'var(--color-surface)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Main Search Bar with Multi-Word Token Engine */}
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', opacity: 0.6 }}>
              🔍
            </span>
            <input
              type="text"
              className="input"
              style={{
                paddingLeft: '46px',
                paddingRight: search ? '40px' : '16px',
                paddingTop: '0.85rem',
                paddingBottom: '0.85rem',
                fontSize: '0.95rem',
                borderRadius: '12px',
                border: search ? '2px solid #2563eb' : '2px solid var(--color-border)',
                background: 'var(--color-bg)',
              }}
              placeholder="Search e-library: type title, 'comic', 'cyber', 'python', 'manga', author, year, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  fontSize: '1rem',
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Result Feedback Badge */}
          {search.trim() && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', color: '#2563eb', fontWeight: 700 }}>
              <span>
                ⚡ Found {filteredResources.length} {filteredResources.length === 1 ? 'document' : 'documents'} matching &quot;{search}&quot;
              </span>
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}
              >
                Clear Search Filter
              </button>
            </div>
          )}

          {/* Dynamic Category Tag Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none', alignItems: 'center' }}>
            {dynamicCategories.map((cat) => {
              const isSelected = selectedCat === cat
              const isCustom = customCategories.includes(cat)
              const count = cat === 'All'
                ? resources.length
                : cat === '⭐ Starred / Saved Books'
                ? resources.filter((r) => bookmarkedIds.includes(r.id)).length
                : cat === 'Comic Books'
                ? resources.filter((r) => r.category.toLowerCase().includes('comic') || r.category.toLowerCase().includes('graphic')).length
                : cat === 'Graphic Novels & Manga'
                ? resources.filter((r) => r.category.toLowerCase().includes('manga') || r.category.toLowerCase().includes('graphic')).length
                : resources.filter((r) => r.category.toLowerCase() === cat.toLowerCase()).length

              const emoji = cat === 'All'
                ? '📚'
                : cat === '⭐ Starred / Saved Books'
                ? '⭐'
                : cat.toLowerCase().includes('comic')
                ? '🦸'
                : cat.toLowerCase().includes('manga') || cat.toLowerCase().includes('graphic')
                ? '🎨'
                : cat.toLowerCase().includes('textbook')
                ? '📖'
                : cat.toLowerCase().includes('lab')
                ? '💻'
                : cat.toLowerCase().includes('past')
                ? '📝'
                : cat.toLowerCase().includes('notes')
                ? '📓'
                : '🏷️'

              return (
                <div key={cat} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedCat(cat)}
                    style={{
                      padding: '0.45rem 0.9rem',
                      borderRadius: isCustom && isAdmin ? '999px 0 0 999px' : '999px',
                      fontSize: '0.8rem',
                      fontWeight: isSelected ? 800 : 600,
                      whiteSpace: 'nowrap',
                      border: isSelected ? '2px solid #2563eb' : '1px solid var(--color-border)',
                      borderRight: isCustom && isAdmin ? 'none' : undefined,
                      background: isSelected ? '#eff6ff' : 'var(--color-surface)',
                      color: isSelected ? '#1e3a8a' : 'var(--color-text)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>{emoji}</span>
                    <span>{cat}</span>
                    <span style={{ fontSize: '0.72rem', opacity: isSelected ? 0.9 : 0.6, fontWeight: 700, marginLeft: '2px' }}>
                      ({count})
                    </span>
                  </button>
                  {isCustom && isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCustomCategory(cat)
                      }}
                      title={`Delete "${cat}" category`}
                      style={{
                        padding: '0.45rem 0.5rem',
                        borderRadius: '0 999px 999px 0',
                        fontSize: '0.75rem',
                        border: isSelected ? '2px solid #2563eb' : '1px solid var(--color-border)',
                        borderLeft: '1px solid rgba(0,0,0,0.1)',
                        background: isSelected ? '#eff6ff' : 'var(--color-surface)',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontWeight: 900,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })}

            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAddCatModal(true)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  border: '1.5px dashed #2563eb',
                  background: 'transparent',
                  color: '#2563eb',
                  cursor: 'pointer',
                }}
              >
                + Add Category
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', padding: '3.5rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📚</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>No E-Library Documents Found</h3>
            <p style={{ fontSize: '0.85rem' }}>
              {isStudent
                ? 'Your instructors have not published past papers or notes for this category yet.'
                : 'Upload past papers, revision notes, or lab guides using the button above.'}
            </p>
          </div>
        ) : (
          filteredResources.map((res) => (
            <div
              key={res.id}
              className="card"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-primary" style={{ fontWeight: 700 }}>{res.category}</span>
                    <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                      {res.file_type}
                      {res.file_size && !res.file_size.toLowerCase().includes('drive') && !res.file_size.toLowerCase().includes('cloud') ? ` • ${res.file_size}` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => toggleBookmark(res.id, e)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.25rem',
                      lineHeight: 1,
                      color: bookmarkedIds.includes(res.id) ? '#f59e0b' : '#94a3b8',
                      transition: 'transform 0.15s ease',
                    }}
                    title={bookmarkedIds.includes(res.id) ? 'Remove from Saved Books' : 'Save to My Starred Books'}
                  >
                    {bookmarkedIds.includes(res.id) ? '⭐' : '☆'}
                  </button>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--color-primary)', lineHeight: 1.35 }}>
                  {res.title}
                </h3>

                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div>📚 <strong>Discipline:</strong> {res.subject}</div>
                  <div>🎯 <strong>Level:</strong> {res.class_level}</div>
                  <div>👨‍🏫 <strong>Uploaded by:</strong> {res.uploaded_by}</div>
                  <div>👁️ <strong>Readings:</strong> {res.downloads_count || 0} students</div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', paddingTop: '0.85rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  {res.year ? `Examination Year ${res.year}` : 'Active Edition'}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {isAdmin && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#dc2626' }}
                      title="Delete Resource"
                      onClick={() => setResourceToDelete(res)}
                    >
                      🗑️
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleOpenReader(res)}
                  >
                    📖 Read Document 🔒
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Interactive Fullscreen Protected Document Viewer */}
      {readingResource && (
        <>
          <style>{`
            ::selection { background: #fef08a !important; color: #0f172a !important; }
            ::-moz-selection { background: #fef08a !important; color: #0f172a !important; }
          `}</style>
        <div
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 99999,
            background: readerTheme === 'dark' ? '#0b0f19' : readerTheme === 'sepia' ? '#fbf0d9' : '#ffffff',
            color: readerTheme === 'dark' ? '#f8fafc' : '#1e293b',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            userSelect: 'text',
            WebkitUserSelect: 'text',
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            setDrmWarning('🔒 Protected Academic Viewer: Screenshots and saving are restricted.')
            setTimeout(() => setDrmWarning(null), 3000)
          }}
          onCopy={(e) => {
            e.preventDefault()
            setDrmWarning('🔒 Protected Academic Viewer: Copying is restricted.')
            setTimeout(() => setDrmWarning(null), 3000)
          }}
          onCut={(e) => e.preventDefault()}
        >
          {/* DRM Warning Toast */}
          {drmWarning && (
            <div
              style={{
                position: 'fixed',
                top: '64px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 100000,
                background: '#dc2626',
                color: '#ffffff',
                padding: '0.65rem 1.4rem',
                borderRadius: '999px',
                fontWeight: 800,
                fontSize: '0.85rem',
                boxShadow: '0 8px 24px rgba(220, 38, 38, 0.45)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'center',
                animation: 'fadeIn 0.2s ease-in-out',
              }}
            >
              <span>🛡️</span>
              <span>{drmWarning}</span>
            </div>
          )}

          {/* WPS-Style Fullscreen Document Toolbar */}
          <div
            style={{
              paddingTop: 'calc(0.4rem + env(safe-area-inset-top, 0px))',
              paddingLeft: isMobile ? '0.5rem' : '1rem',
              paddingRight: isMobile ? '0.5rem' : '1rem',
              paddingBottom: '0.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${readerTheme === 'dark' ? '#1e293b' : readerTheme === 'sepia' ? '#e6d7b9' : '#e2e8f0'}`,
              background: readerTheme === 'dark' ? '#0f172a' : readerTheme === 'sepia' ? '#f4ebd0' : '#ffffff',
              flexShrink: 0,
              gap: '0.5rem',
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              zIndex: 50,
              flexWrap: 'wrap',
            }}
          >
            {/* Left: Back + Doc Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
              <button
                type="button"
                onClick={() => setReadingResource(null)}
                style={{
                  background: readerTheme === 'dark' ? '#1e293b' : '#f1f5f9',
                  color: readerTheme === 'dark' ? '#94a3b8' : '#475569',
                  border: 'none',
                  borderRadius: '8px',
                  padding: isMobile ? '5px 8px' : '6px 12px',
                  fontWeight: 800,
                  fontSize: isMobile ? '0.75rem' : '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0,
                }}
                title="Close Reader and return to Library"
              >
                <span>←</span>
                <span>{isMobile ? 'Back' : 'Back to Library'}</span>
              </button>

              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: isMobile ? '0.82rem' : '0.96rem',
                    fontWeight: 900,
                    color: readerTheme === 'dark' ? '#93c5fd' : readerTheme === 'sepia' ? '#2d2215' : '#1e3a8a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: isMobile ? '120px' : '240px',
                  }}
                >
                  {readingResource.title}
                </h3>
                <div style={{ fontSize: '0.68rem', opacity: 0.75, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {readingResource.subject} {readingResource.category ? `• ${readingResource.category}` : ''}
                </div>
              </div>
            </div>

            {/* Center: WPS Annotation & Highlighter Suite */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                background: readerTheme === 'dark' ? '#1e293b' : '#f1f5f9',
                padding: '2px 4px',
                borderRadius: '10px',
                border: `1px solid ${readerTheme === 'dark' ? '#334155' : '#cbd5e1'}`,
              }}
            >
              {/* Scroll / Read Mode */}
              <button
                type="button"
                onClick={() => setAnnotationTool('cursor')}
                style={{
                  background: annotationTool === 'cursor' ? '#2563eb' : 'transparent',
                  color: annotationTool === 'cursor' ? '#ffffff' : 'inherit',
                  border: 'none',
                  padding: isMobile ? '4px 6px' : '4px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.72rem' : '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
                title="Read / Scroll Mode"
              >
                <span>👆</span>
                {!isMobile && <span>Read</span>}
              </button>

              {/* WPS Highlighter */}
              <button
                type="button"
                onClick={() => {
                  setAnnotationTool('highlighter')
                }}
                style={{
                  background: annotationTool === 'highlighter' ? highlighterColor : 'transparent',
                  color: annotationTool === 'highlighter' ? '#713f12' : 'inherit',
                  border: annotationTool === 'highlighter' ? '1.5px solid #eab308' : 'none',
                  padding: isMobile ? '4px 6px' : '4px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.72rem' : '0.78rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
                title="WPS Highlighter: Drag to highlight lines of text"
              >
                <span>🖍️</span>
                {!isMobile && <span>Highlight</span>}
              </button>

              {/* Highlighter Color Swatches */}
              {annotationTool === 'highlighter' && (
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', marginLeft: '2px', paddingLeft: '2px', borderLeft: '1px solid rgba(0,0,0,0.1)' }}>
                  {[
                    { color: '#fef08a', title: 'Yellow' },
                    { color: '#86efac', title: 'Green' },
                    { color: '#fbcfe8', title: 'Pink' },
                    { color: '#a5f3fc', title: 'Cyan' },
                  ].map((sw) => (
                    <button
                      key={sw.color}
                      type="button"
                      onClick={() => setHighlighterColor(sw.color)}
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: sw.color,
                        border: highlighterColor === sw.color ? '2px solid #000' : '1px solid rgba(0,0,0,0.2)',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      title={sw.title}
                    />
                  ))}
                </div>
              )}

              {/* Pen / Freehand Draw */}
              <button
                type="button"
                onClick={() => setAnnotationTool('pen')}
                style={{
                  background: annotationTool === 'pen' ? '#dc2626' : 'transparent',
                  color: annotationTool === 'pen' ? '#ffffff' : 'inherit',
                  border: 'none',
                  padding: isMobile ? '4px 6px' : '4px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.72rem' : '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
                title="Pen Tool: Draw notes, circle formulas"
              >
                <span>✏️</span>
                {!isMobile && <span>Pen</span>}
              </button>

              {/* Pen Color Swatches */}
              {annotationTool === 'pen' && (
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', marginLeft: '2px', paddingLeft: '2px', borderLeft: '1px solid rgba(0,0,0,0.1)' }}>
                  {[
                    { color: '#ef4444', title: 'Red' },
                    { color: '#2563eb', title: 'Blue' },
                    { color: '#0f172a', title: 'Black' },
                  ].map((sw) => (
                    <button
                      key={sw.color}
                      type="button"
                      onClick={() => setPenColor(sw.color)}
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: sw.color,
                        border: penColor === sw.color ? '2px solid #fff' : '1px solid rgba(0,0,0,0.2)',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      title={sw.title}
                    />
                  ))}
                </div>
              )}

              {/* Sticky Note */}
              <button
                type="button"
                onClick={() => setAnnotationTool('sticky')}
                style={{
                  background: annotationTool === 'sticky' ? '#f59e0b' : 'transparent',
                  color: annotationTool === 'sticky' ? '#ffffff' : 'inherit',
                  border: 'none',
                  padding: isMobile ? '4px 6px' : '4px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.72rem' : '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
                title="Sticky Note: Tap document to place revision note"
              >
                <span>📝</span>
                {!isMobile && <span>Note</span>}
              </button>

              {/* Eraser */}
              <button
                type="button"
                onClick={() => setAnnotationTool('eraser')}
                style={{
                  background: annotationTool === 'eraser' ? '#64748b' : 'transparent',
                  color: annotationTool === 'eraser' ? '#ffffff' : 'inherit',
                  border: 'none',
                  padding: isMobile ? '4px 6px' : '4px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.72rem' : '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
                title="Eraser: Tap stroke to erase"
              >
                <span>🧽</span>
                {!isMobile && <span>Eraser</span>}
              </button>

              {/* Clear All Annotations */}
              {(annotations.length > 0 || stickyNotes.length > 0) && (
                <button
                  type="button"
                  onClick={handleClearAnnotations}
                  style={{
                    background: '#fee2e2',
                    color: '#991b1b',
                    border: 'none',
                    padding: '3px 6px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                  }}
                  title="Clear all highlights & notes"
                >
                  🗑️
                </button>
              )}
            </div>

            {/* Right: Working Zoom Engine + Fullscreen + Themes */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {/* Working Zoom Controls */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1px',
                  background: readerTheme === 'dark' ? '#1e293b' : '#f1f5f9',
                  padding: '2px 4px',
                  borderRadius: '8px',
                  border: `1px solid ${readerTheme === 'dark' ? '#334155' : '#cbd5e1'}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => setReaderZoom((z) => Math.max(50, z - 15))}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    padding: '2px 6px',
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                  }}
                  title="Zoom Out (−)"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => setReaderZoom(100)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    minWidth: '38px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    color: readerTheme === 'dark' ? '#93c5fd' : '#2563eb',
                    padding: '1px 2px',
                  }}
                  title="Click to reset 100%"
                >
                  {readerZoom}%
                </button>
                <button
                  type="button"
                  onClick={() => setReaderZoom((z) => Math.min(250, z + 15))}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    padding: '2px 6px',
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                  }}
                  title="Zoom In (+)"
                >
                  +
                </button>
                {!isMobile && (
                  <button
                    type="button"
                    onClick={() => setReaderZoom(130)}
                    style={{
                      background: readerZoom === 130 ? '#dbeafe' : 'transparent',
                      border: 'none',
                      color: readerZoom === 130 ? '#1e40af' : '#64748b',
                      padding: '2px 5px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                    }}
                    title="Fit Page Width"
                  >
                    ↔ Fit
                  </button>
                )}
              </div>

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={handleToggleFullscreen}
                style={{
                  background: isFullscreen ? '#2563eb' : (readerTheme === 'dark' ? '#1e293b' : '#f1f5f9'),
                  color: isFullscreen ? '#ffffff' : 'inherit',
                  border: `1px solid ${readerTheme === 'dark' ? '#334155' : '#cbd5e1'}`,
                  borderRadius: '8px',
                  padding: isMobile ? '4px 6px' : '4px 8px',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
                title={isFullscreen ? 'Exit Fullscreen' : 'Open Fullscreen (WPS Mode)'}
              >
                <span>{isFullscreen ? '🗗' : '⛶'}</span>
                {!isMobile && <span>{isFullscreen ? 'Window' : 'Fullscreen'}</span>}
              </button>

              {/* Bookmark Toggle */}
              <button
                type="button"
                onClick={() => toggleBookmark(readingResource.id)}
                style={{
                  background: bookmarkedIds.includes(readingResource.id) ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                  border: bookmarkedIds.includes(readingResource.id) ? '1px solid #f59e0b' : '1px solid transparent',
                  color: bookmarkedIds.includes(readingResource.id) ? '#f59e0b' : 'inherit',
                  fontSize: '0.85rem',
                  padding: '4px 6px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title={bookmarkedIds.includes(readingResource.id) ? 'Saved in My Books' : 'Save Book'}
              >
                <span>{bookmarkedIds.includes(readingResource.id) ? '⭐' : '☆'}</span>
              </button>

              {/* Theme Selector */}
              <div style={{ display: 'flex', gap: '1px', background: readerTheme === 'dark' ? '#1e293b' : readerTheme === 'sepia' ? '#e2cca4' : '#e2e8f0', borderRadius: '8px', padding: '2px' }}>
                <button
                  type="button"
                  style={{ background: readerTheme === 'light' ? '#fff' : 'transparent', color: readerTheme === 'light' ? '#000' : 'inherit', border: 'none', padding: '3px 6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem' }}
                  onClick={() => setReaderTheme('light')}
                  title="Light Mode"
                >
                  ☀️
                </button>
                <button
                  type="button"
                  style={{ background: readerTheme === 'sepia' ? '#fdf6e2' : 'transparent', color: readerTheme === 'sepia' ? '#78350f' : 'inherit', border: 'none', padding: '3px 6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem' }}
                  onClick={() => setReaderTheme('sepia')}
                  title="Sepia Mode"
                >
                  📜
                </button>
                <button
                  type="button"
                  style={{ background: readerTheme === 'dark' ? '#334155' : 'transparent', color: readerTheme === 'dark' ? '#fff' : 'inherit', border: 'none', padding: '3px 6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem' }}
                  onClick={() => setReaderTheme('dark')}
                  title="Dark Night Mode"
                >
                  🌙
                </button>
              </div>
            </div>
          </div>

            {/* Dedicated Collapsible Table of Contents & Chapter Navigation Bar */}
            {activeHandbook && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  background: readerTheme === 'dark' ? '#131d31' : readerTheme === 'sepia' ? '#ecdeb8' : '#e0e7ff',
                  borderRadius: '12px',
                  padding: '6px 10px',
                  border: `1px solid ${readerTheme === 'dark' ? '#1e3a8a' : readerTheme === 'sepia' ? '#d4af37' : '#c7d2fe'}`,
                }}
              >
                {/* Collapsible Table of Contents Toggle Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (isMobile) {
                      setShowMobileToc(true)
                    } else {
                      setIsTocCollapsed((prev) => !prev)
                    }
                  }}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: isMobile ? '6px 12px' : '7px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: isMobile ? '0.8rem' : '0.86rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
                    flexShrink: 0,
                  }}
                  title="Toggle Table of Contents Sidebar"
                >
                  <span style={{ fontSize: '1rem' }}>📑</span>
                  <span>
                    {isMobile
                      ? `Table of Contents (${activeHandbook.chapters.length} Ch.) ▾`
                      : isTocCollapsed
                      ? `▶ Expand Table of Contents (${activeHandbook.chapters.length} Ch.)`
                      : `◀ Collapse Table of Contents`}
                  </span>
                </button>

                {/* Current Chapter Badge & Dropdown Quick Switcher */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    minWidth: 0,
                    overflow: 'hidden',
                    fontSize: isMobile ? '0.78rem' : '0.85rem',
                    fontWeight: 800,
                    color: readerTheme === 'dark' ? '#bfdbfe' : readerTheme === 'sepia' ? '#433422' : '#1e3a8a',
                  }}
                >
                  <span style={{ opacity: 0.75, flexShrink: 0 }}>Now:</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Ch. {activeHandbook.chapters[activeChapterIndex]?.number}: {activeHandbook.chapters[activeChapterIndex]?.title}
                  </span>
                </div>

                {/* Width Mode & Prev / Next Chapter Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => setIsHandbookFullWidth((prev) => !prev)}
                    style={{
                      background: isHandbookFullWidth ? '#2563eb' : (readerTheme === 'dark' ? '#1e293b' : '#ffffff'),
                      color: isHandbookFullWidth ? '#ffffff' : 'inherit',
                      border: `1px solid ${readerTheme === 'dark' ? '#334155' : '#cbd5e1'}`,
                      padding: isMobile ? '5px 8px' : '5px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: isMobile ? '0.75rem' : '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title={isHandbookFullWidth ? 'Switch to Book Page Width' : 'Switch to 100% Whole Screen Width'}
                  >
                    <span>{isHandbookFullWidth ? '⛶ 100% Screen' : '📖 Page Mode'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={activeChapterIndex === 0}
                    onClick={() => setActiveChapterIndex((idx) => Math.max(0, idx - 1))}
                    style={{
                      background: readerTheme === 'dark' ? '#1e293b' : '#ffffff',
                      color: activeChapterIndex === 0 ? '#94a3b8' : 'inherit',
                      border: 'none',
                      padding: isMobile ? '5px 8px' : '5px 12px',
                      borderRadius: '8px',
                      cursor: activeChapterIndex === 0 ? 'not-allowed' : 'pointer',
                      fontWeight: 700,
                      fontSize: isMobile ? '0.75rem' : '0.8rem',
                      opacity: activeChapterIndex === 0 ? 0.5 : 1,
                    }}
                    title="Previous Chapter"
                  >
                    ◀ Prev
                  </button>
                  <button
                    type="button"
                    disabled={activeChapterIndex >= activeHandbook.chapters.length - 1}
                    onClick={() => setActiveChapterIndex((idx) => Math.min(activeHandbook.chapters.length - 1, idx + 1))}
                    style={{
                      background: readerTheme === 'dark' ? '#1e293b' : '#ffffff',
                      color: activeChapterIndex >= activeHandbook.chapters.length - 1 ? '#94a3b8' : 'inherit',
                      border: 'none',
                      padding: isMobile ? '5px 8px' : '5px 12px',
                      borderRadius: '8px',
                      cursor: activeChapterIndex >= activeHandbook.chapters.length - 1 ? 'not-allowed' : 'pointer',
                      fontWeight: 700,
                      fontSize: isMobile ? '0.75rem' : '0.8rem',
                      opacity: activeChapterIndex >= activeHandbook.chapters.length - 1 ? 0.5 : 1,
                    }}
                    title="Next Chapter"
                  >
                    Next ▶
                  </button>
                </div>
              </div>
            )}

          {/* Fullscreen Document Content Viewport */}
          <div style={{ flex: 1, position: 'relative', overflow: 'auto', WebkitOverflowScrolling: 'touch', background: readerTheme === 'dark' ? '#0b0f19' : readerTheme === 'sepia' ? '#fdf6e2' : '#f8fafc' }}>
            {/* Anti-Popout Click Interceptor */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '75px',
                height: '75px',
                zIndex: 35,
                background: 'transparent',
                cursor: 'default',
              }}
              onClick={(e) => {
                e.stopPropagation()
                setDrmWarning('🔒 Protected Viewer: Opening documents outside the LMS app is disabled.')
                setTimeout(() => setDrmWarning(null), 3500)
              }}
              title="Protected Viewer: In-App Reading Only"
            />

            {/* Dynamic Subtle Security Watermark */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 25,
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
                    fontSize: isMobile ? '0.8rem' : '1rem',
                    fontWeight: 800,
                    color: '#64748b',
                    letterSpacing: '0.12em',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  GLOBAL COLLEGE • LICENSED TO {profile?.full_name?.toUpperCase() || 'REGISTERED STUDENT'} • ACADEMIC USE ONLY
                </div>
              ))}
            </div>

            {/* Embedded Document Viewport with Zoom Scaling and Native E-Reader */}
            <div
              style={{
                width: '100%',
                minHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: readerTheme === 'dark' ? '#0b0f19' : readerTheme === 'sepia' ? '#fdf6e2' : '#ffffff',
                color: readerTheme === 'dark' ? '#cbd5e1' : readerTheme === 'sepia' ? '#433422' : '#1e293b',
                position: 'relative',
              }}
            >
              {/* Blur / Screenshot Blackout Shield */}
              {isBlurred && (
                <div
                  onClick={() => setIsBlurred(false)}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 99999,
                    background: 'rgba(7, 10, 18, 0.98)',
                    backdropFilter: 'blur(35px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    textAlign: 'center',
                    padding: '2rem',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🛡️</div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '0 0 0.5rem', color: '#d4af37' }}>
                    Screen Capture Protection Active
                  </h3>
                  <p style={{ fontSize: '0.92rem', color: '#94a3b8', maxWidth: '420px', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
                    Screen recording, snipping tools, or background window switching detected.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsBlurred(false)}
                    style={{
                      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.65rem 1.6rem',
                      borderRadius: '12px',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    Resume Reading →
                  </button>
                </div>
              )}

              {activeComicBook ? (
                // 1. INTERACTIVE COMIC BOOK & MANGA VIEWER
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100%', position: 'relative' }}>
                  {/* Comic Reader Top Bar */}
                  <div
                    style={{
                      background: comicTheme === 'cyber' ? 'linear-gradient(135deg, #090d16, #022c22)' : comicTheme === 'noir' ? '#000000' : comicTheme === 'sepia' ? '#f4ebd0' : '#f8fafc',
                      borderBottom: comicTheme === 'cyber' ? '2px solid #059669' : comicTheme === 'noir' ? '1px solid #334155' : '1px solid #e2e8f0',
                      padding: isMobile ? '0.75rem 1rem' : '1rem 1.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ background: '#059669', color: '#ffffff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>
                          🦸 {activeComicBook.genre}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: comicTheme === 'cyber' ? '#34d399' : '#059669' }}>
                          {activeComicBook.volume}
                        </span>
                      </div>
                      <h2 style={{ margin: '4px 0 2px', fontSize: isMobile ? '1.15rem' : '1.45rem', fontWeight: 900, color: comicTheme === 'cyber' || comicTheme === 'noir' ? '#ffffff' : '#0f172a' }}>
                        {activeComicBook.title}
                      </h2>
                      <div style={{ fontSize: '0.75rem', opacity: 0.8, color: comicTheme === 'cyber' || comicTheme === 'noir' ? '#94a3b8' : '#475569' }}>
                        ✍️ Written by {activeComicBook.author} • 🎨 Art by {activeComicBook.illustrator} • ⏱️ {activeComicBook.estimatedReadTime}
                      </div>
                    </div>

                    {/* Comic Reading Mode Switcher & Theme Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '2px', border: '1px solid rgba(255,255,255,0.15)' }}>
                        <button
                          type="button"
                          onClick={() => setComicViewLayout('webtoon')}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            border: 'none',
                            background: comicViewLayout === 'webtoon' ? '#059669' : 'transparent',
                            color: comicViewLayout === 'webtoon' ? '#ffffff' : 'inherit',
                            cursor: 'pointer',
                          }}
                        >
                          📜 Webtoon Vertical
                        </button>
                        <button
                          type="button"
                          onClick={() => setComicViewLayout('panel')}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            border: 'none',
                            background: comicViewLayout === 'panel' ? '#059669' : 'transparent',
                            color: comicViewLayout === 'panel' ? '#ffffff' : 'inherit',
                            cursor: 'pointer',
                          }}
                        >
                          📑 Panel Flip
                        </button>
                      </div>

                      {/* Theme switcher */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {(['cyber', 'noir', 'sepia', 'light'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setComicTheme(t)}
                            style={{
                              padding: '4px 7px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              border: comicTheme === t ? '1.5px solid #10b981' : '1px solid rgba(255,255,255,0.2)',
                              background: t === 'cyber' ? '#064e3b' : t === 'noir' ? '#18181b' : t === 'sepia' ? '#78350f' : '#f1f5f9',
                              color: t === 'light' ? '#0f172a' : '#ffffff',
                              cursor: 'pointer',
                            }}
                          >
                            {t === 'cyber' ? '⚡ Cyber' : t === 'noir' ? '🕶️ Noir' : t === 'sepia' ? '📜 Sepia' : '☀️ Day'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Issue Selector Tabs */}
                  {activeComicBook.issues.length > 1 && (
                    <div style={{ display: 'flex', gap: '6px', padding: '0.5rem 1.5rem', background: comicTheme === 'cyber' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
                      {activeComicBook.issues.map((iss, iIdx) => (
                        <button
                          key={iIdx}
                          type="button"
                          onClick={() => {
                            setActiveIssueIndex(iIdx)
                            setActivePanelIndex(0)
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: activeIssueIndex === iIdx ? 800 : 600,
                            border: activeIssueIndex === iIdx ? '1.5px solid #10b981' : '1px solid transparent',
                            background: activeIssueIndex === iIdx ? '#064e3b' : 'transparent',
                            color: activeIssueIndex === iIdx ? '#34d399' : 'inherit',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {iss.coverEmoji} {iss.title}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Comic Reader Body */}
                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: isMobile ? '1rem 0.75rem' : '2rem 1.5rem',
                      background: comicTheme === 'cyber' ? '#040711' : comicTheme === 'noir' ? '#000000' : comicTheme === 'sepia' ? '#fbf0d9' : '#f8fafc',
                      color: comicTheme === 'cyber' || comicTheme === 'noir' ? '#f8fafc' : '#1e293b',
                    }}
                  >
                    {(() => {
                      const currentIssue = activeComicBook.issues[activeIssueIndex] || activeComicBook.issues[0]
                      if (!currentIssue) return null

                      if (comicViewLayout === 'panel') {
                        const currentPanel = currentIssue.panels[activePanelIndex] || currentIssue.panels[0]
                        return (
                          <div style={{ maxWidth: '750px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {/* Panel Flip Progress Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', fontWeight: 800, color: '#10b981' }}>
                              <span>{currentIssue.title}</span>
                              <span>Panel {activePanelIndex + 1} of {currentIssue.panels.length}</span>
                            </div>

                            {/* Single Large Active Panel */}
                            <div
                              style={{
                                background: comicTheme === 'cyber' ? '#0a0f1d' : comicTheme === 'noir' ? '#09090b' : comicTheme === 'sepia' ? '#f4ebd0' : '#ffffff',
                                border: comicTheme === 'cyber' ? '2px solid #059669' : comicTheme === 'noir' ? '2px solid #27272a' : '2px solid #0f172a',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                boxShadow: comicTheme === 'cyber' ? '0 12px 35px rgba(5, 150, 105, 0.25)' : '0 12px 30px rgba(0,0,0,0.15)',
                                position: 'relative',
                              }}
                            >
                              {currentPanel.narrative && (
                                <div style={{ background: '#fef08a', color: '#713f12', padding: '0.75rem 1.25rem', fontSize: '0.85rem', fontWeight: 800, borderBottom: '2px solid #0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  📌 {currentPanel.narrative}
                                </div>
                              )}

                              <div style={{ padding: isMobile ? '2rem 1rem' : '3.5rem 2rem', background: 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.15), transparent 70%)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
                                {currentPanel.sfx && (
                                  <div style={{ position: 'absolute', top: '16px', right: '18px', background: '#dc2626', color: '#ffffff', fontWeight: 900, fontStyle: 'italic', fontSize: '0.95rem', padding: '4px 12px', borderRadius: '6px', transform: 'rotate(-5deg)', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)' }}>
                                    💥 {currentPanel.sfx}
                                  </div>
                                )}
                                <div style={{ fontSize: isMobile ? '4.5rem' : '6rem', marginBottom: '1rem', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.4))' }}>
                                  {currentPanel.illustrationEmoji}
                                </div>
                                <div style={{ fontSize: isMobile ? '0.95rem' : '1.15rem', fontWeight: 700, opacity: 0.95, maxWidth: '580px', lineHeight: 1.5 }}>
                                  {currentPanel.illustrationVisual}
                                </div>
                              </div>

                              {currentPanel.codeSnippet && (
                                <div style={{ margin: '0 1.25rem 1.25rem', background: '#020617', border: '1px solid #1e293b', borderRadius: '10px', overflow: 'hidden' }}>
                                  <div style={{ background: '#0f172a', padding: '4px 10px', fontSize: '0.72rem', color: '#38bdf8', fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
                                    <span>💻 Live Terminal Protocol</span>
                                    <span>🔒 Sandbox Verified</span>
                                  </div>
                                  <pre style={{ margin: 0, padding: '0.85rem', fontFamily: 'monospace', fontSize: '0.82rem', color: '#4ade80', overflowX: 'auto', lineHeight: 1.5 }}>
                                    <code>{currentPanel.codeSnippet}</code>
                                  </pre>
                                </div>
                              )}

                              {currentPanel.terminalOutput && (
                                <div style={{ margin: '0 1.25rem 1.25rem', background: '#020617', border: '1px solid #059669', borderRadius: '10px', padding: '0.85rem', fontFamily: 'monospace', fontSize: '0.8rem', color: '#34d399', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                  {currentPanel.terminalOutput}
                                </div>
                              )}

                              {currentPanel.dialogue && (
                                <div style={{ padding: '1.25rem', borderTop: comicTheme === 'cyber' ? '1px solid #1e293b' : '1px solid #e2e8f0', background: comicTheme === 'cyber' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                  <div style={{ fontSize: '2.5rem', flexShrink: 0 }}>{currentPanel.avatarEmoji || '🧑‍💻'}</div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#10b981', textTransform: 'uppercase', marginBottom: '4px' }}>
                                      {currentPanel.characterName || 'Character'}
                                    </div>
                                    <div style={{ background: comicTheme === 'cyber' ? '#131c31' : '#f1f5f9', border: '1.5px solid #2563eb', borderRadius: '0 14px 14px 14px', padding: '0.85rem 1.15rem', fontSize: '0.95rem', fontWeight: 600, color: comicTheme === 'cyber' || comicTheme === 'noir' ? '#ffffff' : '#0f172a', lineHeight: 1.45 }}>
                                      💬 “{currentPanel.dialogue}”
                                    </div>
                                    {currentPanel.thought && (
                                      <div style={{ marginTop: '6px', fontStyle: 'italic', fontSize: '0.82rem', opacity: 0.8, color: '#93c5fd', paddingLeft: '8px' }}>
                                        💭 <em>(Thought: {currentPanel.thought})</em>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Panel Navigation Controls */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                              <button
                                type="button"
                                disabled={activePanelIndex === 0}
                                onClick={() => setActivePanelIndex((p) => Math.max(0, p - 1))}
                                style={{
                                  flex: 1,
                                  padding: '0.75rem',
                                  borderRadius: '12px',
                                  border: 'none',
                                  background: activePanelIndex === 0 ? 'rgba(255,255,255,0.1)' : '#1e293b',
                                  color: '#ffffff',
                                  fontWeight: 800,
                                  cursor: activePanelIndex === 0 ? 'not-allowed' : 'pointer',
                                  opacity: activePanelIndex === 0 ? 0.4 : 1,
                                }}
                              >
                                ← Previous Panel
                              </button>

                              <button
                                type="button"
                                disabled={activePanelIndex === currentIssue.panels.length - 1}
                                onClick={() => setActivePanelIndex((p) => Math.min(currentIssue.panels.length - 1, p + 1))}
                                style={{
                                  flex: 1,
                                  padding: '0.75rem',
                                  borderRadius: '12px',
                                  border: 'none',
                                  background: activePanelIndex === currentIssue.panels.length - 1 ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #059669, #10b981)',
                                  color: '#ffffff',
                                  fontWeight: 900,
                                  cursor: activePanelIndex === currentIssue.panels.length - 1 ? 'not-allowed' : 'pointer',
                                  opacity: activePanelIndex === currentIssue.panels.length - 1 ? 0.4 : 1,
                                }}
                              >
                                Next Panel →
                              </button>
                            </div>
                          </div>
                        )
                      }

                      // Webtoon Vertical Continuous Flow
                      return (
                        <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                          {/* Issue Header Banner */}
                          <div style={{ textAlign: 'center', padding: '1.25rem', background: 'rgba(5, 150, 105, 0.1)', border: '1px solid rgba(5, 150, 105, 0.3)', borderRadius: '16px' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '6px' }}>{currentIssue.coverEmoji}</div>
                            <h3 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '0 0 4px', color: '#10b981' }}>{currentIssue.title}</h3>
                            <p style={{ fontSize: '0.88rem', opacity: 0.8, margin: 0, fontStyle: 'italic' }}>{currentIssue.synopsis}</p>
                          </div>

                          {currentIssue.panels.map((panel, pIdx) => (
                            <div
                              key={pIdx}
                              style={{
                                background: comicTheme === 'cyber' ? '#0a0f1d' : comicTheme === 'noir' ? '#09090b' : comicTheme === 'sepia' ? '#f4ebd0' : '#ffffff',
                                border: comicTheme === 'cyber' ? '2px solid #059669' : comicTheme === 'noir' ? '2px solid #27272a' : '2px solid #0f172a',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                boxShadow: comicTheme === 'cyber' ? '0 8px 30px rgba(5, 150, 105, 0.2)' : '0 8px 24px rgba(0,0,0,0.12)',
                                position: 'relative',
                              }}
                            >
                              {panel.narrative && (
                                <div style={{ background: '#fef08a', color: '#713f12', padding: '0.65rem 1rem', fontSize: '0.82rem', fontWeight: 800, borderBottom: '2px solid #0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  📌 {panel.narrative}
                                </div>
                              )}

                              <div style={{ padding: isMobile ? '1.5rem 1rem' : '2.5rem 1.5rem', background: 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.12), transparent 70%)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
                                {panel.sfx && (
                                  <div style={{ position: 'absolute', top: '10px', right: '12px', background: '#dc2626', color: '#ffffff', fontWeight: 900, fontStyle: 'italic', fontSize: '0.85rem', padding: '3px 10px', borderRadius: '6px', transform: 'rotate(-5deg)', boxShadow: '0 4px 10px rgba(220, 38, 38, 0.4)', letterSpacing: '0.05em' }}>
                                    💥 {panel.sfx}
                                  </div>
                                )}
                                <div style={{ fontSize: isMobile ? '3.5rem' : '4.5rem', marginBottom: '0.5rem', filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.4))' }}>
                                  {panel.illustrationEmoji}
                                </div>
                                <div style={{ fontSize: isMobile ? '0.85rem' : '0.98rem', fontWeight: 700, opacity: 0.9, maxWidth: '600px', lineHeight: 1.45 }}>
                                  {panel.illustrationVisual}
                                </div>
                              </div>

                              {panel.codeSnippet && (
                                <div style={{ margin: '0 1rem 1rem', background: '#020617', border: '1px solid #1e293b', borderRadius: '10px', overflow: 'hidden' }}>
                                  <div style={{ background: '#0f172a', padding: '4px 10px', fontSize: '0.72rem', color: '#38bdf8', fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
                                    <span>💻 Terminal Intrusion Log</span>
                                    <span>🔒 Live Cyber Execution</span>
                                  </div>
                                  <pre style={{ margin: 0, padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.78rem', color: '#4ade80', overflowX: 'auto', lineHeight: 1.5 }}>
                                    <code>{panel.codeSnippet}</code>
                                  </pre>
                                </div>
                              )}

                              {panel.terminalOutput && (
                                <div style={{ margin: '0 1rem 1rem', background: '#020617', border: '1px solid #059669', borderRadius: '10px', padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.76rem', color: '#34d399', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                  {panel.terminalOutput}
                                </div>
                              )}

                              {panel.dialogue && (
                                <div style={{ padding: '1rem', borderTop: comicTheme === 'cyber' ? '1px solid #1e293b' : '1px solid #e2e8f0', background: comicTheme === 'cyber' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                  <div style={{ fontSize: '2rem', flexShrink: 0 }}>{panel.avatarEmoji || '🧑‍💻'}</div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#10b981', textTransform: 'uppercase', marginBottom: '2px' }}>
                                      {panel.characterName || 'Character'}
                                    </div>
                                    <div style={{ background: comicTheme === 'cyber' ? '#131c31' : '#f1f5f9', border: '1.5px solid #2563eb', borderRadius: '0 12px 12px 12px', padding: '0.75rem 1rem', fontSize: '0.88rem', fontWeight: 600, color: comicTheme === 'cyber' || comicTheme === 'noir' ? '#ffffff' : '#0f172a', lineHeight: 1.45 }}>
                                      💬 “{panel.dialogue}”
                                    </div>
                                    {panel.thought && (
                                      <div style={{ marginTop: '6px', fontStyle: 'italic', fontSize: '0.78rem', opacity: 0.8, color: '#93c5fd', paddingLeft: '8px' }}>
                                        💭 <em>(Thought: {panel.thought})</em>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              ) : activeHandbook ? (
                // 2. NATIVE ACADEMIC HANDBOOK & E-TEXTBOOK READER
                <div style={{ display: 'flex', flex: 1, minHeight: '100%', position: 'relative' }}>
                  {/* Desktop Left Table of Contents Sidebar */}
                  {!isMobile && !isTocCollapsed && (
                    <aside
                      style={{
                        width: '280px',
                        flexShrink: 0,
                        borderRight: readerTheme === 'dark' ? '1px solid #1e293b' : readerTheme === 'sepia' ? '1px solid #e6d7b9' : '1px solid #e2e8f0',
                        background: readerTheme === 'dark' ? '#070a12' : readerTheme === 'sepia' ? '#f4ebd0' : '#f8fafc',
                        padding: '1.25rem 1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        overflowY: 'auto',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: '#d4af37', letterSpacing: '0.05em' }}>
                            {activeHandbook.edition}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsTocCollapsed(true)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'inherit',
                              opacity: 0.6,
                              cursor: 'pointer',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 4px',
                            }}
                            title="Collapse Table of Contents"
                          >
                            ◀ Hide
                          </button>
                        </div>
                        <h4 style={{ margin: '4px 0 2px', fontSize: '0.9rem', fontWeight: 800, color: readerTheme === 'dark' ? '#ffffff' : readerTheme === 'sepia' ? '#2d2215' : '#0f172a', lineHeight: 1.3 }}>
                          {activeHandbook.title}
                        </h4>
                        <div style={{ fontSize: '0.72rem', opacity: 0.75, marginTop: '2px' }}>
                          🏛️ {activeHandbook.faculty}
                        </div>
                        <div style={{ fontSize: '0.72rem', opacity: 0.75, marginTop: '2px' }}>
                          ⏱️ {activeHandbook.estimatedReadTime} • {activeHandbook.totalChapters} Chapters
                        </div>
                      </div>

                      <div style={{ borderTop: readerTheme === 'dark' ? '1px solid #1e293b' : '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.6, marginBottom: '0.5rem' }}>
                          Table of Contents
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {activeHandbook.chapters.map((ch, idx) => {
                            const isActive = idx === activeChapterIndex
                            return (
                              <button
                                key={ch.id}
                                type="button"
                                onClick={() => setActiveChapterIndex(idx)}
                                style={{
                                  textAlign: 'left',
                                  padding: '0.6rem 0.75rem',
                                  borderRadius: '10px',
                                  border: 'none',
                                  background: isActive
                                    ? readerTheme === 'dark' ? '#1e3a8a' : readerTheme === 'sepia' ? '#e2cca4' : '#dbeafe'
                                    : 'transparent',
                                  color: isActive
                                    ? readerTheme === 'dark' ? '#93c5fd' : readerTheme === 'sepia' ? '#433422' : '#1e40af'
                                    : readerTheme === 'dark' ? '#94a3b8' : readerTheme === 'sepia' ? '#6b583f' : '#64748b',
                                  fontWeight: isActive ? 800 : 600,
                                  fontSize: '0.8rem',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                }}
                              >
                                <span style={{ fontSize: '0.75rem', opacity: 0.8, minWidth: '16px' }}>{ch.number}.</span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.title}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </aside>
                  )}

                  {/* Mobile Table of Contents Slide-up Drawer */}
                  {isMobile && showMobileToc && (
                    <div
                      style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 999999,
                        background: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                      }}
                      onClick={() => setShowMobileToc(false)}
                    >
                      <div
                        style={{
                          background: readerTheme === 'dark' ? '#0f172a' : readerTheme === 'sepia' ? '#fdf6e2' : '#ffffff',
                          color: readerTheme === 'dark' ? '#f8fafc' : readerTheme === 'sepia' ? '#2d2215' : '#0f172a',
                          borderTopLeftRadius: '20px',
                          borderTopRightRadius: '20px',
                          maxHeight: '80vh',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.3)',
                          paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Drawer Header */}
                        <div
                          style={{
                            padding: '1.25rem 1.25rem 0.75rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: `1px solid ${readerTheme === 'dark' ? '#1e293b' : readerTheme === 'sepia' ? '#e6d7b9' : '#e2e8f0'}`,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#d4af37' }}>
                              Table of Contents ({activeHandbook.totalChapters} Chapters)
                            </div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 800 }}>
                              {activeHandbook.title}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowMobileToc(false)}
                            style={{
                              background: readerTheme === 'dark' ? '#1e293b' : '#f1f5f9',
                              border: 'none',
                              borderRadius: '50%',
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontWeight: 800,
                              color: 'inherit',
                            }}
                          >
                            ✕
                          </button>
                        </div>

                        {/* Chapter List */}
                        <div style={{ padding: '0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {activeHandbook.chapters.map((ch, idx) => {
                            const isActive = idx === activeChapterIndex
                            return (
                              <button
                                key={ch.id}
                                type="button"
                                onClick={() => {
                                  setActiveChapterIndex(idx)
                                  setShowMobileToc(false)
                                }}
                                style={{
                                  textAlign: 'left',
                                  padding: '0.85rem 1rem',
                                  borderRadius: '12px',
                                  border: 'none',
                                  background: isActive
                                    ? readerTheme === 'dark' ? '#1e3a8a' : readerTheme === 'sepia' ? '#e2cca4' : '#dbeafe'
                                    : readerTheme === 'dark' ? '#1e293b' : readerTheme === 'sepia' ? '#f4ebd0' : '#f8fafc',
                                  color: isActive
                                    ? readerTheme === 'dark' ? '#93c5fd' : readerTheme === 'sepia' ? '#433422' : '#1e40af'
                                    : 'inherit',
                                  fontWeight: isActive ? 800 : 600,
                                  fontSize: '0.88rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '10px',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                  <span style={{ fontWeight: 800, opacity: 0.8, minWidth: '22px' }}>
                                    {ch.number}.
                                  </span>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {ch.title}
                                  </span>
                                </div>
                                {isActive && <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2563eb' }}>● Reading</span>}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Main Chapter Content Area */}
                  <div
                    style={{
                      flex: 1,
                      padding: isMobile ? '1rem 0.75rem 4rem' : isHandbookFullWidth ? '2rem 3rem 4rem' : '2.5rem 3.5rem',
                      maxWidth: isHandbookFullWidth ? '100%' : '900px',
                      margin: isHandbookFullWidth ? '0' : '0 auto',
                      width: '100%',
                      boxSizing: 'border-box',
                      fontSize: `${readerZoom}%`,
                      lineHeight: 1.7,
                      overflowY: 'auto',
                    }}
                  >
                    {activeHandbook.chapters[activeChapterIndex] ? (
                      <div>
                        {/* In-Page Collapsible Table of Contents Accordion */}
                        <div
                          style={{
                            background: readerTheme === 'dark' ? '#0f172a' : readerTheme === 'sepia' ? '#f4ebd0' : '#f1f5f9',
                            border: readerTheme === 'dark' ? '1px solid #1e293b' : readerTheme === 'sepia' ? '1px solid #e6d7b9' : '1px solid #e2e8f0',
                            borderRadius: '14px',
                            marginBottom: '1.5rem',
                            overflow: 'hidden',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setIsInlineTocOpen((prev) => !prev)}
                            style={{
                              width: '100%',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.85rem 1.15rem',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'inherit',
                              fontWeight: 800,
                              fontSize: '0.88rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '1.1rem' }}>📑</span>
                              <span>Table of Contents ({activeHandbook.chapters.length} Chapters)</span>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 800 }}>
                              {isInlineTocOpen ? '▲ Collapse Table of Contents' : '▼ Expand Table of Contents'}
                            </span>
                          </button>

                          {isInlineTocOpen && (
                            <div
                              style={{
                                borderTop: readerTheme === 'dark' ? '1px solid #1e293b' : readerTheme === 'sepia' ? '1px solid #e6d7b9' : '1px solid #e2e8f0',
                                padding: '0.75rem',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                                gap: '6px',
                                maxHeight: '320px',
                                overflowY: 'auto',
                              }}
                            >
                              {activeHandbook.chapters.map((ch, idx) => (
                                <button
                                  key={ch.id}
                                  type="button"
                                  onClick={() => {
                                    setActiveChapterIndex(idx)
                                    setIsInlineTocOpen(false)
                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                  }}
                                  style={{
                                    textAlign: 'left',
                                    padding: '0.65rem 0.85rem',
                                    borderRadius: '10px',
                                    border: idx === activeChapterIndex ? '1.5px solid #2563eb' : '1px solid transparent',
                                    background: idx === activeChapterIndex
                                      ? (readerTheme === 'dark' ? '#1e3a8a' : '#dbeafe')
                                      : (readerTheme === 'dark' ? '#1e293b' : '#ffffff'),
                                    color: idx === activeChapterIndex
                                      ? (readerTheme === 'dark' ? '#93c5fd' : '#1e40af')
                                      : 'inherit',
                                    fontWeight: idx === activeChapterIndex ? 800 : 600,
                                    fontSize: '0.82rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                    <span style={{ fontWeight: 800, opacity: 0.8, minWidth: '18px' }}>{ch.number}.</span>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.title}</span>
                                  </div>
                                  {idx === activeChapterIndex && <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 900, flexShrink: 0 }}>● Current</span>}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Chapter Title Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              background: readerTheme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : readerTheme === 'sepia' ? '#e8d5b0' : '#e0e7ff',
                              color: readerTheme === 'dark' ? '#60a5fa' : readerTheme === 'sepia' ? '#78350f' : '#4338ca',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                            }}
                          >
                            Chapter {activeHandbook.chapters[activeChapterIndex].number}
                          </span>
                          <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                            Module Syllabus Unit
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsInlineTocOpen((prev) => !prev)}
                            style={{
                              marginLeft: 'auto',
                              background: 'transparent',
                              border: 'none',
                              color: '#2563eb',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              padding: '2px 6px',
                            }}
                          >
                            📑 All Chapters ▾
                          </button>
                        </div>

                        <h1
                          style={{
                            fontSize: isMobile ? '1.4rem' : '1.85rem',
                            fontWeight: 900,
                            color: readerTheme === 'dark' ? '#ffffff' : readerTheme === 'sepia' ? '#2d2215' : '#0f172a',
                            margin: '0 0 1rem',
                            lineHeight: 1.25,
                            letterSpacing: '-0.02em',
                          }}
                        >
                          {activeHandbook.chapters[activeChapterIndex].title}
                        </h1>

                        <div
                          style={{
                            background: readerTheme === 'dark' ? '#131b2e' : readerTheme === 'sepia' ? '#f4ebd0' : '#f1f5f9',
                            borderLeft: '4px solid #3b82f6',
                            padding: isMobile ? '0.75rem 1rem' : '0.85rem 1.25rem',
                            borderRadius: '0 12px 12px 0',
                            fontSize: isMobile ? '0.85rem' : '0.92rem',
                            marginBottom: '1.75rem',
                            fontStyle: 'italic',
                          }}
                        >
                          {activeHandbook.chapters[activeChapterIndex].summary}
                        </div>

                        {/* Sections */}
                        {activeHandbook.chapters[activeChapterIndex].sections.map((sec, secIdx) => (
                          <div key={secIdx} style={{ marginBottom: isMobile ? '2rem' : '2.5rem' }}>
                            <h2
                              style={{
                                fontSize: isMobile ? '1.1rem' : '1.25rem',
                                fontWeight: 800,
                                color: readerTheme === 'dark' ? '#f8fafc' : readerTheme === 'sepia' ? '#2d2215' : '#1e293b',
                                margin: '0 0 0.85rem',
                                paddingBottom: '0.4rem',
                                borderBottom: readerTheme === 'dark' ? '1px solid #1e293b' : readerTheme === 'sepia' ? '1px solid #e6d7b9' : '1px solid #e2e8f0',
                              }}
                            >
                              {sec.heading}
                            </h2>

                            {sec.content.map((p, pIdx) => (
                              <p key={pIdx} style={{ margin: '0 0 1rem', fontSize: isMobile ? '0.9rem' : '0.95rem' }}>
                                {p}
                              </p>
                            ))}

                            {/* Practical Code Block */}
                            {sec.codeSnippet && (
                              <div
                                style={{
                                  background: '#040711',
                                  borderRadius: '12px',
                                  border: '1px solid #1e293b',
                                  margin: '1.25rem 0',
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: '#0b1120',
                                    padding: '0.4rem 1rem',
                                    borderBottom: '1px solid #1e293b',
                                    fontSize: '0.72rem',
                                    color: '#94a3b8',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  <span>💻 {sec.codeLanguage || 'Code snippet'}</span>
                                  <span>🔒 Academic Example</span>
                                </div>
                                <pre
                                  style={{
                                    margin: 0,
                                    padding: isMobile ? '0.85rem' : '1.2rem',
                                    fontFamily: 'Fira Code, Consolas, Monaco, monospace',
                                    fontSize: isMobile ? '0.78rem' : '0.85rem',
                                    lineHeight: 1.6,
                                    color: '#38bdf8',
                                    overflowX: 'auto',
                                    userSelect: 'none',
                                    WebkitOverflowScrolling: 'touch',
                                  }}
                                >
                                  <code>{sec.codeSnippet}</code>
                                </pre>
                              </div>
                            )}

                            {/* Key Points Callout */}
                            {sec.keyPoints && sec.keyPoints.length > 0 && (
                              <div
                                style={{
                                  background: readerTheme === 'dark' ? 'rgba(34, 197, 94, 0.1)' : readerTheme === 'sepia' ? '#f5eedb' : '#f0fdf4',
                                  border: readerTheme === 'dark' ? '1px solid rgba(34, 197, 94, 0.3)' : readerTheme === 'sepia' ? '1px solid #d4c5a3' : '1px solid #bbf7d0',
                                  borderRadius: '14px',
                                  padding: isMobile ? '0.85rem 1rem' : '1.1rem 1.4rem',
                                  margin: '1.25rem 0',
                                }}
                              >
                                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: readerTheme === 'dark' ? '#4ade80' : readerTheme === 'sepia' ? '#2d2215' : '#166534', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>💡</span>
                                  <span>Key Examination & Practical Takeaways</span>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: isMobile ? '1rem' : '1.2rem', fontSize: isMobile ? '0.82rem' : '0.88rem' }}>
                                  {sec.keyPoints.map((kp, kpIdx) => (
                                    <li key={kpIdx} style={{ margin: '0.35rem 0' }}>{kp}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Practice Questions */}
                            {sec.practiceQuestions && sec.practiceQuestions.length > 0 && (
                              <div
                                style={{
                                  background: readerTheme === 'dark' ? 'rgba(212, 175, 55, 0.1)' : readerTheme === 'sepia' ? '#f7ebd2' : '#fefce8',
                                  border: readerTheme === 'dark' ? '1px solid rgba(212, 175, 55, 0.3)' : readerTheme === 'sepia' ? '1px solid #d9c49c' : '1px solid #fef08a',
                                  borderRadius: '14px',
                                  padding: isMobile ? '0.85rem 1rem' : '1.1rem 1.4rem',
                                  margin: '1.25rem 0',
                                }}
                              >
                                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: readerTheme === 'dark' ? '#fbbf24' : readerTheme === 'sepia' ? '#78350f' : '#854d0e', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>📝</span>
                                  <span>Past Examination Questions & Model Solution</span>
                                </div>
                                {sec.practiceQuestions.map((pq, pqIdx) => (
                                  <div key={pqIdx} style={{ marginTop: '0.6rem' }}>
                                    <div style={{ fontWeight: 700, fontSize: isMobile ? '0.82rem' : '0.88rem', marginBottom: '0.25rem' }}>{pq.q}</div>
                                    <div style={{ fontSize: isMobile ? '0.78rem' : '0.84rem', opacity: 0.9, paddingLeft: '0.75rem', borderLeft: '2px solid #eab308' }}>{pq.a}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Chapter Navigation Footer (Thumb Friendly on Mobile) */}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '1rem',
                            marginTop: '2.5rem',
                            paddingTop: '1.25rem',
                            borderTop: readerTheme === 'dark' ? '1px solid #1e293b' : readerTheme === 'sepia' ? '1px solid #e6d7b9' : '1px solid #e2e8f0',
                          }}
                        >
                          <div style={{ display: 'flex', gap: '0.75rem', width: isMobile ? '100%' : 'auto', justifyContent: 'space-between' }}>
                            <button
                              type="button"
                              disabled={activeChapterIndex === 0}
                              onClick={() => {
                                setActiveChapterIndex((i) => Math.max(0, i - 1))
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                              }}
                              style={{
                                flex: isMobile ? 1 : 'initial',
                                minHeight: '44px',
                                background: readerTheme === 'dark' ? '#1e293b' : readerTheme === 'sepia' ? '#e8d5b0' : '#f1f5f9',
                                color: readerTheme === 'dark' ? '#f8fafc' : readerTheme === 'sepia' ? '#433422' : '#0f172a',
                                border: 'none',
                                padding: '0.6rem 1.25rem',
                                borderRadius: '12px',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: activeChapterIndex === 0 ? 'not-allowed' : 'pointer',
                                opacity: activeChapterIndex === 0 ? 0.4 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                              }}
                            >
                              ← Prev Chapter
                            </button>

                            <button
                              type="button"
                              disabled={activeChapterIndex === activeHandbook.chapters.length - 1}
                              onClick={() => {
                                setActiveChapterIndex((i) => Math.min(activeHandbook.chapters.length - 1, i + 1))
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                              }}
                              style={{
                                flex: isMobile ? 1 : 'initial',
                                minHeight: '44px',
                                background: '#2563eb',
                                color: '#ffffff',
                                border: 'none',
                                padding: '0.6rem 1.25rem',
                                borderRadius: '12px',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                cursor: activeChapterIndex === activeHandbook.chapters.length - 1 ? 'not-allowed' : 'pointer',
                                opacity: activeChapterIndex === activeHandbook.chapters.length - 1 ? 0.4 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                              }}
                            >
                              Next Chapter →
                            </button>
                          </div>

                          <div style={{ fontSize: '0.8rem', opacity: 0.7, fontWeight: 700, textAlign: 'center' }}>
                            Chapter {activeChapterIndex + 1} of {activeHandbook.chapters.length}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : /\.(png|jpe?g|webp|gif|svg)$/i.test(readingResource.file_url || '') || readingResource.file_url?.startsWith('data:image/') ? (
                // 2. IMAGE VIEWER
                <div style={{ padding: isMobile ? '1rem' : '2rem', height: '100%', overflowY: 'auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src={readingResource.file_url}
                    alt={readingResource.title}
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '85vh',
                      objectFit: 'contain',
                      borderRadius: '12px',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                      pointerEvents: 'none',
                    }}
                  />
                  <div style={{ marginTop: '1rem', fontSize: '0.85rem', opacity: 0.75, fontWeight: 700 }}>
                    {readingResource.title} • {readingResource.subject}
                  </div>
                </div>
              ) : readingResource.file_url ? (
                // 3. WPS OFFICE / ACROBAT-STYLE FULL-SCREEN ANNOTATED VIEWER (PDF, DOCS, REVISION MATERIALS)
                <div
                  onTouchStart={handleReaderTouchStart}
                  onTouchMove={handleReaderTouchMove}
                  onTouchEnd={handleReaderTouchEnd}
                  onTouchCancel={handleReaderTouchEnd}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    width: '100%',
                    height: '100%',
                    minHeight: 0,
                    padding: 0,
                    margin: 0,
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    background: readerTheme === 'dark' ? '#090d16' : readerTheme === 'sepia' ? '#241a10' : '#1e293b',
                    position: 'relative',
                    alignItems: 'center',
                    touchAction: 'pan-x pan-y pinch-zoom',
                  }}
                >
                  {/* Anti-Screen Capture & Snipping Tool Blackout Shield */}
                  {isBlurred && (
                    <div
                      style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 100,
                        background: '#090d16',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1rem',
                        color: '#ffffff',
                        textAlign: 'center',
                        padding: '2rem',
                      }}
                    >
                      <div style={{ fontSize: '3.5rem' }}>🔒</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#f87171', letterSpacing: '-0.02em' }}>
                        Screen Capture & Snipping Tool Blocked
                      </div>
                      <p style={{ fontSize: '0.9rem', color: '#94a3b8', maxWidth: '440px', margin: 0, lineHeight: 1.5 }}>
                        Document view is blacked out during screen capture, window switching, or snipping tool activation to protect academic copyright. Click back into the window to resume reading.
                      </p>
                    </div>
                  )}

                  {/* Zoomable & Annotatable Document Viewport Canvas Container */}
                  <div
                    style={{
                      width: readerZoom <= 100 ? '100%' : `${readerZoom}%`,
                      minWidth: '100%',
                      height: '100%',
                      minHeight: isMobile ? 'calc(100dvh - 54px)' : 'calc(100vh - 54px)',
                      position: 'relative',
                      background: '#000000',
                      transition: 'width 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
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
                        background: readerTheme === 'dark' ? '#0f172a' : readerTheme === 'sepia' ? '#f4ebd0' : '#ffffff',
                        borderBottomLeftRadius: '12px',
                        borderLeft: `1px solid ${readerTheme === 'dark' ? '#1e293b' : '#e2e8f0'}`,
                        borderBottom: `1px solid ${readerTheme === 'dark' ? '#1e293b' : '#e2e8f0'}`,
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
                      <span style={{ fontSize: '0.72rem', opacity: 0.4, color: '#94a3b8' }} title="Protected Reader">🔒</span>
                    </div>

                    {/* Interactive Annotation Canvas Overlay (Draw, Highlight, Erase) */}
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

                    {/* Interactive Draggable Sticky Notes */}
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
                            onClick={() => handleDeleteStickyNote(note.id)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: '0 2px', opacity: 0.7 }}
                            title="Delete note"
                          >
                            ✕
                          </button>
                        </div>
                        <textarea
                          value={note.text}
                          onChange={(e) => handleUpdateStickyNote(note.id, e.target.value)}
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

                    {/* Document Embed Viewport with In-App Offline Protection */}
                    {!isNetworkOnline || iframeLoadError ? (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: isMobile ? 'calc(100dvh - 54px)' : 'calc(100vh - 54px)',
                          height: '100%',
                          background: readerTheme === 'dark' ? '#090d16' : '#f8fafc',
                          color: readerTheme === 'dark' ? '#ffffff' : '#0f172a',
                          padding: '2.5rem 1.5rem',
                          textAlign: 'center',
                          flex: 1,
                        }}
                      >
                        <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'bounce 2s infinite' }}>
                          📡
                        </div>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            color: '#f87171',
                            padding: '4px 14px',
                            borderRadius: '999px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            marginBottom: '1rem',
                            letterSpacing: '0.04em',
                          }}
                        >
                          <span>●</span> Offline Mode
                        </div>
                        <h3
                          style={{
                            fontSize: '1.4rem',
                            fontWeight: 900,
                            margin: '0 0 0.5rem',
                            color: readerTheme === 'dark' ? '#ffffff' : '#0f172a',
                          }}
                        >
                          You Are Currently Offline
                        </h3>
                        <p
                          style={{
                            fontSize: '0.92rem',
                            color: '#94a3b8',
                            maxWidth: '460px',
                            margin: '0 auto 1.75rem',
                            lineHeight: 1.6,
                          }}
                        >
                          This protected academic study document requires an active internet connection to stream securely. Please connect your device to WiFi or cellular data and tap retry.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                              if (navigator.onLine) {
                                setIsNetworkOnline(true)
                                setIframeLoadError(false)
                              } else {
                                alert('Your device is still offline. Please check your WiFi or mobile data connection.')
                              }
                            }}
                            style={{ fontWeight: 800, padding: '0.75rem 1.5rem', borderRadius: '12px' }}
                          >
                            🔄 Check Connection & Retry
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setReadingResource(null)}
                            style={{ fontWeight: 700, padding: '0.75rem 1.5rem', borderRadius: '12px' }}
                          >
                            ✕ Close Document
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Document Embed Iframe (Zero Storage Leaks) */
                      <iframe
                        src={getEmbeddableDocumentUrl(readingResource.file_url)}
                        title={readingResource.title}
                        sandbox="allow-scripts allow-same-origin allow-forms"
                        onError={() => setIframeLoadError(true)}
                        style={{
                          width: '100%',
                          height: '100%',
                          minHeight: '100%',
                          flex: 1,
                          border: 'none',
                          background: '#000000',
                          filter: isBlurred ? 'blur(20px) brightness(0.1)' : 'none',
                          transition: 'filter 0.15s ease',
                          display: 'block',
                        }}
                        allow="autoplay; encrypted-media; fullscreen"
                      />
                    )}
                  </div>
                </div>
              ) : (
                // 4. INSTITUTIONAL FALLBACK DOCUMENT VIEW (ZERO THIRD-PARTY LEAKS)
                <div style={{ padding: '3rem', maxWidth: '750px', margin: '0 auto', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📜</div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: readerTheme === 'dark' ? '#ffffff' : '#0f172a', margin: '0 0 0.5rem' }}>
                    {readingResource.title}
                  </h2>
                  <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: '0 0 1.5rem' }}>
                    {readingResource.category} • {readingResource.subject} • Academic Year {readingResource.year || 2026}
                  </p>
                  <div
                    style={{
                      background: readerTheme === 'dark' ? '#131b2e' : '#f1f5f9',
                      borderRadius: '16px',
                      padding: '1.5rem',
                      textAlign: 'left',
                      fontSize: '0.88rem',
                      border: readerTheme === 'dark' ? '1px solid #1e293b' : '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ fontWeight: 800, color: '#3b82f6', marginBottom: '0.4rem' }}>
                      🎓 Course Unit Information
                    </div>
                    <p style={{ margin: '0 0 0.5rem' }}>
                      This resource is an institutional study material managed under the Global College Academic Library.
                    </p>
                    <p style={{ margin: 0, opacity: 0.8 }}>
                      Uploaded by: {readingResource.uploaded_by || 'Academic Administrator'} • Size: {readingResource.file_size || 'Standard Handbook'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </>
      )}

      {/* Upload Modal (Faculty Only) */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div
            className="modal-content modal-md"
            onClick={(e) => e.stopPropagation()}
            style={{
              borderRadius: '20px',
              maxWidth: '560px',
              width: '94%',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', background: '#ffffff', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.3rem' }}>📤</span>
                <h3 className="modal-title" style={{ color: '#0f172a', fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                  Upload Academic E-Resource
                </h3>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowUploadModal(false)}
                style={{ color: '#64748b', background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadResource} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="modal-body" style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                {/* Source Selection Tabs */}
                <div>
                  <label className="label" style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.4rem' }}>
                    Resource Source
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
                    <button
                      type="button"
                      onClick={() => setUploadSource('file')}
                      style={{
                        padding: '0.75rem 0.85rem',
                        borderRadius: '10px',
                        border: uploadSource === 'file' ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
                        background: uploadSource === 'file' ? '#eff6ff' : '#ffffff',
                        color: uploadSource === 'file' ? '#1e3a8a' : '#475569',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>📁</span> Device Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadSource('gdrive')}
                      style={{
                        padding: '0.75rem 0.85rem',
                        borderRadius: '10px',
                        border: uploadSource === 'gdrive' ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
                        background: uploadSource === 'gdrive' ? '#eff6ff' : '#ffffff',
                        color: uploadSource === 'gdrive' ? '#1e3a8a' : '#475569',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>☁️</span> Google Drive Link
                    </button>
                  </div>
                </div>

                {uploadSource === 'file' ? (
                  /* Local Storage File Picker */
                  <div>
                    <label className="label" style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                      Select File from Device *
                    </label>
                    <div
                      style={{
                        border: '2px dashed #3b82f6',
                        borderRadius: '12px',
                        padding: '1.5rem 1rem',
                        textAlign: 'center',
                        background: selectedFile ? '#eff6ff' : '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onClick={() => document.getElementById('libFilePicker')?.click()}
                    >
                      <input
                        id="libFilePicker"
                        type="file"
                        style={{ display: 'none' }}
                        accept=".pdf, .docx, .doc, .ppt, .pptx, .xlsx, .xls, .zip, .html, .txt, image/*"
                        onChange={handleFileChange}
                      />
                      <div style={{ fontSize: '2.2rem', marginBottom: '0.4rem' }}>
                        {selectedFile ? '📄' : '📁'}
                      </div>
                      {selectedFile ? (
                        <div>
                          <div style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '0.95rem' }}>
                            {selectedFile.name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700, marginTop: '4px' }}>
                            ✓ Ready to upload • {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedFile(null)
                            }}
                            style={{
                              background: '#fee2e2',
                              border: 'none',
                              color: '#991b1b',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              borderRadius: '6px',
                              padding: '4px 10px',
                              cursor: 'pointer',
                              marginTop: '0.6rem',
                            }}
                          >
                            ✕ Remove / Choose different file
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.92rem' }}>
                            Tap to Choose Document from Storage
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                            PDF, Word (DOCX), PowerPoint, Excel, ZIP or HTML
                          </div>
                          <div style={{ display: 'inline-block', background: '#2563eb', color: '#ffffff', padding: '6px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, marginTop: '0.75rem' }}>
                            Browse Device Files
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Google Drive Link Input */
                  <div>
                    <label className="label" style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                      Google Drive or Cloud Document Link *
                    </label>
                    <div style={{ background: '#eff6ff', border: '1.5px dashed #3b82f6', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      <div style={{ fontSize: '0.8rem', color: '#1e3a8a', lineHeight: 1.4 }}>
                        💡 <strong>In-App Viewer:</strong> Paste any shared link from Google Drive, Docs, Slides, or Sheets. Students read seamlessly inside the LMS!
                      </div>
                      <input
                        type="url"
                        required={uploadSource === 'gdrive'}
                        className="input"
                        style={{ background: '#ffffff', fontSize: '0.9rem', padding: '0.75rem' }}
                        placeholder="https://drive.google.com/file/d/... or any Google Docs / Drive link"
                        value={googleDriveUrl}
                        onChange={(e) => {
                          const val = e.target.value
                          setGoogleDriveUrl(val)
                          if (!newTitle.trim() && (val.includes('drive.google.com') || val.includes('docs.google.com'))) {
                            setNewTitle('Google Drive Resource')
                          }
                        }}
                      />
                      {googleDriveUrl.trim() && (
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: getGoogleDrivePreviewUrl(googleDriveUrl) ? '#16a34a' : '#2563eb', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {getGoogleDrivePreviewUrl(googleDriveUrl) ? (
                            <>✅ Valid Cloud Document: In-App Interactive Reader Enabled</>
                          ) : (
                            <>🔗 Standard Web Document Link</>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="label" style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                    Resource Title *
                  </label>
                  <input
                    type="text"
                    required
                    className="input"
                    style={{ fontSize: '0.9rem', padding: '0.75rem' }}
                    placeholder="e.g. 2026 Revision Guide or Lab Notes"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem' }}>
                  <div style={{ flex: '1 1 180px', minWidth: '140px' }}>
                    <label className="label" style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                      Category / Document Type *
                    </label>
                    <input
                      type="text"
                      list="categorySuggestions"
                      required
                      className="input"
                      style={{ fontSize: '0.9rem', padding: '0.75rem' }}
                      placeholder="e.g. Comic Books, Textbooks, Past Papers"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    />
                    <datalist id="categorySuggestions">
                      {dynamicCategories.filter((c) => c !== 'All' && !c.includes('Starred')).map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>
                  <div style={{ flex: '1 1 140px', minWidth: '120px' }}>
                    <label className="label" style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                      Exam Year (Optional)
                    </label>
                    <input
                      type="number"
                      className="input"
                      style={{ fontSize: '0.9rem', padding: '0.75rem' }}
                      placeholder="e.g. 2026"
                      value={newYear}
                      onChange={(e) => setNewYear(e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>
                </div>

                <div>
                  <label className="label" style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                    Subject / Course Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="input"
                    style={{ fontSize: '0.9rem', padding: '0.75rem' }}
                    placeholder="Type subject (e.g. Cybersecurity, Full-Stack Development, Graphic Arts)"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label" style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                    Class / Target Level
                  </label>
                  <input
                    type="text"
                    className="input"
                    style={{ fontSize: '0.9rem', padding: '0.75rem' }}
                    placeholder="e.g. All Trainees / Diploma / Certificate"
                    value={newClassLevel}
                    onChange={(e) => setNewClassLevel(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label" style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                    Synopsis / Summary Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    className="input"
                    style={{ fontSize: '0.85rem', padding: '0.65rem', resize: 'vertical' }}
                    placeholder="Provide a brief summary or key study outcomes for this resource..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label" style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                    Search Keywords & Tags (Optional, comma-separated)
                  </label>
                  <input
                    type="text"
                    className="input"
                    style={{ fontSize: '0.85rem', padding: '0.65rem' }}
                    placeholder="e.g. comic, hacker, python, cybersecurity, exam, revision"
                    value={newTagsInput}
                    onChange={(e) => setNewTagsInput(e.target.value)}
                  />
                </div>

                {/* Free Access Notice Banner */}
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>🟢</span>
                  <span style={{ fontSize: '0.78rem', color: '#065f46', fontWeight: 700 }}>
                    100% Free Open Access: This e-resource will be freely accessible to all enrolled students and visitors.
                  </span>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={isUploading}
                  onClick={() => setShowUploadModal(false)}
                  style={{ fontWeight: 700 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUploading}
                  style={{ fontWeight: 800, padding: '0.75rem 1.5rem' }}
                >
                  {isUploading ? '⏳ Uploading & Saving...' : '✓ Publish to E-Library'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Custom Category Modal (Faculty Only) */}
      {showAddCatModal && (
        <div className="modal-overlay" onClick={() => setShowAddCatModal(false)}>
          <div
            className="modal-content modal-sm"
            onClick={(e) => e.stopPropagation()}
            style={{
              borderRadius: '20px',
              maxWidth: '460px',
              width: '92%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              background: '#ffffff',
            }}
          >
            <div style={{ padding: '1.25rem 1.5rem', background: '#ffffff', color: '#0f172a', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🏷️</span>
                <h3 style={{ color: '#0f172a', fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                  Add Custom Category
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCatModal(false)}
                style={{ color: '#64748b', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleAddCustomCategory(newCustomCategoryInput)
              }}
              style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div>
                <label className="label" style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                  New Category Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="input"
                  style={{ fontSize: '0.9rem', padding: '0.75rem' }}
                  placeholder="e.g. Comic Books, Audiobooks, CPA Revision"
                  value={newCustomCategoryInput}
                  onChange={(e) => setNewCustomCategoryInput(e.target.value)}
                />
              </div>

              {/* Quick Preset Suggestions */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem' }}>
                  Quick Suggestions:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {['Comic Books', 'Graphic Novels & Manga', 'Audiobooks', 'Podcasts & Media', 'KASNEB / CPA', 'International Exams', 'Barista Guides', 'Research Papers'].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setNewCustomCategoryInput(sug)}
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Custom Categories */}
              {customCategories.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem' }}>
                    Active Custom Categories:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {customCategories.map((c) => (
                      <span
                        key={c}
                        style={{
                          background: '#eff6ff',
                          color: '#1e40af',
                          border: '1px solid #bfdbfe',
                          borderRadius: '8px',
                          padding: '2px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {c}
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomCategory(c)}
                          style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 900, padding: 0 }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAddCatModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 800 }}
                >
                  ✓ Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* High-Contrast Custom Delete Confirmation Modal */}
      {resourceToDelete && (
        <div
          className="modal-overlay"
          onClick={() => setResourceToDelete(null)}
          style={{ zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            className="modal-content modal-sm"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#090e1f',
              color: '#ffffff',
              border: '2px solid rgba(239, 68, 68, 0.6)',
              borderRadius: '20px',
              padding: '1.75rem',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(239, 68, 68, 0.25)',
              maxWidth: '440px',
              width: '92%',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  flexShrink: 0,
                }}
              >
                🗑️
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffffff', margin: '0 0 2px' }}>
                  Delete Resource
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#fca5a5', fontWeight: 800, textTransform: 'uppercase' }}>
                  Permanent Action • Irreversible
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
              Are you sure you want to permanently remove <strong style={{ color: '#ffffff' }}>"{resourceToDelete.title}"</strong> from the E-Library?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setResourceToDelete(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontWeight: 800,
                  padding: '0.6rem 1.25rem',
                  borderRadius: '10px',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={async () => {
                  const id = resourceToDelete.id
                  setResourceToDelete(null)
                  await handleDeleteResource(id)
                }}
                style={{
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '10px',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                }}
              >
                🗑️ Remove Resource
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Native App DRM Restriction Modal (Web Protection) */}
      {showAppRequiredModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowAppRequiredModal(false)}
          style={{ zIndex: 999999, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        >
          <div
            className="modal-content modal-md"
            onClick={(e) => e.stopPropagation()}
            style={{
              borderRadius: '24px',
              maxWidth: '540px',
              width: '92%',
              background: 'linear-gradient(145deg, #090e1f, #0f172a)',
              border: '1.5px solid rgba(212, 175, 55, 0.45)',
              padding: '2rem',
              textAlign: 'center',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(212, 175, 55, 0.2)',
              color: '#ffffff',
            }}
          >
            {/* Header Icon */}
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                border: '2px solid #d4af37',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                margin: '0 auto 1.25rem',
                boxShadow: '0 0 20px rgba(212, 175, 55, 0.3)',
              }}
            >
              🔒
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  color: '#d4af37',
                  textTransform: 'uppercase',
                  background: 'rgba(212, 175, 55, 0.15)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                }}
              >
                In-App DRM Protection
              </span>
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', margin: '0.5rem 0' }}>
              Official App Required to Access Resources
            </h2>

            <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              To protect academic copyright, prevent unauthorized downloading, and block screen scraping, institutional library books and course materials are accessible exclusively inside the{' '}
              <strong style={{ color: '#ffffff' }}>Official Global College Native Applications</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <a
                href={OFFICIAL_APKPURE_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  textDecoration: 'none',
                  boxShadow: '0 6px 18px rgba(16, 185, 129, 0.35)',
                }}
              >
                <span>⚡</span>
                <span>Install via APKPure Store (Official)</span>
              </a>

              <a
                href={OFFICIAL_APK_URL}
                download="global-college.apk"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  textDecoration: 'none',
                }}
              >
                <span>🤖</span>
                <span>Direct Android Download (.APK)</span>
              </a>

              <a
                href={OFFICIAL_DESKTOP_URL}
                download="global-college-setup.exe"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  textDecoration: 'none',
                  boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)',
                }}
              >
                <span>💻</span>
                <span>Download Desktop Laptop App (Windows)</span>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setShowAppRequiredModal(false)}
              className="btn btn-ghost btn-sm"
              style={{ color: '#94a3b8', fontSize: '0.82rem' }}
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
