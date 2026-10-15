import { schoolStore } from './schoolData'

export interface CertificateFieldConfig {
  enabled: boolean
  x: number // Percentage from left (0 - 100)
  y: number // Percentage from top (0 - 100)
  fontSize: number // Base font size in px (scaled to 1000px reference canvas)
  color: string
  fontWeight?: string
  fontFamily?: string
  textAlign?: 'center' | 'left' | 'right'
  prefix?: string
  suffix?: string
  letterSpacing?: string
  textTransform?: 'none' | 'uppercase' | 'capitalize' | 'lowercase'
}

export interface CertificateTemplateConfig {
  id: string
  name: string
  backgroundImageUrl: string // Base64 data URL or remote CDN/Supabase Storage URL
  orientation: 'landscape' | 'portrait'
  aspectRatio: number // e.g. 1.414 for standard A4 landscape, 0.707 for portrait
  isActive: boolean
  updatedAt: string
  updatedBy?: string
  fields: {
    studentName: CertificateFieldConfig
    courseTitle: CertificateFieldConfig
    admissionNumber: CertificateFieldConfig
    grade: CertificateFieldConfig
    issueDate: CertificateFieldConfig
    certificateNo: CertificateFieldConfig
    qrCode: {
      enabled: boolean
      x: number
      y: number
      size: number
      showHash: boolean
    }
  }
}

/**
 * Creates an intelligent default layout for any uploaded certificate.
 * Positions are automatically calculated based on international diploma standards:
 * - Student name in the prominent conferment focal zone (~47% Y)
 * - Course / Degree title directly underneath (~57% Y)
 * - Academic honors & admission number flanking (~52% & ~63% Y)
 * - Issue date on bottom left (~80% Y)
 * - Certificate serial on bottom center (~88% Y)
 * - Cryptographic verification QR code on bottom right (~80% Y)
 */
export function createDefaultAutomatedTemplate(
  backgroundImageUrl: string,
  name = 'Official Institutional Diploma',
  aspectRatio = 1.414,
  orientation: 'landscape' | 'portrait' = 'landscape'
): CertificateTemplateConfig {
  const isLandscape = orientation === 'landscape'

  return {
    id: `template-${Date.now()}`,
    name,
    backgroundImageUrl,
    orientation,
    aspectRatio,
    isActive: true,
    updatedAt: new Date().toISOString(),
    fields: {
      studentName: {
        enabled: true,
        x: 50,
        y: isLandscape ? 47 : 44,
        fontSize: isLandscape ? 34 : 28,
        color: '#1e3a8a',
        fontWeight: 'bold',
        fontFamily: '"Cormorant Garamond", "Cinzel Decorative", Georgia, serif',
        textAlign: 'center',
        letterSpacing: '0.02em',
      },
      admissionNumber: {
        enabled: true,
        x: 50,
        y: isLandscape ? 52.5 : 49,
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textAlign: 'center',
        prefix: 'Admission / Reg No: ',
      },
      courseTitle: {
        enabled: true,
        x: 50,
        y: isLandscape ? 58 : 55,
        fontSize: isLandscape ? 22 : 18,
        color: '#0f172a',
        fontWeight: '700',
        fontFamily: '"Cinzel", Georgia, serif',
        textAlign: 'center',
        letterSpacing: '0.03em',
      },
      grade: {
        enabled: true,
        x: 50,
        y: isLandscape ? 64 : 61,
        fontSize: 14,
        color: '#b45309',
        fontWeight: '700',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textAlign: 'center',
        prefix: 'Conferred with ',
      },
      issueDate: {
        enabled: true,
        x: isLandscape ? 24 : 28,
        y: isLandscape ? 81 : 80,
        fontSize: 12,
        color: '#334155',
        fontWeight: '600',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textAlign: 'center',
        prefix: 'Date of Issue: ',
      },
      certificateNo: {
        enabled: true,
        x: 50,
        y: isLandscape ? 89 : 88,
        fontSize: 11,
        color: '#64748b',
        fontWeight: '600',
        fontFamily: 'monospace, monospace',
        textAlign: 'center',
        prefix: 'Serial: ',
      },
      qrCode: {
        enabled: true,
        x: isLandscape ? 78 : 72,
        y: isLandscape ? 80 : 79,
        size: isLandscape ? 68 : 58,
        showHash: true,
      },
    },
  }
}

/**
 * Retrieves the currently active certificate template from schoolStore / IndexedDB.
 */
export function getActiveCertificateTemplate(): CertificateTemplateConfig | null {
  return schoolStore.getCertificateTemplate<CertificateTemplateConfig>()
}

/**
 * Saves and broadcasts a new or updated certificate template across all devices.
 */
export async function saveCertificateTemplate(template: CertificateTemplateConfig): Promise<void> {
  await schoolStore.setCertificateTemplate(template)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gc-certificate-template-updated', { detail: template }))
  }
}

/**
 * Disables the custom certificate template, reverting back to the built-in gold diploma.
 */
export async function disableCertificateTemplate(): Promise<void> {
  const current = getActiveCertificateTemplate()
  if (current) {
    const updated = { ...current, isActive: false, updatedAt: new Date().toISOString() }
    await schoolStore.setCertificateTemplate(updated)
  }
}

/**
 * Completely removes the uploaded certificate template.
 */
export async function deleteCertificateTemplate(): Promise<void> {
  await schoolStore.setCertificateTemplate(null)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gc-certificate-template-updated', { detail: null }))
  }
}
