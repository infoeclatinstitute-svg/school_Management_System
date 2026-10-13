import { supabase } from './supabase'

export interface CloudServicesConfig {
  showInPublicNavbar: boolean
  enablePublishCourse: boolean
  enableHireServices: boolean
  enableCareers: boolean
  enableDonations: boolean
  defaultTutorRevenueSplitPct: number
  defaultSchoolRevenueSplitPct: number
  publishCourseBadge: string
}

export interface TechServiceItem {
  id: string
  title: string
  category: string
  tagline: string
  badge: string
  iconKey: string
  color: string
  deliverables: string[]
  technologies: string[]
  bestFor: string
  timeline: string
  isActive?: boolean
}

export interface HireInquiryItem {
  id: string
  name: string
  company: string
  email: string
  phone: string
  serviceCategory: string
  budget: string
  timeline: string
  description: string
  submittedAt: string
  status: 'New Inquiry' | 'Quote Sent' | 'In Progress' | 'Completed' | 'Archived'
  adminNotes?: string
}

export interface JobPositionItem {
  id: string
  referenceCode: string
  title: string
  faculty: string
  department: string
  workType: '100% Remote / Online' | 'Flexible Schedule' | 'Part-Time or Full-Time'
  badge: string
  badgeColor: string
  iconKey: string
  summary: string
  responsibilities: string[]
  requirements: string[]
  compensation: string
  urgency: 'Immediate Intake' | 'Open Application' | 'Closed'
  isActive?: boolean
}

export interface CareerApplicationItem {
  id: string
  fullName: string
  email: string
  phone: string
  positionId: string
  positionTitle?: string
  country: string
  experienceYears: string
  highestQualification: string
  portfolioUrl: string
  teachingPhilosophy: string
  submittedAt: string
  status: 'Pending Review' | 'Shortlisted' | 'Interviewing' | 'Hired & Onboarded' | 'Declined'
}

export interface DonationLedgerItem {
  id?: string
  reference: string
  amount: number
  currency: 'USD' | 'KES'
  donorName: string
  donorEmail: string
  donorPhone: string
  track: string
  message: string
  timestamp: string
  allocatedStudentName?: string
  allocatedStudentAdmNo?: string
  status?: 'Verified' | 'Allocated to Student' | 'Pending'
}

export interface SponsorshipTierItem {
  amount: number
  label: string
  impact: string
}

export interface PublishedTutorCourseRecord {
  id: string
  providerType: 'individual_tutor' | 'partner_institution'
  tutorName: string
  institutionName?: string
  institutionLogo?: string
  institutionSignatory?: string
  deliveryMode: 'self_paced' | 'live_cohort'
  email: string
  phone: string
  courseTitle: string
  category: string
  courseDescription: string
  videoUrl: string
  suggestedPriceUsd: number
  payoutSplitPct: number
  payoutMethod: string
  payoutSchedule: string
  payoutDetails: string
  payoutCurrency: string
  submittedAt: string
  status: 'Approved & Live' | 'Pending Review' | 'Paused'
  downloadPath?: string
}

const DEFAULT_CONFIG: CloudServicesConfig = {
  showInPublicNavbar: false, // Managed inside Admin Portal by default
  enablePublishCourse: true,
  enableHireServices: true,
  enableCareers: true,
  enableDonations: true,
  defaultTutorRevenueSplitPct: 50,
  defaultSchoolRevenueSplitPct: 70,
  publishCourseBadge: '50% Share',
}

export const DEFAULT_TECH_SERVICES: TechServiceItem[] = []

export const DEFAULT_JOB_POSITIONS: JobPositionItem[] = []

export const DEFAULT_TIERS_USD: SponsorshipTierItem[] = []

export const DEFAULT_TIERS_KES: SponsorshipTierItem[] = []

const CLOUD_SYNC_KEY = 'gc_v2_cloud_services_state'

class CloudServicesStore {
  private listeners = new Set<() => void>()

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    this.listeners.forEach((fn) => fn())
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('gc-cloud-services-updated'))
    }
  }

  private readStorage<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return fallback
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  }

  private writeStorage<T>(key: string, value: T) {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {}
    this.notify()
    this.pushToCloud().catch(() => {})
  }

  // 1. Config & Navbar Visibility
  getConfig(): CloudServicesConfig {
    const saved = this.readStorage<Partial<CloudServicesConfig>>('gc_v2_cloud_services_config', {})
    return { ...DEFAULT_CONFIG, ...saved }
  }

  updateConfig(patch: Partial<CloudServicesConfig>) {
    const next = { ...this.getConfig(), ...patch }
    this.writeStorage('gc_v2_cloud_services_config', next)
    return next
  }

  // 2. Tech Services & Client Quote Inquiries
  getTechServices(): TechServiceItem[] {
    return this.readStorage<TechServiceItem[]>('gc_v2_tech_services', DEFAULT_TECH_SERVICES)
  }

  saveTechService(service: TechServiceItem) {
    const list = this.getTechServices()
    const idx = list.findIndex((s) => s.id === service.id)
    const next = idx >= 0 ? list.map((s, i) => (i === idx ? service : s)) : [service, ...list]
    this.writeStorage('gc_v2_tech_services', next)
  }

  deleteTechService(id: string) {
    const next = this.getTechServices().filter((s) => s.id !== id)
    this.writeStorage('gc_v2_tech_services', next)
  }

  getHireInquiries(): HireInquiryItem[] {
    const list = this.readStorage<HireInquiryItem[]>('gc_v2_hire_inquiries', [])
    return list.map((item, idx) => ({
      ...item,
      id: item.id || `inq-${idx}-${item.submittedAt || Date.now()}`,
      status: item.status || 'New Inquiry',
    }))
  }

  addHireInquiry(inquiry: Omit<HireInquiryItem, 'id' | 'submittedAt' | 'status'>) {
    const list = this.getHireInquiries()
    const newItem: HireInquiryItem = {
      ...inquiry,
      id: `inq-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      status: 'New Inquiry',
    }
    this.writeStorage('gc_v2_hire_inquiries', [newItem, ...list])
    return newItem
  }

  updateHireInquiryStatus(id: string, status: HireInquiryItem['status'], adminNotes?: string) {
    const next = this.getHireInquiries().map((item) =>
      item.id === id ? { ...item, status, ...(adminNotes !== undefined ? { adminNotes } : {}) } : item
    )
    this.writeStorage('gc_v2_hire_inquiries', next)
  }

  deleteHireInquiry(id: string) {
    const next = this.getHireInquiries().filter((item) => item.id !== id)
    this.writeStorage('gc_v2_hire_inquiries', next)
  }

  // 3. Careers & Faculty Recruitment
  getJobPositions(): JobPositionItem[] {
    return this.readStorage<JobPositionItem[]>('gc_v2_job_positions', DEFAULT_JOB_POSITIONS)
  }

  saveJobPosition(position: JobPositionItem) {
    const list = this.getJobPositions()
    const idx = list.findIndex((p) => p.id === position.id)
    const next = idx >= 0 ? list.map((p, i) => (i === idx ? position : p)) : [position, ...list]
    this.writeStorage('gc_v2_job_positions', next)
  }

  deleteJobPosition(id: string) {
    const next = this.getJobPositions().filter((p) => p.id !== id)
    this.writeStorage('gc_v2_job_positions', next)
  }

  getCareerApplications(): CareerApplicationItem[] {
    return this.readStorage<CareerApplicationItem[]>('gc_v2_career_applications', [])
  }

  addCareerApplication(app: Omit<CareerApplicationItem, 'id' | 'submittedAt' | 'status'>) {
    const list = this.getCareerApplications()
    const newItem: CareerApplicationItem = {
      ...app,
      id: `app-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      status: 'Pending Review',
    }
    this.writeStorage('gc_v2_career_applications', [newItem, ...list])
    return newItem
  }

  updateCareerApplicationStatus(id: string, status: CareerApplicationItem['status']) {
    const next = this.getCareerApplications().map((a) => (a.id === id ? { ...a, status } : a))
    this.writeStorage('gc_v2_career_applications', next)
  }

  deleteCareerApplication(id: string) {
    const next = this.getCareerApplications().filter((a) => a.id !== id)
    this.writeStorage('gc_v2_career_applications', next)
  }

  // 4. Tutor & Partner School Published Courses
  getPublishedTutorCourses(): PublishedTutorCourseRecord[] {
    return this.readStorage<PublishedTutorCourseRecord[]>('gc_v2_published_tutor_courses', [])
  }

  savePublishedTutorCourse(course: PublishedTutorCourseRecord) {
    const list = this.getPublishedTutorCourses()
    const idx = list.findIndex((c) => c.id === course.id)
    const next = idx >= 0 ? list.map((c, i) => (i === idx ? course : c)) : [course, ...list]
    this.writeStorage('gc_v2_published_tutor_courses', next)
  }

  deletePublishedTutorCourse(id: string) {
    const next = this.getPublishedTutorCourses().filter((c) => c.id !== id)
    this.writeStorage('gc_v2_published_tutor_courses', next)
  }

  // 5. Donations & Student Sponsorship Ledger
  getDonationsLedger(): DonationLedgerItem[] {
    const list = this.readStorage<DonationLedgerItem[]>('gc_v2_donations_ledger', [])
    return list.map((d, idx) => ({
      ...d,
      id: d.id || d.reference || `don-${idx}`,
      status: d.status || (d.allocatedStudentName ? 'Allocated to Student' : 'Verified'),
    }))
  }

  addDonationRecord(record: DonationLedgerItem) {
    const list = this.getDonationsLedger()
    const next = [{ ...record, id: record.id || record.reference || `don-${Date.now()}` }, ...list]
    this.writeStorage('gc_v2_donations_ledger', next)
  }

  allocateDonationToStudent(referenceOrId: string, studentName: string, studentAdmNo: string) {
    const next = this.getDonationsLedger().map((d) =>
      d.id === referenceOrId || d.reference === referenceOrId
        ? {
            ...d,
            allocatedStudentName: studentName,
            allocatedStudentAdmNo: studentAdmNo,
            status: 'Allocated to Student' as const,
          }
        : d
    )
    this.writeStorage('gc_v2_donations_ledger', next)
  }

  deleteDonationRecord(referenceOrId: string) {
    const next = this.getDonationsLedger().filter(
      (d) => d.id !== referenceOrId && d.reference !== referenceOrId
    )
    this.writeStorage('gc_v2_donations_ledger', next)
  }

  getSponsorshipTiers(currency: 'USD' | 'KES'): SponsorshipTierItem[] {
    const key = currency === 'USD' ? 'gc_v2_sponsorship_tiers_usd' : 'gc_v2_sponsorship_tiers_kes'
    const fallback = currency === 'USD' ? DEFAULT_TIERS_USD : DEFAULT_TIERS_KES
    return this.readStorage<SponsorshipTierItem[]>(key, fallback)
  }

  saveSponsorshipTiers(currency: 'USD' | 'KES', tiers: SponsorshipTierItem[]) {
    const key = currency === 'USD' ? 'gc_v2_sponsorship_tiers_usd' : 'gc_v2_sponsorship_tiers_kes'
    this.writeStorage(key, tiers)
  }

  // Cloud Sync
  async syncFromCloud() {
    try {
      const { data } = await supabase
        .from('app_cloud_sync')
        .select('data')
        .eq('key', CLOUD_SYNC_KEY)
        .maybeSingle()

      if (data?.data && typeof data.data === 'object') {
        const parsed = data.data as any
        if (typeof window !== 'undefined') {
          if (parsed.config) localStorage.setItem('gc_v2_cloud_services_config', JSON.stringify(parsed.config))
          if (parsed.techServices) localStorage.setItem('gc_v2_tech_services', JSON.stringify(parsed.techServices))
          if (parsed.hireInquiries) localStorage.setItem('gc_v2_hire_inquiries', JSON.stringify(parsed.hireInquiries))
          if (parsed.jobPositions) localStorage.setItem('gc_v2_job_positions', JSON.stringify(parsed.jobPositions))
          if (parsed.careerApplications) localStorage.setItem('gc_v2_career_applications', JSON.stringify(parsed.careerApplications))
          if (parsed.tutorCourses) localStorage.setItem('gc_v2_published_tutor_courses', JSON.stringify(parsed.tutorCourses))
          if (parsed.donationsLedger) localStorage.setItem('gc_v2_donations_ledger', JSON.stringify(parsed.donationsLedger))
          if (parsed.tiersUsd) localStorage.setItem('gc_v2_sponsorship_tiers_usd', JSON.stringify(parsed.tiersUsd))
          if (parsed.tiersKes) localStorage.setItem('gc_v2_sponsorship_tiers_kes', JSON.stringify(parsed.tiersKes))
        }
        this.notify()
      }
    } catch {}
  }

  async pushToCloud() {
    try {
      const payload = {
        config: this.getConfig(),
        techServices: this.getTechServices(),
        hireInquiries: this.getHireInquiries(),
        jobPositions: this.getJobPositions(),
        careerApplications: this.getCareerApplications(),
        tutorCourses: this.getPublishedTutorCourses(),
        donationsLedger: this.getDonationsLedger(),
        tiersUsd: this.getSponsorshipTiers('USD'),
        tiersKes: this.getSponsorshipTiers('KES'),
        updatedAt: new Date().toISOString(),
      }
      await supabase.from('app_cloud_sync').upsert(
        {
          key: CLOUD_SYNC_KEY,
          data: payload,
          updated_at: new Date().toISOString(),
          updated_by: 'Admin Portal',
        },
        { onConflict: 'key' }
      )
    } catch {}
  }
}

export const cloudServicesStore = new CloudServicesStore()
