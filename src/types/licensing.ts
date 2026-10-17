// ============================================================
// Global College — Master SaaS Licensing & Billing Types
// ============================================================

export type LicenseDurationType = '1_month' | '3_months' | '6_months' | '1_year' | 'perpetual'

export type LicenseStatus = 'active' | 'used' | 'revoked' | 'expired'

export type SubscriptionTierType = 'silver' | 'gold' | 'platinum'

export const SUBSCRIPTION_TIER_RATES: Record<SubscriptionTierType, number> = {
  silver: 2500,
  gold: 3000,
  platinum: 5000,
}

export const SUBSCRIPTION_TIER_DETAILS: Record<
  SubscriptionTierType,
  {
    name: string
    rateKes: number
    badge: string
    tagline: string
    features: string[]
  }
> = {
  silver: {
    name: 'Silver Tier (Standard)',
    rateKes: 2500,
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
}

export interface ProductKeyLicense {
  id: string
  key: string // Format: GC-GLD-XXXX-XXXX-XXXX or GC-SLV-...
  school_slug: string
  school_name: string
  campus_count: number
  tier?: SubscriptionTierType // 'silver' | 'gold' | 'platinum'
  rate_per_campus: number // 2500, 3000, or 5000 KES
  total_amount_kes: number // campus_count * rate * months
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
