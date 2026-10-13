// ============================================================
// Global College — Universal Dynamic Courses & Programs Store
// Real-time Cloud Synchronization (Supabase) + Offline LocalStorage Cache
// Single source of truth for Admin Console, Public Catalog, Landing, & SIMS
// ============================================================

import { supabase } from './supabase'
import { OFFICIAL_COURSES, type CourseProgram, calculateDynamicFeeFields } from '@/config/officialCourses'

const STORAGE_KEY = 'gc_v2_official_courses'

class CourseStore {
  private courses: CourseProgram[] = []
  private initialized = false
  private isSyncing = false

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') {
      this.courses = [...OFFICIAL_COURSES]
      this.initialized = true
      return
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          this.courses = parsed
          this.initialized = true
          return
        }
      }
    } catch {
      // Fallback
    }

    // Default to official initial seed data
    this.courses = [...OFFICIAL_COURSES]
    this.initialized = true
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.courses))
    } catch {}
  }

  public getCourses(): CourseProgram[] {
    if (!this.initialized) this.loadFromStorage()
    return [...this.courses]
  }

  public getCourseById(id: string): CourseProgram | undefined {
    return this.getCourses().find(
      (c) => c.id === id || c.shortTitle.toLowerCase() === id.toLowerCase()
    )
  }

  /**
   * Fetch live courses from Supabase cloud database
   */
  public async fetchCloudCourses(): Promise<CourseProgram[]> {
    if (this.isSyncing) return this.getCourses()
    this.isSyncing = true

    try {
      // 1. Primary: Load from universal app_cloud_sync state
      const { data: syncRow, error: syncErr } = await supabase
        .from('app_cloud_sync')
        .select('data')
        .eq('key', 'gc_v2_official_courses')
        .maybeSingle()

      if (!syncErr && syncRow?.data && Array.isArray(syncRow.data)) {
        this.courses = syncRow.data
        this.saveToStorage()
        window.dispatchEvent(new CustomEvent('gc-courses-updated', { detail: this.courses }))
        this.isSyncing = false
        return this.getCourses()
      }

      // 2. If app_cloud_sync is not yet seeded, seed it with initial official courses
      if (!syncRow?.data && this.courses.length > 0) {
        await this.pushToCloud(this.courses)
      }
    } catch {
      // Fallback to local storage
    } finally {
      this.isSyncing = false
    }

    return this.getCourses()
  }

  /**
   * Push courses list to Supabase cloud
   */
  public async pushToCloud(coursesList: CourseProgram[]): Promise<void> {
    try {
      // Save full courses JSON to app_cloud_sync
      await supabase.from('app_cloud_sync').upsert(
        {
          key: 'gc_v2_official_courses',
          data: coursesList,
          updated_at: new Date().toISOString(),
          updated_by: 'Admin Portal',
        },
        { onConflict: 'key' }
      )

      // Also ensure classes table reflects course updates
      const classesPayload = coursesList.map((c) => ({
        id: `class-${c.id}-2026`,
        name: c.title,
        grade_level: 'Cohort 2026',
        academic_year: '2026',
        hod_name: c.instructor,
        fee_amount: c.feeUsd,
        duration: c.duration,
        shifts: c.schedule,
        icon: c.icon,
      }))

      await supabase.from('classes').upsert(classesPayload, { onConflict: 'id' })
    } catch (err) {
      console.warn('Could not sync courses to Supabase cloud:', err)
    }
  }

  /**
   * Save / Update an existing course
   */
  public async saveCourse(updated: CourseProgram): Promise<void> {
    const feeCalcs = calculateDynamicFeeFields(updated.feeUsd, updated.originalFeeUsd)
    const normalized: CourseProgram = {
      ...updated,
      ...feeCalcs,
    }

    const list = this.getCourses()
    const idx = list.findIndex((c) => c.id === normalized.id)

    if (idx !== -1) {
      list[idx] = normalized
    } else {
      list.unshift(normalized)
    }

    this.courses = list
    this.saveToStorage()

    // Dispatch real-time local updates across all tabs & components
    window.dispatchEvent(new CustomEvent('gc-courses-updated', { detail: this.courses }))
    window.dispatchEvent(new Event('storage'))

    // Persist to Supabase
    await this.pushToCloud(this.courses)
  }

  /**
   * Add a new course
   */
  public async addCourse(newCourse: Partial<CourseProgram>): Promise<CourseProgram> {
    const feeUsd = Number(newCourse.feeUsd) || 60
    const feeCalcs = calculateDynamicFeeFields(feeUsd, newCourse.originalFeeUsd)
    const id = newCourse.id?.trim() || `course-${Date.now()}`

    const course: CourseProgram = {
      id,
      title: newCourse.title?.trim() || 'New Academic Program',
      shortTitle: newCourse.shortTitle?.trim() || newCourse.title?.trim() || 'New Course',
      category: newCourse.category || 'Tech & Programming',
      tag: newCourse.tag || 'Academic Program',
      tagColor: newCourse.tagColor || '#1e3a8a',
      duration: newCourse.duration || '8 Weeks (2 Months)',
      durationWeeks: newCourse.durationWeeks || 8,
      schedule:
        newCourse.schedule ||
        'All Shifts: Early Morning, Late Morning, Midday, Afternoon, Evening & Night',
      ...feeCalcs,
      instructor: newCourse.instructor || 'Global College Certified Faculty',
      departmentId: newCourse.departmentId || 'dept-general',
      departmentName: newCourse.departmentName || 'General Academic Studies',
      schoolId: newCourse.schoolId,
      schoolName: newCourse.schoolName,
      yearLevel: newCourse.yearLevel,
      examBoard: newCourse.examBoard,
      syllabusCode: newCourse.syllabusCode,
      careerOutcome:
        newCourse.careerOutcome || 'Certified Professional Competency in field.',
      skills: newCourse.skills || ['Live Interactive Virtual Classes', 'Verified E-Certificate'],
      prerequisites: newCourse.prerequisites || 'Basic interest and commitment to learn.',
      targetAudience: newCourse.targetAudience || 'Beginners, career switchers, and professionals.',
      description: newCourse.description || '',
      icon: newCourse.icon || 'book',
      bestseller: newCourse.bestseller || false,
      popular: newCourse.popular || false,
      rating: newCourse.rating ?? 5.0,
      ratingCount: newCourse.ratingCount ?? 0,
      studentsEnrolled: newCourse.studentsEnrolled ?? 0,
      syllabus: newCourse.syllabus || [
        {
          week: 'Module 1-2',
          topic: 'Foundations & Interactive Practice',
          practicalLab: 'Live virtual classroom lab and tools setup.',
        },
        {
          week: 'Module 3-4',
          topic: 'Capstone Lab & Evaluation',
          practicalLab: 'Online evaluation and certification project.',
        },
      ],
    }

    await this.saveCourse(course)
    return course
  }

  /**
   * Delete a course
   */
  public async deleteCourse(id: string): Promise<void> {
    this.courses = this.getCourses().filter((c) => c.id !== id)
    this.saveToStorage()

    window.dispatchEvent(new CustomEvent('gc-courses-updated', { detail: this.courses }))
    window.dispatchEvent(new Event('storage'))

    await this.pushToCloud(this.courses)
  }

  /**
   * Replace all courses (used for bulk restore or sync)
   */
  public setCourses(newCourses: CourseProgram[]): void {
    this.courses = [...newCourses]
    this.saveToStorage()
    window.dispatchEvent(new CustomEvent('gc-courses-updated', { detail: this.courses }))
  }
}

export const courseStore = new CourseStore()
