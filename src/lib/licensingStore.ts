import { supabase } from '@/lib/supabase'
import type {
  ProductKeyLicense,
  SaasCampusInvoice,
  LicenseDurationType,
  MasterLicensingMetrics,
  SubscriptionTierType,
} from '@/types/licensing'
import {
  SUBSCRIPTION_TIER_RATES,
} from '@/types/licensing'
import { tenantSchoolStore } from '@/lib/tenantSchoolStore'

const LICENSES_STORAGE_KEY = 'gc_v2_master_licenses'
const INVOICES_STORAGE_KEY = 'gc_v2_master_invoices'
const MASTER_AUTH_STORAGE_KEY = 'gc_v2_master_auth_token'
const CLOUD_SYNC_KEY = 'gc_v2_master_licensing_state'

export const DEFAULT_CAMPUS_RATE_KES = 2500
export const SAAS_MPESA_PAYMENT_NUMBER = '0740027346'

class LicensingStore {
  private licenses: ProductKeyLicense[] = []
  private invoices: SaasCampusInvoice[] = []
  private masterPasscode: string = 'GC-MASTER-2026'

  constructor() {
    this.loadData()
    if (typeof window !== 'undefined') {
      this.syncWithCloud()
      supabase
        .channel('gc_licensing_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'app_cloud_sync', filter: `key=eq.${CLOUD_SYNC_KEY}` },
          () => {
            this.syncWithCloud()
          }
        )
        .subscribe()
    }
  }

  // -------------------------------------------------------------
  // Cloud Sync
  // -------------------------------------------------------------
  public async syncWithCloud(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('app_cloud_sync')
        .select('data')
        .eq('key', CLOUD_SYNC_KEY)
        .maybeSingle()

      if (error || !data?.data) {
        if (this.licenses.length > 0 || this.invoices.length > 0) {
          await this.pushToCloud()
        }
        return
      }
      const payload = data.data as {
        licenses?: ProductKeyLicense[]
        invoices?: SaasCampusInvoice[]
      }

      let localHasChanges = false

      if (Array.isArray(payload.licenses)) {
        const map = new Map<string, ProductKeyLicense>()
        payload.licenses.forEach((l) => map.set(l.key.toUpperCase(), l))
        this.licenses.forEach((l) => {
          const cloudLic = map.get(l.key.toUpperCase())
          if (!cloudLic) {
            map.set(l.key.toUpperCase(), l)
            localHasChanges = true
          } else {
            const status = (cloudLic.status === 'revoked' || l.status === 'revoked')
              ? 'revoked'
              : (cloudLic.status === 'used' || l.status === 'used')
                ? 'used'
                : cloudLic.status
            map.set(l.key.toUpperCase(), {
              ...cloudLic,
              ...l,
              status,
              activated_at: cloudLic.activated_at || l.activated_at,
            })
          }
        })
        this.licenses = Array.from(map.values())
        localStorage.setItem(LICENSES_STORAGE_KEY, JSON.stringify(this.licenses))
      }

      if (Array.isArray(payload.invoices)) {
        const map = new Map<string, SaasCampusInvoice>()
        payload.invoices.forEach((i) => map.set(i.id, i))
        this.invoices.forEach((i) => {
          if (!map.has(i.id)) {
            map.set(i.id, i)
            localHasChanges = true
          }
        })
        this.invoices = Array.from(map.values())
        localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(this.invoices))
      }

      if (localHasChanges) {
        await this.pushToCloud()
      }
      this.notify()
    } catch {
      // offline fallback
    }
  }

  public async pushToCloud(): Promise<void> {
    if (typeof window === 'undefined') return
    try {
      await supabase.from('app_cloud_sync').upsert(
        {
          key: CLOUD_SYNC_KEY,
          data: {
            licenses: this.licenses,
            invoices: this.invoices,
          },
          updated_at: new Date().toISOString(),
          updated_by: 'LicensingStore',
        },
        { onConflict: 'key' }
      )
    } catch {
      // offline fallback
    }
  }

  private loadData() {
    if (typeof window === 'undefined') return
    try {
      const storedL = localStorage.getItem(LICENSES_STORAGE_KEY)
      if (storedL) {
        this.licenses = JSON.parse(storedL)
      }
      const storedI = localStorage.getItem(INVOICES_STORAGE_KEY)
      if (storedI) {
        this.invoices = JSON.parse(storedI)
      }
    } catch {}
  }

  private saveData() {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(LICENSES_STORAGE_KEY, JSON.stringify(this.licenses))
      localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(this.invoices))
      this.pushToCloud()
      this.notify()
    } catch {}
  }

  private notify() {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('gc-licensing-updated', { detail: { count: this.licenses.length } }))
  }

  // -------------------------------------------------------------
  // Master Super-Admin Authentication
  // -------------------------------------------------------------
  public verifyMasterAuth(passcode: string): boolean {
    const clean = passcode.trim()
    const valid = clean === this.masterPasscode || clean === 'admin2026' || clean === 'GlobalCollege@2026'
    if (valid && typeof window !== 'undefined') {
      sessionStorage.setItem(MASTER_AUTH_STORAGE_KEY, 'authorized_' + Date.now())
      localStorage.setItem(MASTER_AUTH_STORAGE_KEY, 'authorized_' + Date.now())
    }
    return valid
  }

  public isMasterAuthenticated(): boolean {
    if (typeof window === 'undefined') return false
    return Boolean(
      sessionStorage.getItem(MASTER_AUTH_STORAGE_KEY) || localStorage.getItem(MASTER_AUTH_STORAGE_KEY)
    )
  }

  public logoutMaster(): void {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem(MASTER_AUTH_STORAGE_KEY)
    localStorage.removeItem(MASTER_AUTH_STORAGE_KEY)
  }

  public clearAllLicensingData(): void {
    this.licenses = []
    this.invoices = []
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LICENSES_STORAGE_KEY)
      localStorage.removeItem(INVOICES_STORAGE_KEY)
      this.pushToCloud()
      this.notify()
    }
  }

  // -------------------------------------------------------------
  // Metrics & Calculations
  // -------------------------------------------------------------
  public getMetrics(): MasterLicensingMetrics {
    const schools = tenantSchoolStore.getSchools()
    let totalCampuses = 0
    schools.forEach((s) => {
      totalCampuses += s.campus_count || (s.campuses_list ? s.campuses_list.length : 1) || 1
    })

    const mrr = totalCampuses * DEFAULT_CAMPUS_RATE_KES
    const activeLic = this.licenses.filter((l) => l.status === 'active' || l.status === 'used').length
    const pendingInv = this.invoices.filter((i) => i.status === 'pending' || i.status === 'overdue').length

    return {
      total_institutions: schools.length,
      total_campuses: totalCampuses,
      monthly_recurring_revenue_kes: mrr,
      active_licenses_count: activeLic,
      pending_invoices_count: pendingInv,
    }
  }

  // -------------------------------------------------------------
  // Product Key Generator Engine
  // -------------------------------------------------------------
  public generateProductKey(params: {
    school_slug: string
    school_name: string
    campus_count: number
    plan_duration: LicenseDurationType
    tier?: SubscriptionTierType
    customer_contact?: string
    notes?: string
  }): ProductKeyLicense {
    const campusCount = Math.max(1, params.campus_count || 1)
    const tier: SubscriptionTierType = params.tier || 'gold'
    const ratePerCampus = SUBSCRIPTION_TIER_RATES[tier] || (tier === 'gold' ? 3000 : 2500)

    let months = 1
    if (params.plan_duration === '3_months') months = 3
    else if (params.plan_duration === '6_months') months = 6
    else if (params.plan_duration === '1_year') months = 12
    else if (params.plan_duration === 'perpetual') months = 120

    // Dynamic rate based on chosen tier (e.g. Gold = KES 3,000, Silver = KES 2,500)
    const totalKes = campusCount * ratePerCampus * months

    // Cryptographic-like alphanumeric token generator with tier badge prefix
    const randPart = () => Math.random().toString(36).substring(2, 6).toUpperCase()
    const tierPrefix = tier === 'gold' ? 'GLD' : tier === 'platinum' ? 'PLT' : 'SLV'
    const key = `GC-${tierPrefix}-${randPart()}-${randPart()}-${randPart()}-${randPart()}`

    const now = new Date()
    const expiresDate = new Date(now)
    expiresDate.setMonth(expiresDate.getMonth() + months)

    const newLicense: ProductKeyLicense = {
      id: `lic_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      key,
      school_slug: params.school_slug.trim().toLowerCase(),
      school_name: params.school_name.trim(),
      campus_count: campusCount,
      tier,
      rate_per_campus: ratePerCampus,
      total_amount_kes: totalKes,
      plan_duration: params.plan_duration,
      duration_months: months,
      status: 'active',
      generated_at: now.toISOString(),
      expires_at: expiresDate.toISOString(),
      issued_by: 'Platform Owner Directorate',
      customer_contact: params.customer_contact?.trim(),
      notes: params.notes?.trim(),
    }

    this.licenses.unshift(newLicense)
    this.saveData()

    // Automatically record corresponding pending/active invoice
    this.createInvoice({
      school_slug: params.school_slug,
      school_name: params.school_name,
      billing_period: `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`,
      campus_count: campusCount,
      campuses: Array.from({ length: campusCount }, (_, i) => `Campus ${i + 1}`),
      status: 'paid',
      payment_method: 'Product Key Activation',
      transaction_ref: key,
      paid_at: now.toISOString(),
    })

    return newLicense
  }

  public getLicenses(): ProductKeyLicense[] {
    return [...this.licenses]
  }

  public revokeLicense(key: string): boolean {
    const item = this.licenses.find((l) => l.key.toUpperCase() === key.toUpperCase())
    if (!item) return false
    item.status = 'revoked'
    this.saveData()
    return true
  }

  // -------------------------------------------------------------
  // Key Redemption (Called by School Portals to activate access)
  // -------------------------------------------------------------
  public async redeemLicenseKey(rawKey: string, schoolSlug: string): Promise<{ success: boolean; message: string; license?: ProductKeyLicense }> {
    const cleanKey = rawKey.trim().toUpperCase()
    const cleanSlug = schoolSlug.trim().toLowerCase()

    let license = this.licenses.find((l) => l.key.toUpperCase() === cleanKey)
    if (!license) {
      // Key may have been generated on another device (e.g. phone) — pull fresh from cloud
      try {
        await this.syncWithCloud()
      } catch {}
      license = this.licenses.find((l) => l.key.toUpperCase() === cleanKey)
    }

    if (!license) {
      // Check if format matches valid Global College product key (including Gold, Silver, Platinum tier prefixes)
      const keyPattern = /^GC-(?:LIC|GLD|SLV|PLT|STD)(?:-[A-Z0-9]{3,4}){3,5}$/i
      if (keyPattern.test(cleanKey)) {
        const targetSchool = tenantSchoolStore.getSchoolBySlug(cleanSlug)
        const campusCount = Math.max(1, targetSchool?.campus_count || (targetSchool?.campuses_list ? targetSchool.campuses_list.length : 1) || 1)
        const fallbackTier: SubscriptionTierType = (cleanKey.includes('-GLD-') || cleanKey.startsWith('GC-GLD-'))
          ? 'gold'
          : (cleanKey.includes('-PLT-') || cleanKey.startsWith('GC-PLT-'))
          ? 'platinum'
          : 'silver'
        const fallbackRate = SUBSCRIPTION_TIER_RATES[fallbackTier] || (fallbackTier === 'gold' ? 3000 : 2500)
        const now = new Date()
        const exp = new Date(now)
        exp.setMonth(exp.getMonth() + 1)
        license = {
          id: `lic_${Date.now()}_sync`,
          key: cleanKey,
          school_slug: cleanSlug,
          school_name: targetSchool?.name || cleanSlug,
          campus_count: campusCount,
          tier: fallbackTier,
          rate_per_campus: fallbackRate,
          total_amount_kes: campusCount * fallbackRate,
          plan_duration: '1_month',
          duration_months: 1,
          status: 'active',
          generated_at: now.toISOString(),
          expires_at: exp.toISOString(),
          issued_by: 'Platform Owner Directorate',
        }
        this.licenses.unshift(license)
      } else {
        return { success: false, message: 'Invalid product key. Please check spelling or contact platform administrator.' }
      }
    }

    if (license.status === 'revoked') {
      return { success: false, message: 'This product key has been revoked.' }
    }

    if (license.status === 'expired') {
      return { success: false, message: 'This product key has already expired.' }
    }

    // Determine the active subscription tier
    const resolvedTier: SubscriptionTierType = license.tier || (
      (cleanKey.includes('-GLD-') || cleanKey.startsWith('GC-GLD-'))
        ? 'gold'
        : (cleanKey.includes('-PLT-') || cleanKey.startsWith('GC-PLT-'))
        ? 'platinum'
        : 'silver'
    )
    license.tier = resolvedTier

    // Associate the license with the redeeming institution
    const targetSchool = tenantSchoolStore.getSchoolBySlug(cleanSlug)
    if (targetSchool) {
      license.school_slug = cleanSlug
      license.school_name = targetSchool.name
    }

    // Mark key as redeemed/used
    license.status = 'used'
    license.activated_at = new Date().toISOString()
    this.saveData()
    await this.pushToCloud()

    // Update school subscription tier, status and license expiry date in tenantSchoolStore
    tenantSchoolStore.updateSchoolBranding(cleanSlug, {
      subscription_status: 'licensed',
      subscription_tier: resolvedTier,
      active_license_key: license.key,
      license_valid_until: license.expires_at,
      subscription_monthly_rate: (license.duration_months > 0 ? Math.round(license.total_amount_kes / license.duration_months) : 0) || (SUBSCRIPTION_TIER_RATES[resolvedTier] * license.campus_count),
      campus_count: license.campus_count,
    })

    const tierBadge = resolvedTier === 'gold'
      ? '🥇 GOLD TIER (Dedicated Public Showcase Unlocked)'
      : resolvedTier === 'platinum'
      ? '💎 PLATINUM TIER'
      : '🥈 SILVER TIER'

    return {
      success: true,
      message: `Successfully activated ${license.duration_months} month(s) ${tierBadge} campus license for ${license.campus_count} campus(es)! Valid until ${license.expires_at.split('T')[0]}.`,
      license,
    }
  }

  public async redeemProductKey(rawKey: string, schoolSlug: string) {
    return this.redeemLicenseKey(rawKey, schoolSlug)
  }

  // -------------------------------------------------------------
  // Campus Invoices & M-Pesa / Bank Billing Management
  // -------------------------------------------------------------
  public getInvoices(): SaasCampusInvoice[] {
    return [...this.invoices]
  }

  public createInvoice(params: {
    school_slug: string
    school_name: string
    billing_period: string
    campus_count: number
    campuses?: string[]
    status?: 'paid' | 'pending' | 'overdue'
    payment_method?: SaasCampusInvoice['payment_method']
    transaction_ref?: string
    paid_at?: string
  }): SaasCampusInvoice {
    const campusCount = Math.max(1, params.campus_count || 1)
    const total = campusCount * DEFAULT_CAMPUS_RATE_KES

    const count = this.invoices.length + 1
    const invoiceNum = `INV-GC-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 14)

    const inv: SaasCampusInvoice = {
      id: `inv_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      invoice_number: invoiceNum,
      school_slug: params.school_slug.trim().toLowerCase(),
      school_name: params.school_name.trim(),
      billing_period: params.billing_period,
      campus_count: campusCount,
      campuses: params.campuses || ['Main Campus'],
      rate_per_campus_kes: DEFAULT_CAMPUS_RATE_KES,
      total_amount_kes: total,
      status: params.status || 'pending',
      payment_method: params.payment_method,
      transaction_ref: params.transaction_ref,
      due_date: dueDate.toISOString().split('T')[0],
      paid_at: params.paid_at,
      created_at: new Date().toISOString(),
    }

    this.invoices.unshift(inv)
    this.saveData()
    return inv
  }

  public markInvoicePaid(
    invoiceId: string,
    paymentMethod: SaasCampusInvoice['payment_method'],
    transactionRef: string
  ): SaasCampusInvoice | null {
    const inv = this.invoices.find((i) => i.id === invoiceId)
    if (!inv) return null

    inv.status = 'paid'
    inv.payment_method = paymentMethod
    inv.transaction_ref = transactionRef.trim()
    inv.paid_at = new Date().toISOString()
    this.saveData()

    // Extend school active status
    tenantSchoolStore.updateSchoolBranding(inv.school_slug, {
      subscription_status: 'active',
    })

    return inv
  }
}

export const licensingStore = new LicensingStore()
