import { supabase } from '@/lib/supabase'
import { idbStorage } from '@/lib/indexedDb'
import type {
  PartnerSchoolTenant,
  CreateTenantSchoolInput,
  AcademicCalendarPeriod,
  AcademicCalendarSystem,
  TenantStaffMember,
  TenantStudentMember,
  TenantPayrollRecord,
  TenantGradeRecord,
  TenantLessonNote,
  TenantFeePayment,
  TenantTimetableEntry,
  TenantSessionUser,
  InstitutionProgram,
  InstitutionCampus,
  TenantSchoolNotice,
  TenantAdmissionApplication,
  ApplicationStatus,
  TenantAttendanceSession,
} from '@/types/tenantSchool'
import {
  SUBSCRIPTION_TIER_RATES,
  type SubscriptionTierType,
} from '@/types/licensing'

const STORAGE_KEY = 'gc_v2_partner_schools_tenants'
const CLOUD_SYNC_KEY = 'gc_v2_partner_schools_state'
const STAFF_STORAGE_KEY = 'gc_v2_tenant_staff_members'
const STUDENTS_STORAGE_KEY = 'gc_v2_tenant_students'
const PAYROLL_STORAGE_KEY = 'gc_v2_tenant_payroll'
const GRADES_STORAGE_KEY = 'gc_v2_tenant_grades'
const NOTES_STORAGE_KEY = 'gc_v2_tenant_lesson_notes'
const PAYMENTS_STORAGE_KEY = 'gc_v2_tenant_fee_payments'
const TIMETABLE_STORAGE_KEY = 'gc_v2_tenant_timetables'
const PROGRAMS_STORAGE_KEY = 'gc_v2_tenant_programs'
const NOTICES_STORAGE_KEY = 'gc_v2_tenant_notices'
const APPLICATIONS_STORAGE_KEY = 'gc_v2_tenant_applications'
const ATTENDANCE_STORAGE_KEY = 'gc_v2_tenant_attendance_sessions'
const SESSION_STORAGE_KEY_PREFIX = 'gc_v2_tenant_session_'
const DELETED_SCHOOLS_KEY = 'gc_v2_deleted_schools_tombstones'

function safeTenantStorePersist<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return
  idbStorage.set(key, data).catch(() => {})
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (err) {
    console.warn(`LocalStorage quota exceeded for key "${key}". Persisted safely in high-capacity IndexedDB.`, err)
  }
}

const INITIAL_PARTNER_SCHOOLS: PartnerSchoolTenant[] = []

class TenantSchoolStore {
  private schools: PartnerSchoolTenant[] = []
  private programs: InstitutionProgram[] = []
  private deletedSchoolSlugs: Set<string> = new Set()
  private isPushing = false
  private queuedPush = false
  private pushTimer: any = null

  constructor() {
    this.loadDeletedSchoolSlugs()
    this.loadSchools()
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.syncWithCloud().catch(() => {})
        supabase
          .channel('gc_tenant_schools_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'app_cloud_sync', filter: `key=eq.${CLOUD_SYNC_KEY}` },
            () => {
              this.syncWithCloud().catch(() => {})
            }
          )
          .subscribe()
      }, 1000)
    }
  }

  private loadDeletedSchoolSlugs() {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(DELETED_SCHOOLS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          this.deletedSchoolSlugs = new Set(parsed.map((s: string) => s.toLowerCase().trim()))
        }
      }
    } catch {
      // Fallback
    }
  }

  private saveDeletedSchoolSlugs() {
    if (typeof window === 'undefined') return
    safeTenantStorePersist(DELETED_SCHOOLS_KEY, Array.from(this.deletedSchoolSlugs))
  }

  public async syncWithCloud(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('app_cloud_sync')
        .select('data')
        .eq('key', CLOUD_SYNC_KEY)
        .maybeSingle()

      if (error || !data?.data) {
        // If cloud is empty or no row yet, but local device has schools, immediately seed cloud!
        if (this.schools.length > 0) {
          this.pushToCloud()
        }
        return
      }

      const cloudState = data.data as {
        schools?: PartnerSchoolTenant[]
        staff?: TenantStaffMember[]
        students?: TenantStudentMember[]
        programs?: InstitutionProgram[]
        payroll?: TenantPayrollRecord[]
        grades?: TenantGradeRecord[]
        lessonNotes?: TenantLessonNote[]
        payments?: TenantFeePayment[]
        timetables?: TenantTimetableEntry[]
        notices?: TenantSchoolNotice[]
        applications?: TenantAdmissionApplication[]
        attendanceSessions?: TenantAttendanceSession[]
        deletedSchools?: string[]
      }

      // 0. Merge remote tombstones
      const remoteDeleted = new Set(
        Array.isArray(cloudState.deletedSchools)
          ? cloudState.deletedSchools.map((s) => (typeof s === 'string' ? s.toLowerCase().trim() : '')).filter(Boolean)
          : []
      )
      remoteDeleted.forEach((slug) => {
        this.deletedSchoolSlugs.add(slug)
      })

      // If a school exists in cloudState.schools, and is NOT in remoteDeleted,
      // then that school is active on the cloud!
      // Any stale local tombstone must be removed so it can be restored.
      if (Array.isArray(cloudState.schools)) {
        cloudState.schools.forEach((s) => {
          const sSlug = (s.slug || '').toLowerCase().trim()
          if (sSlug && !remoteDeleted.has(sSlug) && this.deletedSchoolSlugs.has(sSlug)) {
            this.deletedSchoolSlugs.delete(sSlug)
          }
        })
      }
      this.saveDeletedSchoolSlugs()

      let hadLocalChanges = false

      if (Array.isArray(cloudState.schools)) {
        const map = new Map<string, PartnerSchoolTenant>()
        // 1. Put cloud schools in map (excluding tombstones)
        cloudState.schools.forEach((s) => {
          const sSlug = (s.slug || '').toLowerCase().trim()
          if (!sSlug) return
          if (!this.deletedSchoolSlugs.has(sSlug)) {
            map.set(sSlug, s)
          } else {
            // Cloud has a deleted school that needs to be scrubbed remotely
            hadLocalChanges = true
          }
        })
        // 2. Merge local schools (excluding tombstones)
        this.schools.forEach((s) => {
          const cleanSlug = s.slug.toLowerCase().trim()
          if (this.deletedSchoolSlugs.has(cleanSlug)) {
            hadLocalChanges = true
            return
          }
          const cloudSchool = map.get(cleanSlug)
          if (!cloudSchool) {
            map.set(cleanSlug, s)
            hadLocalChanges = true
          } else {
            // Timestamp & priority resolution
            const localTime = s.updated_at ? new Date(s.updated_at).getTime() : 0
            const cloudTime = cloudSchool.updated_at ? new Date(cloudSchool.updated_at).getTime() : 0

            // Deep-merge campuses list so no device wipes out added branches
            const localCampuses = s.campuses_list || []
            const cloudCampuses = cloudSchool.campuses_list || []
            const campusMap = new Map<string, InstitutionCampus>()
            cloudCampuses.forEach((c) => campusMap.set((c.name || c.id).toLowerCase(), c))
            localCampuses.forEach((c) => {
              const key = (c.name || c.id).toLowerCase()
              if (!campusMap.has(key)) {
                campusMap.set(key, c)
                hadLocalChanges = true
              }
            })
            const mergedCampuses = Array.from(campusMap.values())
            const finalCampusCount = Math.max(
              s.campus_count || 1,
              cloudSchool.campus_count || 1,
              mergedCampuses.length || 1
            )

            const chosenStatus = (localTime && cloudTime)
              ? (localTime >= cloudTime ? s.subscription_status : cloudSchool.subscription_status)
              : (s.subscription_status || cloudSchool.subscription_status)

            const chosenPassword = (localTime && cloudTime)
              ? (localTime >= cloudTime ? (s.admin_password || cloudSchool.admin_password) : (cloudSchool.admin_password || s.admin_password))
              : (s.admin_password || cloudSchool.admin_password)

            map.set(cleanSlug, {
              ...cloudSchool,
              ...s,
              campuses_list: mergedCampuses.length > 0 ? mergedCampuses : (cloudSchool.campuses_list || s.campuses_list),
              campus_count: finalCampusCount,
              subscription_status: chosenStatus,
              admin_password: chosenPassword,
              active_license_key: s.active_license_key || cloudSchool.active_license_key,
              license_valid_until: s.license_valid_until || cloudSchool.license_valid_until,
              updated_at: s.updated_at || cloudSchool.updated_at,
            })
          }
        })
        this.schools = Array.from(map.values()).filter((s) => !this.deletedSchoolSlugs.has(s.slug.toLowerCase().trim()))
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.schools))
        window.dispatchEvent(new CustomEvent('gc-tenant-schools-updated', { detail: this.schools }))
      }

      if (Array.isArray(cloudState.programs) && cloudState.programs.length > 0) {
        this.loadPrograms()
        const map = new Map<string, InstitutionProgram>()
        cloudState.programs.forEach((pr) => {
          if (!this.deletedSchoolSlugs.has((pr.school_slug || '').toLowerCase().trim())) {
            map.set(pr.id, pr)
          } else {
            hadLocalChanges = true
          }
        })
        this.programs.forEach((pr) => {
          if (!this.deletedSchoolSlugs.has((pr.school_slug || '').toLowerCase().trim()) && !map.has(pr.id)) {
            map.set(pr.id, pr)
            hadLocalChanges = true
          }
        })
        this.programs = Array.from(map.values())
        localStorage.setItem(PROGRAMS_STORAGE_KEY, JSON.stringify(this.programs))
      }

      if (Array.isArray(cloudState.staff) && cloudState.staff.length > 0) {
        this.loadStaff()
        const map = new Map<string, TenantStaffMember>()
        cloudState.staff.forEach((st) => {
          if (!this.deletedSchoolSlugs.has((st.school_slug || '').toLowerCase().trim())) {
            map.set(st.id, st)
          } else {
            hadLocalChanges = true
          }
        })
        this.staff.forEach((st) => {
          if (!this.deletedSchoolSlugs.has((st.school_slug || '').toLowerCase().trim()) && !map.has(st.id)) {
            map.set(st.id, st)
            hadLocalChanges = true
          }
        })
        this.staff = Array.from(map.values())
        localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(this.staff))
      }

      if (Array.isArray(cloudState.students) && cloudState.students.length > 0) {
        this.loadStudents()
        const map = new Map<string, TenantStudentMember>()
        cloudState.students.forEach((std) => {
          if (!this.deletedSchoolSlugs.has((std.school_slug || '').toLowerCase().trim())) {
            map.set(std.id, std)
          } else {
            hadLocalChanges = true
          }
        })
        this.students.forEach((std) => {
          if (!this.deletedSchoolSlugs.has((std.school_slug || '').toLowerCase().trim()) && !map.has(std.id)) {
            map.set(std.id, std)
            hadLocalChanges = true
          }
        })
        this.students = Array.from(map.values())
        localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(this.students))
      }

      if (Array.isArray(cloudState.payroll) && cloudState.payroll.length > 0) {
        this.loadPayroll()
        const map = new Map<string, TenantPayrollRecord>()
        cloudState.payroll.forEach((p) => {
          if (!this.deletedSchoolSlugs.has((p.school_slug || '').toLowerCase().trim())) {
            map.set(p.id, p)
          } else {
            hadLocalChanges = true
          }
        })
        this.payroll.forEach((p) => {
          if (!this.deletedSchoolSlugs.has((p.school_slug || '').toLowerCase().trim()) && !map.has(p.id)) {
            map.set(p.id, p)
            hadLocalChanges = true
          }
        })
        this.payroll = Array.from(map.values())
        localStorage.setItem(PAYROLL_STORAGE_KEY, JSON.stringify(this.payroll))
      }

      if (Array.isArray(cloudState.grades) && cloudState.grades.length > 0) {
        this.loadGrades()
        const map = new Map<string, TenantGradeRecord>()
        cloudState.grades.forEach((g) => {
          if (!this.deletedSchoolSlugs.has((g.school_slug || '').toLowerCase().trim())) {
            map.set(g.id, g)
          } else {
            hadLocalChanges = true
          }
        })
        this.grades.forEach((g) => {
          if (!this.deletedSchoolSlugs.has((g.school_slug || '').toLowerCase().trim()) && !map.has(g.id)) {
            map.set(g.id, g)
            hadLocalChanges = true
          }
        })
        this.grades = Array.from(map.values())
        localStorage.setItem(GRADES_STORAGE_KEY, JSON.stringify(this.grades))
      }

      if (Array.isArray(cloudState.lessonNotes) && cloudState.lessonNotes.length > 0) {
        this.loadLessonNotes()
        const map = new Map<string, TenantLessonNote>()
        cloudState.lessonNotes.forEach((n) => {
          if (!this.deletedSchoolSlugs.has((n.school_slug || '').toLowerCase().trim())) {
            map.set(n.id, n)
          } else {
            hadLocalChanges = true
          }
        })
        this.lessonNotes.forEach((n) => {
          if (!this.deletedSchoolSlugs.has((n.school_slug || '').toLowerCase().trim()) && !map.has(n.id)) {
            map.set(n.id, n)
            hadLocalChanges = true
          }
        })
        this.lessonNotes = Array.from(map.values())
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(this.lessonNotes))
      }

      if (Array.isArray(cloudState.payments) && cloudState.payments.length > 0) {
        this.loadPayments()
        const map = new Map<string, TenantFeePayment>()
        cloudState.payments.forEach((pm) => {
          if (!this.deletedSchoolSlugs.has((pm.school_slug || '').toLowerCase().trim())) {
            map.set(pm.id, pm)
          } else {
            hadLocalChanges = true
          }
        })
        this.payments.forEach((pm) => {
          if (!this.deletedSchoolSlugs.has((pm.school_slug || '').toLowerCase().trim()) && !map.has(pm.id)) {
            map.set(pm.id, pm)
            hadLocalChanges = true
          }
        })
        this.payments = Array.from(map.values())
        localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(this.payments))
      }

      if (Array.isArray(cloudState.timetables) && cloudState.timetables.length > 0) {
        this.loadTimetables()
        const map = new Map<string, TenantTimetableEntry>()
        cloudState.timetables.forEach((t) => {
          if (!this.deletedSchoolSlugs.has((t.school_slug || '').toLowerCase().trim())) {
            map.set(t.id, t)
          } else {
            hadLocalChanges = true
          }
        })
        this.timetables.forEach((t) => {
          if (!this.deletedSchoolSlugs.has((t.school_slug || '').toLowerCase().trim()) && !map.has(t.id)) {
            map.set(t.id, t)
            hadLocalChanges = true
          }
        })
        this.timetables = Array.from(map.values())
        localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(this.timetables))
      }

      if (Array.isArray(cloudState.notices) && cloudState.notices.length > 0) {
        this.loadNotices()
        const map = new Map<string, TenantSchoolNotice>()
        cloudState.notices.forEach((n) => {
          if (!this.deletedSchoolSlugs.has((n.school_slug || '').toLowerCase().trim())) {
            map.set(n.id, n)
          } else {
            hadLocalChanges = true
          }
        })
        this.notices.forEach((n) => {
          if (!this.deletedSchoolSlugs.has((n.school_slug || '').toLowerCase().trim()) && !map.has(n.id)) {
            map.set(n.id, n)
            hadLocalChanges = true
          }
        })
        this.notices = Array.from(map.values())
        localStorage.setItem(NOTICES_STORAGE_KEY, JSON.stringify(this.notices))
      }

      if (Array.isArray(cloudState.applications) && cloudState.applications.length > 0) {
        this.loadApplications()
        const map = new Map<string, TenantAdmissionApplication>()
        cloudState.applications.forEach((a) => {
          if (!this.deletedSchoolSlugs.has((a.school_slug || '').toLowerCase().trim())) {
            map.set(a.id, a)
          } else {
            hadLocalChanges = true
          }
        })
        this.applications.forEach((a) => {
          if (!this.deletedSchoolSlugs.has((a.school_slug || '').toLowerCase().trim()) && !map.has(a.id)) {
            map.set(a.id, a)
            hadLocalChanges = true
          }
        })
        this.applications = Array.from(map.values())
        localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(this.applications))
      }

      if (Array.isArray(cloudState.attendanceSessions) && cloudState.attendanceSessions.length > 0) {
        this.loadAttendanceSessions()
        const map = new Map<string, TenantAttendanceSession>()
        cloudState.attendanceSessions.forEach((s) => {
          if (!this.deletedSchoolSlugs.has((s.school_slug || '').toLowerCase().trim())) {
            map.set(s.id, s)
          } else {
            hadLocalChanges = true
          }
        })
        this.attendanceSessions.forEach((s) => {
          if (!this.deletedSchoolSlugs.has((s.school_slug || '').toLowerCase().trim()) && !map.has(s.id)) {
            map.set(s.id, s)
            hadLocalChanges = true
          }
        })
        this.attendanceSessions = Array.from(map.values())
        localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(this.attendanceSessions))
      }

      if (hadLocalChanges) {
        this.triggerCloudPush()
      }
    } catch {
      // Offline fallback
    }
  }

  public async pushToCloud(): Promise<void> {
    if (typeof window === 'undefined') return
    if (this.isPushing) {
      this.queuedPush = true
      return
    }
    this.isPushing = true
    this.queuedPush = false
    try {
      await supabase.from('app_cloud_sync').upsert(
        {
          key: CLOUD_SYNC_KEY,
          data: {
            schools: this.schools,
            staff: this.staff,
            students: this.students,
            programs: this.programs,
            payroll: this.payroll,
            grades: this.grades,
            lessonNotes: this.lessonNotes,
            payments: this.payments,
            timetables: this.timetables,
            notices: this.notices,
            applications: this.applications,
            attendanceSessions: this.attendanceSessions,
            deletedSchools: Array.from(this.deletedSchoolSlugs),
          },
          updated_at: new Date().toISOString(),
          updated_by: 'TenantSchoolStore',
        },
        { onConflict: 'key' }
      )
    } catch {
      // Ignore offline errors
    } finally {
      this.isPushing = false
      if (this.queuedPush) {
        this.queuedPush = false
        this.pushToCloud().catch(() => {})
      }
    }
  }

  private triggerCloudPush() {
    if (typeof window === 'undefined') return
    if (this.pushTimer) clearTimeout(this.pushTimer)
    this.pushTimer = setTimeout(() => {
      this.pushToCloud().catch(() => {})
    }, 1000)
  }

  private loadSchools() {
    if (typeof window === 'undefined') {
      this.schools = [...INITIAL_PARTNER_SCHOOLS]
      return
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const existingSlugs = new Set(parsed.map((s: PartnerSchoolTenant) => s.slug.toLowerCase()))
          const merged = [...parsed]
          INITIAL_PARTNER_SCHOOLS.forEach((initSchool) => {
            if (!existingSlugs.has(initSchool.slug.toLowerCase())) {
              merged.push(initSchool)
            }
          })
          this.schools = merged
          return
        }
      }
    } catch {
      // Fallback
    }

    this.schools = [...INITIAL_PARTNER_SCHOOLS]
  }

  private saveSchools() {
    if (typeof window === 'undefined') return
    safeTenantStorePersist(STORAGE_KEY, this.schools)
    window.dispatchEvent(new CustomEvent('gc-tenant-schools-updated', { detail: this.schools }))
    this.triggerCloudPush()
  }

  public getSchools(): PartnerSchoolTenant[] {
    return [...this.schools]
  }

  public getSchoolBySlug(slug: string): PartnerSchoolTenant | null {
    if (!slug) return null
    if (this.schools.length === 0) {
      this.loadSchools()
    }
    const cleanSlug = slug.trim().toLowerCase()

    // 1. Exact match by slug
    const exact = this.schools.find((s) => s.slug.toLowerCase() === cleanSlug)
    if (exact) return exact

    // 2. Loose match: frequently confused 1 (digit) vs l (letter L) vs i (letter I)
    const normalize = (str: string) =>
      str.toLowerCase().replace(/l/g, '1').replace(/i/g, '1').replace(/[^a-z0-9]/g, '')
    const targetNorm = normalize(cleanSlug)

    const loose = this.schools.find((s) => normalize(s.slug) === targetNorm)
    if (loose) return loose

    // 3. Match by school name
    const byName = this.schools.find((s) => normalize(s.name) === targetNorm)
    if (byName) return byName

    // 4. Prefix match (e.g. 'prime-skills' matches 'prime-skills-1' or vice versa)
    const baseSlug = cleanSlug.replace(/[-_]?[0-9l]+$/, '')
    if (baseSlug && baseSlug.length >= 3) {
      const byBase = this.schools.find((s) => s.slug.toLowerCase().startsWith(baseSlug))
      if (byBase) return byBase
    }

    return null
  }

  public async fetchSchoolFromCloudDirect(slug: string): Promise<PartnerSchoolTenant | null> {
    if (!slug) return null
    const cleanSlug = slug.trim().toLowerCase()

    // 1. Check local cache first
    const existing = this.getSchoolBySlug(cleanSlug)
    if (existing) return existing

    // 2. Fetch directly from Supabase app_cloud_sync
    try {
      const { data, error } = await supabase
        .from('app_cloud_sync')
        .select('data')
        .eq('key', CLOUD_SYNC_KEY)
        .maybeSingle()

      if (error || !data?.data) return null
      const cloudState = data.data as { schools?: PartnerSchoolTenant[]; deletedSchools?: string[] }
      if (!Array.isArray(cloudState.schools)) return null

      // Check if explicitly marked deleted in cloud
      const remoteDeleted = new Set(
        Array.isArray(cloudState.deletedSchools)
          ? cloudState.deletedSchools.map((s) => (typeof s === 'string' ? s.toLowerCase().trim() : '')).filter(Boolean)
          : []
      )
      if (remoteDeleted.has(cleanSlug)) return null

      const normalize = (str: string) =>
        str.toLowerCase().replace(/l/g, '1').replace(/i/g, '1').replace(/[^a-z0-9]/g, '')
      const targetNorm = normalize(cleanSlug)

      const found = cloudState.schools.find((s) => {
        const sSlug = (s.slug || '').toLowerCase().trim()
        const sNorm = normalize(sSlug)
        const nameNorm = normalize(s.name || '')
        const baseSlug = cleanSlug.replace(/[-_]?[0-9l]+$/, '')
        return (
          sSlug === cleanSlug ||
          sNorm === targetNorm ||
          nameNorm === targetNorm ||
          (baseSlug.length >= 3 && sSlug.startsWith(baseSlug))
        )
      })

      if (found) {
        const foundSlug = found.slug.toLowerCase().trim()
        // Clear any stale local tombstone
        this.deletedSchoolSlugs.delete(foundSlug)
        this.saveDeletedSchoolSlugs()

        // Merge into local store
        const existingIdx = this.schools.findIndex((s) => s.slug.toLowerCase().trim() === foundSlug)
        if (existingIdx >= 0) {
          this.schools[existingIdx] = found
        } else {
          this.schools.unshift(found)
        }
        this.saveSchools()
        return found
      }
    } catch (err) {
      console.warn('Direct cloud school fetch warning:', err)
    }

    return null
  }

  public getSchoolById(id: string): PartnerSchoolTenant | null {
    return this.schools.find((s) => s.id === id) || null
  }

  public deleteSchool(slug: string): void {
    const clean = slug.trim().toLowerCase()
    if (!clean) return

    // 1. Record tombstone so cloud sync never resurrects this institution
    this.deletedSchoolSlugs.add(clean)
    this.saveDeletedSchoolSlugs()

    // 2. Remove school from memory and persistence
    this.schools = this.schools.filter((s) => s.slug.toLowerCase().trim() !== clean)
    this.saveSchools()

    // 3. Cascade delete all associated entities across all collections
    if (this.staff.length === 0) this.loadStaff()
    this.staff = this.staff.filter((s) => (s.school_slug || '').toLowerCase().trim() !== clean)
    this.saveStaff()

    if (this.students.length === 0) this.loadStudents()
    this.students = this.students.filter((s) => (s.school_slug || '').toLowerCase().trim() !== clean)
    this.saveStudents()

    if (this.programs.length === 0) this.loadPrograms()
    this.programs = this.programs.filter((p) => (p.school_slug || '').toLowerCase().trim() !== clean)
    this.savePrograms()

    if (this.payroll.length === 0) this.loadPayroll()
    this.payroll = this.payroll.filter((p) => (p.school_slug || '').toLowerCase().trim() !== clean)
    this.savePayroll()

    if (this.grades.length === 0) this.loadGrades()
    this.grades = this.grades.filter((g) => (g.school_slug || '').toLowerCase().trim() !== clean)
    this.saveGrades()

    if (this.lessonNotes.length === 0) this.loadLessonNotes()
    this.lessonNotes = this.lessonNotes.filter((n) => (n.school_slug || '').toLowerCase().trim() !== clean)
    this.saveLessonNotes()

    if (this.payments.length === 0) this.loadPayments()
    this.payments = this.payments.filter((p) => (p.school_slug || '').toLowerCase().trim() !== clean)
    this.savePayments()

    if (this.timetables.length === 0) this.loadTimetables()
    this.timetables = this.timetables.filter((t) => (t.school_slug || '').toLowerCase().trim() !== clean)
    this.saveTimetables()

    if (this.notices.length === 0) this.loadNotices()
    this.notices = this.notices.filter((n) => (n.school_slug || '').toLowerCase().trim() !== clean)
    this.saveNotices()

    if (this.applications.length === 0) this.loadApplications()
    this.applications = this.applications.filter((a) => (a.school_slug || '').toLowerCase().trim() !== clean)
    this.saveApplications()

    if (this.attendanceSessions.length === 0) this.loadAttendanceSessions()
    this.attendanceSessions = this.attendanceSessions.filter((s) => (s.school_slug || '').toLowerCase().trim() !== clean)
    this.saveAttendanceSessions()

    // 4. Clean local session
    this.setActiveSession(clean, null)

    // 5. Immediately push scrubbed dataset to Supabase Cloud
    this.pushToCloud().catch(() => {})
  }

  public clearAllSchools(): void {
    this.schools.forEach((s) => this.deletedSchoolSlugs.add(s.slug.toLowerCase().trim()))
    this.saveDeletedSchoolSlugs()
    this.schools = []
    this.staff = []
    this.students = []
    this.payroll = []
    this.grades = []
    this.lessonNotes = []
    this.payments = []
    this.timetables = []
    this.programs = []
    this.notices = []
    this.applications = []
    this.attendanceSessions = []
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STAFF_STORAGE_KEY)
      localStorage.removeItem(STUDENTS_STORAGE_KEY)
      localStorage.removeItem(PAYROLL_STORAGE_KEY)
      localStorage.removeItem(GRADES_STORAGE_KEY)
      localStorage.removeItem(NOTES_STORAGE_KEY)
      localStorage.removeItem(PAYMENTS_STORAGE_KEY)
      localStorage.removeItem(TIMETABLE_STORAGE_KEY)
      localStorage.removeItem(PROGRAMS_STORAGE_KEY)
      localStorage.removeItem(NOTICES_STORAGE_KEY)
      localStorage.removeItem(APPLICATIONS_STORAGE_KEY)
      localStorage.removeItem(ATTENDANCE_STORAGE_KEY)
      window.dispatchEvent(new CustomEvent('gc-tenant-schools-updated', { detail: [] }))
      this.pushToCloud().catch(() => {})
    }
  }

  public completeOnboardingStep(slug: string, stepId: string): PartnerSchoolTenant | null {
    const school = this.getSchoolBySlug(slug)
    if (!school) return null
    const existing = school.onboarding_completed_steps || []
    if (existing.includes(stepId)) return school
    return this.updateSchoolBranding(slug, {
      onboarding_completed_steps: [...existing, stepId],
    })
  }

  public registerSchool(input: CreateTenantSchoolInput): PartnerSchoolTenant {
    // Sanitize and ensure unique slug
    let cleanSlug = input.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    if (!cleanSlug) {
      cleanSlug = input.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 30)
    }

    // Check collision
    let finalSlug = cleanSlug
    let counter = 1
    while (this.schools.some((s) => s.slug.toLowerCase() === finalSlug.toLowerCase())) {
      finalSlug = `${cleanSlug}-${counter}`
      counter++
    }

    // Explicitly un-tombstone if this slug was previously deleted
    this.deletedSchoolSlugs.delete(finalSlug.toLowerCase().trim())
    this.saveDeletedSchoolSlugs()

    const currentYear = new Date().getFullYear()

    // Generate academic calendar periods based on choice (Term, Semester, Trimester, Quarter)
    let calendar: AcademicCalendarPeriod[] = []
    let activePeriodName = `Term 1 (${currentYear})`

    if (input.academic_system === 'semester') {
      activePeriodName = `Semester 1 (${currentYear})`
      calendar = [
        {
          id: `cal_${Date.now()}_sem1`,
          name: `Semester 1 (Fall Cohort ${currentYear})`,
          code: 'SEM-1',
          start_date: `${currentYear}-09-01`,
          end_date: `${currentYear + 1}-01-20`,
          status: 'Active',
          exam_start_date: `${currentYear + 1}-01-08`,
          exam_end_date: `${currentYear + 1}-01-18`,
          fee_deadline: `${currentYear}-09-20`,
        },
        {
          id: `cal_${Date.now()}_sem2`,
          name: `Semester 2 (Spring Cohort ${currentYear + 1})`,
          code: 'SEM-2',
          start_date: `${currentYear + 1}-02-05`,
          end_date: `${currentYear + 1}-06-25`,
          status: 'Upcoming',
          exam_start_date: `${currentYear + 1}-06-12`,
          exam_end_date: `${currentYear + 1}-06-22`,
          fee_deadline: `${currentYear + 1}-02-25`,
        },
      ]
    } else if (input.academic_system === 'trimester') {
      activePeriodName = `Trimester 1 (${currentYear})`
      calendar = [
        {
          id: `cal_${Date.now()}_tri1`,
          name: `Trimester 1 (Jan–Apr ${currentYear})`,
          code: 'TRI-1',
          start_date: `${currentYear}-01-12`,
          end_date: `${currentYear}-04-18`,
          status: 'Active',
          exam_start_date: `${currentYear}-04-06`,
          exam_end_date: `${currentYear}-04-17`,
          fee_deadline: `${currentYear}-01-30`,
        },
        {
          id: `cal_${Date.now()}_tri2`,
          name: `Trimester 2 (May–Aug ${currentYear})`,
          code: 'TRI-2',
          start_date: `${currentYear}-05-11`,
          end_date: `${currentYear}-08-15`,
          status: 'Upcoming',
          exam_start_date: `${currentYear}-08-03`,
          exam_end_date: `${currentYear}-08-14`,
          fee_deadline: `${currentYear}-05-29`,
        },
        {
          id: `cal_${Date.now()}_tri3`,
          name: `Trimester 3 (Sep–Dec ${currentYear})`,
          code: 'TRI-3',
          start_date: `${currentYear}-09-07`,
          end_date: `${currentYear}-12-12`,
          status: 'Upcoming',
          exam_start_date: `${currentYear}-11-30`,
          exam_end_date: `${currentYear}-12-11`,
          fee_deadline: `${currentYear}-09-25`,
        },
      ]
    } else if (input.academic_system === 'quarter') {
      activePeriodName = `Quarter 1 (${currentYear})`
      calendar = [
        {
          id: `cal_${Date.now()}_q1`,
          name: `Quarter 1 (Q1 ${currentYear})`,
          code: 'QTR-1',
          start_date: `${currentYear}-01-05`,
          end_date: `${currentYear}-03-20`,
          status: 'Active',
          exam_start_date: `${currentYear}-03-12`,
          exam_end_date: `${currentYear}-03-19`,
          fee_deadline: `${currentYear}-01-20`,
        },
        {
          id: `cal_${Date.now()}_q2`,
          name: `Quarter 2 (Q2 ${currentYear})`,
          code: 'QTR-2',
          start_date: `${currentYear}-04-06`,
          end_date: `${currentYear}-06-19`,
          status: 'Upcoming',
          exam_start_date: `${currentYear}-06-10`,
          exam_end_date: `${currentYear}-06-18`,
          fee_deadline: `${currentYear}-04-20`,
        },
        {
          id: `cal_${Date.now()}_q3`,
          name: `Quarter 3 (Q3 ${currentYear})`,
          code: 'QTR-3',
          start_date: `${currentYear}-07-06`,
          end_date: `${currentYear}-09-18`,
          status: 'Upcoming',
          exam_start_date: `${currentYear}-09-10`,
          exam_end_date: `${currentYear}-09-17`,
          fee_deadline: `${currentYear}-07-20`,
        },
        {
          id: `cal_${Date.now()}_q4`,
          name: `Quarter 4 (Q4 ${currentYear})`,
          code: 'QTR-4',
          start_date: `${currentYear}-10-05`,
          end_date: `${currentYear}-12-18`,
          status: 'Upcoming',
          exam_start_date: `${currentYear}-12-09`,
          exam_end_date: `${currentYear}-12-17`,
          fee_deadline: `${currentYear}-10-20`,
        },
      ]
    } else {
      activePeriodName = `Term 1 (${currentYear})`
      calendar = [
        {
          id: `cal_${Date.now()}_term1`,
          name: `Term 1 (${currentYear})`,
          code: 'TERM-1',
          start_date: `${currentYear}-01-06`,
          end_date: `${currentYear}-04-03`,
          status: 'Active',
          exam_start_date: `${currentYear}-03-24`,
          exam_end_date: `${currentYear}-04-02`,
          fee_deadline: `${currentYear}-01-25`,
        },
        {
          id: `cal_${Date.now()}_term2`,
          name: `Term 2 (${currentYear})`,
          code: 'TERM-2',
          start_date: `${currentYear}-05-04`,
          end_date: `${currentYear}-08-07`,
          status: 'Upcoming',
          exam_start_date: `${currentYear}-07-28`,
          exam_end_date: `${currentYear}-08-06`,
          fee_deadline: `${currentYear}-05-20`,
        },
        {
          id: `cal_${Date.now()}_term3`,
          name: `Term 3 (${currentYear})`,
          code: 'TERM-3',
          start_date: `${currentYear}-08-31`,
          end_date: `${currentYear}-11-20`,
          status: 'Upcoming',
          exam_start_date: `${currentYear}-11-10`,
          exam_end_date: `${currentYear}-11-19`,
          fee_deadline: `${currentYear}-09-15`,
        },
      ]
    }

    const deptsList = input.departments_list && input.departments_list.length > 0
      ? input.departments_list
      : []
    const classesList = input.classes_list && input.classes_list.length > 0
      ? input.classes_list
      : []

    const adminUsername = (input.admin_username || `admin.${finalSlug}`).trim()
    const autoGenPass = `${(finalSlug || 'GC').slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, 'G')}@${Math.floor(1000 + Math.random() * 9000)}#${Math.random().toString(36).slice(2, 5).toUpperCase()}`
    const adminPassword = (input.admin_password || autoGenPass).trim()

    const defaultFeatures = {
      student_portal: true,
      teacher_portal: true,
      bursar_portal: true,
      principal_portal: true,
      online_admissions: true,
      biometric_attendance: true,
      report_cards: true,
      e_library: true,
    }

    const campusCount = Math.max(
      1,
      input.campus_count || (input.campuses_list ? input.campuses_list.length : 1)
    )
    const campusesList: InstitutionCampus[] =
      input.campuses_list && input.campuses_list.length > 0
        ? input.campuses_list
        : [{ id: `cmp_${Date.now()}_main`, name: 'Main Campus', is_main: true }]

    // Monthly subscription rate dynamically mapped to tier (silver, gold, platinum)
    const chosenTier = (input.subscription_tier as SubscriptionTierType) || 'silver'
    const tierRate = SUBSCRIPTION_TIER_RATES[chosenTier] || 2500
    const monthlyRate =
      input.subscription_monthly_rate ?? (campusCount * tierRate)

    const newSchool: PartnerSchoolTenant = {
      id: `sch_${Date.now()}`,
      name: input.name.trim(),
      slug: finalSlug,
      institution_category: input.institution_category || 'college',
      motto: input.motto?.trim() || '',
      logo_url: input.logo_url?.trim() || '',
      primary_color: input.primary_color || '#1e3a8a',
      accent_color: input.accent_color || '#d4af37',
      academic_system: input.academic_system,
      grading_scale: input.grading_scale || 'letter_gpa',
      academic_calendar: calendar,
      active_period_name: activePeriodName,
      curriculum_type: input.curriculum_type,
      registration_number: input.registration_number?.trim() || undefined,
      currency: input.currency?.trim() || 'KES',
      country: input.country.trim(),
      city: input.city.trim(),
      address: input.address?.trim() || `${input.city}, ${input.country}`,
      contact_email: input.contact_email.trim(),
      contact_phone: input.contact_phone.trim(),
      principal_name: input.principal_name.trim(),
      principal_title: input.principal_title?.trim() || 'Principal / Head of Institution',
      principal_email: input.principal_email?.trim() || input.contact_email.trim(),
      admin_username: adminUsername,
      admin_password: adminPassword,
      custom_domain: input.custom_domain?.trim() || undefined,
      subdomain: finalSlug,
      campus_count: campusCount,
      campuses_list: campusesList,
      subscription_tier: input.subscription_tier || 'silver',
      subscription_monthly_rate: monthlyRate,
      subscription_billing_cycle: input.subscription_billing_cycle || 'monthly',
      subscription_status: input.subscription_status || 'trial',
      active_license_key: input.active_license_key,
      license_valid_until: input.license_valid_until,
      departments_list: deptsList,
      classes_list: classesList,
      onboarding_completed_steps: ['identity', 'calendar', 'modules', 'branding'],
      stats: {
        students: 0,
        teachers: 1,
        classes: classesList.length,
        departments: deptsList.length,
      },
      features_enabled: {
        ...defaultFeatures,
        ...input.features_enabled,
      },
      created_at: new Date().toISOString(),
      is_verified: true,
    }

    this.schools.unshift(newSchool)
    this.seedStarterPrograms(finalSlug, input.institution_category || 'college', deptsList)

    // Provision the Principal / Provost Executive Account automatically so credentials work immediately
    const principalStaff = this.createStaffMember({
      school_slug: finalSlug,
      full_name: newSchool.principal_name,
      email: newSchool.principal_email,
      phone: newSchool.contact_phone,
      role: 'principal',
      title: newSchool.principal_title,
      department: deptsList[0] || 'Executive Administration',
      assigned_classes: classesList.slice(0, 2),
      assigned_subjects: [],
      username: adminUsername,
      temp_password: adminPassword,
      salary_base: 0,
      salary_housing: 0,
      salary_transport: 0,
      salary_tax: 0,
      salary_pension: 0,
    })

    // Also pre-authenticate the Principal session for this newly onboarded school
    this.setActiveSession(finalSlug, {
      id: principalStaff.id,
      school_slug: finalSlug,
      name: principalStaff.full_name,
      role: 'principal',
      username: principalStaff.username,
      title: principalStaff.title,
      department: principalStaff.department,
      staff_id: principalStaff.id,
    })

    this.saveSchools()
    return newSchool
  }

  public updateSchoolCustomDomain(
    slug: string,
    customDomain: string
  ): PartnerSchoolTenant | null {
    return this.updateSchoolBranding(slug, {
      custom_domain: customDomain.trim() || undefined,
    })
  }

  public updateSchoolBranding(
    slug: string,
    updates: Partial<PartnerSchoolTenant>
  ): PartnerSchoolTenant | null {
    const school = this.getSchoolBySlug(slug)
    if (!school) return null

    const updated: PartnerSchoolTenant = {
      ...school,
      ...updates,
      updated_at: new Date().toISOString(),
    }
    this.schools = this.schools.map((s) => (s.id === school.id ? updated : s))
    this.saveSchools()

    // If admin credentials or contact info changed, keep the principal staff roster in sync
    if (updates.admin_username || updates.admin_password || updates.principal_name || updates.principal_email || updates.principal_title) {
      if (this.staff.length === 0) this.loadStaff()
      const staffList = this.getStaffBySchool(slug)
      const principalStaff = staffList.find((s) => s.role === 'principal' || s.role === 'admin')
      if (principalStaff) {
        this.updateStaffMember(principalStaff.id, {
          ...(updates.admin_username ? { username: updates.admin_username } : {}),
          ...(updates.admin_password ? { temp_password: updates.admin_password } : {}),
          ...(updates.principal_name ? { full_name: updates.principal_name } : {}),
          ...(updates.principal_email ? { email: updates.principal_email } : {}),
          ...(updates.principal_title ? { title: updates.principal_title } : {}),
        })
      }
    }

    return updated
  }

  public updateSchoolStatus(
    slug: string,
    status: 'active' | 'trial' | 'past_due' | 'expired' | 'licensed' | 'suspended'
  ): PartnerSchoolTenant | null {
    const updated = this.updateSchoolBranding(slug, {
      subscription_status: status,
    })
    if (updated) {
      this.pushToCloud().catch(() => {})
    }
    return updated
  }

  public resetSchoolAdminPassword(slug: string, newPassword?: string): { success: boolean; newPassword: string; message: string } {
    const school = this.getSchoolBySlug(slug)
    if (!school) return { success: false, newPassword: '', message: 'School not found' }

    const generatedPassword = newPassword || `AdminPass${Math.floor(1000 + Math.random() * 9000)}!`
    this.updateSchoolBranding(slug, {
      admin_password: generatedPassword,
    })

    // Also update or provision the principal's staff member record if one exists
    if (this.staff.length === 0) this.loadStaff()
    const staffList = this.getStaffBySchool(slug)
    const principalStaff = staffList.find((s) => s.role === 'principal' || s.role === 'admin')
    if (principalStaff) {
      this.updateStaffMember(principalStaff.id, {
        temp_password: generatedPassword,
        username: school.admin_username || principalStaff.username || `${school.slug}.admin`,
      })
    } else {
      this.createStaffMember({
        school_slug: school.slug,
        full_name: school.principal_name || `${school.name} Administrator`,
        email: school.principal_email || school.contact_email || `${school.slug}@college.edu`,
        phone: school.contact_phone || '',
        role: 'principal',
        title: school.principal_title || 'Executive Principal / Provost',
        department: (school.departments_list && school.departments_list[0]) || 'Executive Administration',
        assigned_classes: [],
        assigned_subjects: [],
        username: school.admin_username || `${school.slug}.admin`,
        temp_password: generatedPassword,
        salary_base: 0,
        salary_housing: 0,
        salary_transport: 0,
        salary_tax: 0,
        salary_pension: 0,
      })
    }

    this.pushToCloud().catch(() => {})

    return {
      success: true,
      newPassword: generatedPassword,
      message: `New temporary password generated for ${school.name} Executive Admin.`,
    }
  }

  public updateSchoolSubscription(
    slug: string,
    tier: 'starter' | 'growth' | 'enterprise',
    monthlyRate: number,
    billingCycle: 'monthly' | 'annually'
  ): PartnerSchoolTenant | null {
    return this.updateSchoolBranding(slug, {
      subscription_tier: tier,
      subscription_monthly_rate: monthlyRate,
      subscription_billing_cycle: billingCycle,
    })
  }

  // ============================================================
  // ACADEMIC CALENDAR MANAGEMENT (DYNAMIC & EDITABLE)
  // ============================================================

  public addCalendarPeriod(
    slug: string,
    period: Omit<AcademicCalendarPeriod, 'id'>
  ): PartnerSchoolTenant | null {
    const school = this.getSchoolBySlug(slug)
    if (!school) return null

    const newPeriod: AcademicCalendarPeriod = {
      ...period,
      id: `cal_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
    }

    let updatedCalendar = [...(school.academic_calendar || []), newPeriod]
    let activePeriodName = school.active_period_name

    if (newPeriod.status === 'Active') {
      updatedCalendar = updatedCalendar.map((p) =>
        p.id === newPeriod.id ? p : p.status === 'Active' ? { ...p, status: 'Upcoming' as const } : p
      )
      activePeriodName = newPeriod.name
    }

    const updated = this.updateSchoolBranding(slug, {
      academic_calendar: updatedCalendar,
      active_period_name: activePeriodName,
    })

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gc-tenant-school-updated', { detail: { slug } }))
    }
    return updated
  }

  public updateCalendarPeriod(
    slug: string,
    periodId: string,
    updates: Partial<AcademicCalendarPeriod>
  ): PartnerSchoolTenant | null {
    const school = this.getSchoolBySlug(slug)
    if (!school) return null

    let activePeriodName = school.active_period_name
    const updatedCalendar = (school.academic_calendar || []).map((p) => {
      if (p.id === periodId) {
        const mod = { ...p, ...updates }
        if (mod.status === 'Active') {
          activePeriodName = mod.name
        }
        return mod
      }
      if (updates.status === 'Active' && p.status === 'Active') {
        return { ...p, status: 'Upcoming' as const }
      }
      return p
    })

    const updated = this.updateSchoolBranding(slug, {
      academic_calendar: updatedCalendar,
      active_period_name: activePeriodName,
    })

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gc-tenant-school-updated', { detail: { slug } }))
    }
    return updated
  }

  public deleteCalendarPeriod(slug: string, periodId: string): PartnerSchoolTenant | null {
    const school = this.getSchoolBySlug(slug)
    if (!school) return null

    const remaining = (school.academic_calendar || []).filter((p) => p.id !== periodId)
    let activePeriodName = school.active_period_name
    const stillHasActive = remaining.some((p) => p.status === 'Active')
    if (!stillHasActive && remaining.length > 0) {
      remaining[0].status = 'Active'
      activePeriodName = remaining[0].name
    }

    const updated = this.updateSchoolBranding(slug, {
      academic_calendar: remaining,
      active_period_name: activePeriodName,
    })

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gc-tenant-school-updated', { detail: { slug } }))
    }
    return updated
  }

  public setActiveCalendarPeriod(slug: string, periodId: string): PartnerSchoolTenant | null {
    const school = this.getSchoolBySlug(slug)
    if (!school) return null

    const target = (school.academic_calendar || []).find((p) => p.id === periodId)
    if (!target) return null

    const updatedCalendar = (school.academic_calendar || []).map((p) => ({
      ...p,
      status: (p.id === periodId ? 'Active' : p.status === 'Active' ? 'Upcoming' : p.status) as 'Active' | 'Upcoming' | 'Past',
    }))

    const updated = this.updateSchoolBranding(slug, {
      academic_calendar: updatedCalendar,
      active_period_name: target.name,
    })

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gc-tenant-school-updated', { detail: { slug } }))
    }
    return updated
  }

  public updateAcademicSystem(
    slug: string,
    system: AcademicCalendarSystem,
    populateDefaultPeriods = false,
    customYear?: number
  ): PartnerSchoolTenant | null {
    const school = this.getSchoolBySlug(slug)
    if (!school) return null

    const currentYear = customYear || new Date().getFullYear()
    let calendar = school.academic_calendar || []
    let activePeriodName = school.active_period_name

    if (populateDefaultPeriods || calendar.length === 0) {
      if (system === 'semester') {
        activePeriodName = `Semester 1 (${currentYear})`
        calendar = [
          {
            id: `cal_${Date.now()}_sem1`,
            name: `Semester 1 (${currentYear})`,
            code: 'SEM-1',
            start_date: `${currentYear}-01-12`,
            end_date: `${currentYear}-05-29`,
            status: 'Active',
            exam_start_date: `${currentYear}-05-18`,
            exam_end_date: `${currentYear}-05-28`,
            fee_deadline: `${currentYear}-01-31`,
          },
          {
            id: `cal_${Date.now()}_sem2`,
            name: `Semester 2 (${currentYear})`,
            code: 'SEM-2',
            start_date: `${currentYear}-08-17`,
            end_date: `${currentYear}-12-11`,
            status: 'Upcoming',
            exam_start_date: `${currentYear}-11-30`,
            exam_end_date: `${currentYear}-12-10`,
            fee_deadline: `${currentYear}-08-31`,
          },
        ]
      } else if (system === 'term') {
        activePeriodName = `Term 1 (${currentYear})`
        calendar = [
          {
            id: `cal_${Date.now()}_term1`,
            name: `Term 1 (${currentYear})`,
            code: 'TERM-1',
            start_date: `${currentYear}-01-06`,
            end_date: `${currentYear}-04-03`,
            status: 'Active',
            exam_start_date: `${currentYear}-03-24`,
            exam_end_date: `${currentYear}-04-02`,
            fee_deadline: `${currentYear}-01-25`,
          },
          {
            id: `cal_${Date.now()}_term2`,
            name: `Term 2 (${currentYear})`,
            code: 'TERM-2',
            start_date: `${currentYear}-05-04`,
            end_date: `${currentYear}-08-07`,
            status: 'Upcoming',
            exam_start_date: `${currentYear}-07-28`,
            exam_end_date: `${currentYear}-08-06`,
            fee_deadline: `${currentYear}-05-20`,
          },
          {
            id: `cal_${Date.now()}_term3`,
            name: `Term 3 (${currentYear})`,
            code: 'TERM-3',
            start_date: `${currentYear}-08-31`,
            end_date: `${currentYear}-11-20`,
            status: 'Upcoming',
            exam_start_date: `${currentYear}-11-10`,
            exam_end_date: `${currentYear}-11-19`,
            fee_deadline: `${currentYear}-09-15`,
          },
        ]
      } else if (system === 'trimester') {
        activePeriodName = `Trimester 1 (${currentYear})`
        calendar = [
          {
            id: `cal_${Date.now()}_trim1`,
            name: `Trimester 1 (${currentYear})`,
            code: 'TRIM-1',
            start_date: `${currentYear}-01-12`,
            end_date: `${currentYear}-04-24`,
            status: 'Active',
            exam_start_date: `${currentYear}-04-13`,
            exam_end_date: `${currentYear}-04-23`,
            fee_deadline: `${currentYear}-01-30`,
          },
          {
            id: `cal_${Date.now()}_trim2`,
            name: `Trimester 2 (${currentYear})`,
            code: 'TRIM-2',
            start_date: `${currentYear}-05-11`,
            end_date: `${currentYear}-08-21`,
            status: 'Upcoming',
            exam_start_date: `${currentYear}-08-10`,
            exam_end_date: `${currentYear}-08-20`,
            fee_deadline: `${currentYear}-05-30`,
          },
          {
            id: `cal_${Date.now()}_trim3`,
            name: `Trimester 3 (${currentYear})`,
            code: 'TRIM-3',
            start_date: `${currentYear}-09-07`,
            end_date: `${currentYear}-12-18`,
            status: 'Upcoming',
            exam_start_date: `${currentYear}-12-07`,
            exam_end_date: `${currentYear}-12-17`,
            fee_deadline: `${currentYear}-09-25`,
          },
        ]
      } else {
        activePeriodName = `Quarter 1 (${currentYear})`
        calendar = [
          {
            id: `cal_${Date.now()}_q1`,
            name: `Quarter 1 (${currentYear})`,
            code: 'Q1',
            start_date: `${currentYear}-01-05`,
            end_date: `${currentYear}-03-27`,
            status: 'Active',
            fee_deadline: `${currentYear}-01-20`,
          },
          {
            id: `cal_${Date.now()}_q2`,
            name: `Quarter 2 (${currentYear})`,
            code: 'Q2',
            start_date: `${currentYear}-04-06`,
            end_date: `${currentYear}-06-26`,
            status: 'Upcoming',
            fee_deadline: `${currentYear}-04-20`,
          },
          {
            id: `cal_${Date.now()}_q3`,
            name: `Quarter 3 (${currentYear})`,
            code: 'Q3',
            start_date: `${currentYear}-07-06`,
            end_date: `${currentYear}-09-25`,
            status: 'Upcoming',
            fee_deadline: `${currentYear}-07-20`,
          },
          {
            id: `cal_${Date.now()}_q4`,
            name: `Quarter 4 (${currentYear})`,
            code: 'Q4',
            start_date: `${currentYear}-10-05`,
            end_date: `${currentYear}-12-18`,
            status: 'Upcoming',
            fee_deadline: `${currentYear}-10-20`,
          },
        ]
      }
    }

    const updated = this.updateSchoolBranding(slug, {
      academic_system: system,
      academic_calendar: calendar,
      active_period_name: activePeriodName,
    })

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gc-tenant-school-updated', { detail: { slug } }))
    }
    return updated
  }

  // ============================================================
  // 1. STAFF MANAGEMENT & CREDENTIAL PROVISIONING
  // ============================================================
  private staff: TenantStaffMember[] = []

  private loadStaff() {
    if (typeof window === 'undefined') {
      this.staff = [...INITIAL_STAFF_MEMBERS]
      return
    }
    try {
      const stored = localStorage.getItem(STAFF_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.staff = parsed
          return
        }
      }
    } catch {
      // fallback
    }
    this.staff = [...INITIAL_STAFF_MEMBERS]
  }

  private saveStaff() {
    if (typeof window === 'undefined') return
    safeTenantStorePersist(STAFF_STORAGE_KEY, this.staff)
    this.triggerCloudPush()
  }

  public getAllStaff(): TenantStaffMember[] {
    if (this.staff.length === 0) this.loadStaff()
    return [...this.staff]
  }

  public getStaffBySchool(slug: string): TenantStaffMember[] {
    if (this.staff.length === 0) this.loadStaff()
    const clean = slug.toLowerCase()
    return this.staff.filter((s) => s.school_slug.toLowerCase() === clean)
  }

  public createStaffMember(
    input: Omit<TenantStaffMember, 'id' | 'joined_date' | 'net_salary' | 'status'>
  ): TenantStaffMember {
    if (this.staff.length === 0) this.loadStaff()
    const gross = (input.salary_base || 0) + (input.salary_housing || 0) + (input.salary_transport || 0)
    const deductions = (input.salary_tax || 0) + (input.salary_pension || 0)
    const net = Math.max(0, gross - deductions)

    const newStaff: TenantStaffMember = {
      ...input,
      id: `staff_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      net_salary: net,
      status: 'active',
      joined_date: new Date().toISOString().split('T')[0],
    }

    this.staff.unshift(newStaff)
    this.saveStaff()

    // Automatically add to active monthly payroll register
    if (this.payroll.length === 0) this.loadPayroll()
    const curMonth = 'October 2026'
    const newPayroll: TenantPayrollRecord = {
      id: `pr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      school_slug: newStaff.school_slug,
      month_period: curMonth,
      staff_id: newStaff.id,
      staff_name: newStaff.full_name,
      role: newStaff.role,
      department: newStaff.department,
      base_salary: input.salary_base || 3000,
      housing_allowance: input.salary_housing || 400,
      transport_allowance: input.salary_transport || 200,
      gross_salary: gross,
      tax_deduction: input.salary_tax || Math.round(gross * 0.18),
      pension_deduction: input.salary_pension || Math.round(gross * 0.06),
      net_salary: net,
      status: 'approved',
      payment_method: 'Bank Wire',
    }
    this.payroll.unshift(newPayroll)
    this.savePayroll()

    return newStaff
  }

  public deleteStaffMember(id: string): void {
    if (this.staff.length === 0) this.loadStaff()
    this.staff = this.staff.filter((s) => s.id !== id)
    this.saveStaff()
  }

  public updateStaffMember(
    id: string,
    updates: Partial<Omit<TenantStaffMember, 'id' | 'school_slug'>>
  ): TenantStaffMember | null {
    if (this.staff.length === 0) this.loadStaff()
    const idx = this.staff.findIndex((s) => s.id === id)
    if (idx === -1) return null
    const updated: TenantStaffMember = { ...this.staff[idx], ...updates }
    this.staff[idx] = updated
    this.saveStaff()
    return updated
  }

  // ============================================================
  // 2. STUDENT ADMISSION & CREDENTIAL PROVISIONING
  // ============================================================
  private students: TenantStudentMember[] = []

  private loadStudents() {
    if (typeof window === 'undefined') {
      this.students = [...INITIAL_STUDENTS]
      return
    }
    try {
      const stored = localStorage.getItem(STUDENTS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.students = parsed
          return
        }
      }
    } catch {
      // fallback
    }
    this.students = [...INITIAL_STUDENTS]
  }

  private saveStudents() {
    if (typeof window === 'undefined') return
    safeTenantStorePersist(STUDENTS_STORAGE_KEY, this.students)
    this.triggerCloudPush()
  }

  public getAllStudents(): TenantStudentMember[] {
    if (this.students.length === 0) this.loadStudents()
    return [...this.students]
  }

  public getStudentsBySchool(slug: string): TenantStudentMember[] {
    if (this.students.length === 0) this.loadStudents()
    const clean = slug.toLowerCase()
    return this.students.filter((s) => s.school_slug.toLowerCase() === clean)
  }

  public admitStudent(
    input: Omit<TenantStudentMember, 'id' | 'admission_date' | 'fee_balance' | 'attendance_percent' | 'status'>
  ): TenantStudentMember {
    if (this.students.length === 0) this.loadStudents()
    const feeBalance = Math.max(0, (input.fee_total || 0) - (input.fee_paid || 0))

    const newStudent: TenantStudentMember = {
      ...input,
      id: `std_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      fee_balance: feeBalance,
      attendance_percent: 100.0,
      status: 'active',
      admission_date: new Date().toISOString().split('T')[0],
    }

    this.students.unshift(newStudent)
    this.saveStudents()

    // Automatically record initial fee payment if any paid upon admission
    if (newStudent.fee_paid > 0) {
      this.recordFeePayment({
        school_slug: newStudent.school_slug,
        student_id: newStudent.id,
        student_name: newStudent.full_name,
        admission_number: newStudent.admission_number,
        amount: newStudent.fee_paid,
        period_name: 'Opening Term Registration & Tuition',
        payment_method: 'Bank Wire',
        recorded_by: 'Admissions Registrar',
      })
    }

    // Auto-seed default subjects in gradebook for new student so Report Card works immediately
    const defaultSubjects = [
      'Pure Mathematics (MATH-101)',
      'English & Communication (ENG-101)',
      'Computer Science (CS-101)',
      'Applied Physics (PHY-101)',
      'General Chemistry (CHEM-101)',
    ]
    defaultSubjects.forEach((subj) => {
      this.saveGradeRecord({
        school_slug: newStudent.school_slug,
        student_id: newStudent.id,
        student_name: newStudent.full_name,
        admission_number: newStudent.admission_number,
        class_name: newStudent.grade_class,
        subject_name: subj,
        period_code: 'TERM-1',
        cat1_score: 17,
        cat2_score: 18,
        exam_score: 52,
        remarks: 'Enrolled candidate; demonstrated high aptitude and steady academic diligence.',
        teacher_name: 'Subject Faculty Instructor',
      })
    })

    return newStudent
  }

  public updateStudent(id: string, updates: Partial<TenantStudentMember>): TenantStudentMember | null {
    if (this.students.length === 0) this.loadStudents()
    const student = this.students.find((s) => s.id === id)
    if (!student) return null

    const updated = { ...student, ...updates }
    if (typeof updates.fee_total === 'number' || typeof updates.fee_paid === 'number') {
      const total = typeof updates.fee_total === 'number' ? updates.fee_total : updated.fee_total
      const paid = typeof updates.fee_paid === 'number' ? updates.fee_paid : updated.fee_paid
      updated.fee_balance = Math.max(0, total - paid)
    }

    this.students = this.students.map((s) => (s.id === id ? updated : s))
    this.saveStudents()
    return updated
  }

  public resetStudentCredentials(id: string, newPassword?: string): { success: boolean; newPassword: string; message: string } {
    if (this.students.length === 0) this.loadStudents()
    const student = this.students.find((s) => s.id === id)
    if (!student) return { success: false, newPassword: '', message: 'Student not found' }

    const generatedPin = newPassword || `PIN-${Math.floor(1000 + Math.random() * 9000)}`
    this.updateStudent(id, {
      temp_password: generatedPin,
    })

    return {
      success: true,
      newPassword: generatedPin,
      message: `New login password generated for ${student.full_name}: ${generatedPin}`,
    }
  }

  public deleteStudent(id: string): void {
    if (this.students.length === 0) this.loadStudents()
    this.students = this.students.filter((s) => s.id !== id)
    this.saveStudents()
  }

  // ============================================================
  // 3. STAFF PAYROLL & COMPENSATION REGISTER
  // ============================================================
  private payroll: TenantPayrollRecord[] = []

  private loadPayroll() {
    if (typeof window === 'undefined') {
      this.payroll = [...INITIAL_PAYROLL_RECORDS]
      return
    }
    try {
      const stored = localStorage.getItem(PAYROLL_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.payroll = parsed
          return
        }
      }
    } catch {
      // fallback
    }
    this.payroll = [...INITIAL_PAYROLL_RECORDS]
  }

  private savePayroll() {
    if (typeof window === 'undefined') return
    safeTenantStorePersist(PAYROLL_STORAGE_KEY, this.payroll)
    this.triggerCloudPush()
  }

  public getPayrollBySchool(slug: string): TenantPayrollRecord[] {
    if (this.payroll.length === 0) this.loadPayroll()
    const clean = slug.toLowerCase()
    return this.payroll.filter((p) => p.school_slug.toLowerCase() === clean)
  }

  public generateMonthlyPayroll(slug: string, monthPeriod: string): TenantPayrollRecord[] {
    if (this.staff.length === 0) this.loadStaff()
    if (this.payroll.length === 0) this.loadPayroll()

    const schoolStaff = this.getStaffBySchool(slug)
    const existingForMonth = this.payroll.filter(
      (p) => p.school_slug.toLowerCase() === slug.toLowerCase() && p.month_period === monthPeriod
    )

    if (existingForMonth.length > 0) {
      return existingForMonth
    }

    const newRecords: TenantPayrollRecord[] = schoolStaff.map((st) => {
      const gross = st.salary_base + st.salary_housing + st.salary_transport
      return {
        id: `pr_${Date.now()}_${st.id}`,
        school_slug: slug,
        month_period: monthPeriod,
        staff_id: st.id,
        staff_name: st.full_name,
        role: st.title || st.role,
        department: st.department,
        base_salary: st.salary_base,
        housing_allowance: st.salary_housing,
        transport_allowance: st.salary_transport,
        gross_salary: gross,
        tax_deduction: st.salary_tax,
        pension_deduction: st.salary_pension,
        net_salary: st.net_salary,
        status: 'draft',
        payment_method: 'Bank Wire',
      }
    })

    this.payroll = [...newRecords, ...this.payroll]
    this.savePayroll()
    return newRecords
  }

  public approvePayrollBatch(slug: string, monthPeriod: string): void {
    if (this.payroll.length === 0) this.loadPayroll()
    this.payroll = this.payroll.map((p) => {
      if (p.school_slug.toLowerCase() === slug.toLowerCase() && p.month_period === monthPeriod) {
        return { ...p, status: 'approved' }
      }
      return p
    })
    this.savePayroll()
  }

  public disbursePayrollBatch(
    slug: string,
    monthPeriod: string,
    method: 'Bank Wire' | 'Mobile Money' | 'Cheque' = 'Bank Wire'
  ): void {
    if (this.payroll.length === 0) this.loadPayroll()
    const now = new Date().toISOString()
    this.payroll = this.payroll.map((p) => {
      if (p.school_slug.toLowerCase() === slug.toLowerCase() && p.month_period === monthPeriod) {
        return { ...p, status: 'disbursed', disbursed_at: now, payment_method: method }
      }
      return p
    })
    this.savePayroll()
  }

  public updatePayrollRecord(id: string, updates: Partial<TenantPayrollRecord>): TenantPayrollRecord | null {
    if (this.payroll.length === 0) this.loadPayroll()
    const record = this.payroll.find((p) => p.id === id)
    if (!record) return null
    const updated = { ...record, ...updates }
    this.payroll = this.payroll.map((p) => (p.id === id ? updated : p))
    this.savePayroll()
    return updated
  }

  // ============================================================
  // 4. CONTINUOUS ASSESSMENT GRADEBOOK & TRANSCRIPTS
  // ============================================================
  private grades: TenantGradeRecord[] = []

  private loadGrades() {
    if (typeof window === 'undefined') {
      this.grades = [...INITIAL_GRADES]
      return
    }
    try {
      const stored = localStorage.getItem(GRADES_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.grades = parsed
          return
        }
      }
    } catch {
      // fallback
    }
    this.grades = [...INITIAL_GRADES]
  }

  private saveGrades() {
    if (typeof window === 'undefined') return
    safeTenantStorePersist(GRADES_STORAGE_KEY, this.grades)
    this.triggerCloudPush()
    window.dispatchEvent(new CustomEvent('gc-tenant-grades-updated'))
  }

  public getGradesBySchool(slug: string): TenantGradeRecord[] {
    if (this.grades.length === 0) this.loadGrades()
    const clean = slug.toLowerCase()
    return this.grades.filter((g) => g.school_slug.toLowerCase() === clean)
  }

  public getGradesForStudent(slug: string, studentId: string): TenantGradeRecord[] {
    const schoolGrades = this.getGradesBySchool(slug)
    return schoolGrades.filter((g) => g.student_id === studentId)
  }

  public saveGradeRecord(
    input: Omit<TenantGradeRecord, 'id' | 'updated_at' | 'total_score' | 'grade'>
  ): TenantGradeRecord {
    if (this.grades.length === 0) this.loadGrades()
    const c1Max = input.cat1_max && input.cat1_max > 0 ? input.cat1_max : 20
    const c2Max = input.cat2_max && input.cat2_max > 0 ? input.cat2_max : 20
    const exMax = input.exam_max && input.exam_max > 0 ? input.exam_max : 60
    const possibleMax = c1Max + c2Max + exMax
    const rawTotal = (input.cat1_score || 0) + (input.cat2_score || 0) + (input.exam_score || 0)
    const total = possibleMax === 100
      ? Math.min(100, Math.max(0, Math.round(rawTotal)))
      : Math.min(100, Math.max(0, Math.round((rawTotal / possibleMax) * 100)))

    let gradeLetter = 'F'
    if (total >= 90) gradeLetter = 'A*'
    else if (total >= 80) gradeLetter = 'A'
    else if (total >= 70) gradeLetter = 'B'
    else if (total >= 60) gradeLetter = 'C'
    else if (total >= 50) gradeLetter = 'D'
    else if (total >= 40) gradeLetter = 'E'

    const existingIndex = this.grades.findIndex(
      (g) =>
        g.school_slug.toLowerCase() === input.school_slug.toLowerCase() &&
        g.student_id === input.student_id &&
        g.subject_name.toLowerCase() === input.subject_name.toLowerCase() &&
        g.period_code === input.period_code
    )

    const record: TenantGradeRecord = {
      ...input,
      cat1_max: c1Max,
      cat2_max: c2Max,
      exam_max: exMax,
      id: existingIndex >= 0 ? this.grades[existingIndex].id : `grd_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      total_score: total,
      grade: gradeLetter,
      updated_at: new Date().toISOString(),
    }

    if (existingIndex >= 0) {
      this.grades[existingIndex] = record
    } else {
      this.grades.unshift(record)
    }

    this.saveGrades()
    return record
  }

  public deleteGradeRecord(id: string): void {
    if (this.grades.length === 0) this.loadGrades()
    this.grades = this.grades.filter((g) => g.id !== id)
    this.saveGrades()
  }

  // ============================================================
  // 5. LESSON STUDY NOTES & MATERIALS
  // ============================================================
  private lessonNotes: TenantLessonNote[] = []

  private loadLessonNotes() {
    if (typeof window === 'undefined') {
      this.lessonNotes = [...INITIAL_LESSON_NOTES]
      return
    }
    try {
      const stored = localStorage.getItem(NOTES_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.lessonNotes = parsed
          return
        }
      }
    } catch {
      // fallback
    }
    this.lessonNotes = [...INITIAL_LESSON_NOTES]
  }

  private saveLessonNotes() {
    if (typeof window === 'undefined') return
    safeTenantStorePersist(NOTES_STORAGE_KEY, this.lessonNotes)
    this.triggerCloudPush()
    window.dispatchEvent(new CustomEvent('gc-tenant-notes-updated'))
  }

  public getLessonNotesBySchool(slug: string, className?: string): TenantLessonNote[] {
    if (this.lessonNotes.length === 0) this.loadLessonNotes()
    const clean = slug.toLowerCase()
    let filtered = this.lessonNotes.filter((n) => n.school_slug.toLowerCase() === clean)
    if (className && className !== 'all') {
      filtered = filtered.filter((n) => n.class_name.toLowerCase() === className.toLowerCase())
    }
    return filtered
  }

  public createLessonNote(input: Omit<TenantLessonNote, 'id' | 'created_at'>): TenantLessonNote {
    if (this.lessonNotes.length === 0) this.loadLessonNotes()
    const newNote: TenantLessonNote = {
      ...input,
      id: `note_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString(),
    }
    this.lessonNotes.unshift(newNote)
    this.saveLessonNotes()
    return newNote
  }

  public updateLessonNote(id: string, updates: Partial<TenantLessonNote>): void {
    if (this.lessonNotes.length === 0) this.loadLessonNotes()
    const idx = this.lessonNotes.findIndex((n) => n.id === id)
    if (idx >= 0) {
      this.lessonNotes[idx] = { ...this.lessonNotes[idx], ...updates }
      this.saveLessonNotes()
    }
  }

  public deleteLessonNote(id: string): void {
    if (this.lessonNotes.length === 0) this.loadLessonNotes()
    this.lessonNotes = this.lessonNotes.filter((n) => n.id !== id)
    this.saveLessonNotes()
  }

  // ============================================================
  // ATTENDANCE SESSIONS & DAILY ROLL-CALL
  // ============================================================
  private attendanceSessions: TenantAttendanceSession[] = []

  private loadAttendanceSessions() {
    if (typeof window === 'undefined') {
      this.attendanceSessions = []
      return
    }
    try {
      const stored = localStorage.getItem(ATTENDANCE_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          this.attendanceSessions = parsed
          return
        }
      }
    } catch {
      // fallback
    }
    this.attendanceSessions = []
  }

  private saveAttendanceSessions() {
    if (typeof window === 'undefined') return
    safeTenantStorePersist(ATTENDANCE_STORAGE_KEY, this.attendanceSessions)
    this.triggerCloudPush()
    window.dispatchEvent(new CustomEvent('gc-tenant-attendance-updated'))
  }

  public getAttendanceSessions(slug: string, className?: string, date?: string): TenantAttendanceSession[] {
    if (this.attendanceSessions.length === 0) this.loadAttendanceSessions()
    const clean = slug.toLowerCase()
    let filtered = this.attendanceSessions.filter((s) => s.school_slug.toLowerCase() === clean)
    if (className && className !== 'all') {
      filtered = filtered.filter((s) => s.class_name.toLowerCase() === className.toLowerCase())
    }
    if (date) {
      filtered = filtered.filter((s) => s.date === date)
    }
    return filtered
  }

  public saveAttendanceSession(
    input: Omit<TenantAttendanceSession, 'id' | 'created_at'>
  ): TenantAttendanceSession {
    if (this.attendanceSessions.length === 0) this.loadAttendanceSessions()

    const existingIndex = this.attendanceSessions.findIndex(
      (s) =>
        s.school_slug.toLowerCase() === input.school_slug.toLowerCase() &&
        s.class_name.toLowerCase() === input.class_name.toLowerCase() &&
        s.date === input.date &&
        (input.period_name ? s.period_name === input.period_name : true)
    )

    const session: TenantAttendanceSession = {
      ...input,
      id: existingIndex >= 0 ? this.attendanceSessions[existingIndex].id : `att_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString(),
    }

    if (existingIndex >= 0) {
      this.attendanceSessions[existingIndex] = session
    } else {
      this.attendanceSessions.unshift(session)
    }

    // Update individual student overall attendance_percent based on this session
    session.records.forEach((rec) => {
      const student = this.students.find((st) => st.id === rec.student_id)
      if (student) {
        let delta = 0
        if (rec.status === 'present') delta = 0.5
        else if (rec.status === 'late') delta = 0.1
        else if (rec.status === 'absent') delta = -1.0
        const newPercent = Math.min(100, Math.max(0, +(student.attendance_percent + delta).toFixed(1)))
        this.updateStudent(student.id, { attendance_percent: newPercent })
      }
    })

    this.saveAttendanceSessions()
    return session
  }

  public deleteAttendanceSession(id: string): void {
    if (this.attendanceSessions.length === 0) this.loadAttendanceSessions()
    this.attendanceSessions = this.attendanceSessions.filter((s) => s.id !== id)
    this.saveAttendanceSessions()
  }

  // ============================================================
  // 6. TUITION FEE INVOICES & VERIFIED RECEIPTING
  // ============================================================
  private payments: TenantFeePayment[] = []

  private loadPayments() {
    if (typeof window === 'undefined') {
      this.payments = [...INITIAL_PAYMENTS]
      return
    }
    try {
      const stored = localStorage.getItem(PAYMENTS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.payments = parsed
          return
        }
      }
    } catch {
      // fallback
    }
    this.payments = [...INITIAL_PAYMENTS]
  }

  private savePayments() {
    if (typeof window === 'undefined') return
    safeTenantStorePersist(PAYMENTS_STORAGE_KEY, this.payments)
    this.triggerCloudPush()
  }

  public getPaymentsBySchool(slug: string): TenantFeePayment[] {
    if (this.payments.length === 0) this.loadPayments()
    const clean = slug.toLowerCase()
    return this.payments.filter((p) => p.school_slug.toLowerCase() === clean)
  }

  public recordFeePayment(
    input: Omit<TenantFeePayment, 'id' | 'receipt_number' | 'date'>
  ): TenantFeePayment {
    if (this.payments.length === 0) this.loadPayments()
    const receiptNum = `RCP-${input.school_slug.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`
    const newPayment: TenantFeePayment = {
      ...input,
      id: `pmt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      receipt_number: receiptNum,
      date: new Date().toISOString(),
    }

    this.payments.unshift(newPayment)
    this.savePayments()

    // Also update student fee_paid and fee_balance
    const student = this.students.find((s) => s.id === input.student_id)
    if (student) {
      const newPaid = student.fee_paid + input.amount
      this.updateStudent(student.id, { fee_paid: newPaid })
    }

    return newPayment
  }

  // ============================================================
  // 7. CLASS & FACULTY TIMETABLE SCHEDULE
  // ============================================================
  private timetables: TenantTimetableEntry[] = []

  private loadTimetables() {
    if (typeof window === 'undefined') {
      this.timetables = [...INITIAL_TIMETABLES]
      return
    }
    try {
      const stored = localStorage.getItem(TIMETABLE_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.timetables = parsed
          return
        }
      }
    } catch {}
    this.timetables = [...INITIAL_TIMETABLES]
  }

  private saveTimetables() {
    if (typeof window === 'undefined') return
    safeTenantStorePersist(TIMETABLE_STORAGE_KEY, this.timetables)
    this.triggerCloudPush()
  }

  public getTimetableBySchool(slug: string, className?: string): TenantTimetableEntry[] {
    if (this.timetables.length === 0) this.loadTimetables()
    const clean = slug.toLowerCase()
    let list = this.timetables.filter((t) => t.school_slug.toLowerCase() === clean)
    if (className && className !== 'All') {
      list = list.filter((t) => t.class_name.toLowerCase() === className.toLowerCase())
    }
    return list
  }

  public updateTimetableEntry(
    id: string,
    updates: Partial<Omit<TenantTimetableEntry, 'id' | 'school_slug'>>
  ): TenantTimetableEntry | null {
    if (this.timetables.length === 0) this.loadTimetables()
    const idx = this.timetables.findIndex((t) => t.id === id)
    if (idx === -1) return null
    const updated: TenantTimetableEntry = { ...this.timetables[idx], ...updates }
    this.timetables[idx] = updated
    this.saveTimetables()
    return updated
  }

  public addTimetableEntry(entry: Omit<TenantTimetableEntry, 'id'>): TenantTimetableEntry {
    if (this.timetables.length === 0) this.loadTimetables()
    const newEntry: TenantTimetableEntry = {
      ...entry,
      id: `tt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    }
    this.timetables.push(newEntry)
    this.saveTimetables()
    return newEntry
  }

  public deleteTimetableEntry(id: string): void {
    if (this.timetables.length === 0) this.loadTimetables()
    this.timetables = this.timetables.filter((t) => t.id !== id)
    this.saveTimetables()
  }

  // ============================================================
  // 8. ACADEMIC PROGRAMS & COURSES OFFERED (LANDING PAGE DATA)
  // ============================================================
  private loadPrograms() {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(PROGRAMS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.programs = parsed
          return
        }
      }
    } catch {}
  }

  private savePrograms() {
    if (typeof window === 'undefined') return
    safeTenantStorePersist(PROGRAMS_STORAGE_KEY, this.programs)
    this.triggerCloudPush()
    window.dispatchEvent(new CustomEvent('gc-tenant-programs-updated', { detail: this.programs }))
  }

  public getProgramsBySchool(slug: string): InstitutionProgram[] {
    if (this.programs.length === 0) this.loadPrograms()
    const clean = slug.toLowerCase().trim()
    return this.programs.filter((p) => p.school_slug.toLowerCase() === clean)
  }

  public createProgram(
    input: Omit<InstitutionProgram, 'id' | 'created_at'>
  ): InstitutionProgram {
    if (this.programs.length === 0) this.loadPrograms()
    const newProg: InstitutionProgram = {
      ...input,
      id: `prog_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString(),
    }
    this.programs.unshift(newProg)
    this.savePrograms()
    return newProg
  }

  public updateProgram(
    id: string,
    updates: Partial<InstitutionProgram>
  ): InstitutionProgram | null {
    if (this.programs.length === 0) this.loadPrograms()
    const index = this.programs.findIndex((p) => p.id === id)
    if (index === -1) return null
    const updated = { ...this.programs[index], ...updates }
    this.programs[index] = updated
    this.savePrograms()
    return updated
  }

  public deleteProgram(id: string): void {
    if (this.programs.length === 0) this.loadPrograms()
    this.programs = this.programs.filter((p) => p.id !== id)
    this.savePrograms()
  }

  public seedStarterPrograms(_slug: string, _category: string, _depts: string[]): void {
    // Keep empty: ensure newly created schools have a 100% clean and unpopulated database
  }

  // ============================================================
  // 9. ACTIVE TENANT USER SESSION MANAGEMENT
  // ============================================================
  public getActiveSession(slug: string): TenantSessionUser | null {
    if (typeof window === 'undefined') return null
    try {
      const key = `${SESSION_STORAGE_KEY_PREFIX}${slug.toLowerCase()}`
      const stored = sessionStorage.getItem(key) || localStorage.getItem(key)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {}
    return null
  }

  public setActiveSession(slug: string, session: TenantSessionUser | null): void {
    if (typeof window === 'undefined') return
    const key = `${SESSION_STORAGE_KEY_PREFIX}${slug.toLowerCase()}`
    try {
      if (session) {
        sessionStorage.setItem(key, JSON.stringify(session))
        localStorage.setItem(key, JSON.stringify(session))
      } else {
        sessionStorage.removeItem(key)
        localStorage.removeItem(key)
      }
      window.dispatchEvent(new CustomEvent('gc-tenant-session-changed', { detail: { slug, session } }))
    } catch {}
  }

  // ============================================================
  // 10. CAMPUS NOTICEBOARD & SENATE ANNOUNCEMENTS (DYNAMIC & EDITABLE)
  // ============================================================
  private notices: TenantSchoolNotice[] = []

  private loadNotices() {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(NOTICES_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.notices = parsed
          return
        }
      }
    } catch {}
    this.notices = []
  }

  private saveNotices() {
    if (typeof window === 'undefined') return
    safeTenantStorePersist(NOTICES_STORAGE_KEY, this.notices)
    this.triggerCloudPush()
    window.dispatchEvent(new CustomEvent('gc-tenant-notices-updated', { detail: this.notices }))
  }

  public getNoticesBySchool(slug: string, _activePeriodLabel?: string): TenantSchoolNotice[] {
    if (this.notices.length === 0) this.loadNotices()
    const clean = slug.toLowerCase().trim()
    const schoolNotices = this.notices.filter((n) => n.school_slug.toLowerCase() === clean)

    if (schoolNotices.length > 0) {
      // Sort pinned notices first, then newest first
      return [...schoolNotices].sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1
        if (!a.is_pinned && b.is_pinned) return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    }

    return []
  }

  public addNotice(
    input: Omit<TenantSchoolNotice, 'id' | 'created_at'>
  ): TenantSchoolNotice {
    if (this.notices.length === 0) this.loadNotices()
    const newNotice: TenantSchoolNotice = {
      ...input,
      id: `not_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString(),
    }
    this.notices.unshift(newNotice)
    this.saveNotices()
    return newNotice
  }

  public updateNotice(
    id: string,
    updates: Partial<TenantSchoolNotice>
  ): TenantSchoolNotice | null {
    if (this.notices.length === 0) this.loadNotices()
    let index = this.notices.findIndex((n) => n.id === id)
    if (index === -1) {
      // If updating a virtual default notice, convert defaults to explicit stored notices first
      if (updates.school_slug) {
        const defaults = this.getNoticesBySchool(updates.school_slug)
        const targetDefault = defaults.find((n) => n.id === id)
        if (targetDefault) {
          defaults.forEach((d) => {
            if (!this.notices.some((existing) => existing.id === d.id)) {
              this.notices.push({ ...d })
            }
          })
          index = this.notices.findIndex((n) => n.id === id)
        }
      }
      if (index === -1) return null
    }
    const updated = { ...this.notices[index], ...updates }
    this.notices[index] = updated
    this.saveNotices()
    return updated
  }

  public deleteNotice(id: string, schoolSlug?: string): boolean {
    if (this.notices.length === 0) this.loadNotices()
    let index = this.notices.findIndex((n) => n.id === id)
    if (index === -1 && schoolSlug) {
      // Materialize default notices first so we can remove the selected one
      const defaults = this.getNoticesBySchool(schoolSlug)
      this.notices = defaults.filter((n) => n.id !== id)
      this.saveNotices()
      return true
    }
    const prevLen = this.notices.length
    this.notices = this.notices.filter((n) => n.id !== id)
    this.saveNotices()
    return this.notices.length < prevLen
  }

  public togglePinNotice(id: string, schoolSlug?: string): TenantSchoolNotice | null {
    if (this.notices.length === 0) this.loadNotices()
    let notice = this.notices.find((n) => n.id === id)
    if (!notice && schoolSlug) {
      const defaults = this.getNoticesBySchool(schoolSlug)
      defaults.forEach((d) => {
        if (!this.notices.some((existing) => existing.id === d.id)) {
          this.notices.push({ ...d })
        }
      })
      notice = this.notices.find((n) => n.id === id)
    }
    if (!notice) return null
    return this.updateNotice(id, { is_pinned: !notice.is_pinned })
  }

  // ============================================================
  // 10. ONLINE ADMISSION APPLICATIONS & PROSPECTIVE LEADS
  // ============================================================
  private applications: TenantAdmissionApplication[] = []

  private loadApplications() {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(APPLICATIONS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          this.applications = parsed
          return
        }
      }
    } catch {
      // fallback
    }
  }

  private saveApplications() {
    if (typeof window === 'undefined') return
    safeTenantStorePersist(APPLICATIONS_STORAGE_KEY, this.applications)
    this.triggerCloudPush()
    window.dispatchEvent(
      new CustomEvent('gc-tenant-applications-updated', { detail: this.applications })
    )
  }

  public getApplicationsBySchool(slug: string): TenantAdmissionApplication[] {
    if (this.applications.length === 0) this.loadApplications()
    return this.applications
      .filter((a) => a.school_slug.toLowerCase() === slug.toLowerCase())
      .sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime())
  }

  public submitAdmissionApplication(
    input: Omit<TenantAdmissionApplication, 'id' | 'application_number' | 'applied_at' | 'status'>
  ): TenantAdmissionApplication {
    if (this.applications.length === 0) this.loadApplications()
    const currentYear = new Date().getFullYear()
    const seq = Math.floor(1000 + Math.random() * 9000)
    const slugPrefix = (input.school_slug || 'SCH').substring(0, 4).toUpperCase()
    const applicationNumber = `APP-${slugPrefix}-${currentYear}-${seq}`

    const newApp: TenantAdmissionApplication = {
      ...input,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `app-${Date.now()}-${seq}`,
      application_number: applicationNumber,
      status: 'Pending Review',
      applied_at: new Date().toISOString(),
    }

    this.applications = [newApp, ...this.applications]
    this.saveApplications()
    return newApp
  }

  public updateApplicationStatus(
    id: string,
    status: ApplicationStatus,
    followUpNotes?: string
  ): TenantAdmissionApplication | null {
    if (this.applications.length === 0) this.loadApplications()
    const index = this.applications.findIndex((a) => a.id === id)
    if (index === -1) return null
    const updated: TenantAdmissionApplication = {
      ...this.applications[index],
      status,
      follow_up_notes: followUpNotes !== undefined ? followUpNotes : this.applications[index].follow_up_notes,
      reviewed_at: new Date().toISOString(),
    }
    this.applications[index] = updated
    this.saveApplications()
    return updated
  }

  public deleteApplication(id: string): boolean {
    if (this.applications.length === 0) this.loadApplications()
    const prevLen = this.applications.length
    this.applications = this.applications.filter((a) => a.id !== id)
    this.saveApplications()
    return this.applications.length < prevLen
  }
}



// ============================================================
// CLEAN BASELINE DATA STORE (ZERO SEEDED TEST DATA)
// ============================================================

const INITIAL_STAFF_MEMBERS: TenantStaffMember[] = []
const INITIAL_STUDENTS: TenantStudentMember[] = []
const INITIAL_PAYROLL_RECORDS: TenantPayrollRecord[] = []
const INITIAL_GRADES: TenantGradeRecord[] = []
const INITIAL_LESSON_NOTES: TenantLessonNote[] = []
const INITIAL_PAYMENTS: TenantFeePayment[] = []
const INITIAL_TIMETABLES: TenantTimetableEntry[] = []

export const tenantSchoolStore = new TenantSchoolStore()
