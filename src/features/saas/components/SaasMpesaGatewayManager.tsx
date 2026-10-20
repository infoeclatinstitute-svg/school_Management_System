import React, { useState } from 'react'
import { mpesaDarajaService, DEFAULT_MANUAL_MPESA_NUMBER, type DarajaConfig } from '@/lib/mpesaDarajaService'

export function SaasMpesaGatewayManager() {
  const [config, setConfig] = useState<DarajaConfig>(() => mpesaDarajaService.getConfig())
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testAmount, setTestAmount] = useState(10)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  const status = mpesaDarajaService.getStatus()

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    mpesaDarajaService.updateConfig(config)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const handleTestStk = async () => {
    if (!testPhone.trim()) return
    setTestLoading(true)
    setTestResult(null)
    const res = await mpesaDarajaService.initiateStkPush({
      phoneNumber: testPhone,
      amount: testAmount,
      accountReference: 'SAAS-TEST',
      transactionDesc: 'Gateway Test Ping',
    })
    setTestResult(res)
    setTestLoading(false)
  }

  return (
    <div style={{ background: '#131b2e', borderRadius: '24px', padding: '1.75rem', border: '1px solid #1e293b' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f8fafc', margin: '0 0 0.35rem' }}>
            📲 Safaricom M-Pesa Daraja Gateway Settings
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.84rem', margin: 0 }}>
            Configure automated STK Push (Lipa Na M-Pesa Online) credentials. Dynamic configuration — zero hardcoded API keys.
          </p>
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: status.isConfigured ? '#064e3b' : '#1e293b',
          color: status.isConfigured ? '#34d399' : '#94a3b8',
          border: '1px solid ' + (status.isConfigured ? '#059669' : '#334155'),
          padding: '6px 14px',
          borderRadius: '999px',
          fontSize: '0.76rem',
          fontWeight: 800,
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: status.isConfigured ? '#10b981' : '#64748b' }} />
          <span>{status.isConfigured ? `${config.environment.toUpperCase()} DARAJA ACTIVE` : 'MANUAL VERIFICATION MODE'}</span>
        </div>
      </div>

      <div style={{ background: '#0a0f1d', borderRadius: '16px', padding: '1.25rem', border: '1px solid #1e293b', marginBottom: '1.75rem', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.6 }}>
        <strong style={{ color: '#f8fafc' }}>📌 Integration Status &amp; Guidance:</strong>
        <p style={{ margin: '4px 0 8px' }}>
          {status.message}
        </p>
        <div style={{ color: '#94a3b8', fontSize: '0.76rem' }}>
          If you have not yet purchased or activated Safaricom Daraja API credentials, leave the fields blank or unchecked. The entire platform will smoothly operate on the verified manual M-Pesa business line (<code>{DEFAULT_MANUAL_MPESA_NUMBER}</code>) with serial receipt generation and admin key activation.
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 800, color: '#f8fafc' }}>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
            />
            Enable Automated Safaricom Daraja STK Push Gateway
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '6px' }}>
              ENVIRONMENT
            </label>
            <select
              value={config.environment}
              onChange={(e) => setConfig({ ...config, environment: e.target.value as 'sandbox' | 'live' })}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '10px',
                background: '#0a0f1d',
                border: '1px solid #334155',
                color: '#ffffff',
                fontSize: '0.88rem',
              }}
            >
              <option value="sandbox">Sandbox (Testing / Daraja Portal)</option>
              <option value="live">Production / Live (Live Safaricom Go)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '6px' }}>
              BUSINESS SHORTCODE / PAYBILL / TILL
            </label>
            <input
              type="text"
              placeholder="e.g. 174379 (Sandbox) or Paybill Number"
              value={config.shortCode}
              onChange={(e) => setConfig({ ...config, shortCode: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '10px',
                background: '#0a0f1d',
                border: '1px solid #334155',
                color: '#ffffff',
                fontSize: '0.88rem',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '6px' }}>
              DARAJA CONSUMER KEY
            </label>
            <input
              type="password"
              placeholder="Paste Daraja Consumer Key..."
              value={config.consumerKey}
              onChange={(e) => setConfig({ ...config, consumerKey: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '10px',
                background: '#0a0f1d',
                border: '1px solid #334155',
                color: '#ffffff',
                fontSize: '0.88rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '6px' }}>
              DARAJA CONSUMER SECRET
            </label>
            <input
              type="password"
              placeholder="Paste Daraja Consumer Secret..."
              value={config.consumerSecret}
              onChange={(e) => setConfig({ ...config, consumerSecret: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '10px',
                background: '#0a0f1d',
                border: '1px solid #334155',
                color: '#ffffff',
                fontSize: '0.88rem',
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', marginBottom: '6px' }}>
            LIPA NA M-PESA PASSKEY
          </label>
          <input
            type="password"
            placeholder="Paste Lipa Na M-Pesa Online Passkey..."
            value={config.passkey}
            onChange={(e) => setConfig({ ...config, passkey: e.target.value })}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '10px',
              background: '#0a0f1d',
              border: '1px solid #334155',
              color: '#ffffff',
              fontSize: '0.88rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
          <div>
            {saveSuccess && (
              <span style={{ color: '#34d399', fontSize: '0.84rem', fontWeight: 800 }}>
                ✓ M-Pesa gateway configuration saved securely!
              </span>
            )}
          </div>
          <button
            type="submit"
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '0.75rem 1.75rem',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
            }}
          >
            💾 Save Gateway Settings
          </button>
        </div>
      </form>

      {/* STK Push Handset Test Bench */}
      <div style={{ borderTop: '1px dashed #334155', marginTop: '2rem', paddingTop: '1.5rem' }}>
        <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 900, color: '#f8fafc' }}>
          🧪 Test STK Push Prompt
        </h4>
        <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: '0 0 1rem' }}>
          Test the phone number normalization and STK payload dispatch to verify compatibility.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="tel"
            placeholder="07XX XXX XXX or 254..."
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            style={{
              flex: 1,
              minWidth: '220px',
              padding: '0.65rem 0.85rem',
              borderRadius: '10px',
              background: '#0a0f1d',
              border: '1px solid #334155',
              color: '#ffffff',
              fontSize: '0.85rem',
            }}
          />
          <input
            type="number"
            min={1}
            value={testAmount}
            onChange={(e) => setTestAmount(Number(e.target.value))}
            style={{
              width: '100px',
              padding: '0.65rem 0.85rem',
              borderRadius: '10px',
              background: '#0a0f1d',
              border: '1px solid #334155',
              color: '#ffffff',
              fontSize: '0.85rem',
            }}
          />
          <button
            type="button"
            disabled={testLoading || !testPhone.trim()}
            onClick={handleTestStk}
            style={{
              background: testLoading ? '#334155' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: testLoading || !testPhone.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {testLoading ? 'Pinging Safaricom...' : 'Send STK Test Prompt'}
          </button>
        </div>

        {testResult && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            borderRadius: '12px',
            background: testResult.success ? '#064e3b' : '#7f1d1d',
            border: '1px solid ' + (testResult.success ? '#059669' : '#991b1b'),
            fontSize: '0.8rem',
            color: '#f8fafc',
          }}>
            <div style={{ fontWeight: 800, marginBottom: '4px' }}>
              {testResult.success ? '✓ Dispatch Successful' : '✕ Request Notice'} ({testResult.mode})
            </div>
            <div>{testResult.customerMessage || testResult.error}</div>
            {testResult.fallbackPaymentNumber && (
              <div style={{ marginTop: '6px', color: '#fde047', fontSize: '0.75rem' }}>
                Fallback manual payment number: {testResult.fallbackPaymentNumber}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
