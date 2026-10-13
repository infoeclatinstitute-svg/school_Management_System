// ============================================================
// Global College — High-Quality Course Photography Registry
// Curated, crisp, high-resolution Unsplash imagery tailored
// directly to each academic program and professional domain.
// ============================================================

export const COURSE_IMAGES: Record<string, string> = {
  // 1. Tech & Programming
  'c-coding':
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80', // Full-Stack Web Development & Modern JavaScript
  'c-python':
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80', // Python Programming & Data Analytics
  'c-cyber':
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80', // Cybersecurity Fundamentals & Ethical Hacking
  'c-spss-r':
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80', // Data Analysis with SPSS, STATA & R Studio
  'c-comp':
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80', // Computer Packages & ICDL Digital Literacy

  // 2. Business, Finance & Executive Leadership
  'c-accounting':
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80', // Computerized Accounting & QuickBooks
  'c-pmp':
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80', // PMP Project Management
  'c-fmva':
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80', // Financial Modeling & Valuation Analyst (FMVA)
  'c-cma':
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80', // Certified Management Accountant (CMA)
  'c-sixsigma':
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80', // Lean Six Sigma Green & Black Belt
  'c-cbap':
    'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80', // Certified Business Analysis Professional (CBAP)
  'c-cscp':
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80', // Supply Chain Professional (CSCP)
  'c-shrm':
    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80', // Human Resource Management (SHRM-CP/SCP)
  'c-growth-mkt':
    'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?auto=format&fit=crop&w=800&q=80', // Digital Growth Marketing & Performance Ads
  'c-forex-trading':
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80', // Professional Forex, Crypto & Stock Trading
  'c-algo-forex':
    'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=800&q=80', // Algorithmic Trading & MQL5 Bot Dev

  // 3. Languages & International Exams
  'c-ielts':
    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80', // IELTS Academic & General Training Masterclass
  'c-english':
    'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80', // English for Professionals & Corporate Communication
  'c-foreign-lang':
    'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=800&q=80', // Foreign Languages (French, German, Spanish, Mandarin, Arabic)
}

/**
 * Fallback topic and category mapper for course photo resolutions
 */
export function getCoursePhoto(courseId?: string, category?: string, title?: string): string {
  if (courseId && COURSE_IMAGES[courseId]) {
    return COURSE_IMAGES[courseId]
  }

  const text = `${courseId || ''} ${category || ''} ${title || ''}`.toLowerCase()

  if (text.includes('python')) {
    return 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80'
  }
  if (text.includes('code') || text.includes('web') || text.includes('react') || text.includes('software') || text.includes('javascript')) {
    return 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80'
  }
  if (text.includes('cyber') || text.includes('security') || text.includes('hack')) {
    return 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80'
  }
  if (text.includes('data') || text.includes('spss') || text.includes('analytics') || text.includes('stata')) {
    return 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80'
  }
  if (text.includes('forex') || text.includes('trading') || text.includes('stock') || text.includes('crypto')) {
    return 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80'
  }
  if (text.includes('accounting') || text.includes('quickbooks') || text.includes('finance') || text.includes('fmva')) {
    return 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80'
  }
  if (text.includes('ielts') || text.includes('language') || text.includes('english') || text.includes('french') || text.includes('german')) {
    return 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80'
  }
  if (text.includes('math')) {
    return 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80'
  }
  if (text.includes('physic') || text.includes('science')) {
    return 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=800&q=80'
  }
  if (text.includes('chem')) {
    return 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?auto=format&fit=crop&w=800&q=80'
  }
  if (text.includes('bio')) {
    return 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=800&q=80'
  }

  // Fallback high quality academic education banner
  return 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80'
}
