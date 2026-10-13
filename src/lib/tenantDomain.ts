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
    student: { subdomain: string; path: string }
    teacher: { subdomain: string; path: string }
    bursar: { subdomain: string; path: string }
    principal: { subdomain: string; path: string }
    calendar: { subdomain: string; path: string }
  }
}

/**
 * Returns special links and domain URLs for a given partner school.
 */
export function getTenantDomainLinks(school: PartnerSchoolTenant): TenantDomainLinks {
  const baseDomain = 'globalcollege.edu'
  const isBrowser = typeof window !== 'undefined'
  const currentOrigin = isBrowser ? window.location.origin : `https://${baseDomain}`
  const protocol = isBrowser ? window.location.protocol : 'https:'
  const port = isBrowser && window.location.port ? `:${window.location.port}` : ''

  // Subdomain URL calculation
  // In dev / localhost: slug.localhost:port
  // In production: slug.globalcollege.edu
  let subdomainHost = `${school.slug}.${baseDomain}`
  if (isBrowser && window.location.hostname.includes('localhost')) {
    subdomainHost = `${school.slug}.localhost${port}`
  }

  const subdomainUrl = `${protocol}//${subdomainHost}`
  const pathUrl = `${currentOrigin}/s/${school.slug}`
  const customDomainUrl = school.custom_domain
    ? school.custom_domain.startsWith('http')
      ? school.custom_domain
      : `https://${school.custom_domain}`
    : null

  return {
    subdomain: `${school.slug}.${baseDomain}`,
    subdomainUrl,
    pathUrl,
    customDomainUrl,
    portals: {
      hub: {
        subdomain: `${subdomainUrl}/`,
        path: `${pathUrl}`,
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
        subdomain: `${subdomainUrl}/principal`,
        path: `${pathUrl}/principal`,
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
 * Examples:
 * - "hillcrest.globalcollege.edu" -> slug "hillcrest"
 * - "hillcrest.localhost" -> slug "hillcrest"
 * - "portal.hillcrest.edu" -> matched against school.custom_domain
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
    'globalcollege.edu',
    'www.globalcollege.edu',
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    'smart-009.github.io',
    'brent1_college',
  ]
  if (nonTenantHosts.includes(cleanHost)) {
    return null
  }

  // 3. Check *.globalcollege.edu
  if (cleanHost.endsWith('.globalcollege.edu')) {
    const slug = cleanHost.slice(0, -'.globalcollege.edu'.length)
    const found = schools.find((s) => s.slug.toLowerCase() === slug)
    if (found) {
      return { school: found, matchedVia: 'subdomain' }
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
