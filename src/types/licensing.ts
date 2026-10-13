// ============================================================
// Global College — Master SaaS Licensing & Billing Types
// ============================================================

export type LicenseDurationType = '1_month' | '3_months' | '6_months' | '1_year' | 'perpetual'

export type LicenseStatus = 'active' | 'used' | 'revoked' | 'expired'

export interface ProductKeyLicense {
  id: string
  key: string // Format: GC-LIC-XXXX-XXXX-XXXX-XXXX
  school_slug: string
  school_name: string
  campus_count: number
  rate_per_campus: number // 2500 KES
  total_amount_kes: number // campus_count * 2500 * months
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
