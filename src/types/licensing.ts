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
  gold: 3000,
  platinum: 5000,
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
    name: 'Silver Tier (Standard)',
    rateKes: 2500,
    billingLabel: '/ mo',
    badge: '🥈 Silver',
    tagline: 'Core SIS & LMS Portals',
    features: [
      'Learner, Teacher, Bursar & Principal Portals',
      'Continuous Assessment CAT & Exam Gradebooks',
      'Attendance Tracking & Master Class Timetables',
      'Offline PWA & Installable Web Application',
    ],
  },
  gold: {
    name: 'Gold Tier (Public Showcase & Offerings)',
    rateKes: 3000,
    billingLabel: '/ mo',
    badge: '🥇 Gold Tier',
    tagline: 'Dedicated Public Page & Programs Catalog',
    features: [
      'Dedicated Institutional Public Landing Page',
      'Interactive Academic Programs & Qualifications Catalog',
      'Search & Filter by Diploma, Certificate & Degree',
      'Institutional About Us, Mission & Vision Showcase',
      'Executive Principal Welcome Message',
      'Campus Facilities & Infrastructure Showcase',
      'Direct "Apply for this Program" Instant Admission Link',
      'All Silver Tier Portals, Gradebooks & Offline Features',
    ],
  },
  platinum: {
    name: 'Platinum Tier (Enterprise)',
    rateKes: 5000,
    billingLabel: '/ mo',
    badge: '💎 Platinum',
    tagline: 'Multi-Campus Enterprise & Custom Domain',
    features: [
      'All Gold Tier Features & Public Showcase',
      'Multi-Campus Federation & Centralized Bursar Audit',
      'Custom CNAME / Subdomain Routing',
      'Direct WhatsApp / SMS Automated Admissions Alerts',
      '24/7 Priority SLA & Dedicated Engineering Support',
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
      'One-Time KES 30,000 Lifetime Purchase (No Monthly Fees)',
      'Only KES 1,000 / Year Annual Maintenance & Cloud Sync Fee',
      'Full Gold & Platinum Access + Dedicated Public Showcase',
      'All 4 Role Portals, Custom Domain & Lifetime OTA Updates',
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
