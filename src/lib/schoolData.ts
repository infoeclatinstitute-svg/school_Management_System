// ============================================================
// Global College — Enterprise SIMS Clean Data Store (Zero Test Data)
// ============================================================

import type {
  StudentRecord,
  TimetablePeriod,
  ExamSession,
  ReportCard,
  FeeInvoice,
  FeePaymentReceipt,
  AcademicResource,
  DisciplineRecord,
  SchoolNotice,
  PaymentReminder,
  SecretaryInquiry,
  CourseUnit,
  UnitRegistrationReceipt,
  CollegeDepartment,
  CollegeSubject,
  BiometricFeeClearancePass,
  FacultyTeacher,
  DeviceSession,
  InstitutionalSchool,
} from '@/types/school'
import { txEngine, IntegrityError } from './transactionManager'
import { schoolEventBus } from './eventBus'
export { schoolEventBus }
import { generateBiometricTemplate } from './biometricEngine'
import { supabase } from './supabase'
import { idbStorage } from './indexedDb'
import { INSTITUTIONAL_SCHOOLS } from '@/config/institution'
import { OFFICIAL_COURSES, type CourseProgram } from '@/config/officialCourses'
import { sanitizeInput } from './utils'

function isValidUuid(id?: string): boolean {
  if (!id) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

// Official Enrolled Students
export const INITIAL_STUDENTS: StudentRecord[] = []
export const INITIAL_TIMETABLE: TimetablePeriod[] = []
export const INITIAL_EXAMS: ExamSession[] = []
export const INITIAL_REPORT_CARDS: ReportCard[] = []
export const INITIAL_FACULTY_TEACHERS: FacultyTeacher[] = []
export const INITIAL_DEPARTMENTS: CollegeDepartment[] = []
export const INITIAL_SUBJECTS: CollegeSubject[] = []

export const INITIAL_COURSE_UNITS: CourseUnit[] = []
export const INITIAL_INVOICES: FeeInvoice[] = []
export const INITIAL_RECEIPTS: FeePaymentReceipt[] = []
export const INITIAL_RESOURCES: AcademicResource[] = []
export const FALLBACK_SAMPLE_RESOURCES: AcademicResource[] = []
export const INITIAL_DISCIPLINE: DisciplineRecord[] = []
export const INITIAL_NOTICES: SchoolNotice[] = []
export const INITIAL_REMINDERS: PaymentReminder[] = []
export const INITIAL_INQUIRIES: SecretaryInquiry[] = []

export const CLOUD_SYNC_SYSTEM_IDS: Record<string, string> = {
  resources: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01',
  custom_categories: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02',
  course_units: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa03',
  subjects: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa04',
  notices: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa05',
  students: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa06',
  timetable: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa07',
  fee_structures: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa08',
  invoices: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa09',
  receipts: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa10',
  biometric_passes: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa11',
  unit_registrations: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa12',
}

export function safeAdmClean(val?: string | null): string {
  return (val || '').trim().toLowerCase()
}

// ============================================================
// High-Performance Data Access & Transaction Store
// ============================================================
class SchoolDataStore {
  private memCache = new Map<string, any>()
  private syncChannel: any = null
  private isSyncing = false
  private autoSyncTimer: any = null

  constructor() {
    this.cleanLegacyMockData()
    this.setupRealtimeSync()
    this.hydrateFromIndexedDb().catch(() => {})
    this.syncWithCloud().catch(() => {})

    // Sync automatically on window focus, device wake, or network reconnect across Desktop and Mobile
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        this.syncWithCloud(true).catch(() => {})
      })
      window.addEventListener('online', () => {
        this.syncWithCloud(true).catch(() => {})
      })
      window.addEventListener('pageshow', () => {
        this.syncWithCloud(true).catch(() => {})
      })
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.syncWithCloud(true).catch(() => {})
        }
      })
      document.addEventListener('deviceready', () => {
        this.syncWithCloud(true).catch(() => {})
      })
      // Periodic automatic live sync fallback heartbeat (every 30s)
      this.autoSyncTimer = setInterval(() => {
        if (!this.syncChannel || this.syncChannel.state === 'closed' || this.syncChannel.state === 'errored') {
          this.setupRealtimeSync()
        }
        this.syncWithCloud(false).catch(() => {})
      }, 30000)
    }
  }

  private setupRealtimeSync() {
    try {
      this.syncChannel = supabase.channel('gc-cloud-sync')
        .on('broadcast', { event: 'store_data_sync' }, (payload: any) => {
          const eventType = payload?.payload?.type
          const eventData = payload?.payload?.data
          if (eventType === 'COLLECTION_UPDATED_RESOURCES' && Array.isArray(eventData)) {
            this.set('resources', eventData)
            schoolEventBus.publish('LIBRARY_UPDATED' as any)
            window.dispatchEvent(new CustomEvent('gc-data-synced'))
          } else if (eventType === 'COLLECTION_UPDATED_CUSTOM_CATEGORIES' && Array.isArray(eventData)) {
            this.set('custom_categories', eventData)
            schoolEventBus.publish('LIBRARY_UPDATED' as any)
            window.dispatchEvent(new CustomEvent('gc-data-synced'))
          } else if (eventType === 'RESOURCE_DELETED' && typeof eventData === 'string') {
            const remaining = this.getResources().filter((r) => r.id !== eventData)
            this.set('resources', remaining)
            schoolEventBus.publish('LIBRARY_UPDATED' as any)
            window.dispatchEvent(new CustomEvent('gc-data-synced'))
          } else if (eventType === 'COLLECTION_UPDATED_FEE_STRUCTURES' && typeof eventData === 'object') {
            this.set('custom_course_fees', eventData)
            window.dispatchEvent(new CustomEvent('gc-courses-updated'))
            window.dispatchEvent(new CustomEvent('gc-data-synced'))
          } else if (eventType === 'COLLECTION_UPDATED_STUDENTS' && Array.isArray(eventData)) {
            this.mergeCloudStudents(eventData)
            schoolEventBus.publish('STUDENT_UPDATED')
            window.dispatchEvent(new CustomEvent('gc-data-synced'))
          } else if (eventType === 'COLLECTION_UPDATED_INVOICES' && Array.isArray(eventData)) {
            this.set('invoices', eventData)
            schoolEventBus.publish('INVOICE_CREATED')
            window.dispatchEvent(new CustomEvent('gc-data-synced'))
          } else if (eventType === 'COLLECTION_UPDATED_RECEIPTS' && Array.isArray(eventData)) {
            this.set('receipts', eventData)
            schoolEventBus.publish('PAYMENT_RECORDED')
            window.dispatchEvent(new CustomEvent('gc-data-synced'))
          } else if (eventType === 'COLLECTION_UPDATED_UNIT_REGISTRATIONS' && Array.isArray(eventData)) {
            this.set('unit_registrations', eventData)
            schoolEventBus.publish('UNIT_REGISTRATION_COMPLETED' as any)
            window.dispatchEvent(new CustomEvent('gc-data-synced'))
          } else if (eventType === 'COLLECTION_UPDATED_TIMETABLE' && Array.isArray(eventData)) {
            this.set('timetable', eventData)
            schoolEventBus.publish('TIMETABLE_UPDATED')
            window.dispatchEvent(new CustomEvent('gc-data-synced'))
          } else if (eventType === 'COLLECTION_UPDATED_SUBJECTS' && Array.isArray(eventData)) {
            this.set('subjects', eventData)
            window.dispatchEvent(new CustomEvent('gc-courses-updated'))
            window.dispatchEvent(new CustomEvent('gc-data-synced'))
          } else if (eventType === 'COLLECTION_UPDATED_DEPARTMENTS' && Array.isArray(eventData)) {
            this.set('departments', eventData)
            window.dispatchEvent(new CustomEvent('gc-data-synced'))
          } else if (eventType === 'COLLECTION_UPDATED_NOTICES' && Array.isArray(eventData)) {
            this.set('notices', eventData)
            schoolEventBus.publish('NOTICE_UPDATED' as any)
            window.dispatchEvent(new CustomEvent('gc-data-synced'))
          } else if (eventType === 'COLLECTION_UPDATED_EXAMS' && Array.isArray(eventData)) {
            this.set('exams', eventData)
            window.dispatchEvent(new CustomEvent('gc-data-synced'))
          } else if (eventType === 'COLLECTION_UPDATED_REPORT_CARDS' && Array.isArray(eventData)) {
            this.set('report_cards', eventData)
            window.dispatchEvent(new CustomEvent('gc-data-synced'))
          } else if (eventType === 'COLLECTION_UPDATED_DISCIPLINE' && Array.isArray(eventData)) {
            this.set('discipline', eventData)
            window.dispatchEvent(new CustomEvent('gc-data-synced'))
          } else if (eventType === 'COLLECTION_UPDATED_FACULTY_TEACHERS' && Array.isArray(eventData)) {
            this.set('faculty_teachers', eventData)
            schoolEventBus.publish('TEACHER_UPDATED' as any)
            window.dispatchEvent(new CustomEvent('gc-data-synced'))
          } else if (eventType === 'COLLECTION_UPDATED_COURSE_UNITS' && Array.isArray(eventData)) {
            this.set('course_units', eventData)
            schoolEventBus.publish('COURSE_UNIT_CREATED' as any)
            window.dispatchEvent(new CustomEvent('gc-data-synced'))
          } else if (eventType === 'STUDENT_LESSONS_UNLOCKED' || eventType === 'STUDENT_UPDATED' || eventType === 'PAYMENT_RECORDED') {
            this.syncWithCloud(true).catch(() => {})
            schoolEventBus.publish('STUDENT_UPDATED')
            schoolEventBus.publish('PAYMENT_RECORDED')
            window.dispatchEvent(new CustomEvent('gc-data-synced'))
          }
          this.syncWithCloud(true).catch(() => {})
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_cloud_sync' }, (payload: any) => {
          const row = payload?.new
          if (row && typeof row.key === 'string' && row.key.startsWith('gc_v2_') && row.data !== undefined) {
            const cleanKey = row.key.replace(/^gc_v2_/, '')
            if (cleanKey === 'resources' && Array.isArray(row.data)) {
              this.set('resources', row.data)
              schoolEventBus.publish('LIBRARY_UPDATED' as any)
            } else if (cleanKey === 'custom_categories' && Array.isArray(row.data)) {
              this.set('custom_categories', row.data)
              schoolEventBus.publish('LIBRARY_UPDATED' as any)
            } else if (cleanKey === 'students' && Array.isArray(row.data)) {
              this.mergeCloudStudents(row.data)
              schoolEventBus.publish('STUDENT_UPDATED')
            } else if (cleanKey === 'invoices' && Array.isArray(row.data)) {
              this.set('invoices', row.data)
              schoolEventBus.publish('INVOICE_CREATED')
            } else if (cleanKey === 'receipts' && Array.isArray(row.data)) {
              this.set('receipts', row.data)
              schoolEventBus.publish('PAYMENT_RECORDED')
            } else if (cleanKey === 'unit_registrations' && Array.isArray(row.data)) {
              this.set('unit_registrations', row.data)
              schoolEventBus.publish('UNIT_REGISTRATION_COMPLETED' as any)
            } else if (cleanKey === 'course_units' && Array.isArray(row.data)) {
              this.set('course_units', row.data)
              schoolEventBus.publish('COURSE_UNIT_CREATED' as any)
            } else if (cleanKey === 'faculty_teachers' && Array.isArray(row.data)) {
              this.set('faculty_teachers', row.data)
              schoolEventBus.publish('TEACHER_UPDATED' as any)
            } else if (cleanKey === 'timetable' && Array.isArray(row.data)) {
              this.set('timetable', row.data)
              schoolEventBus.publish('TIMETABLE_UPDATED')
            } else if (cleanKey === 'subjects' && Array.isArray(row.data)) {
              this.set('subjects', row.data)
              window.dispatchEvent(new CustomEvent('gc-courses-updated'))
            } else if (cleanKey === 'departments' && Array.isArray(row.data)) {
              this.set('departments', row.data)
            } else if (cleanKey === 'notices' && Array.isArray(row.data)) {
              this.set('notices', row.data)
              schoolEventBus.publish('NOTICE_UPDATED' as any)
            } else if (cleanKey === 'exams' && Array.isArray(row.data)) {
              this.set('exams', row.data)
            } else if (cleanKey === 'report_cards' && Array.isArray(row.data)) {
              this.set('report_cards', row.data)
            } else if (cleanKey === 'discipline' && Array.isArray(row.data)) {
              this.set('discipline', row.data)
            } else if ((cleanKey === 'fee_structures' || cleanKey === 'custom_course_fees') && typeof row.data === 'object' && row.data !== null) {
              this.set('custom_course_fees', row.data)
              window.dispatchEvent(new CustomEvent('gc-courses-updated'))
            } else if (cleanKey === 'biometric_passes' && Array.isArray(row.data)) {
              this.set('biometric_passes', row.data)
            } else if (cleanKey === 'credentials' && typeof row.data === 'object' && row.data !== null) {
              try {
                const existingRaw = localStorage.getItem('gc_v2_local_credentials') || localStorage.getItem('gc_local_credentials')
                const existing = existingRaw ? JSON.parse(existingRaw) : {}
                const merged = { ...existing, ...row.data }
                localStorage.setItem('gc_v2_local_credentials', JSON.stringify(merged))
                localStorage.setItem('gc_local_credentials', JSON.stringify(merged))
              } catch {}
            } else if (cleanKey === 'certificate_template') {
              this.set('certificate_template', row.data)
              window.dispatchEvent(new CustomEvent('gc-certificate-template-updated', { detail: row.data }))
            }
            window.dispatchEvent(new CustomEvent('gc-data-synced'))
          }
        })
        .subscribe()
    } catch {}
  }

  private async hydrateFromIndexedDb(): Promise<void> {
    if (typeof window === 'undefined') return
    const keys = [
      'students',
      'invoices',
      'receipts',
      'resources',
      'timetable',
      'exams',
      'report_cards',
      'discipline',
      'notices',
      'course_units',
      'subjects',
      'departments',
      'custom_categories',
      'custom_course_fees',
      'unit_registrations',
      'biometric_passes',
      'credentials',
      'certificate_template',
    ]

    await Promise.all(
      keys.map(async (key) => {
        try {
          const idbVal = await idbStorage.get(`gc_v2_school_${key}`)
          if (idbVal !== null && idbVal !== undefined) {
            this.memCache.set(key, idbVal)
          } else {
            const localVal = this.get(key, null)
            if (localVal !== null && localVal !== undefined) {
              idbStorage.set(`gc_v2_school_${key}`, localVal).catch(() => {})
            }
          }
        } catch {}
      })
    )
    window.dispatchEvent(new CustomEvent('gc-data-synced'))
  }

  broadcastChange(type: string, data?: any) {
    try {
      if (this.syncChannel) {
        this.syncChannel.send({
          type: 'broadcast',
          event: 'store_data_sync',
          payload: { type, data, timestamp: Date.now() },
        })
      }
      window.dispatchEvent(new Event('storage'))
      window.dispatchEvent(new CustomEvent('gc-courses-updated'))
      window.dispatchEvent(new CustomEvent('gc-data-synced'))
    } catch {}
  }

  async pushCollectionToCloud(collectionKey: string, data: any): Promise<void> {
    const scopedKey = collectionKey.startsWith('gc_v2_') ? collectionKey : `gc_v2_${collectionKey}`
    try {
      await supabase.from('app_cloud_sync').upsert(
        {
          key: scopedKey,
          data: data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
    } catch {}

    this.broadcastChange(`COLLECTION_UPDATED_${collectionKey.toUpperCase()}`, data)
  }

  mergeCloudStudents(cloudList: StudentRecord[]): void {
    if (!Array.isArray(cloudList)) return
    const currentList = this.get<StudentRecord[]>('students', INITIAL_STUDENTS) || []
    const map = new Map<string, StudentRecord>()
    currentList.filter(Boolean).forEach((s) => {
      const key = (s.admission_number || s.id || '').toLowerCase().trim()
      if (key) map.set(key, s)
    })

    cloudList.filter(Boolean).forEach((cs) => {
      const key = (cs.admission_number || cs.id || '').toLowerCase().trim()
      if (!key) return
      const local = map.get(key)
      if (local) {
        const isCleared = cs.fee_cleared === true || local.fee_cleared === true || (cs.fee_balance === 0) || (local.fee_balance === 0)
        const lowestBalance = isCleared ? 0 : Math.min(cs.fee_balance ?? 0, local.fee_balance ?? 60)
        map.set(key, {
          ...local,
          ...cs,
          fee_cleared: isCleared,
          fee_balance: lowestBalance,
        })
      } else {
        map.set(key, cs)
      }
    })
    this.set('students', Array.from(map.values()))
  }

  async syncStudentProfileToSupabase(student: StudentRecord): Promise<void> {
    try {
      const renewed = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      if (student.id) {
        await supabase.from('profiles').upsert({
          id: student.id,
          full_name: student.full_name,
          admission_number: student.admission_number,
          role: 'student',
          access_expires_at: renewed,
          is_active: student.status === 'Active',
        }, { onConflict: 'id' })
      }
      if (student.admission_number) {
        await supabase.from('profiles').update({
          access_expires_at: renewed,
          is_active: true,
        }).ilike('admission_number', student.admission_number)
      }
    } catch {}
  }

  getCustomCategories(): string[] {
    const raw = this.get<string[]>('custom_categories', [])
    try {
      const stored = localStorage.getItem('gc_v2_custom_library_categories')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          return Array.from(new Set([...raw, ...parsed]))
        }
      }
    } catch {}
    return raw
  }

  async addCustomCategory(category: string): Promise<void> {
    const trimmed = category.trim()
    if (!trimmed) return
    const list = this.getCustomCategories()
    if (!list.includes(trimmed)) {
      list.push(trimmed)
      this.set('custom_categories', list)
      try {
        localStorage.setItem('gc_v2_custom_library_categories', JSON.stringify(list))
      } catch {}
      await this.pushCollectionToCloud('custom_categories', list)
      schoolEventBus.publish('LIBRARY_UPDATED' as any)
      window.dispatchEvent(new CustomEvent('gc-data-synced'))
    }
  }

  async deleteCustomCategory(category: string): Promise<void> {
    const list = this.getCustomCategories().filter((c) => c !== category)
    this.set('custom_categories', list)
    try {
      localStorage.setItem('gc_v2_custom_library_categories', JSON.stringify(list))
    } catch {}
    await this.pushCollectionToCloud('custom_categories', list)
    schoolEventBus.publish('LIBRARY_UPDATED' as any)
    window.dispatchEvent(new CustomEvent('gc-data-synced'))
  }

  async syncWithCloud(force: boolean = false): Promise<void> {
    if (this.isSyncing && !force) return
    this.isSyncing = true
    let libraryUpdated = false

    try {
      // Sync strictly from clean v2 keys in app_cloud_sync
      const { data: cloudSyncRows, error: syncErr } = await supabase
        .from('app_cloud_sync')
        .select('*')
        .like('key', 'gc_v2_%')

      if (!syncErr && cloudSyncRows && cloudSyncRows.length > 0) {
        for (const row of cloudSyncRows) {
          if (!row.key || row.data === undefined) continue
          const cleanKey = row.key.replace(/^gc_v2_/, '')

          if (cleanKey === 'resources' && Array.isArray(row.data)) {
            this.set('resources', row.data)
            libraryUpdated = true
          } else if (cleanKey === 'custom_categories' && Array.isArray(row.data)) {
            this.set('custom_categories', row.data)
            try {
              localStorage.setItem('gc_v2_custom_library_categories', JSON.stringify(row.data))
            } catch {}
            libraryUpdated = true
          } else if (cleanKey === 'course_units' && Array.isArray(row.data)) {
            this.set('course_units', row.data)
          } else if (cleanKey === 'subjects' && Array.isArray(row.data)) {
            this.set('subjects', row.data)
          } else if (cleanKey === 'departments' && Array.isArray(row.data)) {
            this.set('departments', row.data)
          } else if (cleanKey === 'notices' && Array.isArray(row.data)) {
            this.set('notices', row.data)
          } else if (cleanKey === 'students' && Array.isArray(row.data)) {
            this.mergeCloudStudents(row.data)
          } else if (cleanKey === 'faculty_teachers' && Array.isArray(row.data)) {
            this.set('faculty_teachers', row.data)
          } else if (cleanKey === 'invoices' && Array.isArray(row.data)) {
            this.set('invoices', row.data)
          } else if (cleanKey === 'receipts' && Array.isArray(row.data)) {
            this.set('receipts', row.data)
          } else if (cleanKey === 'unit_registrations' && Array.isArray(row.data)) {
            this.set('unit_registrations', row.data)
          } else if (cleanKey === 'timetable' && Array.isArray(row.data)) {
            this.set('timetable', row.data)
            schoolEventBus.publish('TIMETABLE_UPDATED')
          } else if (cleanKey === 'exams' && Array.isArray(row.data)) {
            this.set('exams', row.data)
          } else if (cleanKey === 'report_cards' && Array.isArray(row.data)) {
            this.set('report_cards', row.data)
          } else if (cleanKey === 'discipline' && Array.isArray(row.data)) {
            this.set('discipline', row.data)
          } else if (cleanKey === 'biometric_passes' && Array.isArray(row.data)) {
            this.set('biometric_passes', row.data)
          } else if (cleanKey === 'credentials' && typeof row.data === 'object' && row.data !== null) {
            try {
              const existingRaw = localStorage.getItem('gc_v2_local_credentials') || localStorage.getItem('gc_local_credentials')
              const existing = existingRaw ? JSON.parse(existingRaw) : {}
              const merged = { ...existing, ...row.data }
              localStorage.setItem('gc_v2_local_credentials', JSON.stringify(merged))
              localStorage.setItem('gc_local_credentials', JSON.stringify(merged))
            } catch {}
          } else if (cleanKey === 'official_courses' && Array.isArray(row.data)) {
            try {
              localStorage.setItem('gc_v2_official_courses', JSON.stringify(row.data))
            } catch {}
            window.dispatchEvent(new CustomEvent('gc-courses-updated', { detail: row.data }))
          } else if ((cleanKey === 'fee_structures' || cleanKey === 'custom_course_fees') && typeof row.data === 'object' && row.data !== null) {
            this.set('custom_course_fees', row.data)
            window.dispatchEvent(new CustomEvent('gc-courses-updated'))
          } else if (cleanKey === 'device_sessions' && typeof row.data === 'object' && row.data !== null) {
            this.set('device_sessions', row.data)
            try {
              localStorage.setItem('gc_v2_school_device_sessions', JSON.stringify(row.data))
            } catch {}
            window.dispatchEvent(new CustomEvent('gc-device-sessions-updated', { detail: row.data }))
          }
        }
      }

      if (libraryUpdated) {
        schoolEventBus.publish('LIBRARY_UPDATED' as any)
      }
      window.dispatchEvent(new CustomEvent('gc-data-synced'))
    } catch (err) {
      console.warn('Cloud store sync notice:', err)
    } finally {
      this.isSyncing = false
    }
  }

  private cleanLegacyMockData() {
    if (typeof window === 'undefined') return
    try {
      const legacyKeys = [
        'gc_school_students',
        'gc_school_timetable',
        'gc_school_exams',
        'gc_school_report_cards',
        'gc_school_invoices',
        'gc_school_receipts',
        'gc_school_resources',
        'gc_school_discipline',
        'gc_school_notices',
        'gc_school_reminders',
        'gc_school_inquiries',
        'gc_school_course_units',
        'gc_school_unit_registrations',
        'gc_school_departments',
        'gc_school_subjects',
        'gc_school_custom_course_fees',
        'gc_school_official_courses_v2',
        'gc_intake_schedules_v1',
      ]
      legacyKeys.forEach((k) => localStorage.removeItem(k))
    } catch {}
  }

  purgeAllDataForLaunch(): void {
    this.memCache.clear()
    const keys = [
      'students',
      'timetable',
      'exams',
      'report_cards',
      'invoices',
      'receipts',
      'resources',
      'discipline',
      'notices',
      'reminders',
      'inquiries',
      'course_units',
      'unit_registrations',
      'custom_course_fees',
      'departments',
      'subjects',
      'faculty_teachers',
    ]
    keys.forEach((k) => {
      idbStorage.delete(`gc_v2_school_${k}`).catch(() => {})
      localStorage.removeItem(`gc_v2_school_${k}`)
      localStorage.removeItem(`gc_school_${k}`)
    })
    schoolEventBus.publish('STUDENT_UPDATED')
    schoolEventBus.publish('PAYMENT_RECORDED')
  }

  private get<T>(key: string, fallback: T): T {
    if (this.memCache.has(key)) {
      return this.memCache.get(key)
    }
    try {
      const stored = localStorage.getItem(`gc_v2_school_${key}`)
      const val = stored ? JSON.parse(stored) : fallback
      this.memCache.set(key, val)
      return val
    } catch {
      this.memCache.set(key, fallback)
      return fallback
    }
  }

  private set<T>(key: string, value: T): void {
    this.memCache.set(key, value)
    idbStorage.set(`gc_v2_school_${key}`, value).catch(() => {})
    try {
      if (key === 'resources' && Array.isArray(value)) {
        const sanitized = (value as AcademicResource[]).map((r) => {
          if (r.file_url && r.file_url.startsWith('data:') && r.file_url.length > 262144) {
            return {
              ...r,
              file_url: `https://globalcollege.internal/docs/${encodeURIComponent(r.title)}`,
            }
          }
          return r
        })
        localStorage.setItem(`gc_v2_school_${key}`, JSON.stringify(sanitized))
        return
      }
      localStorage.setItem(`gc_v2_school_${key}`, JSON.stringify(value))
    } catch (e) {
      console.warn('LocalStorage error:', e)
    }
  }

  getStudents(): StudentRecord[] {
    const rawList = this.get<StudentRecord[]>('students', INITIAL_STUDENTS) || []
    const receipts = this.getReceipts() || []
    return rawList.filter(Boolean).map((s) => {
      const sAdm = (s.admission_number || '').trim().toLowerCase()
      const studentReceipts = receipts.filter(
        (r) =>
          r && (
            (r.student_id && s.id && r.student_id === s.id) ||
            (r.admission_number && sAdm && r.admission_number.trim().toLowerCase() === sAdm)
          )
      )
      const totalPaid = studentReceipts.reduce((acc, r) => acc + (Number(r.amount) || 0), 0)
      const billed = Number(s.term_fee_total) || 60
      const liveBalance = Math.max(0, billed - totalPaid)
      
      const isExplicitlyCleared = s.fee_cleared === true || s.fee_balance === 0
      const isReceiptCleared = (billed > 0 && totalPaid >= billed) || (totalPaid > 0 && liveBalance === 0)
      const isCleared = isExplicitlyCleared || isReceiptCleared
      const finalBalance = isExplicitlyCleared ? (s.fee_balance ?? 0) : liveBalance

      return {
        ...s,
        admission_number: s.admission_number || '',
        full_name: s.full_name || 'Student',
        term_fee_total: billed,
        fee_balance: finalBalance,
        fee_cleared: isCleared,
      }
    })
  }

  saveStudents(students: StudentRecord[]) {
    this.set('students', students)
    schoolEventBus.publish('STUDENT_UPDATED')
  }

  async addStudent(student: StudentRecord): Promise<void> {
    await txEngine.executeAtomic(
      `ADD_STUDENT_${student.admission_number}`,
      ['gc_v2_school_students', 'gc_v2_school_invoices'],
      () => {
        const list = this.get<StudentRecord[]>('students', INITIAL_STUDENTS)
        const targetAdmClean = safeAdmClean(student.admission_number)
        const existingIdx = list.findIndex(
          (s) => s && ((student.id && s.id === student.id) || (targetAdmClean && safeAdmClean(s.admission_number) === targetAdmClean))
        )

        const billed = Number(student.term_fee_total) || 75
        const newRecord: StudentRecord = {
          ...student,
          admission_number: sanitizeInput(student.admission_number),
          full_name: sanitizeInput(student.full_name),
          class_name: sanitizeInput(student.class_name || ''),
          portal_password: student.portal_password ? sanitizeInput(student.portal_password) : undefined,
          term_fee_total: billed,
          fee_balance: student.fee_balance !== undefined ? Number(student.fee_balance) : billed,
          fee_cleared: student.fee_balance === 0,
          attendance_rate: Number(student.attendance_rate) || 0,
          discipline_points: Number(student.discipline_points) || 0,
          merits_count: student.merits_count || 0,
          demerits_count: student.demerits_count || 0,
        }

        if (existingIdx !== -1) {
          list[existingIdx] = { ...list[existingIdx], ...newRecord }
        } else {
          list.unshift(newRecord)
        }
        this.set('students', list)

        // Automatically create unpaid/pending invoice for the new student
        const invoices = this.get<FeeInvoice[]>('invoices', INITIAL_INVOICES)
        if (targetAdmClean && !invoices.some((inv) => safeAdmClean(inv.admission_number) === targetAdmClean)) {
          invoices.unshift({
            id: `inv-${Date.now()}-${student.admission_number.replace(/[^a-zA-Z0-9]/g, '')}`,
            invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            student_id: student.id,
            student_name: student.full_name,
            admission_number: student.admission_number,
            class_name: student.class_name || 'Short Course Cohort',
            term: 'Term 1',
            academic_year: `${new Date().getFullYear()}`,
            issue_date: student.enrollment_date || new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            total_amount: billed,
            paid_amount: 0,
            balance: billed,
            status: 'Pending',
            items: [
              {
                id: `item-${Date.now()}-1`,
                description: `Tuition & Lab Training Fee (${student.class_name})`,
                amount: billed,
              },
            ],
          })
          this.set('invoices', invoices)
        }
      }
    )
    schoolEventBus.publish('STUDENT_ADDED', student)
    schoolEventBus.publish('INVOICE_CREATED')
    schoolEventBus.publish('STUDENT_UPDATED')
    this.broadcastChange('STUDENT_ADDED', student)
    await this.pushCollectionToCloud('students', this.getStudents())
    await this.pushCollectionToCloud('invoices', this.getInvoices())

    try {
      const renewed = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      await supabase.from('profiles').upsert({
        id: student.id,
        full_name: student.full_name,
        admission_number: student.admission_number,
        role: 'student',
        access_expires_at: renewed,
        is_active: student.status === 'Active',
      }, { onConflict: 'id' })
    } catch {}

    const targetAdmClean = safeAdmClean(student.admission_number)
    const std = this.getStudents().find(
      (s) => s && ((student.id && s.id === student.id) || (targetAdmClean && safeAdmClean(s.admission_number) === targetAdmClean))
    )
    if (std) {
      await this.syncStudentProfileToSupabase(std)
    }
  }

  async updateStudent(id: string, updated: Partial<StudentRecord>): Promise<void> {
    const targetIdClean = safeAdmClean(id)
    await txEngine.executeAtomic(
      `UPDATE_STUDENT_${id}`,
      ['gc_v2_school_students', 'gc_v2_school_invoices', 'gc_v2_school_receipts', 'gc_v2_school_unit_registrations'],
      () => {
        const list = this.getStudents()
        const idx = list.findIndex(
          (s) => s && ((s.id && s.id === id) || (targetIdClean && safeAdmClean(s.admission_number) === targetIdClean))
        )
        if (idx === -1) throw new IntegrityError(`Student ID "${id}" not found.`)

        if (updated.admission_number) {
          const conflictAdm = safeAdmClean(updated.admission_number)
          const conflict = list.find(
            (s) => s && s.id !== id && conflictAdm && safeAdmClean(s.admission_number) === conflictAdm
          )
          if (conflict) {
            throw new IntegrityError(`Admission Number "${updated.admission_number}" is already taken by another student.`)
          }
        }

        const isCleared = updated.fee_cleared === true || updated.fee_balance === 0
        const finalBalance = isCleared ? 0 : (updated.fee_balance !== undefined ? updated.fee_balance : list[idx].fee_balance)
        const sanitizedUpdated: Partial<StudentRecord> = {
          ...updated,
          ...(updated.admission_number ? { admission_number: sanitizeInput(updated.admission_number) } : {}),
          ...(updated.full_name ? { full_name: sanitizeInput(updated.full_name) } : {}),
          ...(updated.class_name ? { class_name: sanitizeInput(updated.class_name) } : {}),
          ...(updated.portal_password ? { portal_password: sanitizeInput(updated.portal_password) } : {}),
        }
        const merged: StudentRecord = {
          ...list[idx],
          ...sanitizedUpdated,
          fee_balance: finalBalance,
          fee_cleared: isCleared || list[idx].fee_cleared,
        }

        list[idx] = merged
        this.set('students', list)

        if (isCleared) {
          const adm = safeAdmClean(merged.admission_number)
          const admAlpha = adm.replace(/[^a-z0-9]/g, '')

          // Settle invoices
          const invoices = this.getInvoices()
          invoices.forEach((inv) => {
            const invAdm = safeAdmClean(inv.admission_number)
            if (
              inv.student_id === merged.id ||
              (adm && invAdm === adm) ||
              (admAlpha && invAdm.replace(/[^a-z0-9]/g, '') === admAlpha)
            ) {
              inv.paid_amount = inv.total_amount
              inv.balance = 0
              inv.status = 'Paid'
            }
          })
          this.set('invoices', invoices)

          // Ensure unit registration is cleared
          const unitRegs = this.getUnitRegistrations()
          unitRegs.forEach((reg) => {
            const regAdm = safeAdmClean(reg.admission_number)
            if (
              reg.student_id === merged.id ||
              (adm && regAdm === adm) ||
              (admAlpha && regAdm.replace(/[^a-z0-9]/g, '') === admAlpha)
            ) {
              reg.fee_clearance_status = 'Cleared'
              reg.exam_card_issued = true
            }
          })
          this.set('unit_registrations', unitRegs)

          // Ensure clearance receipt exists
          const receipts = this.getReceipts()
          const hasReceipt = receipts.some((r) => {
            const rAdm = safeAdmClean(r.admission_number)
            return (
              r.student_id === merged.id ||
              (adm && rAdm === adm) ||
              (admAlpha && rAdm.replace(/[^a-z0-9]/g, '') === admAlpha)
            )
          })
          if (!hasReceipt) {
            receipts.unshift({
              id: `rec-clear-${merged.id}`,
              receipt_number: `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
              student_id: merged.id,
              student_name: merged.full_name,
              admission_number: merged.admission_number,
              amount: merged.term_fee_total || 60,
              amount_paid: merged.term_fee_total || 60,
              payment_method: 'Bank Transfer',
              reference_code: `INSTITUTIONAL-CLEAR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
              payment_date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
              paid_by: merged.full_name,
              recorded_by: 'Academic Registrar & Admissions Desk',
              balance_after: 0,
              balance_remaining: 0,
            })
            this.set('receipts', receipts)
          }
        }
      }
    )

    schoolEventBus.publish('STUDENT_UPDATED', updated)
    schoolEventBus.publish('PAYMENT_RECORDED')
    schoolEventBus.publish('INVOICE_CREATED')
    schoolEventBus.publish('UNIT_REGISTRATION_COMPLETED' as any)
    this.broadcastChange('STUDENT_UPDATED', updated)

    await this.pushCollectionToCloud('students', this.getStudents())
    await this.pushCollectionToCloud('invoices', this.getInvoices())
    await this.pushCollectionToCloud('receipts', this.getReceipts())
    await this.pushCollectionToCloud('unit_registrations', this.getUnitRegistrations())

    const std = this.getStudents().find(
      (s) => s && ((s.id && s.id === id) || (targetIdClean && safeAdmClean(s.admission_number) === targetIdClean))
    )
    if (std) {
      await this.syncStudentProfileToSupabase(std)
    }
  }

  async deleteStudent(id: string): Promise<void> {
    const students = this.getStudents()
    const targetIdClean = safeAdmClean(id)
    const student = students.find(
      (s) => s && ((s.id && s.id === id) || (targetIdClean && safeAdmClean(s.admission_number) === targetIdClean))
    )
    const targetId = student?.id || id
    const targetAdm = student?.admission_number || ''
    const cleanAdm = targetAdm.toLowerCase().replace(/[^a-z0-9]/g, '')

    await txEngine.executeAtomic(
      `CASCADE_DELETE_STUDENT_${targetId}`,
      [
        'gc_v2_school_students',
        'gc_v2_school_invoices',
        'gc_v2_school_receipts',
        'gc_v2_school_unit_registrations',
        'gc_v2_school_report_cards',
        'gc_v2_school_exams',
        'gc_v2_school_reminders',
        'gc_v2_school_discipline',
      ],
      () => {
        const matchesStudent = (rec: { student_id?: string; admission_number?: string }) => {
          if (!rec) return false
          if (rec.student_id && (rec.student_id === targetId || rec.student_id === id)) return true
          if (targetAdm && rec.admission_number && rec.admission_number.toLowerCase() === targetAdm.toLowerCase()) return true
          return false
        }

        // 1. Purge Student Record
        const filteredStudents = this.getStudents().filter(
          (s) => s.id !== targetId && s.id !== id && (!targetAdm || s.admission_number.toLowerCase() !== targetAdm.toLowerCase())
        )
        this.set('students', filteredStudents)

        // 2. Cascade Purge Invoices
        const filteredInvoices = this.getInvoices().filter((inv) => !matchesStudent(inv))
        this.set('invoices', filteredInvoices)

        // 3. Cascade Purge Receipts
        const filteredReceipts = this.getReceipts().filter((r) => !matchesStudent(r))
        this.set('receipts', filteredReceipts)

        // 4. Cascade Purge Unit Registrations
        const filteredRegistrations = this.getUnitRegistrations().filter((reg) => !matchesStudent(reg))
        this.set('unit_registrations', filteredRegistrations)

        // 5. Cascade Purge Report Cards / Transcripts
        const filteredReports = this.getReportCards().filter((rc) => !matchesStudent(rc))
        this.set('report_cards', filteredReports)

        // 6. Cascade Purge Payment Reminders
        const filteredReminders = this.getReminders().filter((rem) => !matchesStudent(rem))
        this.set('reminders', filteredReminders)

        // 7. Cascade Purge Discipline Records
        const filteredDiscipline = this.getDiscipline().filter((d) => !matchesStudent(d))
        this.set('discipline', filteredDiscipline)

        // 8. Cascade Purge Biometric Clearance Logs
        const filteredLogs = this.getBiometricClearanceLogs().filter((log) => !matchesStudent(log))
        this.set('biometric_clearance_logs', filteredLogs)

        // 10. Clean Local Credentials Store
        try {
          const rawCreds = localStorage.getItem('gc_v2_local_credentials') || localStorage.getItem('gc_local_credentials')
          if (rawCreds) {
            const creds = JSON.parse(rawCreds)
            if (targetAdm && creds[targetAdm.toLowerCase()]) delete creds[targetAdm.toLowerCase()]
            if (cleanAdm && creds[cleanAdm]) delete creds[cleanAdm]
            if (creds[targetId]) delete creds[targetId]
            localStorage.setItem('gc_v2_local_credentials', JSON.stringify(creds))
            localStorage.setItem('gc_local_credentials', JSON.stringify(creds))
          }
        } catch {}
      }
    )

    // 11. Cloud Cascade Deletion via Supabase
    try {
      if (targetId) {
        supabase.from('profiles').delete().eq('id', targetId).then(() => {})
      }
      if (targetAdm) {
        supabase.from('profiles').delete().eq('admission_number', targetAdm).then(() => {})
      }
    } catch {}

    await this.pushCollectionToCloud('students', this.getStudents())
    await this.pushCollectionToCloud('invoices', this.getInvoices())
    await this.pushCollectionToCloud('receipts', this.getReceipts())

    schoolEventBus.publish('STUDENT_DELETED', targetId)
    schoolEventBus.publish('STUDENT_UPDATED')
    schoolEventBus.publish('INVOICE_CREATED')
    schoolEventBus.publish('PAYMENT_RECORDED')
    this.broadcastChange('STUDENT_DELETED', { id: targetId, admission_number: targetAdm })
  }

  async clearAllStudents(): Promise<void> {
    await txEngine.executeAtomic(
      'CLEAR_ALL_STUDENTS_CASCADE',
      [
        'gc_v2_school_students',
        'gc_v2_school_invoices',
        'gc_v2_school_receipts',
        'gc_v2_school_unit_registrations',
        'gc_v2_school_report_cards',
        'gc_v2_school_reminders',
        'gc_v2_school_discipline',
      ],
      () => {
        this.set('students', [])
        this.set('invoices', [])
        this.set('receipts', [])
        this.set('unit_registrations', [])
        this.set('report_cards', [])
        this.set('reminders', [])
        this.set('discipline', [])
        this.set('biometric_clearance_logs', [])

        localStorage.removeItem('gc_v2_local_credentials')
        localStorage.removeItem('gc_local_credentials')
      }
    )

    try {
      supabase.from('profiles').delete().eq('role', 'student').then(() => {})
    } catch {}

    schoolEventBus.publish('STUDENT_UPDATED')
    schoolEventBus.publish('INVOICE_CREATED')
    schoolEventBus.publish('PAYMENT_RECORDED')
    this.broadcastChange('STUDENTS_CLEARED')
  }

  async grantCertificate(id: string, granted: boolean = true, grade: string = 'Distinction (A)'): Promise<void> {
    await txEngine.executeAtomic(
      `GRANT_CERTIFICATE_${id}`,
      ['gc_v2_school_students'],
      () => {
        const list = this.get<StudentRecord[]>('students', INITIAL_STUDENTS)
        const idx = list.findIndex((s) => s.id === id || s.admission_number.toLowerCase() === id.toLowerCase())
        if (idx === -1) throw new IntegrityError(`Student ID "${id}" not found.`)

        const student = list[idx]
        const certNo = student.certificate_number || `GC-CERT-${student.admission_number.replace(/[^a-zA-Z0-9]/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`

        list[idx] = {
          ...student,
          certificate_granted: granted,
          certificate_granted_at: granted ? new Date().toISOString() : undefined,
          certificate_number: granted ? certNo : undefined,
          certificate_grade: granted ? (grade || 'Distinction (A)') : undefined,
        }
        this.set('students', list)
      }
    )
    schoolEventBus.publish('STUDENT_UPDATED')
  }

  // --- Institutional Certificate Template CRUD & Cloud Sync ---
  getCertificateTemplate<T = any>(): T | null {
    return this.get<T | null>('certificate_template', null)
  }

  async setCertificateTemplate(template: any): Promise<void> {
    this.set('certificate_template', template)
    try {
      await idbStorage.set('gc_v2_school_certificate_template', template)
    } catch {}
    await this.pushCollectionToCloud('certificate_template', template)
  }

  // --- Timetable CRUD (ACID Protected) ---
  getTimetable(classFilter?: string, dayFilter?: string): TimetablePeriod[] {
    let list = this.get<TimetablePeriod[]>('timetable', INITIAL_TIMETABLE)
    if (classFilter && classFilter !== 'All') {
      list = list.filter((p) => p.class_name.toLowerCase().includes(classFilter.toLowerCase()) || p.class_id === classFilter)
    }
    if (dayFilter && dayFilter !== 'All') {
      list = list.filter((p) => p.day_of_week.toLowerCase() === dayFilter.toLowerCase())
    }
    return list
  }

  saveTimetable(periods: TimetablePeriod[]) {
    this.set('timetable', periods)
    schoolEventBus.publish('TIMETABLE_UPDATED')
    this.broadcastChange('COLLECTION_UPDATED_TIMETABLE', periods)
    this.pushCollectionToCloud('timetable', periods).catch(() => {})
  }

  async addPeriod(period: TimetablePeriod): Promise<void> {
    await txEngine.executeAtomic(
      `ADD_PERIOD_${period.id}`,
      ['gc_v2_school_timetable'],
      () => {
        const list = this.get<TimetablePeriod[]>('timetable', INITIAL_TIMETABLE)
        list.push(period)
        this.set('timetable', list)
      }
    )
    schoolEventBus.publish('TIMETABLE_UPDATED')
    this.broadcastChange('COLLECTION_UPDATED_TIMETABLE', this.getTimetable())
    await this.pushCollectionToCloud('timetable', this.getTimetable())
  }

  async updatePeriod(id: string, updated: Partial<TimetablePeriod>): Promise<void> {
    await txEngine.executeAtomic(
      `UPDATE_PERIOD_${id}`,
      ['gc_v2_school_timetable'],
      () => {
        const list = this.get<TimetablePeriod[]>('timetable', INITIAL_TIMETABLE)
        const idx = list.findIndex((p) => p.id === id)
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...updated }
          this.set('timetable', list)
        }
      }
    )
    schoolEventBus.publish('TIMETABLE_UPDATED')
    this.broadcastChange('COLLECTION_UPDATED_TIMETABLE', this.getTimetable())
    await this.pushCollectionToCloud('timetable', this.getTimetable())
  }

  async deletePeriod(id: string): Promise<void> {
    await txEngine.executeAtomic(
      `DELETE_PERIOD_${id}`,
      ['gc_v2_school_timetable'],
      () => {
        const list = this.get<TimetablePeriod[]>('timetable', INITIAL_TIMETABLE).filter((p) => p.id !== id)
        this.set('timetable', list)
      }
    )
    schoolEventBus.publish('TIMETABLE_UPDATED')
    this.broadcastChange('COLLECTION_UPDATED_TIMETABLE', this.getTimetable())
    await this.pushCollectionToCloud('timetable', this.getTimetable())
  }

  // --- Invoices & Fees (ACID Protected) ---
  getInvoices(): FeeInvoice[] {
    const rawInvoices = this.get<FeeInvoice[]>('invoices', INITIAL_INVOICES)
    const rawStudents = this.get<StudentRecord[]>('students', INITIAL_STUDENTS)
    const receipts = this.getReceipts()

    const invoiceList = [...rawInvoices]
    for (const std of rawStudents) {
      const hasInv = invoiceList.some(
        (inv) =>
          (inv.student_id && inv.student_id === std.id) ||
          (inv.admission_number && inv.admission_number.toLowerCase() === std.admission_number.toLowerCase())
      )
      if (!hasInv) {
        const billed = Number(std.term_fee_total) || 60
        invoiceList.push({
          id: `inv-${std.id}`,
          invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          student_id: std.id,
          student_name: std.full_name,
          admission_number: std.admission_number,
          class_name: std.class_name || 'Short Course Cohort',
          term: 'Term 1',
          academic_year: `${new Date().getFullYear()}`,
          issue_date: std.enrollment_date || new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          total_amount: billed,
          paid_amount: 0,
          balance: billed,
          status: 'Pending',
          items: [
            {
              id: `item-${std.id}-1`,
              description: `Tuition & Training Fee (${std.class_name})`,
              amount: billed,
            },
          ],
        })
      }
    }

    return invoiceList.map((inv) => {
      const matchingReceipts = receipts.filter(
        (r) =>
          (r.invoice_id && r.invoice_id === inv.id) ||
          (r.student_id && r.student_id === inv.student_id) ||
          (r.admission_number && r.admission_number.toLowerCase() === inv.admission_number.toLowerCase())
      )
      const paid = matchingReceipts.reduce((acc, r) => acc + (Number(r.amount) || 0), 0)
      const total = Number(inv.total_amount) || 60
      const balance = Math.max(0, total - paid)
      const status: 'Paid' | 'Partial' | 'Overdue' | 'Pending' =
        balance === 0 && paid > 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending'
      return {
        ...inv,
        total_amount: total,
        paid_amount: paid,
        balance,
        status,
      }
    })
  }

  saveInvoices(invoices: FeeInvoice[]) {
    this.set('invoices', invoices)
  }

  async addInvoice(invoice: FeeInvoice): Promise<void> {
    await txEngine.executeAtomic(
      `ADD_INVOICE_${invoice.id}`,
      ['gc_v2_school_invoices'],
      () => {
        const list = this.getInvoices()
        list.unshift(invoice)
        this.set('invoices', list)
      }
    )
    schoolEventBus.publish('INVOICE_CREATED', invoice)
    await this.pushCollectionToCloud('invoices', this.getInvoices())

    // Direct write to Supabase fee_invoices table
    try {
      await supabase.from('fee_invoices').upsert({
        id: isValidUuid(invoice.id) ? invoice.id : undefined,
        invoice_number: invoice.invoice_number,
        student_id: isValidUuid(invoice.student_id) ? invoice.student_id : null,
        term_name: invoice.term,
        academic_year: invoice.academic_year,
        total_amount: invoice.total_amount,
        amount_paid: invoice.paid_amount,
        balance_due: invoice.balance,
        due_date: invoice.due_date,
        status: invoice.status === 'Paid' ? 'PAID' : invoice.status === 'Partial' ? 'PARTIAL' : 'PENDING',
      }, { onConflict: 'invoice_number' })
    } catch {}
  }

  async createInvoice(invoice: FeeInvoice): Promise<void> {
    return this.addInvoice(invoice)
  }

  async updateInvoice(invoiceId: string, updated: Partial<FeeInvoice>, adminName?: string): Promise<void> {
    await txEngine.executeAtomic(
      `UPDATE_INVOICE_${invoiceId}`,
      ['gc_v2_school_invoices', 'gc_v2_school_students'],
      () => {
        const list = this.getInvoices()
        const idx = list.findIndex((inv) => inv.id === invoiceId || inv.invoice_number === invoiceId)
        if (idx === -1) throw new IntegrityError(`Invoice "${invoiceId}" not found.`)

        const oldInv = list[idx]
        const items = updated.items || oldInv.items
        const totalAmount = updated.total_amount ?? items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
        const paidAmount = updated.paid_amount ?? oldInv.paid_amount
        const balance = Math.max(0, totalAmount - paidAmount)
        const status: 'Paid' | 'Partial' | 'Overdue' | 'Pending' =
          balance === 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending'

        const merged: FeeInvoice = {
          ...oldInv,
          ...updated,
          items,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          balance,
          status,
          is_updated: true,
          updated_at: new Date().toISOString(),
          updated_by: adminName || 'Principal / Administrator',
        }

        list[idx] = merged
        this.set('invoices', list)

        // Update student fee total and balance
        const students = this.getStudents()
        const stdIdx = students.findIndex((s) => s.id === merged.student_id || s.admission_number.toLowerCase() === merged.admission_number.toLowerCase())
        if (stdIdx !== -1) {
          students[stdIdx].term_fee_total = totalAmount
          students[stdIdx].fee_balance = balance
          students[stdIdx].fee_cleared = balance === 0
          this.set('students', students)
        }
      }
    )
    schoolEventBus.publish('INVOICE_CREATED', updated)
    schoolEventBus.publish('STUDENT_UPDATED')
    this.broadcastChange('COLLECTION_UPDATED_INVOICES', this.getInvoices())
    await this.pushCollectionToCloud('invoices', this.getInvoices())
    await this.pushCollectionToCloud('students', this.getStudents())
  }

  async deleteInvoice(invoiceId: string): Promise<void> {
    await txEngine.executeAtomic(
      `DELETE_INVOICE_${invoiceId}`,
      ['gc_v2_school_invoices'],
      () => {
        const list = this.getInvoices().filter((inv) => inv.id !== invoiceId && inv.invoice_number !== invoiceId)
        this.set('invoices', list)
      }
    )
    schoolEventBus.publish('INVOICE_CREATED', invoiceId)
    this.broadcastChange('COLLECTION_UPDATED_INVOICES', this.getInvoices())
    await this.pushCollectionToCloud('invoices', this.getInvoices())
  }

  async clearAllInvoices(): Promise<void> {
    await txEngine.executeAtomic(
      'CLEAR_ALL_INVOICES',
      ['gc_v2_school_invoices'],
      () => {
        this.set('invoices', [])
      }
    )
    schoolEventBus.publish('INVOICE_CREATED')
    this.broadcastChange('COLLECTION_UPDATED_INVOICES', [])
    await this.pushCollectionToCloud('invoices', [])
  }

  getReceipts(): FeePaymentReceipt[] {
    return this.get<FeePaymentReceipt[]>('receipts', INITIAL_RECEIPTS)
  }

  async recordPayment(receipt: FeePaymentReceipt): Promise<void> {
    await txEngine.executeAtomic(
      `ATOMIC_RECORD_PAYMENT_${receipt.receipt_number}`,
      ['gc_v2_school_receipts', 'gc_v2_school_invoices', 'gc_v2_school_students'],
      () => {
        if (receipt.amount <= 0) {
          throw new IntegrityError('Payment amount must be greater than zero.')
        }

        const receipts = this.getReceipts()
        receipts.unshift(receipt)
        this.set('receipts', receipts)

        const cleanAdm = receipt.admission_number.toLowerCase().trim()
        const cleanAlpha = cleanAdm.replace(/[^a-z0-9]/g, '')

        const invoices = this.getInvoices()
        const invIndex = invoices.findIndex(
          (inv) =>
            inv.student_id === receipt.student_id ||
            inv.admission_number.toLowerCase().trim() === cleanAdm ||
            inv.admission_number.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlpha
        )
        if (invIndex !== -1) {
          invoices[invIndex].paid_amount += receipt.amount
          invoices[invIndex].balance = Math.max(0, invoices[invIndex].total_amount - invoices[invIndex].paid_amount)
          invoices[invIndex].status = invoices[invIndex].balance === 0 ? 'Paid' : 'Partial'
          this.set('invoices', invoices)
        }

        const students = this.getStudents()
        const stdIndex = students.findIndex(
          (s) =>
            s.id === receipt.student_id ||
            s.admission_number.toLowerCase().trim() === cleanAdm ||
            s.admission_number.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlpha
        )
        if (stdIndex !== -1) {
          students[stdIndex].fee_balance = Math.max(0, students[stdIndex].fee_balance - receipt.amount)
          students[stdIndex].fee_cleared = students[stdIndex].fee_balance === 0 || (receipt.balance_after ?? 0) === 0
          this.set('students', students)
        }
      }
    )

    schoolEventBus.publish('PAYMENT_RECORDED', receipt)
    schoolEventBus.publish('STUDENT_UPDATED')
    this.broadcastChange('PAYMENT_RECORDED', receipt)
    await this.pushCollectionToCloud('receipts', this.getReceipts())
    await this.pushCollectionToCloud('invoices', this.getInvoices())
    await this.pushCollectionToCloud('students', this.getStudents())

    // Direct write to Supabase fee_payments table
    try {
      await supabase.from('fee_payments').upsert({
        id: isValidUuid(receipt.id) ? receipt.id : undefined,
        receipt_number: receipt.receipt_number,
        invoice_id: isValidUuid(receipt.invoice_id) ? receipt.invoice_id : null,
        student_id: isValidUuid(receipt.student_id) ? receipt.student_id : null,
        amount_paid: receipt.amount,
        payment_method: receipt.payment_method === 'M-Pesa' ? 'MPESA' : 'BANK_TRANSFER',
        transaction_reference: receipt.reference_code || receipt.receipt_number,
        payment_date: receipt.payment_date || new Date().toISOString().split('T')[0],
        received_by: receipt.recorded_by || 'Bursar',
      }, { onConflict: 'receipt_number' })
    } catch {}

    const matchedStd = this.getStudents().find(
      (s) => s.id === receipt.student_id || s.admission_number.toLowerCase() === receipt.admission_number.toLowerCase()
    )
    if (matchedStd) {
      await this.syncStudentProfileToSupabase(matchedStd)
    }
  }

  async updateReceipt(receiptId: string, updated: Partial<FeePaymentReceipt>, adminName?: string): Promise<void> {
    await txEngine.executeAtomic(
      `ATOMIC_UPDATE_PAYMENT_${receiptId}`,
      ['gc_v2_school_receipts', 'gc_v2_school_invoices', 'gc_v2_school_students'],
      () => {
        const receipts = this.getReceipts()
        const idx = receipts.findIndex((r) => r.id === receiptId || r.receipt_number === receiptId)
        if (idx === -1) throw new IntegrityError(`Receipt "${receiptId}" not found.`)

        const oldReceipt = receipts[idx]
        const merged: FeePaymentReceipt = {
          ...oldReceipt,
          ...updated,
          is_updated: true,
          updated_at: new Date().toISOString(),
          updated_by: adminName || 'Principal / Administrator',
        }
        receipts[idx] = merged
        this.set('receipts', receipts)

        // Recalculate invoice and student balance
        const allStudentReceipts = receipts.filter(
          (r) => r.student_id === merged.student_id || r.admission_number.toLowerCase() === merged.admission_number.toLowerCase()
        )
        const totalPaid = allStudentReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

        const invoices = this.getInvoices()
        const invIndex = invoices.findIndex((inv) => inv.student_id === merged.student_id || inv.admission_number.toLowerCase() === merged.admission_number.toLowerCase())
        if (invIndex !== -1) {
          invoices[invIndex].paid_amount = totalPaid
          invoices[invIndex].balance = Math.max(0, invoices[invIndex].total_amount - totalPaid)
          invoices[invIndex].status = invoices[invIndex].balance === 0 ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Pending'
          this.set('invoices', invoices)
        }

        const students = this.getStudents()
        const stdIndex = students.findIndex((s) => s.id === merged.student_id || s.admission_number.toLowerCase() === merged.admission_number.toLowerCase())
        if (stdIndex !== -1) {
          const billed = Number(students[stdIndex].term_fee_total) || 60
          students[stdIndex].fee_balance = Math.max(0, billed - totalPaid)
          students[stdIndex].fee_cleared = students[stdIndex].fee_balance === 0
          this.set('students', students)
        }
      }
    )
    schoolEventBus.publish('PAYMENT_RECORDED', updated)
    schoolEventBus.publish('STUDENT_UPDATED')
    await this.pushCollectionToCloud('receipts', this.getReceipts())
    await this.pushCollectionToCloud('invoices', this.getInvoices())
    await this.pushCollectionToCloud('students', this.getStudents())
  }

  async deleteReceipt(receiptId: string): Promise<void> {
    await txEngine.executeAtomic(
      `ATOMIC_DELETE_RECEIPT_${receiptId}`,
      ['gc_v2_school_receipts', 'gc_v2_school_invoices', 'gc_v2_school_students'],
      () => {
        const receipts = this.getReceipts()
        const target = receipts.find((r) => r.id === receiptId || r.receipt_number === receiptId)
        if (!target) return

        const remaining = receipts.filter((r) => r.id !== receiptId && r.receipt_number !== receiptId)
        this.set('receipts', remaining)

        // Recalculate balance
        const allStudentReceipts = remaining.filter(
          (r) => r.student_id === target.student_id || r.admission_number.toLowerCase() === target.admission_number.toLowerCase()
        )
        const totalPaid = allStudentReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

        const students = this.getStudents()
        const stdIndex = students.findIndex((s) => s.id === target.student_id || s.admission_number.toLowerCase() === target.admission_number.toLowerCase())
        if (stdIndex !== -1) {
          const billed = Number(students[stdIndex].term_fee_total) || 60
          students[stdIndex].fee_balance = Math.max(0, billed - totalPaid)
          students[stdIndex].fee_cleared = students[stdIndex].fee_balance === 0
          this.set('students', students)
        }
      }
    )
    schoolEventBus.publish('PAYMENT_RECORDED', receiptId)
    schoolEventBus.publish('STUDENT_UPDATED')
    await this.pushCollectionToCloud('receipts', this.getReceipts())
    await this.pushCollectionToCloud('invoices', this.getInvoices())
    await this.pushCollectionToCloud('students', this.getStudents())
  }

  async clearAllReceipts(): Promise<void> {
    await txEngine.executeAtomic(
      'CLEAR_ALL_RECEIPTS',
      ['gc_v2_school_receipts'],
      () => {
        this.set('receipts', [])
      }
    )
    schoolEventBus.publish('PAYMENT_RECORDED')
    schoolEventBus.publish('STUDENT_UPDATED')
    this.broadcastChange('COLLECTION_UPDATED_RECEIPTS', [])
    await this.pushCollectionToCloud('receipts', [])
  }

  // --- Payment Reminders ---
  getReminders(): PaymentReminder[] {
    return this.get<PaymentReminder[]>('reminders', INITIAL_REMINDERS)
  }

  async sendReminder(reminder: PaymentReminder): Promise<void> {
    await txEngine.executeAtomic(
      `SEND_REMINDER_${reminder.id}`,
      ['gc_v2_school_reminders'],
      () => {
        const list = this.getReminders()
        list.unshift(reminder)
        this.set('reminders', list)
      }
    )
    schoolEventBus.publish('REMINDER_SENT', reminder)
  }

  async addPaymentReminder(reminder: PaymentReminder): Promise<void> {
    return this.sendReminder(reminder)
  }

  // --- Secretary Inquiries ---
  getInquiries(): SecretaryInquiry[] {
    return this.get<SecretaryInquiry[]>('inquiries', INITIAL_INQUIRIES)
  }

  async addInquiry(inquiry: SecretaryInquiry): Promise<void> {
    await txEngine.executeAtomic(
      `ADD_INQUIRY_${inquiry.id}`,
      ['gc_v2_school_inquiries'],
      () => {
        const list = this.getInquiries()
        list.unshift(inquiry)
        this.set('inquiries', list)
      }
    )
    schoolEventBus.publish('INQUIRY_LOGGED', inquiry)
  }

  // --- Notices CRUD ---
  getNotices(): SchoolNotice[] {
    return this.get<SchoolNotice[]>('notices', INITIAL_NOTICES)
  }

  async addNotice(notice: SchoolNotice): Promise<void> {
    await txEngine.executeAtomic(
      `ADD_NOTICE_${notice.id}`,
      ['gc_v2_school_notices'],
      () => {
        const list = this.getNotices()
        list.unshift(notice)
        this.set('notices', list)
      }
    )
    schoolEventBus.publish('NOTICE_POSTED', notice)
    this.broadcastChange('NOTICE_POSTED', notice)
    await this.pushCollectionToCloud('notices', this.getNotices())
  }

  async updateNotice(id: string, updated: Partial<SchoolNotice>): Promise<void> {
    await txEngine.executeAtomic(
      `UPDATE_NOTICE_${id}`,
      ['gc_v2_school_notices'],
      () => {
        const list = this.getNotices()
        const idx = list.findIndex((n) => n.id === id)
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...updated }
          this.set('notices', list)
        }
      }
    )
    schoolEventBus.publish('NOTICE_POSTED', updated)
    this.broadcastChange('NOTICE_UPDATED', updated)
    await this.pushCollectionToCloud('notices', this.getNotices())
  }

  async deleteNotice(id: string): Promise<void> {
    await txEngine.executeAtomic(
      `DELETE_NOTICE_${id}`,
      ['gc_v2_school_notices'],
      () => {
        const list = this.getNotices().filter((n) => n.id !== id)
        this.set('notices', list)
      }
    )
    schoolEventBus.publish('NOTICE_POSTED')
    this.broadcastChange('NOTICE_DELETED', { id })
    await this.pushCollectionToCloud('notices', this.getNotices())
  }

  // --- Exams & Reports ---
  getExams(): ExamSession[] {
    return this.get<ExamSession[]>('exams', INITIAL_EXAMS)
  }

  async addExam(exam: ExamSession): Promise<void> {
    await txEngine.executeAtomic(
      `ADD_EXAM_${exam.id}`,
      ['gc_v2_school_exams'],
      () => {
        const list = this.getExams()
        list.unshift(exam)
        this.set('exams', list)
      }
    )
    await this.pushCollectionToCloud('exams', this.getExams())
  }

  getReportCards(): ReportCard[] {
    return this.get<ReportCard[]>('report_cards', INITIAL_REPORT_CARDS)
  }

  async addReportCard(card: ReportCard): Promise<void> {
    await txEngine.executeAtomic(
      `ADD_REPORT_CARD_${card.id}`,
      ['gc_v2_school_report_cards'],
      () => {
        const list = this.getReportCards()
        list.unshift(card)
        this.set('report_cards', list)
      }
    )
    await this.pushCollectionToCloud('report_cards', this.getReportCards())
  }

  getResources(): AcademicResource[] {
    return this.get<AcademicResource[]>('resources', INITIAL_RESOURCES)
  }

  async addResource(resource: AcademicResource): Promise<void> {
    await txEngine.executeAtomic(
      `ADD_RESOURCE_${resource.id}`,
      ['gc_v2_school_resources'],
      () => {
        const list = this.getResources()
        const existingIdx = list.findIndex((r) => r.id === resource.id)
        if (existingIdx !== -1) {
          list[existingIdx] = resource
        } else {
          list.unshift(resource)
        }
        this.set('resources', list)
      }
    )
    schoolEventBus.publish('LIBRARY_UPDATED' as any, resource)
    this.broadcastChange('RESOURCE_ADDED', resource)

    // Push to library_resources and universal cloud sync store
    try {
      await supabase.from('library_resources').upsert({
        id: resource.id,
        title: resource.title,
        category: resource.category,
        subject: resource.subject,
        class_level: resource.class_level || 'Short Course / Certificate',
        file_url: resource.file_url,
        file_size: resource.file_size,
        file_type: resource.file_type || 'PDF',
        downloads_count: resource.downloads_count || 0,
        year: resource.year,
        uploaded_by: resource.uploaded_by,
        description: resource.description || null,
        tags: resource.tags || [],
        created_at: resource.created_at,
      }, { onConflict: 'id' })
    } catch {}
    await this.pushCollectionToCloud('resources', this.getResources())
  }

  async updateResource(id: string, updated: Partial<AcademicResource>): Promise<void> {
    await txEngine.executeAtomic(
      `UPDATE_RESOURCE_${id}`,
      ['gc_v2_school_resources'],
      () => {
        const list = this.getResources()
        const idx = list.findIndex((r) => r.id === id)
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...updated }
          this.set('resources', list)
        }
      }
    )
    schoolEventBus.publish('LIBRARY_UPDATED' as any, updated)
    this.broadcastChange('RESOURCE_UPDATED', updated)

    try {
      await supabase.from('library_resources').update({
        ...updated,
      }).eq('id', id)
    } catch {}
    await this.pushCollectionToCloud('resources', this.getResources())
  }

  async deleteResource(id: string): Promise<void> {
    let remainingList: AcademicResource[] = []
    await txEngine.executeAtomic(
      `DELETE_RESOURCE_${id}`,
      ['gc_v2_school_resources'],
      () => {
        remainingList = this.getResources().filter((r) => r.id !== id)
        this.set('resources', remainingList)
      }
    )
    schoolEventBus.publish('LIBRARY_UPDATED' as any, id)
    this.broadcastChange('RESOURCE_DELETED', id)
    this.broadcastChange('COLLECTION_UPDATED_RESOURCES', remainingList)

    try {
      await supabase.from('library_resources').delete().eq('id', id)
    } catch {}
    await this.pushCollectionToCloud('resources', remainingList)
  }

  async clearAllResources(): Promise<void> {
    await txEngine.executeAtomic(
      'CLEAR_ALL_RESOURCES',
      ['gc_v2_school_resources'],
      () => {
        this.set('resources', [])
      }
    )
    schoolEventBus.publish('LIBRARY_UPDATED' as any)
    this.broadcastChange('COLLECTION_UPDATED_RESOURCES', [])
    try {
      await supabase.from('library_resources').delete().neq('id', 'placeholder-none')
    } catch {}
    await this.pushCollectionToCloud('resources', [])
  }

  getDiscipline(): DisciplineRecord[] {
    return this.get<DisciplineRecord[]>('discipline', INITIAL_DISCIPLINE)
  }

  async addDiscipline(record: DisciplineRecord): Promise<void> {
    await txEngine.executeAtomic(
      `ADD_DISCIPLINE_${record.id}`,
      ['gc_v2_school_discipline'],
      () => {
        const list = this.getDiscipline()
        list.unshift(record)
        this.set('discipline', list)
      }
    )
    await this.pushCollectionToCloud('discipline', this.getDiscipline())
  }

  // --- Course Units & Curriculum Builder (ACID Protected) ---
  getCourseUnits(): CourseUnit[] {
    const raw = this.get<CourseUnit[]>('course_units', INITIAL_COURSE_UNITS)
    return raw
      .filter((u) => (
        u &&
        typeof u.id === 'string' &&
        !u.id.startsWith('aaaaaaaa-') &&
        !u.id.startsWith('__GC_') &&
        !u.title?.startsWith('__GC_') &&
        !u.title?.includes('SYNC') &&
        !u.description?.startsWith('{"key":') &&
        !u.description?.startsWith('{"')
      ))
      .map((u) => {
        if (u.course_duration && (/1\s*Month|4\s*Weeks?|6\s*Weeks?/i.test(u.course_duration))) {
          return { ...u, course_duration: '8 Weeks (2 Months)' }
        }
        return u
      })
  }

  async addCourseUnit(unit: CourseUnit): Promise<void> {
    await txEngine.executeAtomic(
      `ADD_COURSE_UNIT_${unit.code}`,
      ['gc_v2_school_course_units'],
      () => {
        const list = this.getCourseUnits()
        const existingIdx = list.findIndex(
          (u) => u.id === unit.id || u.code.toLowerCase() === unit.code.toLowerCase()
        )
        if (existingIdx !== -1) {
          list[existingIdx] = unit
        } else {
          list.unshift(unit)
        }
        this.set('course_units', list)
      }
    )
    schoolEventBus.publish('COURSE_UNIT_CREATED' as any, unit)
    this.broadcastChange('COURSE_UNIT_CREATED', unit)
    await this.pushCollectionToCloud('course_units', this.getCourseUnits())

    // Asynchronously push to Supabase courses & lessons
    try {
      const { data: courseRow } = await supabase.from('courses').upsert({
        title: unit.title,
        description: JSON.stringify({
          unit_id: unit.id,
          code: unit.code,
          department: unit.department,
          program: unit.program,
          course_duration: unit.course_duration,
          credit_hours: unit.credit_hours,
          fee: unit.fee,
          teacher_name: unit.teacher_name,
          syllabus_modules: unit.syllabus_modules,
          lessons: unit.lessons,
          description: unit.description,
          live_meeting_url: unit.live_meeting_url,
          live_schedule_text: unit.live_schedule_text,
        }),
        is_published: unit.is_published ?? true,
      }).select().single()

      if (courseRow && unit.lessons?.length) {
        const lessonRows = unit.lessons.map((les, idx) => ({
          course_id: courseRow.id,
          title: les.title,
          description: les.content || '',
          youtube_url: les.video_url || '',
          order_index: idx,
        }))
        await supabase.from('lessons').insert(lessonRows)
      }
    } catch {}
  }

  async updateCourseUnit(id: string, updated: Partial<CourseUnit>): Promise<void> {
    await txEngine.executeAtomic(
      `UPDATE_COURSE_UNIT_${id}`,
      ['gc_v2_school_course_units', 'gc_v2_school_subjects'],
      () => {
        const list = this.getCourseUnits()
        const idx = list.findIndex((u) => u.id === id)
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...updated }
          this.set('course_units', list)
        }

        // Synchronize fee with corresponding subjects if fee was updated
        if (typeof updated.fee === 'number') {
          const targetUnit = idx !== -1 ? list[idx] : updated
          const subjects = this.getSubjects()
          let subChanged = false
          for (let i = 0; i < subjects.length; i++) {
            const s = subjects[i]
            if (
              s.id === id ||
              (targetUnit.code && s.code?.toLowerCase() === targetUnit.code.toLowerCase()) ||
              (targetUnit.title && s.name?.toLowerCase().trim() === targetUnit.title.toLowerCase().trim())
            ) {
              subjects[i] = { ...s, fee: updated.fee }
              subChanged = true
            }
          }
          if (subChanged) {
            this.set('subjects', subjects)
          }
        }
      }
    )
    schoolEventBus.publish('COURSE_UNIT_UPDATED' as any, updated)
    this.broadcastChange('COURSE_UNIT_UPDATED', updated)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gc-courses-updated', { detail: { type: 'course_unit', id, updated } }))
    }
    await this.pushCollectionToCloud('course_units', this.getCourseUnits())
    if (typeof updated.fee === 'number') {
      await this.pushCollectionToCloud('subjects', this.getSubjects())
    }
  }

  async updateLesson(courseId: string, lessonId: string, updatedLesson: { title?: string; video_url?: string; content?: string; duration_minutes?: number; meeting_url?: string }): Promise<void> {
    await txEngine.executeAtomic(
      `UPDATE_LESSON_${lessonId}`,
      ['gc_v2_school_course_units'],
      () => {
        const list = this.getCourseUnits()
        let found = false
        for (const unit of list) {
          if (unit.id === courseId || !courseId || unit.lessons?.some((l) => l.id === lessonId)) {
            if (unit.lessons) {
              const lesIdx = unit.lessons.findIndex((l) => l.id === lessonId)
              if (lesIdx !== -1) {
                unit.lessons[lesIdx] = { ...unit.lessons[lesIdx], ...updatedLesson }
                found = true
                break
              }
            }
          }
        }
        if (found) {
          this.set('course_units', list)
        }
      }
    )
    schoolEventBus.publish('COURSE_UNIT_UPDATED' as any, { courseId, lessonId })
    this.broadcastChange('COURSE_UNIT_UPDATED', { courseId, lessonId })
    await this.pushCollectionToCloud('course_units', this.getCourseUnits())
  }

  async deleteCourseUnit(id: string): Promise<void> {
    await txEngine.executeAtomic(
      `DELETE_COURSE_UNIT_${id}`,
      ['gc_v2_school_course_units'],
      () => {
        const list = this.getCourseUnits().filter((u) => u.id !== id)
        this.set('course_units', list)
      }
    )
    this.broadcastChange('COURSE_UNIT_DELETED', { id })
    await this.pushCollectionToCloud('course_units', this.getCourseUnits())
  }

  // --- Formal Unit Registration by Management (With Official Receipts) ---
  getUnitRegistrations(): UnitRegistrationReceipt[] {
    const raw = this.get<UnitRegistrationReceipt[]>('unit_registrations', [])
    const students = this.getStudents()
    if (students.length === 0) return []
    const studentAdms = new Set(students.map((s) => s.admission_number.toLowerCase()))
    const studentIds = new Set(students.map((s) => s.id.toLowerCase()))

    return raw.filter(
      (r) =>
        (r.student_id && studentIds.has(r.student_id.toLowerCase())) ||
        (r.admission_number && studentAdms.has(r.admission_number.toLowerCase()))
    )
  }

  async deleteUnitRegistration(identifier: string): Promise<void> {
    await txEngine.executeAtomic(
      `DELETE_UNIT_REGISTRATION_${identifier}`,
      ['gc_v2_school_unit_registrations'],
      () => {
        const clean = identifier.toLowerCase()
        const raw = this.get<UnitRegistrationReceipt[]>('unit_registrations', [])
        const list = raw.filter(
          (r) => r.id.toLowerCase() !== clean && r.receipt_number.toLowerCase() !== clean
        )
        this.set('unit_registrations', list)
      }
    )
    schoolEventBus.publish('UNIT_REGISTRATION_COMPLETED' as any)
    this.broadcastChange('UNIT_REGISTRATION_DELETED', { identifier })
    this.broadcastChange('COLLECTION_UPDATED_UNIT_REGISTRATIONS', this.getUnitRegistrations())
    await this.pushCollectionToCloud('unit_registrations', this.getUnitRegistrations())
  }

  async clearAllUnitRegistrations(): Promise<void> {
    await txEngine.executeAtomic(
      'CLEAR_ALL_UNIT_REGISTRATIONS',
      ['gc_v2_school_unit_registrations'],
      () => {
        this.set('unit_registrations', [])
      }
    )
    schoolEventBus.publish('UNIT_REGISTRATION_COMPLETED' as any)
    this.broadcastChange('UNIT_REGISTRATIONS_CLEARED')
    this.broadcastChange('COLLECTION_UPDATED_UNIT_REGISTRATIONS', [])
    await this.pushCollectionToCloud('unit_registrations', [])
  }

  async registerStudentUnits(receipt: UnitRegistrationReceipt): Promise<void> {
    await txEngine.executeAtomic(
      `REGISTER_UNITS_${receipt.receipt_number}`,
      ['gc_v2_school_unit_registrations'],
      () => {
        const list = this.getUnitRegistrations()
        // Replace existing registration or add new
        const existingIdx = list.findIndex((r) => r.student_id === receipt.student_id || r.admission_number.toLowerCase() === receipt.admission_number.toLowerCase())
        if (existingIdx !== -1) {
          list[existingIdx] = receipt
        } else {
          list.unshift(receipt)
        }
        this.set('unit_registrations', list)
      }
    )
    schoolEventBus.publish('UNIT_REGISTRATION_COMPLETED' as any, receipt)
    this.broadcastChange('UNIT_REGISTRATION_CREATED', receipt)
    this.broadcastChange('COLLECTION_UPDATED_UNIT_REGISTRATIONS', this.getUnitRegistrations())
    await this.pushCollectionToCloud('unit_registrations', this.getUnitRegistrations())
  }

  getRegistrationForStudent(identifier: string): UnitRegistrationReceipt | null {
    if (!identifier) return null
    const list = this.getUnitRegistrations()
    const clean = identifier.trim().toLowerCase()
    return list.find((r) => r.student_id.toLowerCase() === clean || r.admission_number.toLowerCase() === clean) || null
  }

  getRegisteredUnitsForStudent(identifier: string): CourseUnit[] {
    if (!identifier) return []
    const clean = identifier.trim().toLowerCase()
    const allUnits = this.getCourseUnits()

    // 1. Check formal unit registration slip
    const reg = this.getRegistrationForStudent(identifier)
    if (reg && reg.registered_unit_ids && reg.registered_unit_ids.length > 0) {
      const regIds = new Set(reg.registered_unit_ids.map((id) => id.toLowerCase()))
      const regCodes = new Set((reg.registered_units || []).map((ru) => ru.code?.toLowerCase()).filter(Boolean))
      return allUnits.filter(
        (u) =>
          regIds.has(u.id.toLowerCase()) ||
          regCodes.has(u.code.toLowerCase()) ||
          reg.registered_unit_ids.includes(u.id) ||
          reg.registered_units?.some((ru) => ru.code?.toLowerCase() === u.code?.toLowerCase())
      )
    }

    // 2. Check student record enrolled_courses & class_name
    const students = this.getStudents()
    const student = students.find(
      (s) => s.id.toLowerCase() === clean || s.admission_number.toLowerCase() === clean
    )

    if (student) {
      if (student.enrolled_courses && student.enrolled_courses.length > 0) {
        const enrolledSet = new Set(student.enrolled_courses.map((c) => c.toLowerCase().trim()))
        const matched = allUnits.filter(
          (u) =>
            enrolledSet.has(u.id.toLowerCase()) ||
            enrolledSet.has(u.code.toLowerCase()) ||
            enrolledSet.has(u.title.toLowerCase())
        )
        if (matched.length > 0) return matched
      }

      if (student.class_name) {
        const classNameLower = student.class_name.toLowerCase().trim()
        const matched = allUnits.filter(
          (u) =>
            u.title.toLowerCase().includes(classNameLower) ||
            classNameLower.includes(u.title.toLowerCase()) ||
            (u.program && classNameLower.includes(u.program.toLowerCase())) ||
            (u.program && u.program.toLowerCase().includes(classNameLower))
        )
        if (matched.length > 0) return matched
      }
    }

    return []
  }

  async addCourseToStudentProgram(studentIdentifier: string, courseUnitId: string): Promise<boolean> {
    const clean = studentIdentifier.trim().toLowerCase()
    const students = this.getStudents()
    const student = students.find(
      (s) => s.id.toLowerCase() === clean || s.admission_number.toLowerCase() === clean
    )
    if (!student) return false

    const allUnits = this.getCourseUnits()
    const unit = allUnits.find(
      (u) => u.id.toLowerCase() === courseUnitId.toLowerCase() || u.code.toLowerCase() === courseUnitId.toLowerCase()
    )
    if (!unit) return false

    // 1. Update student enrolled_courses
    const currentEnrolled = student.enrolled_courses || []
    if (!currentEnrolled.includes(unit.id) && !currentEnrolled.includes(unit.code)) {
      student.enrolled_courses = [...currentEnrolled, unit.id]
      const allStd = this.getStudents()
      const sIdx = allStd.findIndex(
        (s) => s.id === student.id || s.admission_number.toLowerCase() === student.admission_number.toLowerCase()
      )
      if (sIdx !== -1) {
        allStd[sIdx] = student
        this.set('students', allStd)
      }
    }

    // 2. Update or create UnitRegistrationReceipt
    const reg = this.getRegistrationForStudent(student.admission_number) || this.getRegistrationForStudent(student.id)
    if (reg) {
      const regIds = reg.registered_unit_ids || []
      if (!regIds.includes(unit.id)) {
        reg.registered_unit_ids = [...regIds, unit.id]
        reg.registered_units = [
          ...(reg.registered_units || []),
          { code: unit.code, name: unit.title, credits: unit.credit_hours, lecturer: unit.teacher_name || 'Faculty Lecturer' },
        ]
        reg.total_credits = (reg.total_credits || 0) + unit.credit_hours
        await this.registerStudentUnits(reg)
      }
    } else {
      const newSlip: UnitRegistrationReceipt = {
        id: `reg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        receipt_number: `REG-${new Date().getFullYear()}-${student.admission_number.replace(/[^0-9]/g, '') || Math.floor(1000 + Math.random() * 9000)}`,
        student_id: student.id,
        student_name: student.full_name,
        admission_number: student.admission_number,
        course_name: unit.title,
        course_duration: unit.course_duration || '3 Months Short Course',
        semester: 'Term 1 / Cohort 2026',
        registered_unit_ids: [unit.id],
        registered_units: [
          { code: unit.code, name: unit.title, credits: unit.credit_hours, lecturer: unit.teacher_name || 'Faculty Lecturer' },
        ],
        total_credits: unit.credit_hours,
        fee_clearance_status: 'Cleared',
        verified_by: 'Academic Registrar & Admissions Desk',
        timestamp: new Date().toISOString(),
        qr_code_data: `GC-REG-${student.admission_number}-${unit.code}`,
      }
      await this.registerStudentUnits(newSlip)
    }

    schoolEventBus.publish('STUDENT_UPDATED', student)
    schoolEventBus.publish('UNIT_REGISTRATION_COMPLETED' as any)
    window.dispatchEvent(new CustomEvent('gc-courses-updated', { detail: { studentId: student.id, unitId: unit.id } }))
    window.dispatchEvent(new CustomEvent('gc-data-synced'))
    await this.syncWithCloud(true).catch(() => {})
    return true
  }

  async unlockStudentLessons(identifier: string, officerName: string = 'Bursar & Admissions Office'): Promise<void> {
    const clean = identifier.trim().toLowerCase()
    const cleanAlpha = clean.replace(/[^a-z0-9]/g, '')

    await txEngine.executeAtomic(
      `UNLOCK_STUDENT_LESSONS_${cleanAlpha || clean}`,
      ['gc_v2_school_students', 'gc_v2_school_invoices', 'gc_v2_school_receipts', 'gc_v2_school_unit_registrations'],
      () => {
        // 1. Update Student record
        const students = this.getStudents()
        const stdIdx = students.findIndex(
          (s) =>
            s.id.toLowerCase() === clean ||
            s.admission_number.toLowerCase() === clean ||
            s.admission_number.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlpha ||
            s.full_name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlpha
        )
        let targetStudent = stdIdx !== -1 ? students[stdIdx] : null

        if (targetStudent) {
          targetStudent.fee_balance = 0
          targetStudent.fee_cleared = true
          students[stdIdx] = targetStudent
          this.set('students', students)
        } else {
          const studentReg = this.getUnitRegistrations().find(
            (r) =>
              r.student_id?.toLowerCase() === clean ||
              r.admission_number.toLowerCase() === clean ||
              r.admission_number.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlpha
          )
          const registeredUnit = studentReg
            ? this.getCourseUnits().find((u) => u.id === studentReg.unit_id || u.title === studentReg.unit_title)
            : null
          const registeredSubject = studentReg
            ? this.getSubjects().find((s) => s.name === studentReg.program)
            : null

          targetStudent = {
            id: `std-${cleanAlpha || Date.now()}`,
            admission_number: identifier,
            full_name: studentReg?.student_name || identifier,
            gender: 'Not Specified',
            dob: '',
            class_id: registeredUnit?.id || registeredSubject?.id || 'class-main',
            class_name: studentReg?.program || registeredUnit?.title || registeredSubject?.name || 'Vocational Training Program',
            grade_level: registeredUnit ? `${registeredUnit.credit_hours} Credits (Short Course)` : 'Online Certificate',
            stream: 'Virtual Campus',
            enrollment_date: new Date().toISOString().split('T')[0],
            status: 'Active',
            guardian: { name: '', relationship: 'Guardian', phone: '', email: '' },
            emergency_contact: '',
            fee_balance: 0,
            term_fee_total: studentReg?.fee_amount || registeredUnit?.fee || registeredSubject?.fee || 60,
            fee_cleared: true,
            attendance_rate: 0,
            discipline_points: 0,
            merits_count: 0,
            demerits_count: 0,
          }
          students.push(targetStudent)
          this.set('students', students)
        }

        const studentId = targetStudent.id
        const studentAdm = targetStudent.admission_number
        const studentName = targetStudent.full_name
        const studentClass = targetStudent.class_name || 'Vocational Short Course'

        // 2. Mark existing invoices as Paid or create a fully settled invoice
        const invoices = this.getInvoices()
        const matchedInvoices = invoices.filter(
          (inv) =>
            inv.student_id.toLowerCase() === clean ||
            inv.admission_number.toLowerCase() === clean ||
            inv.admission_number.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlpha
        )

        if (matchedInvoices.length > 0) {
          matchedInvoices.forEach((inv) => {
            inv.paid_amount = inv.total_amount
            inv.balance = 0
            inv.status = 'Paid'
          })
          this.set('invoices', invoices)
        } else {
          const unitFee = targetStudent.term_fee_total || 60
          const newInv: FeeInvoice = {
            id: `inv-${Date.now()}`,
            invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            student_id: studentId,
            student_name: studentName,
            admission_number: studentAdm,
            class_name: studentClass,
            term: 'Short Course',
            academic_year: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
            issue_date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            due_date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            items: [{ id: `item-${Date.now()}`, description: `${studentClass} Tuition & LMS Access`, amount: unitFee }],
            total_amount: unitFee,
            paid_amount: unitFee,
            balance: 0,
            status: 'Paid',
          }
          invoices.unshift(newInv)
          this.set('invoices', invoices)
        }

        // 3. Issue a Bursar Fee Clearance Receipt
        const receipts = this.getReceipts()
        const hasReceipt = receipts.some(
          (r) =>
            r.student_id.toLowerCase() === clean ||
            r.admission_number.toLowerCase() === clean ||
            r.admission_number.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlpha
        )
        if (!hasReceipt) {
          const rcpt: FeePaymentReceipt = {
            id: `rcpt-${Date.now()}`,
            receipt_number: `RCT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            invoice_id: matchedInvoices[0]?.id || `inv-${Date.now()}`,
            student_id: studentId,
            student_name: studentName,
            admission_number: studentAdm,
            amount: 75,
            amount_paid: 75,
            payment_method: 'Cash Deposit',
            reference_code: `BURSAR-CLEAR-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
            received_by: officerName,
            recorded_by: officerName,
            paid_by: studentName,
            payment_date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            balance_after: 0,
            balance_remaining: 0,
          }
          receipts.unshift(rcpt)
          this.set('receipts', receipts)
        }

        // 4. Ensure Unit Registration Slip is present with all units registered
        const unitRegs = this.getUnitRegistrations()
        const existingRegIdx = unitRegs.findIndex(
          (r) => r.student_id.toLowerCase() === clean || r.admission_number.toLowerCase() === clean
        )

        const allUnits = this.getCourseUnits()
        const programUnits = allUnits.filter((u) => {
          if (!studentClass) return true
          const c = studentClass.toLowerCase()
          return (
            u.title.toLowerCase().includes(c) ||
            c.includes(u.title.toLowerCase()) ||
            (u.program && c.includes(u.program.toLowerCase())) ||
            (u.program && u.program.toLowerCase().includes(c))
          )
        })
        const selectedUnits = programUnits.length > 0 ? programUnits : allUnits

        if (existingRegIdx !== -1) {
          unitRegs[existingRegIdx].fee_clearance_status = 'Cleared'
          unitRegs[existingRegIdx].exam_card_issued = true
          if (!unitRegs[existingRegIdx].registered_unit_ids || unitRegs[existingRegIdx].registered_unit_ids.length === 0) {
            unitRegs[existingRegIdx].registered_unit_ids = selectedUnits.map((u) => u.id)
            unitRegs[existingRegIdx].registered_units = selectedUnits.map((u) => ({
              code: u.code,
              title: u.title,
              credit_hours: u.credit_hours || 3,
              teacher_name: u.teacher_name,
            }))
            unitRegs[existingRegIdx].total_credits = selectedUnits.reduce((acc, u) => acc + (u.credit_hours || 3), 0)
          }
          this.set('unit_registrations', unitRegs)
        } else {
          const newSlip: UnitRegistrationReceipt = {
            id: `reg-${Date.now()}`,
            receipt_number: `UNIT-REG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            student_id: studentId,
            student_name: studentName,
            admission_number: studentAdm,
            program: studentClass,
            academic_year: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
            course_duration: '3 Months (Certificate Program)',
            semester: 'Term 1 / Module 1',
            registered_unit_ids: selectedUnits.map((u) => u.id),
            registered_units: selectedUnits.map((u) => ({
              code: u.code,
              title: u.title,
              credit_hours: u.credit_hours || 3,
              teacher_name: u.teacher_name,
            })),
            total_credits: selectedUnits.reduce((acc, u) => acc + (u.credit_hours || 3), 0),
            fee_clearance_status: 'Cleared',
            registered_by: officerName,
            registered_at: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            exam_card_issued: true,
          }
          unitRegs.unshift(newSlip)
          this.set('unit_registrations', unitRegs)
        }
      }
    )

    schoolEventBus.publish('STUDENT_UPDATED')
    schoolEventBus.publish('PAYMENT_RECORDED')
    schoolEventBus.publish('INVOICE_CREATED')
    schoolEventBus.publish('UNIT_REGISTRATION_COMPLETED' as any)
    this.broadcastChange('STUDENT_LESSONS_UNLOCKED', { identifier })

    await this.pushCollectionToCloud('students', this.getStudents())
    await this.pushCollectionToCloud('invoices', this.getInvoices())
    await this.pushCollectionToCloud('receipts', this.getReceipts())
    await this.pushCollectionToCloud('unit_registrations', this.getUnitRegistrations())

    const studentRecord = this.getStudents().find(
      (s) => s.id.toLowerCase() === clean || s.admission_number.toLowerCase() === clean
    )
    if (studentRecord) {
      await this.syncStudentProfileToSupabase(studentRecord)
    }
  }

  // --- Faculty Teachers & Course Assignments (ACID Protected) ---
  getTeachers(): FacultyTeacher[] {
    return this.get<FacultyTeacher[]>('faculty_teachers', INITIAL_FACULTY_TEACHERS)
  }

  async addTeacher(teacher: FacultyTeacher): Promise<void> {
    await txEngine.executeAtomic(
      `ADD_TEACHER_${teacher.id}`,
      ['gc_v2_school_faculty_teachers'],
      () => {
        const list = this.getTeachers()
        const existingIdx = list.findIndex(
          (t) =>
            t.id === teacher.id ||
            (teacher.staff_id && t.staff_id?.toLowerCase() === teacher.staff_id.toLowerCase()) ||
            t.name.toLowerCase() === teacher.name.toLowerCase()
        )
        if (existingIdx !== -1) {
          list[existingIdx] = { ...list[existingIdx], ...teacher }
        } else {
          list.unshift(teacher)
        }
        this.set('faculty_teachers', list)
      }
    )
    schoolEventBus.publish('TEACHER_ADDED' as any, teacher)
    this.broadcastChange('TEACHER_ADDED', teacher)
    await this.pushCollectionToCloud('faculty_teachers', this.getTeachers())
  }

  async updateTeacher(teacher: FacultyTeacher): Promise<void> {
    await this.addTeacher(teacher)
  }

  async deleteTeacher(id: string): Promise<void> {
    await txEngine.executeAtomic(
      `DELETE_TEACHER_${id}`,
      ['gc_v2_school_faculty_teachers'],
      () => {
        const list = this.getTeachers().filter(
          (t) => t.id !== id && t.staff_id?.toLowerCase() !== id.toLowerCase()
        )
        this.set('faculty_teachers', list)
      }
    )
    schoolEventBus.publish('TEACHER_UPDATED' as any)
    this.broadcastChange('TEACHER_UPDATED')
    await this.pushCollectionToCloud('faculty_teachers', this.getTeachers())
  }

  async clearAllTeachers(): Promise<void> {
    await txEngine.executeAtomic(
      'CLEAR_ALL_TEACHERS',
      ['gc_v2_school_faculty_teachers'],
      () => {
        this.set('faculty_teachers', [])
      }
    )
    schoolEventBus.publish('TEACHER_UPDATED' as any)
    this.broadcastChange('TEACHER_UPDATED')
    await this.pushCollectionToCloud('faculty_teachers', [])
  }

  // --- Admin Departments & Institutional Schools Management (ACID Protected) ---
  getSchools(): InstitutionalSchool[] {
    return INSTITUTIONAL_SCHOOLS
  }

  getDepartments(): CollegeDepartment[] {
    return this.get<CollegeDepartment[]>('departments', INITIAL_DEPARTMENTS)
  }

  getDepartmentsBySchool(schoolId: string): CollegeDepartment[] {
    return this.getDepartments().filter((d) => d.school_id === schoolId)
  }

  getCoursesByYearLevel(yearLevel: string): CourseProgram[] {
    if (!yearLevel || yearLevel === 'All Years') {
      return OFFICIAL_COURSES
    }
    return OFFICIAL_COURSES.filter((c) => (c.yearLevel as string) === yearLevel || (c.yearLevel as string) === 'All Years')
  }

  getOfficialCoursesBySchool(schoolId: string): CourseProgram[] {
    return OFFICIAL_COURSES.filter((c) => c.schoolId === schoolId)
  }

  async addDepartment(dept: CollegeDepartment): Promise<void> {
    await txEngine.executeAtomic(
      `ADD_DEPARTMENT_${dept.code}`,
      ['gc_v2_school_departments'],
      () => {
        const list = this.getDepartments()
        const existingIdx = list.findIndex(
          (d) => d.id === dept.id || d.code.toLowerCase() === dept.code.toLowerCase() || d.name.toLowerCase() === dept.name.toLowerCase()
        )
        if (existingIdx !== -1) {
          list[existingIdx] = { ...list[existingIdx], ...dept }
        } else {
          list.unshift(dept)
        }
        this.set('departments', list)
      }
    )
    schoolEventBus.publish('DEPARTMENT_CREATED' as any, dept)
    this.broadcastChange('COLLECTION_UPDATED_DEPARTMENTS', this.getDepartments())
    await this.pushCollectionToCloud('departments', this.getDepartments())
  }

  async updateDepartment(id: string, updated: Partial<CollegeDepartment>): Promise<void> {
    await txEngine.executeAtomic(
      `UPDATE_DEPARTMENT_${id}`,
      ['gc_v2_school_departments'],
      () => {
        const list = this.getDepartments()
        const idx = list.findIndex((d) => d.id === id)
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...updated }
          this.set('departments', list)
        }
      }
    )
    this.broadcastChange('COLLECTION_UPDATED_DEPARTMENTS', this.getDepartments())
    await this.pushCollectionToCloud('departments', this.getDepartments())
  }

  async deleteDepartment(id: string): Promise<void> {
    await txEngine.executeAtomic(
      `DELETE_DEPARTMENT_${id}`,
      ['gc_v2_school_departments'],
      () => {
        const list = this.getDepartments().filter((d) => d.id !== id)
        this.set('departments', list)
      }
    )
    this.broadcastChange('COLLECTION_UPDATED_DEPARTMENTS', this.getDepartments())
    await this.pushCollectionToCloud('departments', this.getDepartments())
  }

  // --- Admin Subjects / Disciplines Management (ACID Protected) ---
  getSubjects(): CollegeSubject[] {
    const raw = this.get<CollegeSubject[]>('subjects', INITIAL_SUBJECTS)
    return raw
      .filter((s) => (
        s &&
        typeof s.id === 'string' &&
        !s.id.startsWith('aaaaaaaa-') &&
        !s.id.startsWith('__GC_') &&
        !s.name?.startsWith('__GC_') &&
        !s.name?.includes('SYNC') &&
        !s.description?.startsWith('{"key":') &&
        !s.description?.startsWith('{"')
      ))
      .map((s) => {
        if (s.duration && (/1\s*Month|4\s*Weeks?|6\s*Weeks?/i.test(s.duration))) {
          return { ...s, duration: '8 Weeks (2 Months)' }
        }
        return s
      })
  }

  async addSubject(sub: CollegeSubject): Promise<void> {
    await txEngine.executeAtomic(
      `ADD_SUBJECT_${sub.code}`,
      ['gc_v2_school_subjects'],
      () => {
        const list = this.getSubjects()
        const existingIdx = list.findIndex(
          (s) => s.id === sub.id || s.code.toLowerCase() === sub.code.toLowerCase() || s.name.toLowerCase() === sub.name.toLowerCase()
        )
        if (existingIdx !== -1) {
          list[existingIdx] = sub
        } else {
          list.unshift(sub)
        }
        this.set('subjects', list)
      }
    )
    schoolEventBus.publish('SUBJECT_CREATED' as any, sub)
    this.broadcastChange('SUBJECT_CREATED', sub)
    await this.pushCollectionToCloud('subjects', this.getSubjects())
  }

  async updateSubject(id: string, updated: Partial<CollegeSubject>): Promise<void> {
    await txEngine.executeAtomic(
      `UPDATE_SUBJECT_${id}`,
      ['gc_v2_school_subjects', 'gc_v2_school_course_units'],
      () => {
        const list = this.getSubjects()
        let idx = list.findIndex((s) => s.id === id)
        if (idx === -1 && updated.code) {
          idx = list.findIndex((s) => s.code.toLowerCase() === updated.code!.toLowerCase())
        }
        if (idx === -1 && updated.name) {
          idx = list.findIndex((s) => s.name.toLowerCase() === updated.name!.toLowerCase())
        }

        if (idx !== -1) {
          list[idx] = { ...list[idx], ...updated }
          this.set('subjects', list)
        } else {
          const newSub: CollegeSubject = {
            id,
            code: updated.code || id.toUpperCase(),
            name: updated.name || 'Certified Course',
            department_id: updated.department_id || 'dept-general',
            department_name: updated.department_name || 'Academic Faculty',
            fee: updated.fee || 60,
            duration: updated.duration || '3 Months Certificate',
            color_hex: updated.color_hex || '#1e3a8a',
            created_at: new Date().toISOString(),
            ...updated,
          }
          list.push(newSub)
          this.set('subjects', list)
        }

        // Synchronize fee with corresponding course units if fee was updated
        if (typeof updated.fee === 'number') {
          const targetSub = idx !== -1 ? list[idx] : updated
          const units = this.getCourseUnits()
          let unitChanged = false
          for (let i = 0; i < units.length; i++) {
            const u = units[i]
            if (
              u.id === id ||
              (targetSub.code && u.code?.toLowerCase() === targetSub.code.toLowerCase()) ||
              (targetSub.name && u.title?.toLowerCase().trim() === targetSub.name.toLowerCase().trim())
            ) {
              units[i] = { ...u, fee: updated.fee }
              unitChanged = true
            }
          }
          if (unitChanged) {
            this.set('course_units', units)
          }
        }
      }
    )
    schoolEventBus.publish('SUBJECT_UPDATED' as any, updated)
    this.broadcastChange('SUBJECT_UPDATED', updated)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gc-courses-updated', { detail: { type: 'subject', id, updated } }))
    }
    await this.pushCollectionToCloud('subjects', this.getSubjects())
    if (typeof updated.fee === 'number') {
      await this.pushCollectionToCloud('course_units', this.getCourseUnits())
    }
  }

  async deleteSubject(id: string): Promise<void> {
    await txEngine.executeAtomic(
      `DELETE_SUBJECT_${id}`,
      ['gc_v2_school_subjects'],
      () => {
        const list = this.getSubjects().filter((s) => s.id !== id)
        this.set('subjects', list)
      }
    )
    this.broadcastChange('SUBJECT_DELETED', { id })
    await this.pushCollectionToCloud('subjects', this.getSubjects())
  }

  // --- Biometric Security & Fingerprint Verification (ACID Protected) ---
  async enrollStudentBiometric(
    studentId: string,
    fingerName: 'Right Index' | 'Right Thumb' | 'Left Index' | 'Left Thumb' | 'Right Middle' | 'Left Middle',
    enrolledBy = 'Admissions / Bursar Officer',
    credentialId?: string,
    deviceType?: string,
    publicKey?: string,
    customTemplateHash?: string
  ): Promise<StudentRecord> {
    let updatedStudent: StudentRecord | null = null
    await txEngine.executeAtomic(
      `ENROLL_BIOMETRIC_${studentId}`,
      ['gc_v2_school_students'],
      () => {
        const list = this.getStudents()
        const idx = list.findIndex((s) => s.id === studentId)
        if (idx === -1) throw new IntegrityError(`Student ID "${studentId}" not found for biometric enrollment.`)

        const student = list[idx]
        const templateHash = customTemplateHash || generateBiometricTemplate(student.admission_number, fingerName)
        const now = new Date().toISOString()

        list[idx] = {
          ...student,
          biometric_enrolled: true,
          biometric_finger_name: fingerName,
          biometric_template_hash: templateHash,
          biometric_credential_id: credentialId,
          biometric_device_type: deviceType || 'WebAuthn / Optical Sensor',
          biometric_public_key: publicKey,
          biometric_enrolled_at: now,
          biometric_enrolled_by: enrolledBy,
        }
        updatedStudent = list[idx]
        this.set('students', list)
      }
    )

    schoolEventBus.publish('STUDENT_UPDATED', updatedStudent)
    return updatedStudent!
  }

  async removeStudentBiometric(studentId: string): Promise<void> {
    await txEngine.executeAtomic(
      `REMOVE_BIOMETRIC_${studentId}`,
      ['gc_v2_school_students'],
      () => {
        const list = this.getStudents()
        const idx = list.findIndex((s) => s.id === studentId)
        if (idx !== -1) {
          list[idx] = {
            ...list[idx],
            biometric_enrolled: false,
            biometric_finger_name: undefined,
            biometric_template_hash: undefined,
            biometric_credential_id: undefined,
            biometric_device_type: undefined,
            biometric_public_key: undefined,
            biometric_enrolled_at: undefined,
            biometric_enrolled_by: undefined,
          }
          this.set('students', list)
        }
      }
    )
  }

  getBiometricClearanceLogs(): BiometricFeeClearancePass[] {
    return this.get<BiometricFeeClearancePass[]>('biometric_passes', [])
  }

  async saveBiometricClearanceLog(pass: BiometricFeeClearancePass): Promise<void> {
    await txEngine.executeAtomic(
      `SAVE_CLEARANCE_PASS_${pass.clearance_code}`,
      ['gc_v2_school_biometric_passes'],
      () => {
        const list = this.getBiometricClearanceLogs()
        list.unshift(pass)
        this.set('biometric_passes', list)
      }
    )
    this.broadcastChange('COLLECTION_UPDATED_BIOMETRIC_PASSES', this.getBiometricClearanceLogs())
    await this.pushCollectionToCloud('biometric_passes', this.getBiometricClearanceLogs())
  }

  // --- Custom Course Fee Schedule (ACID Protected & Cloud Synced) ---
  getCustomCourseFees(): Record<string, number> {
    const raw = this.get<Record<string, number>>('custom_course_fees', {})
    try {
      const stored = localStorage.getItem('gc_v2_school_custom_course_fees')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed && typeof parsed === 'object') {
          return { ...parsed, ...raw }
        }
      }
    } catch {}
    return raw
  }

  async setCourseFee(courseId: string, feeUsd: number): Promise<void> {
    const safeFee = Math.max(0, Math.round(feeUsd))
    await txEngine.executeAtomic(
      `SET_COURSE_FEE_${courseId}`,
      ['gc_v2_school_custom_course_fees', 'gc_v2_school_subjects', 'gc_v2_school_course_units'],
      () => {
        const feesMap = { ...this.getCustomCourseFees() }
        feesMap[courseId] = safeFee
        this.set('custom_course_fees', feesMap)
        try {
          localStorage.setItem('gc_v2_school_custom_course_fees', JSON.stringify(feesMap))
        } catch {}

        // Also sync any matching subjects in store
        const subjects = this.getSubjects()
        let subUpdated = false
        for (let i = 0; i < subjects.length; i++) {
          const s = subjects[i]
          if (
            s.id === courseId ||
            s.id === `sub-${courseId.replace(/^c-/, '')}` ||
            (s.code && s.code.toLowerCase() === courseId.toLowerCase()) ||
            (s.name && s.name.toLowerCase().includes(courseId.toLowerCase()))
          ) {
            subjects[i] = { ...s, fee: safeFee }
            subUpdated = true
          }
        }
        if (subUpdated) {
          this.set('subjects', subjects)
        }

        // Also sync any matching course units in store
        const units = this.getCourseUnits()
        let unitUpdated = false
        for (let i = 0; i < units.length; i++) {
          const u = units[i]
          if (
            u.id === courseId ||
            (u.code && u.code.toLowerCase() === courseId.toLowerCase()) ||
            (u.title && u.title.toLowerCase().includes(courseId.toLowerCase()))
          ) {
            units[i] = { ...u, fee: safeFee }
            unitUpdated = true
          }
        }
        if (unitUpdated) {
          this.set('course_units', units)
        }
      }
    )

    schoolEventBus.publish('COURSE_UNIT_UPDATED' as any, { courseId, feeUsd: safeFee })
    this.broadcastChange('COLLECTION_UPDATED_FEE_STRUCTURES', this.getCustomCourseFees())
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gc-courses-updated', { detail: { courseId, feeUsd: safeFee } }))
      window.dispatchEvent(new CustomEvent('gc-data-synced'))
    }
    await this.pushCollectionToCloud('fee_structures', this.getCustomCourseFees())
    await this.pushCollectionToCloud('subjects', this.getSubjects())
    await this.pushCollectionToCloud('course_units', this.getCourseUnits())
  }

  // --- Single Active Device Session Enforcement (Anti-Account Sharing) ---
  getDeviceSessions(): Record<string, DeviceSession> {
    const raw = this.get<Record<string, DeviceSession>>('device_sessions', {})
    try {
      const stored = localStorage.getItem('gc_v2_school_device_sessions')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed && typeof parsed === 'object') {
          return { ...parsed, ...raw }
        }
      }
    } catch {}
    return raw
  }

  getActiveDeviceSession(userId: string): DeviceSession | undefined {
    if (!userId) return undefined
    const cleanId = userId.toLowerCase().trim()
    const sessions = this.getDeviceSessions()
    return sessions[cleanId] || Object.values(sessions).find((s) => s.user_id.toLowerCase().trim() === cleanId)
  }

  async registerDeviceSession(userId: string, sessionToken: string, deviceName: string): Promise<DeviceSession> {
    if (!userId || !sessionToken) {
      throw new Error('User ID and Session Token required')
    }
    const cleanId = userId.toLowerCase().trim()
    const sessionObj: DeviceSession = {
      user_id: userId,
      session_token: sessionToken,
      device_name: deviceName || 'Authorized Device',
      last_active_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }

    const currentSessions = { ...this.getDeviceSessions() }
    currentSessions[cleanId] = sessionObj
    this.set('device_sessions', currentSessions)

    try {
      localStorage.setItem('gc_v2_school_device_sessions', JSON.stringify(currentSessions))
    } catch {}

    // Broadcast eviction immediately across tabs/windows on the same browser / system
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          const channel = new BroadcastChannel('gc_session_channel')
          channel.postMessage({
            type: 'SESSION_REGISTERED',
            userId,
            sessionToken,
            deviceName: sessionObj.device_name,
            timestamp: Date.now(),
          })
          channel.close()
        }
      } catch {}
      window.dispatchEvent(
        new CustomEvent('gc-device-sessions-updated', {
          detail: { userId, sessionToken, deviceName: sessionObj.device_name },
        })
      )
    }

    schoolEventBus.publish('SESSION_REGISTERED' as any, sessionObj)

    // Push to universal cloud sync so other network devices receive eviction notice
    this.pushCollectionToCloud('device_sessions', currentSessions).catch(() => {})

    return sessionObj
  }

  validateDeviceSession(userId: string, currentSessionToken: string): boolean {
    if (!userId || !currentSessionToken) return true
    const active = this.getActiveDeviceSession(userId)
    if (!active) return true
    // If active session token is different from our local token, account was opened elsewhere
    return active.session_token === currentSessionToken
  }

  async terminateDeviceSession(userId: string): Promise<void> {
    if (!userId) return
    const cleanId = userId.toLowerCase().trim()
    const currentSessions = { ...this.getDeviceSessions() }
    delete currentSessions[cleanId]
    this.set('device_sessions', currentSessions)
    try {
      localStorage.setItem('gc_v2_school_device_sessions', JSON.stringify(currentSessions))
    } catch {}
    this.pushCollectionToCloud('device_sessions', currentSessions).catch(() => {})
  }

  getCredentials(): Record<string, any> {
    try {
      const raw = localStorage.getItem('gc_v2_local_credentials') || localStorage.getItem('gc_local_credentials')
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }

  async saveCredentials(creds: Record<string, any>): Promise<void> {
    try {
      localStorage.setItem('gc_v2_local_credentials', JSON.stringify(creds))
      localStorage.setItem('gc_local_credentials', JSON.stringify(creds))
    } catch {}
    idbStorage.set('gc_v2_local_credentials', creds).catch(() => {})
    await this.pushCollectionToCloud('credentials', creds)
  }

  // --- Complete Factory Reset ---
  resetToCleanSlate() {
    this.purgeAllDataForLaunch()
    idbStorage.clear().catch(() => {})
    localStorage.removeItem('gc_v2_school_biometric_passes')
    localStorage.removeItem('gc_v2_school_device_sessions')
    localStorage.removeItem('gc_v2_local_credentials')
    localStorage.removeItem('gc_local_credentials')
  }
}

export const schoolStore = new SchoolDataStore()
