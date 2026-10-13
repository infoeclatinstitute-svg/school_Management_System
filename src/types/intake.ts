// ============================================================
// Global College — Intake Scheduler & Marketing Adverts Types
// ============================================================

export type IntakeStatus = 'Open' | 'Filling Fast' | 'Upcoming' | 'Closed' | 'Archived'

export type StudyMode =
  | '100% Online (Live & Recorded)'
  | 'All Shifts (Early Morning to Night)'
  | 'Early Morning Batch (6:00 AM - 8:00 AM)'
  | 'Late Morning Batch (9:00 AM - 11:30 AM)'
  | 'Midday Batch (11:30 AM - 1:30 PM)'
  | 'Afternoon Batch (2:00 PM - 4:30 PM)'
  | 'Evening Batch (5:30 PM - 7:30 PM)'
  | 'Night Batch (8:00 PM - 10:00 PM)'
  | 'Evening Classes (Live Interactive)'
  | 'Weekend Executive Cohort'
  | 'Self-Paced Masterclass & 1-on-1 Labs'
  | (string & {})

export interface IntakeSchedule {
  id: string
  title: string
  academic_year: string
  term_session: string
  headline: string
  description: string
  poster_image_url?: string
  promo_video_url?: string
  application_deadline: string
  orientation_date?: string
  commencement_date: string
  status: IntakeStatus
  target_courses: string[]
  early_bird_discount?: string
  installment_plan?: string
  study_modes: StudyMode[]
  contact_phone?: string
  contact_email?: string
  registration_fee?: string
  is_published: boolean
  featured?: boolean
  created_at: string
  updated_at?: string
}
