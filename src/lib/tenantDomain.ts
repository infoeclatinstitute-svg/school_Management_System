// ============================================================
// Global College — Multi-Tenant Domain & Subdomain Resolution
// ============================================================

import type { PartnerSchoolTenant } from '@/types/tenantSchool'

export interface TenantDomainLinks {
  subdomain: string
  subdomainUrl: string
  pathUrl: string
  customDomainUrl: string | null
  portals: {
    hub: { subdomain: string; path: string }
    admin: { subdomain: string; path: string }
    student: { subdomain: string; path: string }
    teacher: { subdomain: string; path: string }
    bursar: { subdomain: string; path: string }
    principal: { subdomain: string; path: string }
    parent: { subdomain: string; path: string }
    billing: { subdomain: string; path: string }
    calendar: { subdomain: string; path: string }
  }
}

/**
 * Returns special links and domain URLs for a given partner school.
 */
export function getTenantDomainLinks(school: PartnerSchoolTenant): TenantDomainLinks {
  const isDev = Boolean(import.meta.env.DEV)
  const isBrowser = typeof window !== 'undefined'
  const baseDomain = isBrowser ? window.location.host : 'cloud.eclat.institute'
  const currentOrigin = isBrowser ? window.location.origin : 'https://cloud.eclat.institute'
  const protocol = isBrowser ? window.location.protocol : 'https:'
  const port = isBrowser && window.location.port ? `:${window.location.port}` : ''
  const hostOnly = isBrowser ? window.location.hostname.toLowerCase() : ''

  // Determine base host (e.g. cloud.eclat.institute or localhost:5173 during local dev)
  let platformHost = baseDomain
  if (hostOnly === 'localhost' || hostOnly === '127.0.0.1' || hostOnly.endsWith('.localhost')) {
    platformHost = isDev ? `localhost${port}` : 'cloud.eclat.institute'
  } else if (hostOnly) {
    const parts = hostOnly.split('.')
    // If we're already on a tenant subdomain (e.g. prime.cloud.domain.com with 4+ parts),
    // strip the leading subdomain part so we get cloud.domain.com
    if (parts.length > 3) {
      platformHost = parts.slice(1).join('.') + port
    }
  } else {
    platformHost = 'cloud.eclat.institute'
  }

  let subdomainHost = `${school.slug}.${platformHost}`
  if (isDev && hostOnly.includes('localhost')) {
    subdomainHost = `${school.slug}.localhost${port}`
  }

  const effectiveProtocol = isDev && protocol === 'http:' ? 'http:' : 'https:'
  const subdomainUrl = `${effectiveProtocol}//${subdomainHost}`

  const isLocalOrigin =
    currentOrigin.includes('localhost') ||
    currentOrigin.includes('127.0.0.1') ||
    currentOrigin.startsWith('capacitor:') ||
    currentOrigin.startsWith('ionic:') ||
    currentOrigin.startsWith('file:')

  const effectiveOrigin = !isDev && isLocalOrigin ? 'https://cloud.eclat.institute' : currentOrigin
  const pathUrl = `${effectiveOrigin}/s/${school.slug}`
  const customDomainUrl = school.custom_domain
    ? school.custom_domain.startsWith('http')
      ? school.custom_domain
      : `https://${school.custom_domain}`
    : null

  return {
    subdomain: `${school.slug}.${platformHost}`,
    subdomainUrl,
    pathUrl,
    customDomainUrl,
    portals: {
      hub: {
        subdomain: `${subdomainUrl}/`,
        path: `${pathUrl}`,
      },
      admin: {
        subdomain: `${subdomainUrl}/admin`,
        path: `${pathUrl}/principal`,
      },
      student: {
        subdomain: `${subdomainUrl}/student`,
        path: `${pathUrl}/student`,
      },
      teacher: {
        subdomain: `${subdomainUrl}/teacher`,
        path: `${pathUrl}/teacher`,
      },
      bursar: {
        subdomain: `${subdomainUrl}/bursar`,
        path: `${pathUrl}/bursar`,
      },
      principal: {
        subdomain: `${subdomainUrl}/admin`,
        path: `${pathUrl}/principal`,
      },
      parent: {
        subdomain: `${subdomainUrl}/parent`,
        path: `${pathUrl}/parent`,
      },
      billing: {
        subdomain: `${subdomainUrl}/billing`,
        path: `${pathUrl}/billing`,
      },
      calendar: {
        subdomain: `${subdomainUrl}/calendar`,
        path: `${pathUrl}/calendar`,
      },
    },
  }
}

/**
 * Auto-detects if the current browser hostname is a tenant subdomain or custom domain.
 */
export function detectTenantFromHost(
  hostname: string,
  schools: PartnerSchoolTenant[]
): { school: PartnerSchoolTenant; matchedVia: 'subdomain' | 'custom_domain' } | null {
  if (!hostname) return null

  const cleanHost = hostname.toLowerCase().trim().replace(/:\d+$/, '')

  // 1. Check custom mapped domain
  for (const school of schools) {
    if (school.custom_domain) {
      const cleanCustom = school.custom_domain
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .replace(/:\d+$/, '')
        .trim()
      if (cleanHost === cleanCustom) {
        return { school, matchedVia: 'custom_domain' }
      }
    }
  }

  // 2. Check standard base domains that are NOT tenant subdomains
  const nonTenantHosts = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
  ]
  if (nonTenantHosts.includes(cleanHost)) {
    return null
  }

  // 3. Check subdomain if hostname has more than 2 segments (e.g. prime.cloud.domain)
  const parts = cleanHost.split('.')
  if (parts.length > 2) {
    const slug = parts[0]
    if (slug && slug !== 'www' && slug !== 'cloud' && slug !== 'app') {
      const found = schools.find((s) => s.slug.toLowerCase() === slug)
      if (found) {
        return { school: found, matchedVia: 'subdomain' }
      }
    }
  }

  // 4. Check *.localhost (for local testing)
  if (cleanHost.endsWith('.localhost')) {
    const slug = cleanHost.slice(0, -'.localhost'.length)
    const found = schools.find((s) => s.slug.toLowerCase() === slug)
    if (found) {
      return { school: found, matchedVia: 'subdomain' }
    }
  }

  return null
}
