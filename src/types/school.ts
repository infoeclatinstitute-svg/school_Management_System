// ============================================================
// Global College School Management System — Extended Type Definitions
// ============================================================

export interface GuardianInfo {
  name: string
  relationship: 'Father' | 'Mother' | 'Guardian' | 'Sponsor' | 'Self' | 'Other'
  phone: string
  email: string
  occupation?: string
  address?: string
}

export interface StudentRecord {
  id: string
  admission_number: string
  full_name: string
  gender: 'Male' | 'Female' | 'Other' | 'Not Specified'
  dob: string
  class_id: string
  class_name: string
  grade_level: string // e.g. "Year 1", "Year 2", "Form 3", "Diploma Year 1"
  stream: string // e.g. "A", "B", "Alpha", "Blue"
  enrolled_courses?: string[]
  enrolled_classes?: string[]
  enrolled_programs?: string[]
  enrolled_subjects?: string[]
  enrollment_date: string
  admission_date?: string
  status: 'Active' | 'Suspended' | 'Alumni' | 'Transferred'
  photo_url?: string
  guardian: GuardianInfo
  parent_phone?: string
  emergency_contact: string
  blood_group?: string
  fee_balance: number
  term_fee_total: number
  fee_cleared: boolean
  attendance_rate: number // percentage
  discipline_points: number
  merits_count: number
  demerits_count: number
  biometric_enrolled?: boolean
  biometric_finger_name?: 'Right Index' | 'Right Thumb' | 'Left Index' | 'Left Thumb' | 'Right Middle' | 'Left Middle'
  biometric_template_hash?: string
  biometric_credential_id?: string
  biometric_device_type?: string
  biometric_public_key?: string
  biometric_enrolled_at?: string
  biometric_enrolled_by?: string
  certificate_granted?: boolean
  certificate_granted_at?: string
  certificate_number?: string
  certificate_grade?: string
  portal_password?: string
}

export interface TimetablePeriod {
  id: string
  period_number: number
  start_time: string
  end_time: string
  subject_id: string
  subject_name: string
  subject_code: string
  color_hex: string
  teacher_id: string
  teacher_name: string
  room: string
  day_of_week: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'
  class_id: string
  class_name: string
}

export interface ExamSession {
  id: string
  title: string // e.g. "Term 1 End-Term Examination 2026"
  academic_year: string
  term: 'Term 1' | 'Term 2' | 'Term 3'
  start_date: string
  end_date: string
  status: 'Upcoming' | 'Active' | 'Completed' | 'Published'
  is_published: boolean
}

export interface SubjectGrade {
  subject_id: string
  subject_name: string
  subject_code: string
  cat_score: number // Continuous Assessment (out of 30)
  exam_score: number // Main Exam (out of 70)
  total_score: number // (out of 100)
  grade: 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'E'
  points: number // 1 to 12 scale
  remarks: string
  teacher_name: string
}

export interface ReportCard {
  id: string
  student_id: string
  student_name: string
  admission_number: string
  class_name: string
  academic_year: string
  term: string
  exam_session_title: string
  subjects: SubjectGrade[]
  total_marks: number
  max_marks: number
  mean_percentage: number
  mean_grade: string
  overall_points: number
  class_position: number
  total_students_in_class: number
  stream_position: number
  attendance_present_days: number
  attendance_total_days: number
  class_teacher_remarks: string
  principal_remarks: string
  term_closing_date: string
  next_term_opening_date: string
  fee_balance_next_term: number
  issue_date: string
}

export interface FeeInvoiceItem {
  id: string
  description: string // e.g. "Tuition Fee", "Boarding Levy", "Lab & Practical Levy", "Activity Fee"
  amount: number
}

export interface FeeInvoice {
  id: string
  invoice_number: string
  student_id: string
  student_name: string
  admission_number: string
  class_name: string
  term: string
  academic_year: string
  issue_date: string
  due_date: string
  items: FeeInvoiceItem[]
  total_amount: number
  paid_amount: number
  balance: number
  status: 'Paid' | 'Partial' | 'Overdue' | 'Pending'
  is_updated?: boolean
  updated_at?: string
  updated_by?: string
  update_notes?: string
}

export interface FeePaymentReceipt {
  id: string
  receipt_number: string
  invoice_id?: string
  student_id: string
  student_name: string
  admission_number: string
  amount: number
  amount_paid?: number
  payment_method: 'Card' | 'Bank Transfer' | 'Paybill' | 'PayPal' | 'M-Pesa' | 'Cash Deposit'
  reference_code: string // e.g. "QWE8736421" or Bank slip #
  payment_reference?: string
  description?: string
  payment_date: string
  paid_by: string
  recorded_by: string
  received_by?: string
  balance_after: number
  balance_remaining?: number
  biometric_verified?: boolean
  biometric_finger_used?: string
  biometric_verification_code?: string
  biometric_verified_at?: string
  is_updated?: boolean
  updated_at?: string
  updated_by?: string
  update_notes?: string
}

export interface BiometricFeeClearancePass {
  id: string
  clearance_code: string // e.g. "GC-BIO-2026-98124"
  student_id: string
  student_name: string
  admission_number: string
  class_name: string
  fee_balance: number
  total_billed: number
  total_paid: number
  status: 'CLEARED' | 'CONDITIONAL' | 'OVERDUE'
  finger_scanned: string
  match_confidence: number // e.g. 99.4%
  verified_by: string
  verified_at: string
  purpose: 'Exam Entry' | 'Lab Clearance' | 'Certificate Collection' | 'Financial Audit' | 'Registration Clearance'
  security_hash: string
}

export interface AcademicResource {
  id: string
  title: string
  category: 'Past Papers' | 'Revision Notes' | 'Textbooks' | 'Syllabus' | 'Marking Schemes' | 'Lab Manuals' | 'Comic Books' | 'Graphic Novels & Manga' | string
  subject: string
  class_level: string // e.g. "All Forms", "Form 4 / Year 12", "Form 3"
  file_url: string
  file_size: string
  file_type: 'PDF' | 'DOCX' | 'PPTX' | 'EPUB' | 'COMIC' | 'IMAGE' | 'SHEET' | 'TEXT' | 'MEDIA' | string
  downloads_count: number
  year?: number
  uploaded_by: string
  created_at: string
  description?: string
  tags?: string[]
}

export interface DisciplineRecord {
  id: string
  student_id: string
  student_name: string
  admission_number: string
  class_name: string
  type: 'Merit' | 'Demerit' | 'Commendation' | 'Warning' | 'Suspension'
  points: number // Positive or negative
  incident_date: string
  title: string
  description: string
  recorded_by: string
  status: 'Logged' | 'Resolved' | 'Pending Meeting' | 'Closed'
  action_taken?: string
}

export interface SchoolNotice {
  id: string
  title: string
  category: 'General' | 'Academic' | 'Fees & Finance' | 'Events & Sports' | 'Urgent'
  target_audience: 'All' | 'Students' | 'Teachers' | 'Parents' | 'Board'
  content: string
  author_name: string
  author_role: string
  publish_date: string
  is_pinned: boolean
  attachments?: { name: string; size: string; url: string }[]
}

export interface PaymentReminder {
  id: string
  student_id: string
  student_name: string
  admission_number: string
  guardian_name?: string
  parent_name?: string
  guardian_phone?: string
  phone_number?: string
  amount_due?: number
  balance_due?: number
  channel: 'SMS' | 'Email' | 'Portal Notice'
  message_text?: string
  message?: string
  due_date?: string
  sent_by?: string
  sent_at: string
  status: 'Delivered' | 'Pending' | 'Failed'
}

export interface SecretaryInquiry {
  id: string
  visitor_name: string
  phone: string
  email?: string
  purpose: 'New Admission Inquiry' | 'Document Collection' | 'Fee Inquiry' | 'General Appointment'
  program_of_interest?: string
  notes: string
  recorded_by?: string
  date?: string
  created_at?: string
  status: 'Open' | 'Resolved' | 'Follow-up Scheduled'
}

export interface SyllabusModule {
  id: string
  module_number: number
  title: string
  topics: string[]
  learning_outcomes: string[]
  hours: number
  resources?: {
    id: string
    file_name: string
    file_url: string
    file_type?: string
  }[]
}

export interface CourseUnit {
  id: string
  code: string // e.g. "CS 201"
  title: string // e.g. "Advanced Web & React Development"
  department: string // e.g. "Computer Science & ICT"
  program: string // e.g. "Certificate in Web & Cloud Systems"
  course_duration: string // e.g. "3 Months (Intensive)", "2 Months (Fast-Track)", "6 Months Modular"
  semester?: string // Fallback
  credit_hours: number // e.g. 40 Training Hours
  teacher_id: string
  teacher_name: string
  description: string
  fee?: number // USD tuition fee e.g. 60
  course_fee?: number // KES / USD tuition fee e.g. 15000
  live_meeting_url?: string // e.g. "https://meet.google.com/abc-defg-hij" or Zoom link
  live_schedule_text?: string // e.g. "Mon & Wed 7:30 PM - 9:30 PM EAT"
  resources?: {
    id: string
    file_name: string
    file_url: string
    file_type?: string
  }[]
  syllabus_modules: SyllabusModule[]
  lessons: {
    id: string
    title: string
    video_url?: string
    duration_minutes: number
    content?: string
    notes_file?: string
    meeting_url?: string
    resources?: {
      id: string
      file_name: string
      file_url: string
      file_type?: string
    }[]
  }[]
  is_published: boolean
  created_at: string
  // Multi-tenant institution & individual tutor fields
  provider_type?: 'individual_tutor' | 'partner_institution'
  institution_name?: string
  institution_logo?: string
  institution_signatory?: string
  delivery_mode?: 'live_cohort' | 'self_paced'
  revenue_split_pct?: number
}

export interface UnitRegistrationReceipt {
  id: string
  receipt_number: string // e.g. "UNIT-REG-2026-0042"
  student_id: string
  student_name: string
  admission_number: string
  program?: string
  course_name?: string
  academic_year?: string
  course_duration: string // e.g. "3 Months (Intensive Short Course)"
  semester?: string
  unit_id?: string
  unit_title?: string
  fee_amount?: number
  balance_remaining?: number
  registered_unit_ids: string[]
  registered_units: {
    code: string
    title?: string
    name?: string
    credit_hours?: number
    credits?: number
    teacher_name?: string
    lecturer?: string
  }[]
  total_credits: number
  fee_clearance_status: 'Cleared' | 'Conditional Approval' | 'Pending' | string
  registered_by?: string
  verified_by?: string
  registered_at?: string
  timestamp?: string
  qr_code_data?: string
  exam_card_issued?: boolean
}

export interface InstitutionalSchool {
  id: string
  code: string
  name: string
  shortName: string
  category: string
  description: string
  icon: string
  color: string
  dean_name: string
  dean_email: string
  departments: {
    id: string
    name: string
    code: string
    description?: string
    hod_name?: string
    programs: string[]
  }[]
}

export interface CollegeDepartment {
  id: string
  code: string // e.g. "ICT", "BUS", "ENG"
  name: string // e.g. "Department of Computer Science & ICT"
  school_id?: string
  school_name?: string
  description?: string
  hod_name: string // e.g. "Mr. James Mwangi"
  hod_email?: string
  programs: string[] // e.g. ["Diploma in Computer Science & ICT", "Certificate in Web Systems"]
  year_levels?: string[]
  created_at: string
}

export interface CollegeSubject {
  id: string
  code: string // e.g. "COMP-101", "BAR-101", "ENG-101"
  name: string // e.g. "Computer Packages & Digital Literacy"
  description?: string
  department_id: string
  department_name: string
  school_id?: string
  school_name?: string
  year_level?: 'Tertiary' | string
  fee?: number // e.g. 4500 (Reduced, admin-editable)
  duration?: string // e.g. "8 Weeks (2 Months)"
  icon?: string // e.g. "💻", "☕"
  badge?: string // e.g. "Popular", "Fast-Track"
  category?: string // e.g. "ICT", "Hospitality", "Languages"
  careers?: string[]
  color_hex: string
  created_at: string
}

export interface FacultyTeacher {
  id: string
  staff_id?: string
  name: string
  title: string
  email: string
  department: string
  specialty: string
  portal_password?: string
  class_ids?: string[]
  created_at: string
}

export interface DeviceSession {
  user_id: string
  session_token: string
  device_name: string
  ip_address?: string
  last_active_at: string
  created_at: string
}
