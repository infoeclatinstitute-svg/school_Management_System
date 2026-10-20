// ============================================================
// Global College — Safaricom M-Pesa Daraja API Integration Service
// ============================================================
// Zero Hardcoded Credentials — Dynamic configuration via Environment
// variables or Master SaaS Admin Portal settings.
// ============================================================

export interface DarajaConfig {
  enabled: boolean
  environment: 'sandbox' | 'live'
  consumerKey: string
  consumerSecret: string
  passkey: string
  shortCode: string
  tillNumber?: string
  callbackUrl: string
  accountReferencePrefix: string
}

export interface StkPushRequestParams {
  phoneNumber: string
  amount: number
  accountReference: string
  transactionDesc: string
}

export interface StkPushResponse {
  success: boolean
  mode: 'daraja_live' | 'daraja_sandbox' | 'manual_fallback'
  merchantRequestId?: string
  checkoutRequestId?: string
  responseCode?: string
  responseDescription?: string
  customerMessage?: string
  fallbackPaymentNumber?: string
  error?: string
}

const STORAGE_KEY = 'gc_daraja_api_config'
export const DEFAULT_MANUAL_MPESA_NUMBER = '0740027346'

class MpesaDarajaService {
  private config: DarajaConfig

  constructor() {
    this.config = this.loadConfig()
  }

  private loadConfig(): DarajaConfig {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          return {
            enabled: Boolean(parsed.enabled),
            environment: parsed.environment === 'live' ? 'live' : 'sandbox',
            consumerKey: parsed.consumerKey || '',
            consumerSecret: parsed.consumerSecret || '',
            passkey: parsed.passkey || '',
            shortCode: parsed.shortCode || '',
            tillNumber: parsed.tillNumber || '',
            callbackUrl: parsed.callbackUrl || '',
            accountReferencePrefix: parsed.accountReferencePrefix || 'GC',
          }
        }
      } catch {
        // Fallback
      }
    }

    // Default to dynamic environment variables or empty (manual reconciliation mode)
    const env = (import.meta as any).env || {}
    const isLive = env.VITE_DARAJA_ENVIRONMENT === 'live'
    return {
      enabled: Boolean(env.VITE_DARAJA_ENABLED === 'true' && env.VITE_DARAJA_CONSUMER_KEY),
      environment: isLive ? 'live' : 'sandbox',
      consumerKey: env.VITE_DARAJA_CONSUMER_KEY || '',
      consumerSecret: env.VITE_DARAJA_CONSUMER_SECRET || '',
      passkey: env.VITE_DARAJA_PASSKEY || '',
      shortCode: env.VITE_DARAJA_SHORTCODE || '',
      tillNumber: env.VITE_DARAJA_TILL_NUMBER || '',
      callbackUrl: env.VITE_DARAJA_CALLBACK_URL || '',
      accountReferencePrefix: 'GC',
    }
  }

  public getConfig(): DarajaConfig {
    return { ...this.config }
  }

  public updateConfig(newConfig: Partial<DarajaConfig>): DarajaConfig {
    this.config = {
      ...this.config,
      ...newConfig,
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config))
      } catch {
        // Offline
      }
    }
    return { ...this.config }
  }

  public isConfigured(): boolean {
    return (
      Boolean(this.config.enabled) &&
      Boolean(this.config.consumerKey.trim()) &&
      Boolean(this.config.consumerSecret.trim()) &&
      Boolean(this.config.passkey.trim()) &&
      Boolean(this.config.shortCode.trim())
    )
  }

  public getStatus(): {
    isConfigured: boolean
    mode: 'daraja_live' | 'daraja_sandbox' | 'manual_reconciliation'
    message: string
  } {
    if (!this.isConfigured()) {
      return {
        isConfigured: false,
        mode: 'manual_reconciliation',
        message: `Daraja API Key not active. System is operating in verified manual reconciliation mode (M-Pesa: ${DEFAULT_MANUAL_MPESA_NUMBER}).`,
      }
    }

    return {
      isConfigured: true,
      mode: this.config.environment === 'live' ? 'daraja_live' : 'daraja_sandbox',
      message: `M-Pesa Daraja automated STK Push is ACTIVE in ${this.config.environment.toUpperCase()} mode (Shortcode: ${this.config.shortCode}).`,
    }
  }

  /** Formats a phone number to standard 2547XXXXXXXX or 2541XXXXXXXX format */
  public formatPhoneNumber(phone: string): string {
    let clean = phone.replace(/\D/g, '')
    if (clean.startsWith('0')) {
      clean = '254' + clean.slice(1)
    } else if (clean.startsWith('7') || clean.startsWith('1')) {
      clean = '254' + clean
    } else if (clean.startsWith('+254')) {
      clean = clean.replace('+', '')
    }
    return clean
  }

  /**
   * Initiates Lipa Na M-Pesa Online (STK Push).
   * If credentials are not yet configured by the administrator,
   * it returns a graceful fallback response with manual reconciliation instructions.
   */
  public async initiateStkPush(params: StkPushRequestParams): Promise<StkPushResponse> {
    const formattedPhone = this.formatPhoneNumber(params.phoneNumber)

    if (!this.isConfigured()) {
      // Graceful unhardcoded fallback
      return {
        success: true,
        mode: 'manual_fallback',
        fallbackPaymentNumber: DEFAULT_MANUAL_MPESA_NUMBER,
        customerMessage: `Daraja API is operating in manual verification mode. Please transfer KES ${params.amount.toLocaleString()} to M-Pesa ${DEFAULT_MANUAL_MPESA_NUMBER} with reference "${params.accountReference}".`,
      }
    }

    try {
      const baseUrl =
        this.config.environment === 'live'
          ? 'https://api.safaricom.co.ke'
          : 'https://sandbox.safaricom.co.ke'

      // 1. Fetch OAuth Access Token
      const authHeader = btoa(`${this.config.consumerKey.trim()}:${this.config.consumerSecret.trim()}`)
      const tokenRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${authHeader}`,
        },
      })

      if (!tokenRes.ok) {
        throw new Error(`Failed to authenticate with Safaricom Daraja (${tokenRes.status})`)
      }

      const tokenData = await tokenRes.json()
      const accessToken = tokenData.access_token

      // 2. Generate Timestamp and Password
      const now = new Date()
      const timestamp =
        now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0')

      const rawPassword = `${this.config.shortCode.trim()}${this.config.passkey.trim()}${timestamp}`
      const password = btoa(rawPassword)

      // 3. Send STK Push Payload
      const stkPayload = {
        BusinessShortCode: this.config.shortCode.trim(),
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(params.amount),
        PartyA: formattedPhone,
        PartyB: this.config.shortCode.trim(),
        PhoneNumber: formattedPhone,
        CallBackURL: this.config.callbackUrl || 'https://cloud.globalcollege.ac.ke/api/mpesa/callback',
        AccountReference: `${this.config.accountReferencePrefix}-${params.accountReference}`,
        TransactionDesc: params.transactionDesc || 'Tuition Fee Payment',
      }

      const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stkPayload),
      })

      const stkData = await stkRes.json()

      if (stkData.ResponseCode === '0') {
        return {
          success: true,
          mode: this.config.environment === 'live' ? 'daraja_live' : 'daraja_sandbox',
          merchantRequestId: stkData.MerchantRequestID,
          checkoutRequestId: stkData.CheckoutRequestID,
          responseCode: stkData.ResponseCode,
          responseDescription: stkData.ResponseDescription,
          customerMessage: stkData.CustomerMessage || 'STK Push sent to your handset. Please enter your M-Pesa PIN.',
        }
      } else {
        return {
          success: false,
          mode: this.config.environment === 'live' ? 'daraja_live' : 'daraja_sandbox',
          responseCode: stkData.ResponseCode,
          error: stkData.ResponseDescription || 'Safaricom declined the STK Push request.',
          fallbackPaymentNumber: DEFAULT_MANUAL_MPESA_NUMBER,
        }
      }
    } catch (err: any) {
      return {
        success: false,
        mode: 'manual_fallback',
        error: err.message || 'Network error communicating with Safaricom Daraja.',
        fallbackPaymentNumber: DEFAULT_MANUAL_MPESA_NUMBER,
        customerMessage: `Online STK prompt could not be completed. Please pay KES ${params.amount.toLocaleString()} manually to M-Pesa ${DEFAULT_MANUAL_MPESA_NUMBER} with reference "${params.accountReference}".`,
      }
    }
  }
}

export const mpesaDarajaService = new MpesaDarajaService()
