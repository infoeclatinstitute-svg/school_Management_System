-- ====================================================================================
-- GLOBAL COLLEGE — ENTERPRISE SCHOOL MANAGEMENT SYSTEM (SIMS & LMS) DATABASE SCHEMA
-- PostgreSQL / Supabase Production Schema (Idempotent Migration)
-- ====================================================================================

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================================
-- 1. PROFILES & USERS (RBAC: admin, teacher, student, parent, bursar)
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  admission_number TEXT UNIQUE,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'teacher', 'student', 'parent', 'bursar')),
  first_login_at TIMESTAMPTZ,
  access_expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_admission_number ON public.profiles (LOWER(admission_number));
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- ====================================================================================
-- 2. INSTITUTIONAL SCHOOLS & DEPARTMENTS
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  hod_name TEXT NOT NULL,
  hod_email TEXT NOT NULL,
  programs JSONB NOT NULL DEFAULT '[]'::jsonb,
  school_id TEXT NOT NULL DEFAULT 'school-software',
  school_name TEXT NOT NULL DEFAULT 'School of Computing & Software Engineering',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================================
-- 3. SUBJECTS & ACADEMIC DISCIPLINES
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  department_id TEXT REFERENCES public.departments(id) ON DELETE SET NULL,
  department_name TEXT,
  school_id TEXT,
  school_name TEXT,
  year_level TEXT DEFAULT 'Tertiary',
  description TEXT,
  fee NUMERIC(10, 2) NOT NULL DEFAULT 60.00 CHECK (fee >= 0),
  duration TEXT DEFAULT '8 Weeks (2 Months)',
  icon TEXT DEFAULT '📘',
  badge TEXT,
  category TEXT,
  careers JSONB DEFAULT '[]'::jsonb,
  color_hex TEXT NOT NULL DEFAULT '#1e3a8a',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subjects_code ON public.subjects (LOWER(code));
CREATE INDEX IF NOT EXISTS idx_subjects_department ON public.subjects (department_id);

-- ====================================================================================
-- 4. ACADEMIC TERMS & CLASS COHORTS
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.school_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  half_term_start DATE,
  half_term_end DATE,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade_level TEXT DEFAULT 'Cohort 2026',
  academic_year TEXT DEFAULT '2026',
  hod_name TEXT,
  fee_amount NUMERIC(10, 2) DEFAULT 60.00,
  duration TEXT,
  shifts TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================================
-- 5. STUDENTS DIRECTORY & ADMISSIONS RECORDS
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  admission_number TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'Not Specified',
  dob TEXT,
  class_id TEXT NOT NULL DEFAULT 'class-main',
  class_name TEXT NOT NULL DEFAULT 'Vocational Training Program',
  grade_level TEXT DEFAULT 'Online Certificate',
  stream TEXT DEFAULT 'Virtual Campus',
  enrollment_date TEXT NOT NULL,
  admission_date TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Graduated', 'Transferred', 'Suspended')),
  guardian JSONB NOT NULL DEFAULT '{"name": "", "relationship": "Guardian", "phone": "", "email": ""}'::jsonb,
  emergency_contact TEXT,
  fee_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (fee_balance >= 0),
  term_fee_total NUMERIC(10, 2) NOT NULL DEFAULT 60.00 CHECK (term_fee_total >= 0),
  fee_cleared BOOLEAN NOT NULL DEFAULT FALSE,
  attendance_rate NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
  discipline_points INTEGER NOT NULL DEFAULT 100,
  merits_count INTEGER NOT NULL DEFAULT 0,
  demerits_count INTEGER NOT NULL DEFAULT 0,
  enrolled_courses JSONB DEFAULT '[]'::jsonb,
  certificate_granted BOOLEAN DEFAULT FALSE,
  certificate_granted_at TIMESTAMPTZ,
  certificate_number TEXT,
  certificate_grade TEXT,
  biometric_enrolled BOOLEAN DEFAULT FALSE,
  biometric_finger_name TEXT,
  biometric_template_hash TEXT,
  biometric_credential_id TEXT,
  biometric_device_type TEXT,
  biometric_public_key TEXT,
  biometric_enrolled_at TIMESTAMPTZ,
  biometric_enrolled_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_admission_number ON public.students (LOWER(admission_number));
CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students (class_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students (status);

-- ====================================================================================
-- 6. FACULTY TEACHERS & STAFF REGISTER
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.faculty_teachers (
  id TEXT PRIMARY KEY,
  staff_id TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  department TEXT NOT NULL,
  designation TEXT NOT NULL DEFAULT 'Faculty Lecturer',
  specialization TEXT,
  qualification TEXT,
  assigned_course_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  assigned_course_names JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'On Leave', 'Inactive')),
  joined_date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================================
-- 7. COURSES, COURSE UNITS & LMS LESSONS
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.course_units (
  id TEXT PRIMARY KEY,
  unit_code TEXT NOT NULL,
  title TEXT NOT NULL,
  department_id TEXT REFERENCES public.departments(id) ON DELETE SET NULL,
  department TEXT,
  program TEXT,
  level TEXT DEFAULT '3 Months Certificate',
  credit_hours INTEGER NOT NULL DEFAULT 40,
  instructor_name TEXT DEFAULT 'Faculty Instructor',
  fee NUMERIC(10, 2) NOT NULL DEFAULT 60.00,
  is_core BOOLEAN NOT NULL DEFAULT TRUE,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  live_meeting_url TEXT,
  live_schedule_text TEXT,
  syllabus_modules JSONB DEFAULT '[]'::jsonb,
  lessons JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject_id TEXT,
  teacher_id TEXT,
  class_id TEXT,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  youtube_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edit_locked_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons (course_id, order_index);

-- ====================================================================================
-- 8. FORMAL UNIT REGISTRATIONS & EXAM CARDS
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.unit_registrations (
  id TEXT PRIMARY KEY,
  receipt_number TEXT NOT NULL UNIQUE,
  student_id TEXT NOT NULL,
  admission_number TEXT NOT NULL,
  student_name TEXT NOT NULL,
  program TEXT,
  academic_year TEXT DEFAULT '2026',
  semester TEXT DEFAULT 'Term 1 / Cohort 2026',
  registered_unit_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  registered_units JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_credits INTEGER NOT NULL DEFAULT 0,
  fee_clearance_status TEXT NOT NULL DEFAULT 'Cleared' CHECK (fee_clearance_status IN ('Cleared', 'Provisional', 'Pending')),
  exam_card_issued BOOLEAN NOT NULL DEFAULT TRUE,
  verified_by TEXT DEFAULT 'Academic Registrar',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unit_registrations_student ON public.unit_registrations (LOWER(admission_number));

-- ====================================================================================
-- 9. MASTER CLASS TIMETABLE & LIVE LECTURE SCHEDULE
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.timetable_periods (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  class_name TEXT NOT NULL,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
  period_number INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  subject_id TEXT,
  subject_name TEXT NOT NULL,
  subject_color TEXT DEFAULT '#1e3a8a',
  teacher_id TEXT,
  teacher_name TEXT NOT NULL,
  room TEXT NOT NULL DEFAULT 'Virtual Room 1',
  meeting_link TEXT,
  is_break BOOLEAN DEFAULT FALSE,
  break_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================================
-- 10. EXAMINATIONS, CONTINUOUS ASSESSMENT & ACADEMIC REPORT CARDS
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.exam_sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  term TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('CAT 1', 'CAT 2', 'Mid-Term', 'End-Term', 'Mock')),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Upcoming', 'Scheduled', 'In Progress', 'Grading', 'Published')),
  classes JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_candidates INTEGER DEFAULT 0,
  results_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.report_cards (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  admission_number TEXT NOT NULL,
  class_name TEXT NOT NULL,
  grade_level TEXT,
  term TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  exam_session_id TEXT,
  curriculum TEXT DEFAULT 'College',
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_marks NUMERIC(8, 2) NOT NULL DEFAULT 0,
  max_marks NUMERIC(8, 2) NOT NULL DEFAULT 100,
  mean_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
  mean_grade TEXT NOT NULL DEFAULT 'A',
  mean_points NUMERIC(5, 2) DEFAULT 0,
  class_position INTEGER DEFAULT 1,
  class_size INTEGER DEFAULT 1,
  attendance_days_present INTEGER DEFAULT 60,
  attendance_days_total INTEGER DEFAULT 60,
  class_teacher_remarks TEXT,
  principal_remarks TEXT,
  next_term_begins TEXT,
  fee_balance NUMERIC(10, 2) DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_cards_student ON public.report_cards (LOWER(admission_number));

-- ====================================================================================
-- 11. BURSAR DESK: FEE INVOICES & PAYMENT RECEIPTS
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.fee_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  student_id UUID,
  student_name TEXT,
  admission_number TEXT,
  class_name TEXT DEFAULT 'Online Vocational Program',
  term_name TEXT NOT NULL DEFAULT 'Term 1',
  academic_year TEXT NOT NULL DEFAULT '2026',
  issue_date TEXT,
  due_date TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 60.00 CHECK (total_amount >= 0),
  amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
  balance_due NUMERIC(10, 2) NOT NULL DEFAULT 60.00 CHECK (balance_due >= 0),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PAID', 'PARTIAL', 'PENDING', 'OVERDUE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_invoices_adm ON public.fee_invoices (LOWER(admission_number));

CREATE TABLE IF NOT EXISTS public.fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT NOT NULL UNIQUE,
  invoice_id UUID REFERENCES public.fee_invoices(id) ON DELETE SET NULL,
  student_id UUID,
  student_name TEXT,
  admission_number TEXT,
  amount_paid NUMERIC(10, 2) NOT NULL CHECK (amount_paid > 0),
  payment_method TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
  transaction_reference TEXT NOT NULL,
  payment_date TEXT NOT NULL,
  received_by TEXT NOT NULL DEFAULT 'Bursar',
  balance_after NUMERIC(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_payments_adm ON public.fee_payments (LOWER(admission_number));

-- ====================================================================================
-- 12. E-LIBRARY RESOURCES & ACADEMIC HANDBOOKS
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.library_resources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  class_level TEXT NOT NULL DEFAULT 'Short Course / Certificate',
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size TEXT DEFAULT 'Academic Document',
  file_type TEXT NOT NULL DEFAULT 'PDF',
  downloads_count INTEGER NOT NULL DEFAULT 0,
  year INTEGER DEFAULT 2026,
  uploaded_by TEXT DEFAULT 'Academic Administrator',
  description TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.academic_handbooks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  discipline TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'All Trainees / Diploma',
  author TEXT NOT NULL DEFAULT 'Global College Academic Board',
  year INTEGER NOT NULL DEFAULT 2026,
  readings_count INTEGER NOT NULL DEFAULT 100,
  chapters JSONB NOT NULL DEFAULT '[]'::jsonb,
  takeaways JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_drm_protected BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================================
-- 13. NOTICES, NOTIFICATIONS, INQUIRIES, DISCIPLINE & BIOMETRICS
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.school_notices (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Academic',
  priority TEXT NOT NULL DEFAULT 'Normal',
  target_audience TEXT NOT NULL DEFAULT 'All',
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  event_date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.discipline_records (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  admission_number TEXT NOT NULL,
  class_name TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Merit', 'Demerit', 'Incident', 'Commendation', 'Counseling')),
  category TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  action_taken TEXT,
  reported_by TEXT NOT NULL,
  parent_notified BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'Resolved' CHECK (status IN ('Open', 'Resolved', 'Escalated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.secretary_inquiries (
  id TEXT PRIMARY KEY,
  tracking_number TEXT,
  visitor_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  category TEXT NOT NULL,
  student_admission TEXT,
  subject TEXT NOT NULL,
  notes TEXT NOT NULL,
  assigned_to TEXT DEFAULT 'Registrar',
  status TEXT NOT NULL DEFAULT 'Open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.biometric_clearance_passes (
  id TEXT PRIMARY KEY,
  clearance_code TEXT NOT NULL UNIQUE,
  student_id TEXT NOT NULL,
  admission_number TEXT NOT NULL,
  student_name TEXT NOT NULL,
  course_name TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verification_hash TEXT NOT NULL,
  verified_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'VERIFIED_CLEARED',
  qr_payload TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================================
-- 14. INTAKE SCHEDULES & ADMISSIONS CAMPAIGNS
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.intake_schedules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  term_session TEXT NOT NULL,
  headline TEXT NOT NULL,
  description TEXT NOT NULL,
  poster_image_url TEXT,
  promo_video_url TEXT,
  application_deadline TEXT NOT NULL,
  orientation_date TEXT,
  commencement_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open',
  target_courses JSONB NOT NULL DEFAULT '[]'::jsonb,
  early_bird_discount TEXT,
  installment_plan TEXT,
  study_modes JSONB NOT NULL DEFAULT '[]'::jsonb,
  contact_phone TEXT,
  contact_email TEXT,
  registration_fee TEXT,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================================
-- 15. MULTI-TENANT PARTNER SCHOOLS CLOUD ECOSYSTEM
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.tenant_schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  motto TEXT,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#1e3a8a',
  accent_color TEXT NOT NULL DEFAULT '#d4af37',
  academic_system TEXT NOT NULL DEFAULT 'term',
  academic_calendar JSONB NOT NULL DEFAULT '[]'::jsonb,
  active_period_name TEXT,
  curriculum_type TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  website TEXT,
  custom_domain TEXT,
  subdomain TEXT,
  principal_name TEXT NOT NULL,
  principal_title TEXT DEFAULT 'Principal',
  principal_email TEXT,
  subscription_tier TEXT DEFAULT 'growth',
  subscription_monthly_rate NUMERIC(10, 2) DEFAULT 59.00,
  subscription_billing_cycle TEXT DEFAULT 'monthly',
  stats JSONB NOT NULL DEFAULT '{"students": 0, "teachers": 0, "classes": 0, "departments": 0}'::jsonb,
  features_enabled JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_verified BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================================
-- 16. UNIVERSAL REAL-TIME CLOUD SYNC STORE (Offline-First Sync Engine)
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.app_cloud_sync (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_by TEXT DEFAULT 'System',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS) with permissive policies for authenticated & anon client sync
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_handbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_cloud_sync ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles', 'departments', 'subjects', 'classes', 'students',
    'faculty_teachers', 'course_units', 'courses', 'lessons',
    'unit_registrations', 'timetable_periods', 'exam_sessions',
    'report_cards', 'fee_invoices', 'fee_payments', 'library_resources',
    'academic_handbooks', 'school_notices', 'intake_schedules',
    'tenant_schools', 'app_cloud_sync'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow full access to %I" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow full access to %I" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;
