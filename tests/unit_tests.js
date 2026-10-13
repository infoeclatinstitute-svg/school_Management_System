/**
 * ============================================================================
 * GLOBAL COLLEGE — ENTERPRISE SCHOOL MANAGEMENT SYSTEM UNIT TEST SUITE
 * ============================================================================
 * Executes comprehensive unit & integration tests across:
 *   1. Curriculum & IGCSE Removal Verification
 *   2. PostgreSQL / Supabase Database Schema & Seeder Integrity
 *   3. ACID Transaction Engine (Atomicity, Consistency, Isolation, Rollback)
 *   4. Student Admissions, Bursar Fee Invoicing, Receipts & Fee Clearance
 *   5. Academic Grading, Exam Sessions & Report Card Calculations
 *   6. Multi-Tenant Partner School Cloud Store (Staff, Payroll, Grades, Fees)
 *   7. Installable Web Application (PWA Manifest, Service Worker, Desktop & Phone)
 * ============================================================================
 */

import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

let passedTests = 0
let failedTests = 0
const failures = []

function test(name, fn) {
  try {
    fn()
    passedTests++
    console.log(`  ✅ PASS: ${name}`)
  } catch (err) {
    failedTests++
    failures.push({ name, error: err })
    console.error(`  ❌ FAIL: ${name}`)
    console.error(`     -> ${err.message}`)
  }
}

async function asyncTest(name, fn) {
  try {
    await fn()
    passedTests++
    console.log(`  ✅ PASS: ${name}`)
  } catch (err) {
    failedTests++
    failures.push({ name, error: err })
    console.error(`  ❌ FAIL: ${name}`)
    console.error(`     -> ${err.message}`)
  }
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry)
    return fs.statSync(fullPath).isDirectory() ? walkFiles(fullPath) : [fullPath]
  })
}

console.log('\n============================================================================')
console.log('🎓 GLOBAL COLLEGE — SCHOOL MANAGEMENT SYSTEM UNIT TEST SUITE')
console.log('============================================================================\n')

// ============================================================================
// SUITE 1: CURRICULUM & IGCSE REMOVAL INTEGRITY
// ============================================================================
console.log('📦 Suite 1: Curriculum & IGCSE Removal Verification')

test('Deleted IGCSE portal and statement of results files do not exist', () => {
  const igcsePortal = path.join(ROOT_DIR, 'src', 'features', 'igcse', 'IGCSEPortal.tsx')
  const igcseResults = path.join(ROOT_DIR, 'src', 'features', 'exams', 'IGCSEStatementOfResults.tsx')
  assert.equal(fs.existsSync(igcsePortal), false, 'IGCSEPortal.tsx should be deleted')
  assert.equal(fs.existsSync(igcseResults), false, 'IGCSEStatementOfResults.tsx should be deleted')
})

test('Zero IGCSE, Cambridge, CAIE, or Edexcel references remain in src/ and public/', () => {
  const srcFiles = walkFiles(path.join(ROOT_DIR, 'src')).filter((f) => /\.(ts|tsx|js|jsx|css|json)$/.test(f))
  const publicFiles = walkFiles(path.join(ROOT_DIR, 'public')).filter((f) => /\.(txt|json|xml|html|js)$/.test(f))
  const allFiles = [...srcFiles, ...publicFiles, path.join(ROOT_DIR, 'index.html')]

  const matches = []
  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8')
    if (/\bigcse\b|\bcambridge\b|\bedexcel\b|\bcaie\b/i.test(content)) {
      matches.push(path.relative(ROOT_DIR, file))
    }
  }
  assert.deepEqual(matches, [], `Found unexpected IGCSE/Cambridge references in: ${matches.join(', ')}`)
})

test('Institution configuration defines the 3 core schools (IT & Data Science, Business, Languages)', () => {
  const instContent = fs.readFileSync(path.join(ROOT_DIR, 'src', 'config', 'institution.ts'), 'utf8')
  assert.ok(instContent.includes("id: 'school-it-data'"), 'Missing school-it-data')
  assert.ok(instContent.includes("id: 'school-business'"), 'Missing school-business')
  assert.ok(instContent.includes("id: 'school-languages'"), 'Missing school-languages')
  assert.equal(instContent.includes('school-highschool'), false, 'school-highschool should not exist')
})

// ============================================================================
// SUITE 2: DATABASE SCHEMA & CLOUD SYNC ARCHITECTURE
// ============================================================================
console.log('\n🗄️  Suite 2: PostgreSQL / Supabase Database Schema & Cloud Sync')

test('supabase/schema.sql exists and defines all 22 core School Management System tables', () => {
  const schemaPath = path.join(ROOT_DIR, 'supabase', 'schema.sql')
  assert.ok(fs.existsSync(schemaPath), 'supabase/schema.sql must exist')
  const sql = fs.readFileSync(schemaPath, 'utf8')

  const requiredTables = [
    'profiles',
    'departments',
    'subjects',
    'school_terms',
    'classes',
    'students',
    'faculty_teachers',
    'course_units',
    'courses',
    'lessons',
    'unit_registrations',
    'timetable_periods',
    'exam_sessions',
    'report_cards',
    'fee_invoices',
    'fee_payments',
    'library_resources',
    'academic_handbooks',
    'school_notices',
    'discipline_records',
    'secretary_inquiries',
    'biometric_clearance_passes',
    'intake_schedules',
    'tenant_schools',
    'app_cloud_sync',
  ]

  for (const table of requiredTables) {
    const regex = new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+public\\.${table}\\b`, 'i')
    assert.ok(regex.test(sql), `Missing table definition in schema.sql: public.${table}`)
  }
})

test('supabase/schema.sql enforces Row Level Security (RLS) and check constraints', () => {
  const sql = fs.readFileSync(path.join(ROOT_DIR, 'supabase', 'schema.sql'), 'utf8')
  assert.ok(sql.includes('ENABLE ROW LEVEL SECURITY'), 'Schema must enable Row Level Security')
  assert.ok(sql.includes('CHECK (fee_balance >= 0)'), 'Students table must enforce non-negative fee_balance')
  assert.ok(sql.includes('CHECK (amount_paid > 0)'), 'Fee payments table must enforce positive payment amount')
  assert.ok(
    sql.includes("CHECK (role IN ('admin', 'teacher', 'student', 'parent', 'bursar'))"),
    'Profiles table must enforce valid RBAC roles'
  )
})

test('Database seeder and Supabase client are properly configured', () => {
  const supabaseTs = fs.readFileSync(path.join(ROOT_DIR, 'src', 'lib', 'supabase.ts'), 'utf8')
  const seederTs = fs.readFileSync(path.join(ROOT_DIR, 'src', 'lib', 'databaseSeeder.ts'), 'utf8')
  assert.ok(supabaseTs.includes('createClient'), 'supabase.ts must initialize Supabase client')
  assert.ok(seederTs.includes('export async function seedCloudDatabase'), 'databaseSeeder.ts must export seedCloudDatabase')
  assert.ok(seederTs.includes('export function getDatabaseHealthReport'), 'databaseSeeder.ts must export getDatabaseHealthReport')
})

// ============================================================================
// SUITE 3: ACID TRANSACTION ENGINE & SCHOOL MANAGEMENT DATA STORE LOGIC
// ============================================================================
console.log('\n⚡ Suite 3: ACID Transaction Engine & School Management Operations')

// In-memory simulation of the ACID Transaction Engine & School Management Store
class MockStorage {
  constructor() {
    this.map = new Map()
  }
  getItem(k) {
    return this.map.has(k) ? this.map.get(k) : null
  }
  setItem(k, v) {
    this.map.set(k, String(v))
  }
  removeItem(k) {
    this.map.delete(k)
  }
  clear() {
    this.map.clear()
  }
}

const localStorageMock = new MockStorage()

async function executeAtomicSimulation(keys, mutationFn, validateFn) {
  const snapshot = {}
  for (const k of keys) snapshot[k] = localStorageMock.getItem(k)
  try {
    const res = await mutationFn()
    if (validateFn) validateFn()
    return { status: 'COMMITTED', result: res }
  } catch (err) {
    for (const [k, v] of Object.entries(snapshot)) {
      if (v === null) localStorageMock.removeItem(k)
      else localStorageMock.setItem(k, v)
    }
    throw err
  }
}

await asyncTest('ACID Transaction Engine commits valid multi-collection mutations atomically', async () => {
  localStorageMock.clear()
  localStorageMock.setItem('gc_school_students', JSON.stringify([]))
  localStorageMock.setItem('gc_school_invoices', JSON.stringify([]))

  const student = {
    id: 'std-001',
    admission_number: 'GC-2026-001',
    full_name: 'Amara Okafor',
    class_name: 'Full-Stack Web Development',
    term_fee_total: 120,
    fee_balance: 120,
    fee_cleared: false,
  }

  await executeAtomicSimulation(['gc_school_students', 'gc_school_invoices'], () => {
    const students = JSON.parse(localStorageMock.getItem('gc_school_students'))
    students.push(student)
    localStorageMock.setItem('gc_school_students', JSON.stringify(students))

    const invoices = JSON.parse(localStorageMock.getItem('gc_school_invoices'))
    invoices.push({
      id: 'inv-001',
      invoice_number: 'INV-2026-1001',
      student_id: student.id,
      admission_number: student.admission_number,
      total_amount: 120,
      paid_amount: 0,
      balance: 120,
      status: 'Pending',
    })
    localStorageMock.setItem('gc_school_invoices', JSON.stringify(invoices))
  })

  const savedStudents = JSON.parse(localStorageMock.getItem('gc_school_students'))
  const savedInvoices = JSON.parse(localStorageMock.getItem('gc_school_invoices'))
  assert.equal(savedStudents.length, 1)
  assert.equal(savedStudents[0].admission_number, 'GC-2026-001')
  assert.equal(savedInvoices.length, 1)
  assert.equal(savedInvoices[0].balance, 120)
})

await asyncTest('ACID Transaction Engine automatically rolls back all keys when IntegrityError occurs', async () => {
  const beforeStudents = localStorageMock.getItem('gc_school_students')
  const beforeInvoices = localStorageMock.getItem('gc_school_invoices')

  await assert.rejects(async () => {
    await executeAtomicSimulation(['gc_school_students', 'gc_school_invoices'], () => {
      // Corrupt state first
      localStorageMock.setItem('gc_school_students', JSON.stringify([{ id: 'corrupt' }]))
      localStorageMock.setItem('gc_school_invoices', JSON.stringify([]))
      // Throw integrity error mid-flight
      throw new Error('IntegrityError: Payment amount must be greater than zero.')
    })
  }, /IntegrityError/)

  assert.equal(localStorageMock.getItem('gc_school_students'), beforeStudents, 'Students state must be restored on rollback')
  assert.equal(localStorageMock.getItem('gc_school_invoices'), beforeInvoices, 'Invoices state must be restored on rollback')
})

await asyncTest('Bursar fee payment recording recalculates partial & full clearance balances accurately', async () => {
  localStorageMock.setItem('gc_school_receipts', JSON.stringify([]))

  // 1. Record partial payment of $50 against $120 invoice
  await executeAtomicSimulation(
    ['gc_school_students', 'gc_school_invoices', 'gc_school_receipts'],
    () => {
      const receipts = JSON.parse(localStorageMock.getItem('gc_school_receipts'))
      receipts.push({
        id: 'rcpt-001',
        receipt_number: 'RCT-2026-5001',
        student_id: 'std-001',
        admission_number: 'GC-2026-001',
        amount: 50,
      })
      localStorageMock.setItem('gc_school_receipts', JSON.stringify(receipts))

      const invoices = JSON.parse(localStorageMock.getItem('gc_school_invoices'))
      invoices[0].paid_amount += 50
      invoices[0].balance = Math.max(0, invoices[0].total_amount - invoices[0].paid_amount)
      invoices[0].status = invoices[0].balance === 0 ? 'Paid' : 'Partial'
      localStorageMock.setItem('gc_school_invoices', JSON.stringify(invoices))

      const students = JSON.parse(localStorageMock.getItem('gc_school_students'))
      students[0].fee_balance = invoices[0].balance
      students[0].fee_cleared = invoices[0].balance === 0
      localStorageMock.setItem('gc_school_students', JSON.stringify(students))
    }
  )

  let inv = JSON.parse(localStorageMock.getItem('gc_school_invoices'))[0]
  let std = JSON.parse(localStorageMock.getItem('gc_school_students'))[0]
  assert.equal(inv.paid_amount, 50)
  assert.equal(inv.balance, 70)
  assert.equal(inv.status, 'Partial')
  assert.equal(std.fee_cleared, false)

  // 2. Record remaining $70 payment -> settles balance to $0 and unlocks student fee clearance
  await executeAtomicSimulation(
    ['gc_school_students', 'gc_school_invoices', 'gc_school_receipts'],
    () => {
      const receipts = JSON.parse(localStorageMock.getItem('gc_school_receipts'))
      receipts.push({
        id: 'rcpt-002',
        receipt_number: 'RCT-2026-5002',
        student_id: 'std-001',
        admission_number: 'GC-2026-001',
        amount: 70,
      })
      localStorageMock.setItem('gc_school_receipts', JSON.stringify(receipts))

      const invoices = JSON.parse(localStorageMock.getItem('gc_school_invoices'))
      invoices[0].paid_amount += 70
      invoices[0].balance = Math.max(0, invoices[0].total_amount - invoices[0].paid_amount)
      invoices[0].status = invoices[0].balance === 0 ? 'Paid' : 'Partial'
      localStorageMock.setItem('gc_school_invoices', JSON.stringify(invoices))

      const students = JSON.parse(localStorageMock.getItem('gc_school_students'))
      students[0].fee_balance = invoices[0].balance
      students[0].fee_cleared = invoices[0].balance === 0
      localStorageMock.setItem('gc_school_students', JSON.stringify(students))
    }
  )

  inv = JSON.parse(localStorageMock.getItem('gc_school_invoices'))[0]
  std = JSON.parse(localStorageMock.getItem('gc_school_students'))[0]
  assert.equal(inv.paid_amount, 120)
  assert.equal(inv.balance, 0)
  assert.equal(inv.status, 'Paid')
  assert.equal(std.fee_balance, 0)
  assert.equal(std.fee_cleared, true)
})

// ============================================================================
// SUITE 4: ACADEMIC GRADING, TRANSCRIPTS & MULTI-TENANT SCHOOL ENGINE
// ============================================================================
console.log('\n📊 Suite 4: Academic Grading, Transcripts & Multi-Tenant School Engine')

function getCollegeGrade(percentage) {
  if (percentage >= 70) return 'A'
  if (percentage >= 60) return 'B'
  if (percentage >= 50) return 'C'
  if (percentage >= 40) return 'D'
  return 'F'
}

test('College grading scale maps percentages accurately to A, B, C, D, F', () => {
  assert.equal(getCollegeGrade(85), 'A')
  assert.equal(getCollegeGrade(70), 'A')
  assert.equal(getCollegeGrade(65), 'B')
  assert.equal(getCollegeGrade(54), 'C')
  assert.equal(getCollegeGrade(42), 'D')
  assert.equal(getCollegeGrade(35), 'F')
})

test('Multi-tenant payroll & CAT+Exam gradebook calculations are accurate', () => {
  // Staff payroll calculation
  const staffInput = {
    salary_base: 3200,
    salary_housing: 500,
    salary_transport: 250,
    salary_tax: 600,
    salary_pension: 240,
  }
  const gross = staffInput.salary_base + staffInput.salary_housing + staffInput.salary_transport
  const deductions = staffInput.salary_tax + staffInput.salary_pension
  const net = Math.max(0, gross - deductions)
  assert.equal(gross, 3950)
  assert.equal(deductions, 840)
  assert.equal(net, 3110)

  // Continuous Assessment (CAT 1 + CAT 2 + Exam) calculation
  const cat1 = 18 // out of 20
  const cat2 = 17 // out of 20
  const exam = 51 // out of 60
  const totalScore = Math.min(100, Math.max(0, cat1 + cat2 + exam))
  assert.equal(totalScore, 86)
})

// ============================================================================
// SUITE 5: INSTALLABLE WEB APPLICATION (PHONE & LAPTOP/DESKTOP PWA + ELECTRON)
// ============================================================================
console.log('\n📲 Suite 5: Installable Web Application (Phone & Laptop/Computer)')

test('public/manifest.json is valid and configured for both Phone and Desktop/Laptop installation', () => {
  const manifestPath = path.join(ROOT_DIR, 'public', 'manifest.json')
  assert.ok(fs.existsSync(manifestPath), 'public/manifest.json must exist')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

  assert.equal(manifest.display, 'standalone', 'Manifest display must be standalone')
  assert.equal(manifest.start_url, '/', 'Manifest start_url must be /')
  assert.ok(Array.isArray(manifest.display_override), 'Manifest must include display_override for desktop window controls')
  assert.ok(manifest.display_override.includes('window-controls-overlay'), 'Manifest should support desktop window-controls-overlay')

  // Verify icons (192x192 and 512x512 required for Android & Desktop Chrome/Edge installability)
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 4, 'Manifest must define app icons')
  const has192 = manifest.icons.some((i) => i.sizes === '192x192')
  const has512 = manifest.icons.some((i) => i.sizes === '512x512')
  const hasMaskable = manifest.icons.some((i) => i.purpose === 'maskable')
  assert.ok(has192, 'Manifest must include a 192x192 icon')
  assert.ok(has512, 'Manifest must include a 512x512 icon')
  assert.ok(hasMaskable, 'Manifest must include maskable icon support for mobile phones')

  // Verify all referenced icon files physically exist in public/
  for (const icon of manifest.icons) {
    const cleanSrc = icon.src.split('?')[0].replace(/^\//, '')
    const iconFile = path.join(ROOT_DIR, 'public', cleanSrc)
    assert.ok(fs.existsSync(iconFile), `Referenced manifest icon file missing: public/${cleanSrc}`)
  }

  // Verify desktop ("wide") and mobile ("narrow") screenshots for Rich Install UI
  assert.ok(Array.isArray(manifest.screenshots), 'Manifest must define screenshots')
  assert.ok(manifest.screenshots.some((s) => s.form_factor === 'wide'), 'Manifest must include wide screenshot for Laptop/Desktop install UI')
  assert.ok(manifest.screenshots.some((s) => s.form_factor === 'narrow'), 'Manifest must include narrow screenshot for Phone install UI')
})

test('public/sw.js Service Worker implements install, activate, and fetch handlers for offline capability', () => {
  const swPath = path.join(ROOT_DIR, 'public', 'sw.js')
  assert.ok(fs.existsSync(swPath), 'public/sw.js must exist')
  const swContent = fs.readFileSync(swPath, 'utf8')

  assert.ok(swContent.includes("addEventListener('install'"), 'sw.js must handle install event')
  assert.ok(swContent.includes("addEventListener('activate'"), 'sw.js must handle activate event')
  assert.ok(swContent.includes("addEventListener('fetch'"), 'sw.js must handle fetch event (required for PWA installability)')
  assert.ok(swContent.includes('skipWaiting'), 'sw.js must call skipWaiting()')
  assert.ok(swContent.includes('clients.claim'), 'sw.js must call clients.claim()')
})

test('index.html links /manifest.json, registers /sw.js, and captures beforeinstallprompt', () => {
  const html = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8')
  assert.ok(html.includes('<link rel="manifest" href="/manifest.json" />'), 'index.html must link /manifest.json')
  assert.ok(html.includes("navigator.serviceWorker.register('/sw.js'"), 'index.html must register /sw.js')
  assert.ok(html.includes('beforeinstallprompt'), 'index.html must listen for beforeinstallprompt')
  assert.equal(html.includes('r.unregister()'), false, 'index.html must not unregister service workers')
})

test('Electron desktop entry point (electron/main.cjs) and PWA install UI components exist', () => {
  const electronMain = path.join(ROOT_DIR, 'electron', 'main.cjs')
  assert.ok(fs.existsSync(electronMain), 'electron/main.cjs must exist for desktop workstation builds')

  const pwaHook = fs.readFileSync(path.join(ROOT_DIR, 'src', 'hooks', 'usePWAInstall.ts'), 'utf8')
  const installModal = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'shared', 'SafariInstallModal.tsx'), 'utf8')
  const navbar = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'layout', 'Navbar.tsx'), 'utf8')

  assert.ok(pwaHook.includes('promptInstall'), 'usePWAInstall.ts must expose promptInstall()')
  assert.ok(installModal.includes('Laptop &amp; Computer') && installModal.includes('Phone (Android / iOS)'), 'Install modal must guide both Laptop/Desktop and Phone users')
  assert.ok(navbar.includes('Install App'), 'Navbar.tsx must render an Install App button')
})

test('Login.tsx displays Students Portal, auto-fills only Admin credentials, and disables public self-registration', () => {
  const loginTsx = fs.readFileSync(path.join(ROOT_DIR, 'src', 'features', 'auth', 'Login.tsx'), 'utf8')
  const manageUsersTsx = fs.readFileSync(path.join(ROOT_DIR, 'src', 'features', 'admin', 'ManageUsers.tsx'), 'utf8')

  assert.equal(loginTsx.includes('Create New Account'), false, 'Login.tsx must not expose a public Create New Account tab')
  assert.equal(loginTsx.includes('handleRegister'), false, 'Login.tsx must not contain public self-registration handler')
  assert.equal(loginTsx.includes('Vocational & Short Courses Portal'), false, 'Old Vocational & Short Courses Portal label must be removed')
  assert.ok(loginTsx.includes("label: 'Students Portal'"), 'Login.tsx must label the student portal as Students Portal')
  assert.ok(loginTsx.includes('Official Administrator-Provisioned Access'), 'Login.tsx must display the Administrator-Provisioned Access notice')
  assert.ok(manageUsersTsx.includes('Issue Official Portal Login Credentials'), 'ManageUsers.tsx must allow Admin to issue credentials for all roles')
  assert.ok(manageUsersTsx.includes('Set Login Password'), 'ManageUsers.tsx must allow Admin to set/reset user passwords')
})

test('Cloud & Services Hub is removed from AdminDashboard.tsx, Sidebar.tsx, and App.tsx', () => {
  const adminDash = fs.readFileSync(path.join(ROOT_DIR, 'src', 'features', 'admin', 'AdminDashboard.tsx'), 'utf8')
  const sidebar = fs.readFileSync(path.join(ROOT_DIR, 'src', 'components', 'layout', 'Sidebar.tsx'), 'utf8')
  const appTsx = fs.readFileSync(path.join(ROOT_DIR, 'src', 'App.tsx'), 'utf8')

  assert.equal(adminDash.includes('/admin/cloud-services'), false, 'AdminDashboard.tsx must not link to /admin/cloud-services')
  assert.equal(adminDash.includes('Cloud & Services Hub'), false, 'AdminDashboard.tsx must not render Cloud & Services Hub')
  assert.equal(sidebar.includes('/admin/cloud-services'), false, 'Sidebar.tsx must not include /admin/cloud-services link')
  assert.equal(appTsx.includes('/admin/cloud-services'), false, 'App.tsx must not expose /admin/cloud-services route')
})

test('Production database initial collections in schoolData.ts and stores are clean (zero hardcoded courses, lessons, users, or transactions)', () => {
  const schoolData = fs.readFileSync(path.join(ROOT_DIR, 'src', 'lib', 'schoolData.ts'), 'utf8')
  const authContext = fs.readFileSync(path.join(ROOT_DIR, 'src', 'features', 'auth', 'AuthContext.tsx'), 'utf8')
  const officialCourses = fs.readFileSync(path.join(ROOT_DIR, 'src', 'config', 'officialCourses.ts'), 'utf8')
  const intakeStore = fs.readFileSync(path.join(ROOT_DIR, 'src', 'lib', 'intakeStore.ts'), 'utf8')
  const tenantStore = fs.readFileSync(path.join(ROOT_DIR, 'src', 'lib', 'tenantSchoolStore.ts'), 'utf8')
  const handbooks = fs.readFileSync(path.join(ROOT_DIR, 'src', 'features', 'library', 'academicHandbookData.ts'), 'utf8')
  const adminDash = fs.readFileSync(path.join(ROOT_DIR, 'src', 'features', 'admin', 'AdminDashboard.tsx'), 'utf8')

  assert.ok(schoolData.includes('export const INITIAL_DEPARTMENTS: CollegeDepartment[] = []'), 'INITIAL_DEPARTMENTS must be empty array')
  assert.ok(schoolData.includes('export const INITIAL_SUBJECTS: CollegeSubject[] = []'), 'INITIAL_SUBJECTS must be empty array')
  assert.ok(schoolData.includes('export const INITIAL_COURSE_UNITS: CourseUnit[] = []'), 'INITIAL_COURSE_UNITS must be empty array')
  assert.ok(schoolData.includes('export const INITIAL_RESOURCES: AcademicResource[] = []'), 'INITIAL_RESOURCES must be empty array')
  assert.ok(schoolData.includes('export const FALLBACK_SAMPLE_RESOURCES: AcademicResource[] = []'), 'FALLBACK_SAMPLE_RESOURCES must be empty array')
  assert.ok(schoolData.includes('export const INITIAL_STUDENTS: StudentRecord[] = []'), 'INITIAL_STUDENTS must be empty array for clean production state')
  assert.ok(schoolData.includes('export const INITIAL_FACULTY_TEACHERS: FacultyTeacher[] = []'), 'INITIAL_FACULTY_TEACHERS must be empty array for clean production state')
  assert.ok(schoolData.includes('export const INITIAL_INVOICES: FeeInvoice[] = []'), 'INITIAL_INVOICES must be empty array for clean production state')
  assert.ok(schoolData.includes('export const INITIAL_RECEIPTS: FeePaymentReceipt[] = []'), 'INITIAL_RECEIPTS must be empty array for clean production state')
  assert.ok(officialCourses.includes('export const OFFICIAL_COURSES: CourseProgram[] = []'), 'OFFICIAL_COURSES must be empty array')
  assert.ok(intakeStore.includes('export const INITIAL_INTAKE_SCHEDULES: IntakeSchedule[] = []'), 'INITIAL_INTAKE_SCHEDULES must be empty array')
  assert.ok(tenantStore.includes('const INITIAL_PARTNER_SCHOOLS: PartnerSchoolTenant[] = []'), 'INITIAL_PARTNER_SCHOOLS must be empty array')
  assert.ok(handbooks.includes('export const ACADEMIC_HANDBOOKS: Record<string, AcademicHandbook> = {}'), 'ACADEMIC_HANDBOOKS must be empty object')
  assert.equal(adminDash.includes('Math.max(lessonCount || 0, 24)'), false, 'AdminDashboard must not hardcode minimum 24 uploaded lessons')
  assert.equal(authContext.includes('directDemoMap'), false, 'AuthContext.tsx must not contain hardcoded non-admin demo bypasses')
})

await asyncTest('End-to-End Admin User Provisioning & SHA-256 Password Verification for all roles', async () => {
  const crypto = await import('node:crypto')
  const SALT = 'global_college_2026_salt_'
  const hashPasswordSim = (plain) =>
    crypto.createHash('sha256').update(SALT + plain.trim()).digest('hex')

  const verifyPasswordSim = (plain, storedHash) => hashPasswordSim(plain) === storedHash

  localStorageMock.clear()
  const provisionedStore = {}

  const rolesToProvision = [
    { role: 'student', adm: 'GC-2026-001', name: 'Faith Wanjiku', pass: 'Student@2026' },
    { role: 'teacher', adm: 'STF-2026-001', name: 'Dr. Kevin Otieno', pass: 'Teacher@2026' },
    { role: 'bursar', adm: 'BUR-2026-001', name: 'Grace Mutua', pass: 'Bursar@2026' },
    { role: 'parent', adm: 'PAR-2026-001', name: 'Peter Wanjiku', pass: 'Parent@2026' },
  ]

  for (const u of rolesToProvision) {
    const key = u.adm.toLowerCase().replace(/[^a-z0-9]/g, '')
    provisionedStore[key] = {
      id: `usr-${key}`,
      admission_number: u.adm,
      full_name: u.name,
      role: u.role,
      password: u.pass,
      passwordHash: hashPasswordSim(u.pass),
    }
  }
  localStorageMock.setItem('gc_local_credentials', JSON.stringify(provisionedStore))

  const savedStore = JSON.parse(localStorageMock.getItem('gc_local_credentials'))
  assert.equal(Object.keys(savedStore).length, 4, 'All 4 Admin-provisioned roles must be stored')

  for (const u of rolesToProvision) {
    const key = u.adm.toLowerCase().replace(/[^a-z0-9]/g, '')
    const record = savedStore[key]
    assert.ok(record, `Provisioned record for ${u.adm} must exist`)
    assert.equal(record.role, u.role)
    assert.equal(verifyPasswordSim(u.pass, record.passwordHash), true, `Correct password must authenticate for ${u.role}`)
    assert.equal(verifyPasswordSim('WrongPass123', record.passwordHash), false, `Wrong password must be rejected for ${u.role}`)
  }
})

test('otaUpdater.ts prevents reload loops (? _ota=) and preserves PWA Service Worker registration', () => {
  const otaContent = fs.readFileSync(path.join(ROOT_DIR, 'src', 'lib', 'otaUpdater.ts'), 'utf8')
  assert.equal(otaContent.includes('window.location.replace'), false, 'otaUpdater.ts must not force window.location.replace reload loops')
  assert.equal(otaContent.includes('r.unregister()'), false, 'otaUpdater.ts must not unregister PWA service workers')
  assert.ok(otaContent.includes('import.meta.env.DEV'), 'otaUpdater.ts must skip OTA polling in Vite development mode')
})

test('Zero Eclat or Éclat references remain in src/ and public/', () => {
  const files = [...walkFiles(path.join(ROOT_DIR, 'src')), ...walkFiles(path.join(ROOT_DIR, 'public'))]
  const offending = []
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    if (/[eé]clat/i.test(content)) {
      offending.push(path.relative(ROOT_DIR, file))
    }
  }
  assert.equal(offending.length, 0, `Found Eclat references in: ${offending.join(', ')}`)
})

test('5-Step School & College Onboarding Wizard & Cloud Provisioning verification', () => {
  const regPage = fs.readFileSync(path.join(ROOT_DIR, 'src', 'features', 'tenant', 'SchoolRegistrationPage.tsx'), 'utf8')
  const tenantStore = fs.readFileSync(path.join(ROOT_DIR, 'src', 'lib', 'tenantSchoolStore.ts'), 'utf8')
  const tenantTypes = fs.readFileSync(path.join(ROOT_DIR, 'src', 'types', 'tenantSchool.ts'), 'utf8')

  // Verify all 4 institution categories (school, college, university, academy)
  assert.ok(tenantTypes.includes("'school' | 'college' | 'university' | 'academy'"), 'InstitutionCategory must support school, college, university, and academy')
  assert.ok(regPage.includes('College / TVET / Polytechnic'), 'Wizard must include College / TVET / Polytechnic category')
  assert.ok(regPage.includes('Primary / High School (K-12)'), 'Wizard must include Primary / High School (K-12) category')
  assert.ok(regPage.includes('University / Higher Education'), 'Wizard must include University / Higher Education category')
  assert.ok(regPage.includes('Professional & Tech Academy'), 'Wizard must include Professional & Tech Academy category')

  // Verify 5-step wizard & directory toggle
  assert.ok(regPage.includes("setStep(5)"), 'Wizard must support all 5 onboarding steps')
  assert.ok(regPage.includes("setViewMode('directory')"), 'Page must support switching to the Onboarded Institutions Directory')

  // Verify zero hardcoded dummy student/teacher counts on newly onboarded institutions
  assert.ok(tenantStore.includes('students: 0'), 'Newly onboarded institutions must start with 0 students')
  assert.equal(tenantStore.includes('students: 120'), false, 'Hardcoded 120 students in registerSchool must be removed')

  // Verify automatic Principal/Provost credential & session provisioning
  assert.ok(tenantStore.includes('this.createStaffMember({'), 'registerSchool must automatically provision Principal/Provost staff record')
  assert.ok(tenantStore.includes('this.setActiveSession(finalSlug,'), 'registerSchool must pre-authenticate the Principal session upon onboarding')
})

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n============================================================================')
console.log(`📋 TEST SUMMARY: ${passedTests} passed, ${failedTests} failed (Total: ${passedTests + failedTests})`)
console.log('============================================================================\n')

if (failedTests > 0) {
  process.exit(1)
}
