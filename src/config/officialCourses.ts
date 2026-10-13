// ============================================================
// Global College — Official Institutional Courses & Fee Registry
// Single authoritative source of truth across Landing, Catalog, 
// E-Reader, Fees Management, and SIMS Invoicing.
// ============================================================

export interface CourseProgram {
  id: string
  title: string
  shortTitle: string
  category: 'Tech & Programming' | 'Data Science & Research' | 'Computer & Digital Skills' | 'Business Tech & Accounting' | 'Languages & Communication' | 'Creative Arts & Design' | string
  tag: string
  tagColor: string
  duration: string
  durationWeeks: number
  schedule: string
  feeUsd: number
  feeKes: number
  feeDisplay: string
  originalFeeUsd: number
  discountBadge: string
  installmentText: string
  delivery_mode?: 'live_cohort' | 'self_paced'
  instructor: string
  schoolId?: string
  schoolName?: string
  departmentId: string
  departmentName: string
  yearLevel?: 'Tertiary' | 'All Years' | string
  examBoard?: 'Professional' | string
  syllabusCode?: string
  careerOutcome: string
  skills: string[]
  prerequisites?: string | string[]
  targetAudience?: string | string[]
  description?: string
  modules?: {
    week: string
    topic: string
    practicalLab: string
  }[]
  icon: string
  bestseller?: boolean
  popular?: boolean
  rating?: number
  ratingCount?: number
  studentsEnrolled?: number
  syllabus?: {
    week: string
    topic: string
    practicalLab: string
  }[]
}

export const OFFICIAL_COURSES: CourseProgram[] = []

export function calculateDynamicFeeFields(feeUsd: number, originalBaseUsd?: number, deliveryMode?: 'live_cohort' | 'self_paced') {
  const isVideoCourse = deliveryMode === 'self_paced'
  const fallbackUsd = isVideoCourse ? 19 : 45
  const safeUsd = Math.max(1, Number(feeUsd) || fallbackUsd)
  const feeKes = Math.round(safeUsd * 130)
  const feeDisplay = `$${safeUsd} / KES ${feeKes.toLocaleString()}`
  const originalFeeUsd = originalBaseUsd && originalBaseUsd > safeUsd ? originalBaseUsd : Math.round(safeUsd * 2)
  const discountBadge = '50% OFF'
  const installmentText = safeUsd <= 35
    ? `Single payment of $${safeUsd} (KES ${feeKes.toLocaleString()})`
    : `2 installments of $${Math.ceil(safeUsd / 2)} (KES ${Math.ceil(feeKes / 2).toLocaleString()})`
  return { feeUsd: safeUsd, feeKes, feeDisplay, originalFeeUsd, discountBadge, installmentText }
}

export function getDynamicCoursesList(
  storeSubjects: Array<{ id: string; code: string; name: string; fee?: number; duration?: string; description?: string; category?: string; icon?: string; badge?: string; careers?: string[]; color_hex?: string; department_id?: string; department_name?: string }> = [],
  storeUnits: Array<{ id: string; code: string; title: string; fee?: number; course_duration?: string; description?: string; department?: string; program?: string; teacher_name?: string; live_schedule_text?: string; syllabus_modules?: any[]; delivery_mode?: 'live_cohort' | 'self_paced' }> = [],
  customFees?: Record<string, number>
): CourseProgram[] {
  const activeCustomFees = customFees || (typeof window !== 'undefined' ? (() => {
    try {
      const stored = localStorage.getItem('gc_v2_school_custom_course_fees')
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })() : {})

  const safeStoreSubjects = (storeSubjects || []).filter(
    (s) =>
      s &&
      typeof s.id === 'string' &&
      !s.id.startsWith('aaaaaaaa-') &&
      !s.id.startsWith('__GC_') &&
      !s.name?.startsWith('__GC_') &&
      !s.name?.includes('SYNC') &&
      !s.description?.startsWith('{"key":') &&
      !s.description?.startsWith('{')
  )

  const safeStoreUnits = (storeUnits || []).filter(
    (u) =>
      u &&
      typeof u.id === 'string' &&
      !u.id.startsWith('aaaaaaaa-') &&
      !u.id.startsWith('__GC_') &&
      !u.title?.startsWith('__GC_') &&
      !u.title?.includes('SYNC') &&
      !u.description?.startsWith('{"key":') &&
      !u.description?.startsWith('{')
  )

  const programs: CourseProgram[] = []
  const usedSubjectIds = new Set<string>()
  const usedUnitIds = new Set<string>()

  let baseCourses: CourseProgram[] = OFFICIAL_COURSES
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('gc_v2_official_courses')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          baseCourses = parsed
        }
      }
    } catch {}
  }

  for (const base of baseCourses) {
    const matchedSub = safeStoreSubjects.find((s) => {
      if (s.id === base.id || s.id === `sub-${base.id.replace(/^c-/, '')}`) return true
      if (s.code && (s.code.toLowerCase() === base.id.toLowerCase() || s.code.toLowerCase() === base.shortTitle.toLowerCase())) return true
      const baseClean = base.shortTitle.toLowerCase().replace(/[^a-z0-9]/g, '')
      const subClean = s.name.toLowerCase().replace(/[^a-z0-9]/g, '')
      return baseClean.includes(subClean) || subClean.includes(baseClean)
    })
    if (matchedSub) usedSubjectIds.add(matchedSub.id)

    const matchedUnit = safeStoreUnits.find((u) => {
      if (u.id === base.id) return true
      if (u.code && (u.code.toLowerCase() === base.id.toLowerCase() || u.code.toLowerCase() === base.shortTitle.toLowerCase())) return true
      const baseClean = base.shortTitle.toLowerCase().replace(/[^a-z0-9]/g, '')
      const unitClean = u.title.toLowerCase().replace(/[^a-z0-9]/g, '')
      return baseClean.includes(unitClean) || unitClean.includes(baseClean)
    })
    if (matchedUnit) usedUnitIds.add(matchedUnit.id)

    const customOverrideFee = activeCustomFees?.[base.id] ?? (matchedSub?.id ? activeCustomFees?.[matchedSub.id] : undefined) ?? (matchedUnit?.id ? activeCustomFees?.[matchedUnit.id] : undefined)

    const deliveryMode: 'live_cohort' | 'self_paced' = 
      (matchedUnit as any)?.delivery_mode || 
      base.delivery_mode || 
      'live_cohort'

    const defaultDynamicBaseUsd = deliveryMode === 'self_paced' ? 19 : base.feeUsd

    const liveFeeUsd = (typeof customOverrideFee === 'number' && customOverrideFee >= 0)
      ? customOverrideFee
      : (typeof matchedSub?.fee === 'number' && matchedSub.fee > 0)
      ? matchedSub.fee
      : (typeof matchedUnit?.fee === 'number' && matchedUnit.fee > 0)
      ? matchedUnit.fee
      : defaultDynamicBaseUsd

    const feeCalculations = calculateDynamicFeeFields(liveFeeUsd, base.originalFeeUsd, deliveryMode)

    const cleanInstructorRole = base.instructor?.includes('•')
      ? base.instructor.split('•')[1].trim()
      : base.instructor || 'Global College Certified Faculty'

    programs.push({
      ...base,
      ...feeCalculations,
      instructor: cleanInstructorRole,
      delivery_mode: deliveryMode,
      title: matchedSub?.name || matchedUnit?.title || base.title,
      duration: matchedSub?.duration || matchedUnit?.course_duration || base.duration,
      careerOutcome: (matchedSub?.description && !matchedSub.description.startsWith('{')) ? matchedSub.description : base.careerOutcome,
      skills: matchedSub?.careers && matchedSub.careers.length > 0 ? matchedSub.careers : base.skills,
    })
  }

  // Append custom subjects created by admin
  for (const sub of safeStoreSubjects) {
    if (usedSubjectIds.has(sub.id)) continue
    const customOverrideFee = activeCustomFees?.[sub.id]
    const deliveryMode: 'live_cohort' | 'self_paced' = (sub as any).delivery_mode || 'live_cohort'
    const feeUsd = (typeof customOverrideFee === 'number' && customOverrideFee >= 0)
      ? customOverrideFee
      : typeof sub.fee === 'number' && sub.fee > 0 ? sub.fee : (deliveryMode === 'self_paced' ? 19 : 45)
    const feeCalculations = calculateDynamicFeeFields(feeUsd, undefined, deliveryMode)
    programs.push({
      id: sub.id,
      title: sub.name,
      shortTitle: sub.name,
      category: (sub.category as any) || 'Tech & Programming',
      tag: `${sub.department_name || 'Academic Program'}`,
      tagColor: sub.color_hex || '#0f172a',
      duration: sub.duration || '3 Months Certificate',
      durationWeeks: 12,
      schedule: 'All Shifts: Early Morning, Late Morning, Midday, Afternoon, Evening & Night',
      ...feeCalculations,
      delivery_mode: deliveryMode,
      instructor: 'Global College Certified Faculty',
      departmentId: sub.department_id || 'dept-general',
      departmentName: sub.department_name || 'Academic Faculty',
      schoolId: (sub as any).school_id,
      schoolName: (sub as any).school_name,
      yearLevel: (sub as any).year_level,
      examBoard: (sub as any).exam_board,
      syllabusCode: (sub as any).syllabus_code,
      careerOutcome: (sub.description && !sub.description.startsWith('{')) ? sub.description : `${sub.name} Certified Specialist`,
      skills: sub.careers || ['Live Virtual Classes', 'Verified E-Certificate'],
      icon: sub.icon || 'laptop',
      popular: true,
      rating: 5.0,
      ratingCount: 0,
      studentsEnrolled: 0,
      syllabus: [],
    })
  }

  // Append custom course units created by faculty
  for (const unit of safeStoreUnits) {
    if (usedUnitIds.has(unit.id)) continue
    const customOverrideFee = activeCustomFees?.[unit.id]
    const deliveryMode: 'live_cohort' | 'self_paced' = unit.delivery_mode || (unit.live_schedule_text ? 'live_cohort' : 'self_paced')
    const feeUsd = (typeof customOverrideFee === 'number' && customOverrideFee >= 0)
      ? customOverrideFee
      : typeof unit.fee === 'number' && unit.fee > 0 ? unit.fee : (deliveryMode === 'self_paced' ? 19 : 45)
    const feeCalculations = calculateDynamicFeeFields(feeUsd, undefined, deliveryMode)
    programs.push({
      id: unit.id,
      title: unit.title,
      shortTitle: unit.title,
      category: 'Tech & Programming',
      tag: `${unit.program || unit.department || 'Online Course'}`,
      tagColor: '#0f172a',
      duration: unit.course_duration || (deliveryMode === 'self_paced' ? 'Self-Paced (Lifetime Access)' : '8 Weeks Cohort'),
      durationWeeks: 8,
      schedule: unit.live_schedule_text || (deliveryMode === 'self_paced' ? 'Self-Paced • Instant Access' : 'All Shifts Available'),
      ...feeCalculations,
      delivery_mode: deliveryMode,
      instructor: unit.teacher_name || 'Global College Faculty Specialist',
      departmentId: 'dept-curriculum',
      departmentName: unit.department || 'Department of Technology',
      careerOutcome: (unit.description && !unit.description.startsWith('{')) ? unit.description : 'Certified Online Graduate',
      skills: unit.syllabus_modules?.flatMap((m) => m.topics) || ['Video Lectures & Code Alongs', 'Verified E-Certificate'],
      icon: 'palette',
      popular: true,
      rating: 5.0,
      ratingCount: 0,
      studentsEnrolled: 0,
      syllabus: unit.syllabus_modules?.map((m, idx) => ({
        week: `Week ${idx + 1}`,
        topic: m.title,
        practicalLab: m.learning_outcomes?.[0] || 'Live online hands-on exercises and project labs.',
      })) || [],
    })
  }

  return programs
}

export function getOfficialCourseById(id: string, storeSubjects?: any[], storeUnits?: any[]): CourseProgram | undefined {
  const list = storeSubjects || storeUnits ? getDynamicCoursesList(storeSubjects, storeUnits) : OFFICIAL_COURSES
  return list.find((c) => c.id === id || c.shortTitle.toLowerCase().includes(id.toLowerCase()))
}

export function getOfficialCourseByTitle(title: string, storeSubjects?: any[], storeUnits?: any[]): CourseProgram | undefined {
  const list = storeSubjects || storeUnits ? getDynamicCoursesList(storeSubjects, storeUnits) : OFFICIAL_COURSES
  return list.find((c) => c.title.toLowerCase() === title.toLowerCase() || title.toLowerCase().includes(c.shortTitle.toLowerCase()))
}
