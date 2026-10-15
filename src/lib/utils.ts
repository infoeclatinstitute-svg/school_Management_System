// ============================================================
// Global College — Utility Functions
// ============================================================
import { INSTITUTION_CONFIG } from '@/config/institution'

/** Extract YouTube video ID from any YouTube URL format */
export function extractYouTubeId(url: string): string | null {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()

  // 1. Direct 11-character video ID
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed

  // 2. Query search parameter (handles ?v=, &v= anywhere in URL)
  try {
    const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
    const vParam = urlObj.searchParams.get('v')
    if (vParam && /^[A-Za-z0-9_-]{11}$/.test(vParam)) {
      return vParam
    }
  } catch {}

  // 3. Robust Regex Patterns (shorts, embed, youtu.be, live, desktop/mobile)
  const patterns = [
    /(?:v=|youtu\.be\/|youtube\.com\/(?:embed|shorts|live|v)\/)([^&?/\s]{11})/,
    /(?:youtube-nocookie\.com\/embed\/)([^&?/\s]{11})/,
    /[?&]v=([^&?/\s]{11})/,
    /([A-Za-z0-9_-]{11})/,
  ]

  for (const pattern of patterns) {
    const match = trimmed.match(pattern)
    if (match && match[1] && match[1].length === 11) return match[1]
  }

  return null
}

/** Build a YouTube thumbnail URL */
export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

/** Generate a unique activation code like GC-X7K2-9PQM */
export function generateActivationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const rand = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `GC-${rand(4)}-${rand(4)}`
}

/** Check if a content item is still within the 24-hour edit window */
export function isEditable(createdAt: string): boolean {
  const created = new Date(createdAt)
  const lockTime = new Date(created.getTime() + 24 * 60 * 60 * 1000)
  return new Date() < lockTime
}

/** Get remaining edit time as a human-readable string */
export function getEditTimeRemaining(createdAt: string): string {
  const created = new Date(createdAt)
  const lockTime = new Date(created.getTime() + 24 * 60 * 60 * 1000)
  const now = new Date()
  const diffMs = lockTime.getTime() - now.getTime()
  if (diffMs <= 0) return 'Locked'
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

/** Check if a student's access has expired */
export function isAccessExpired(accessExpiresAt: string | null): boolean {
  if (!accessExpiresAt) return false
  return new Date() > new Date(accessExpiresAt)
}

/** Format a date as a readable string */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Format a datetime as a readable string */
export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Get days remaining until a date */
export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  const diffMs = target.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

/** Get days since a date */
export function daysSince(dateStr: string): number {
  const past = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - past.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/** Calculate course completion percentage */
export function calcProgress(completedIds: string[], totalLessons: number): number {
  if (totalLessons === 0) return 0
  return Math.round((completedIds.length / totalLessons) * 100)
}

/** Truncate text to a maximum length */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '…'
}

/** Create a synthetic email from an admission number */
export function admissionToEmail(admissionNumber: string): string {
  const clean = admissionNumber.toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${clean}@${INSTITUTION_CONFIG.auth.internalEmailDomain || 'globalcollege.internal'}`
}

/** Get initials from a full name */
export function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')
}

/** Pluralize a word */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? singular + 's')
}

/** Deep clone an object */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/** Sanitize input strings to prevent XSS, HTML injection, and script execution */
export function sanitizeInput(str: string): string {
  if (!str || typeof str !== 'string') return ''
  return str
    .replaceAll('\0', '')
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:\s*text\/html/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
}

/** Recursively sanitize all string properties on objects or arrays */
export function sanitizeObject<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string') return sanitizeInput(obj) as unknown as T
    return obj
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as unknown as T
  }
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key] = typeof value === 'string' ? sanitizeInput(value) : sanitizeObject(value)
  }
  return result as T
}

/** Validate safe URLs (http, https, blob, or relative paths) */
export function isSafeUrl(url: string): boolean {
  if (!url) return false
  const trimmed = url.trim()
  if (trimmed.startsWith('/') || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return true
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Detects if a URL is a Google Drive / Google Docs / Slides / Sheets URL
 * and returns the clean interactive preview embed URL.
 * Resilient against malformed or duplicate-prefixed URLs (e.g. accidental double pasting).
 */
export function getGoogleDrivePreviewUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()

  // 1. Google Drive file URL: /file/d/{id}/... (matches even with duplicated prefixes)
  const driveFileMatch = trimmed.match(/(?:drive\.google\.com\/file\/d\/|\/file\/d\/)([a-zA-Z0-9_-]{15,})/i)
  if (driveFileMatch && driveFileMatch[1]) {
    return `https://drive.google.com/file/d/${driveFileMatch[1]}/preview`
  }

  // 2. Google Drive open?id={id} or uc?id={id} or generic ?id={id}
  const driveIdMatch = trimmed.match(/(?:drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=|[?&]id=)([a-zA-Z0-9_-]{15,})/i)
  if (driveIdMatch && driveIdMatch[1]) {
    return `https://drive.google.com/file/d/${driveIdMatch[1]}/preview`
  }

  // 3. Google Docs Document
  const docsMatch = trimmed.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]{15,})/i)
  if (docsMatch && docsMatch[1]) {
    return `https://docs.google.com/document/d/${docsMatch[1]}/preview`
  }

  // 4. Google Slides Presentation
  const slidesMatch = trimmed.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]{15,})/i)
  if (slidesMatch && slidesMatch[1]) {
    return `https://docs.google.com/presentation/d/${slidesMatch[1]}/preview`
  }

  // 5. Google Sheets Spreadsheet
  const sheetsMatch = trimmed.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]{15,})/i)
  if (sheetsMatch && sheetsMatch[1]) {
    return `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/preview`
  }

  // 6. Direct Google Drive file ID if only the raw ID is provided (e.g. 25-50 characters)
  if (/^[a-zA-Z0-9_-]{25,50}$/.test(trimmed)) {
    return `https://drive.google.com/file/d/${trimmed}/preview`
  }

  return null
}

/**
 * Transforms any document/file URL (Google Drive, cloud PDF/DOCX, direct data URL)
 * into a suitable in-app embed preview URL.
 * Strictly prevents self-referencing SPA paths (e.g., '/', '/index.html', 'index.html') from exposing site source code.
 */
export function getEmbeddableDocumentUrl(url: string, engine: 'cloud' | 'direct' = 'direct'): string {
  if (!url || typeof url !== 'string') return ''
  const trimmed = url.trim()

  // Prevent self-referencing SPA paths from returning source HTML
  const lower = trimmed.toLowerCase()
  if (
    lower === '/' ||
    lower === '/index.html' ||
    lower === 'index.html' ||
    lower === './index.html' ||
    lower.startsWith('/?') ||
    lower.startsWith('/#') ||
    lower === ''
  ) {
    return ''
  }

  // 1. Google Drive / Docs / Slides / Sheets preview embed
  const gdriveEmbed = getGoogleDrivePreviewUrl(trimmed)
  if (gdriveEmbed) {
    return gdriveEmbed
  }

  // 2. Base64 Data URL or Blob URL or internal academic/comic scheme
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('academic://') || trimmed.startsWith('comic://')) {
    return trimmed
  }

  // 3. Cloud Viewer fallback when explicitly requested
  if (engine === 'cloud' && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(trimmed)}&embedded=true`
  }

  // 4. Direct HTTP/HTTPS documents
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // If not a direct PDF and not Supabase storage, route via Google Docs Viewer for safe embedding
    if (!trimmed.toLowerCase().endsWith('.pdf') && !trimmed.includes('supabase.co')) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(trimmed)}&embedded=true`
    }
    return trimmed
  }

  return trimmed
}

