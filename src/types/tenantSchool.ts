// ============================================================
// Global College — Multi-Tenant Partner School Type Definitions
// ============================================================

export type AcademicCalendarSystem = 'term' | 'semester' | 'trimester' | 'quarter'

export interface AcademicCalendarPeriod {
  id: string
  name: string // e.g. "Term 1 (Winter/Spring)", "Semester 1 (Fall)"
  code: string // e.g. "T1-2026", "SEM-1"
  start_date: string
  end_date: string
  status: 'Active' | 'Upcoming' | 'Past'
  exam_start_date?: string
  exam_end_date?: string
  fee_deadline?: string
}

export type SchoolCurriculumType =
  | 'General Academic & Multi-Disciplinary'
  | 'National / CBC Curriculum'
  | 'Vocational & TVET College'
  | 'STEM & Technology Institute'
  | 'Business & Professional Academy'
  | 'International Academic Curriculum'
  | 'American Curriculum'
  | 'Custom International'

export type InstitutionCategory = 'school' | 'college' | 'university' | 'academy'

export type InstitutionGradingScale =
  | 'letter_gpa'
  | 'tvet_competency'
  | 'standard_percentage'
  | 'cbc_rubric'
  | 'knec_12point'

export interface InstitutionCampus {
  id: string
  name: string // e.g. "Main Campus", "Town Campus", "West Campus"
  code?: string // e.g. "MC-01", "TC-02"
  location?: string
  is_main?: boolean
}

export interface InstitutionProgram {
  id: string
  school_slug: string
  title: string
  code?: string // Course or program code e.g. "DIT-101", "BBIT-200"
  department: string
  level: 'Certificate' | 'Diploma' | 'Higher Diploma' | 'Degree' | 'Postgraduate' | 'Artisan / Short Course' | 'High School / Secondary'
  duration: string // e.g. "2 Years (6 Semesters)", "1 Year", "6 Months"
  tuition_fee: number // e.g. 35000
  fee_per_term?: number // alternative alias for tuition_fee
  fee_currency: string // e.g. "KES"
  intake_period: string // e.g. "January, May & September Intakes"
  requirements: string // e.g. "KCSE Mean Grade C- or Equivalent Certificate"
  description: string
  career_outcomes?: string[]
  featured?: boolean
  created_at: string
}

export interface PartnerSchoolTenant {
  id: string
  name: string // e.g. "Hillcrest British International College"
  slug: string // unique URL slug: "hillcrest" -> globalcollege.cloud/s/hillcrest
  institution_category?: InstitutionCategory
  registration_number?: string // Ministry / TVETA / CUE Accreditation No.
  currency?: string // e.g. "USD", "KES", "UGX", "TZS", "NGN", "GBP", "EUR"
  grading_scale?: InstitutionGradingScale
  departments_list?: string[]
  classes_list?: string[]
  subjects_list?: string[]
  campus_count?: number // number of campuses (each billed @ KES 2,500/month)
  campuses_list?: InstitutionCampus[]
  motto: string
  logo_url: string
  primary_color: string // hex code e.g. "#881337"
  accent_color: string  // hex code e.g. "#d4af37"
  academic_system: AcademicCalendarSystem // 'term' (Term 1,2,3) vs 'semester' (Semester 1,2)
  academic_calendar: AcademicCalendarPeriod[]
  active_period_name: string // e.g. "Term 1, 2026" or "Semester 2, 2025/2026"
  active_period_code?: string // e.g. "TERM-1" or "SEM-1"
  curriculum_type: SchoolCurriculumType | string
  country: string
  city: string
  address: string
  contact_email: string
  contact_phone: string
  website?: string
  custom_domain?: string // e.g. "portal.hillcrest.ac.ke" or "lms.apextech.ac.ke"
  subdomain?: string     // e.g. "hillcrest" -> "hillcrest.globalcollege.cloud"
  principal_name: string
  principal_title: string // e.g. "Principal", "Head of School", "Dean", "Director"
  principal_email: string
  about_us?: string // Institutional history & profile overview
  mission_statement?: string // Official institutional mission
  vision_statement?: string // Official institutional vision
  core_values?: string[] // Core institutional guiding values
  principal_welcome_message?: string // Executive welcome message for public page
  campus_facilities?: string[] // Notable campus facilities & infrastructure
  admin_username?: string
  admin_password?: string
  subscription_tier?: 'silver' | 'gold' | 'platinum' | 'starter' | 'growth' | 'enterprise'
  subscription_monthly_rate?: number // e.g. KES 2,500 (Silver) or KES 3,000 (Gold) per campus/month
  subscription_billing_cycle?: 'monthly' | 'annually'
  subscription_status?: 'active' | 'trial' | 'past_due' | 'expired' | 'licensed' | 'suspended'
  active_license_key?: string
  license_valid_until?: string
  stats: {
    students: number
    teachers: number
    classes: number
    departments: number
  }
  features_enabled: {
    student_portal: boolean
    teacher_portal: boolean
    bursar_portal: boolean
    principal_portal: boolean
    online_admissions: boolean
    biometric_attendance: boolean
    report_cards: boolean
    e_library: boolean
  }
  onboarding_completed_steps?: string[]
  created_at: string
  updated_at?: string
  is_verified: boolean
}

export type TenantRole = 'admin' | 'principal' | 'teacher' | 'bursar' | 'student' | 'public'

export interface CreateTenantSchoolInput {
  name: string
  slug: string
  institution_category?: InstitutionCategory
  registration_number?: string
  currency?: string
  grading_scale?: InstitutionGradingScale
  departments_list?: string[]
  classes_list?: string[]
  campus_count?: number
  campuses_list?: InstitutionCampus[]
  motto?: string
  logo_url?: string
  primary_color: string
  accent_color?: string
  academic_system: AcademicCalendarSystem
  curriculum_type: PartnerSchoolTenant['curriculum_type']
  country: string
  city: string
  address?: string
  contact_email: string
  contact_phone: string
  principal_name: string
  principal_title?: string
  principal_email?: string
  about_us?: string
  mission_statement?: string
  vision_statement?: string
  core_values?: string[]
  principal_welcome_message?: string
  campus_facilities?: string[]
  admin_username?: string
  admin_password?: string
  custom_domain?: string
  features_enabled?: Partial<PartnerSchoolTenant['features_enabled']>
  subscription_tier?: 'silver' | 'gold' | 'platinum' | 'starter' | 'growth' | 'enterprise'
  subscription_monthly_rate?: number
  subscription_billing_cycle?: 'monthly' | 'annually'
  subscription_status?: 'active' | 'trial' | 'past_due' | 'expired' | 'licensed'
  active_license_key?: string
  license_valid_until?: string
}

// ============================================================
// Real School Management (SIS / LMS) Domain Models
// ============================================================

export interface TenantStaffMember {
  id: string
  school_slug: string
  full_name: string
  role: 'teacher' | 'bursar' | 'admin' | 'principal'
  email: string
  username: string
  temp_password?: string
  phone: string
  department: string
  title: string
  assigned_classes: string[]
  assigned_subjects: string[]
  salary_base: number
  salary_housing: number
  salary_transport: number
  salary_tax: number
  salary_pension: number
  net_salary: number
  status: 'active' | 'suspended'
  joined_date: string
  created_at?: string
}

export interface TenantStudentMember {
  id: string
  school_slug: string
  admission_number: string // e.g. "HC-2026-0042"
  full_name: string
  grade_class: string     // Primary class/cohort e.g. "Diploma Year 1", "Form 3 Alpha"
  enrolled_classes?: string[] // Dynamic list of classes/cohorts student attends
  enrolled_programs?: string[] // Dynamic list of academic programs/courses student is taking
  enrolled_subjects?: string[] // Dynamic list of registered subjects/units/modules
  guardian_name: string
  guardian_phone: string
  guardian_email: string
  email?: string
  phone?: string
  username: string
  temp_password?: string
  fee_total: number
  fee_paid: number
  fee_balance: number
  attendance_percent: number
  campus?: string
  status: 'active' | 'graduated' | 'suspended'
  admission_date: string
  created_at?: string
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say' | string
  age?: number
  fee_due_date?: string
  fee_payment_plan?: 'termly' | 'monthly' | 'weekly' | 'custom'
  fee_installments_count?: number
  fee_installment_amount?: number
}

export interface TenantPayrollRecord {
  id: string
  school_slug: string
  month_period: string // e.g. "October 2026"
  staff_id: string
  staff_name: string
  role: string
  department: string
  base_salary: number
  housing_allowance: number
  transport_allowance: number
  gross_salary: number
  tax_deduction: number
  pension_deduction: number
  net_salary: number
  status: 'draft' | 'approved' | 'disbursed'
  disbursed_at?: string
  payment_method: 'Bank Wire' | 'Mobile Money' | 'Cheque'
}

export interface TenantGradeRecord {
  id: string
  school_slug: string
  student_id: string
  student_name: string
  admission_number: string
  class_name: string
  subject_name: string
  period_code: string // e.g. "TERM-1" or "SEM-1"
  cat1_score: number  // e.g. out of 15, 20, or custom
  cat2_score: number  // e.g. out of 15, 20, or custom
  exam_score: number  // e.g. out of 60, 70, or custom
  cat1_max?: number   // configurable max (default 20)
  cat2_max?: number   // configurable max (default 20)
  exam_max?: number   // configurable max (default 60)
  total_score: number // calculated normalized total out of 100%
  grade: string       // 'A*', 'A', 'B', 'C', 'D', 'E', 'F'
  remarks: string
  teacher_name: string
  updated_at: string
}

export interface TenantLessonNote {
  id: string
  school_slug: string
  class_name: string
  subject_name: string
  title: string
  summary: string
  content?: string
  file_url?: string
  material_type?: 'Lecture Notes' | 'Assignment' | 'Past Paper' | 'Lab Manual' | 'Syllabus'
  due_date?: string
  teacher_name: string
  created_at: string
}

export interface TenantAttendanceRecord {
  student_id: string
  student_name: string
  admission_number: string
  status: 'present' | 'absent' | 'late' | 'excused'
  note?: string
}

export interface TenantAttendanceSession {
  id: string
  school_slug: string
  class_name: string
  subject_name: string
  date: string
  period_name?: string
  teacher_name: string
  notes?: string
  records: TenantAttendanceRecord[]
  created_at: string
}

export interface TenantFeePayment {
  id: string
  school_slug: string
  receipt_number: string
  student_id: string
  student_name: string
  admission_number: string
  amount: number
  period_name: string
  payment_method: 'Bank Wire' | 'Mobile Money (M-Pesa)' | 'Credit Card' | 'Cash'
  date: string
  recorded_by: string
  issuer_name?: string
  issuer_role?: string
  installment_label?: string
  reference_code?: string
  bursar_notes?: string
  notes?: string
}

export interface TenantTimetableEntry {
  id: string
  school_slug: string
  class_name: string
  day_of_week: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'
  period_number: number
  start_time: string
  end_time: string
  subject_name: string
  teacher_name: string
  room: string
}

export interface TenantSessionUser {
  id: string
  school_slug: string
  name: string
  full_name?: string
  role: 'admin' | 'principal' | 'teacher' | 'bursar' | 'student' | 'public'
  username: string
  title?: string
  department?: string
  grade_class?: string
  admission_number?: string
  student_id?: string
  staff_id?: string
}

export interface TenantSchoolNotice {
  id: string
  school_slug: string
  title: string
  department: string // e.g. "Examination Registry", "Bursar's Treasury", "Academic Faculty", "Executive Office"
  content: string
  category: 'Examination' | 'Finance & Fees' | 'Academics' | 'General' | 'Events' | 'Urgent'
  accent_color?: string // e.g. "#d97706", "#16a34a", "#2563eb", "#dc2626"
  target_audience?: 'All' | 'Students' | 'Teachers' | 'Parents' | 'Public'
  is_pinned?: boolean
  created_at: string
  author_name?: string
  author_role?: string
}

export type ApplicationStatus =
  | 'Pending Review'
  | 'Contacted'
  | 'Interview Scheduled'
  | 'Admitted'
  | 'Rejected'

export interface TenantAdmissionApplication {
  id: string
  school_slug: string
  application_number: string // e.g. "APP-2026-1042"
  full_name: string
  email: string
  phone: string
  program_title: string
  level?: string
  intake?: string
  desired_intake?: string
  prior_qualifications?: string
  previous_qualification?: string
  guardian_name?: string
  guardian_phone?: string
  notes?: string
  status: ApplicationStatus
  applied_at: string
  created_at?: string
  follow_up_notes?: string
  reviewed_at?: string
}


