// ============================================================
// Global College — Master SaaS Licensing & Billing Types
// ============================================================

export type LicenseDurationType = '1_month' | '3_months' | '6_months' | '1_year' | 'perpetual'

export type LicenseStatus = 'active' | 'used' | 'revoked' | 'expired'

export type SubscriptionTierType = 'silver' | 'gold' | 'platinum' | 'lifetime'

export const LIFETIME_PURCHASE_KES = 30000
export const LIFETIME_YEARLY_MAINTENANCE_KES = 1000

export const SUBSCRIPTION_TIER_RATES: Record<SubscriptionTierType, number> = {
  silver: 2500,
  gold: 2500,
  platinum: 2500,
  lifetime: 30000,
}

export const SUBSCRIPTION_TIER_DETAILS: Record<
  SubscriptionTierType,
  {
    name: string
    rateKes: number
    maintenanceFeeYearlyKes?: number
    billingLabel?: string
    badge: string
    tagline: string
    features: string[]
  }
> = {
  silver: {
    name: 'Standard Monthly Plan',
    rateKes: 2500,
    billingLabel: '/ mo',
    badge: '⭐ Standard Plan',
    tagline: 'KES 2,500 / month per campus',
    features: [
      'Learner, Teacher, Bursar & Principal Portals',
      'Dedicated Institutional Public Landing Page & Programs Catalog',
      'Continuous Assessment CAT & Exam Gradebooks',
      'Attendance Tracking & Master Class Timetables',
      'Institutional About Us, Mission, Vision & Facilities Showcase',
      'Direct "Apply for this Program" Instant Admission Link',
      'Automated M-Pesa Billing Reconciliation & Offline PWA',
    ],
  },
  gold: {
    name: 'Standard Monthly Plan',
    rateKes: 2500,
    billingLabel: '/ mo',
    badge: '⭐ Standard Plan',
    tagline: 'KES 2,500 / month per campus',
    features: [
      'Learner, Teacher, Bursar & Principal Portals',
      'Dedicated Institutional Public Landing Page & Programs Catalog',
      'Continuous Assessment CAT & Exam Gradebooks',
      'Attendance Tracking & Master Class Timetables',
      'Institutional About Us, Mission, Vision & Facilities Showcase',
      'Direct "Apply for this Program" Instant Admission Link',
      'Automated M-Pesa Billing Reconciliation & Offline PWA',
    ],
  },
  platinum: {
    name: 'Standard Monthly Plan',
    rateKes: 2500,
    billingLabel: '/ mo',
    badge: '⭐ Standard Plan',
    tagline: 'KES 2,500 / month per campus',
    features: [
      'Learner, Teacher, Bursar & Principal Portals',
      'Dedicated Institutional Public Landing Page & Programs Catalog',
      'Multi-Campus Federation & Centralized Bursar Audit',
      'Automated M-Pesa Billing Reconciliation & Offline PWA',
    ],
  },
  lifetime: {
    name: 'Lifetime Purchase (Perpetual License)',
    rateKes: 30000,
    maintenanceFeeYearlyKes: 1000,
    billingLabel: 'One-Time',
    badge: '♾️ Lifetime',
    tagline: 'KES 30,000 One-Time + KES 1,000/yr Maintenance',
    features: [
      'One-Time KES 30,000 Lifetime Purchase per campus (No Monthly Fees)',
      'Only KES 1,000 / Year Annual Maintenance & Cloud Sync Fee',
      'Full Access to All 4 Portals + Dedicated Public Showcase',
      'Interactive Academic Programs Catalog & Instant Admissions',
      'Institutional About Us, Mission, Vision & Facilities Showcase',
      'Perpetual Ownership, Custom Branding & Lifetime OTA Updates',
    ],
  },
}

export interface ProductKeyLicense {
  id: string
  key: string // Format: GC-GLD-XXXX-XXXX-XXXX, GC-LFT-..., or GC-SLV-...
  school_slug: string
  school_name: string
  campus_count: number
  tier?: SubscriptionTierType // 'silver' | 'gold' | 'platinum' | 'lifetime'
  rate_per_campus: number // 2500, 3000, 5000, or 30000 KES
  total_amount_kes: number // campus_count * rate * months (or campus_count * 30000 for lifetime)
  maintenance_fee_yearly_kes?: number // 1000 KES per campus/year for lifetime licenses
  plan_duration: LicenseDurationType
  duration_months: number
  status: LicenseStatus
  generated_at: string
  activated_at?: string
  expires_at: string
  issued_by: string
  customer_contact?: string
  notes?: string
}

export type InvoicePaymentStatus = 'paid' | 'pending' | 'overdue'

export interface SaasCampusInvoice {
  id: string
  invoice_number: string // e.g. "INV-GC-2026-0042"
  school_slug: string
  school_name: string
  billing_period: string // e.g. "October 2026"
  campus_count: number
  campuses: string[]
  rate_per_campus_kes: number // 2500
  total_amount_kes: number // campus_count * 2500
  status: InvoicePaymentStatus
  payment_method?: 'M-Pesa Paybill / Till' | 'Bank Wire' | 'Credit Card' | 'Cash / Cheque' | 'Product Key Activation'
  transaction_ref?: string // e.g. M-Pesa Code "QBH4920KLL"
  due_date: string
  paid_at?: string
  created_at: string
}

export interface MasterLicensingMetrics {
  total_institutions: number
  total_campuses: number
  monthly_recurring_revenue_kes: number
  active_licenses_count: number
  pending_invoices_count: number
}
