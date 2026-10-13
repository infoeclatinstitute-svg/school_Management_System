import { useState, useEffect, useRef } from 'react'
import { startContinuousSchoolBell, stopContinuousSchoolBell } from '@/lib/soundEffects'
import { useAuth } from '@/hooks/useAuth'
import { schoolStore } from '@/lib/schoolData'

interface LiveClassSchedule {
  id: string
  title: string
  shift: string
  startTime: string
  warningTime: string
  endTime: string
  instructor: string
  joinUrl: string
  course: string
  days: string[]
}

function parseTimeFromText(scheduleText: string): { startTime: string; warningTime: string; endTime: string; days: string[] } {
  const days: string[] = []
  const textLower = scheduleText.toLowerCase()
  if (textLower.includes('mon')) days.push('Monday')
  if (textLower.includes('tue')) days.push('Tuesday')
  if (textLower.includes('wed')) days.push('Wednesday')
  if (textLower.includes('thu')) days.push('Thursday')
  if (textLower.includes('fri')) days.push('Friday')
  if (textLower.includes('sat')) days.push('Saturday')
  if (textLower.includes('sun')) days.push('Sunday')
  if (days.length === 0) days.push('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')

  // Match times like 7:30 PM, 08:30 AM, 5:30 PM, etc.
  const timeMatches = scheduleText.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/gi)
  let startH = 19
  let startM = 30
  let endH = 21
  let endM = 30

  if (timeMatches && timeMatches.length >= 1) {
    const parseSingle = (raw: string) => {
      const parts = raw.trim().split(/[:\s]/)
      let h = parseInt(parts[0], 10)
      const m = parseInt(parts[1], 10) || 0
      const isPM = /pm/i.test(raw)
      const isAM = /am/i.test(raw)
      if (isPM && h < 12) h += 12
      if (isAM && h === 12) h = 0
      return { h, m }
    }
    const s = parseSingle(timeMatches[0])
    startH = s.h
    startM = s.m

    if (timeMatches.length >= 2) {
      const e = parseSingle(timeMatches[1])
      endH = e.h
      endM = e.m
    } else {
      endH = (startH + 2) % 24
      endM = startM
    }
  }

  // 10 minutes prior warning time
  let warnH = startH
  let warnM = startM - 10
  if (warnM < 0) {
    warnM += 60
    warnH = (warnH - 1 + 24) % 24
  }

  return {
    startTime: `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`,
    warningTime: `${warnH.toString().padStart(2, '0')}:${warnM.toString().padStart(2, '0')}`,
    endTime: `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`,
    days,
  }
}

function getStudentScheduledClasses(profile: any): LiveClassSchedule[] {
  const studentIdentifier = profile?.admission_number || profile?.id || profile?.email || ''
  const myUnits = profile ? schoolStore.getRegisteredUnitsForStudent(studentIdentifier) : []
  
  const allStudents = schoolStore.getStudents()
  const currentStudent = allStudents.find(
    (s) => s.id === profile?.id || s.admission_number === profile?.admission_number || (profile?.email && s.guardian?.email === profile?.email)
  )

  const allUnits = schoolStore.getCourseUnits().filter((u) => u.is_published !== false)
  const allSubjects = schoolStore.getSubjects()
  const timetable = schoolStore.getTimetable()

  let targetedUnits = myUnits
  if (targetedUnits.length === 0 && currentStudent) {
    if (currentStudent.enrolled_courses?.length) {
      const set = new Set(currentStudent.enrolled_courses.map((c) => c.toLowerCase().trim()))
      targetedUnits = allUnits.filter(
        (u) => set.has(u.id.toLowerCase()) || set.has(u.title.toLowerCase()) || set.has(u.code.toLowerCase())
      )
    }
    if (targetedUnits.length === 0 && currentStudent.class_name) {
      const cname = currentStudent.class_name.toLowerCase().trim()
      targetedUnits = allUnits.filter(
        (u) => u.title.toLowerCase().includes(cname) || cname.includes(u.title.toLowerCase()) || (u.program && cname.includes(u.program.toLowerCase()))
      )
    }
  }

  if (targetedUnits.length === 0) {
    targetedUnits = allUnits
  }

  const list: LiveClassSchedule[] = []

  // 1. Map from units
  for (const unit of targetedUnits) {
    const matchedSub = allSubjects.find((s) => s.code?.toLowerCase() === unit.code?.toLowerCase() || s.name?.toLowerCase() === unit.title?.toLowerCase())
    const schedText = unit.live_schedule_text || matchedSub?.duration || 'Mon, Wed & Fri: 7:30 PM - 9:30 PM EAT'
    const sched = parseTimeFromText(schedText)
    list.push({
      id: `c-bell-${unit.id}`,
      title: unit.title,
      shift: schedText,
      startTime: sched.startTime,
      warningTime: sched.warningTime,
      endTime: sched.endTime,
      instructor: unit.teacher_name || 'Faculty Lecturer',
      joinUrl: unit.live_meeting_url || 'https://meet.google.com',
      course: unit.title,
      days: sched.days,
    })
  }

  // 2. Also map from timetable periods
  if (currentStudent) {
    const studentPeriods = timetable.filter(
      (t) =>
        t.class_name?.toLowerCase().includes(currentStudent.class_name?.toLowerCase() || '') ||
        t.class_id === currentStudent.class_id ||
        (currentStudent.enrolled_courses?.some((ec) => t.subject_name.toLowerCase().includes(ec.toLowerCase())))
    )
    for (const p of studentPeriods) {
      if (!list.some((l) => l.title.toLowerCase() === p.subject_name.toLowerCase())) {
        const warnH = parseInt(p.start_time.split(':')[0], 10)
        const warnM = parseInt(p.start_time.split(':')[1], 10) - 10
        const formattedWarn = `${(warnM < 0 ? (warnH - 1 + 24) % 24 : warnH).toString().padStart(2, '0')}:${(warnM < 0 ? warnM + 60 : warnM).toString().padStart(2, '0')}`
        list.push({
          id: `c-period-${p.id}`,
          title: p.subject_name,
          shift: `${p.day_of_week} • ${p.start_time} - ${p.end_time} (${p.room || 'Virtual Class'})`,
          startTime: p.start_time,
          warningTime: formattedWarn,
          endTime: p.end_time,
          instructor: p.teacher_name || 'Faculty Lecturer',
          joinUrl: 'https://meet.google.com',
          course: p.subject_name,
          days: [p.day_of_week],
        })
      }
    }
  }

  return list.length > 0 ? list : [
    {
      id: 'c-default',
      title: 'Graphics Design & Animation',
      shift: 'Mon, Wed & Fri: 7:30 PM - 9:30 PM EAT',
      startTime: '19:30',
      warningTime: '19:20',
      endTime: '21:30',
      instructor: 'Faculty Lecturer',
      joinUrl: 'https://meet.google.com',
      course: 'Graphics Design & Animation',
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
  ]
}

export function ClassBellReminderModal() {
  const { profile } = useAuth()
  const [activeAlert, setActiveAlert] = useState<LiveClassSchedule | null>(null)
  const [alertType, setAlertType] = useState<'starting_now' | '10min_warning'>('starting_now')
  const [isRinging, setIsRinging] = useState(false)
  const [bellMuted, setBellMuted] = useState(false)
  const lastRingTimestamp = useRef<number>(0)

  // Request native OS background push & notification permission
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission().catch(() => {})
      }
    }
  }, [])

  // Send native OS background push notification (works when app is in background or screen is locked)
  const sendBackgroundNotification = (title: string, body: string, url: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            body,
            icon: '/logo.png?v=2',
            badge: '/logo.png?v=2',
            vibrate: [500, 200, 500, 200, 500, 200, 1000],
            data: { url },
            tag: 'class-bell-reminder',
            renotify: true,
            requireInteraction: true, // Persists until user interacts with notification
            actions: [
              { action: 'join', title: '🚀 Join Live Class' },
              { action: 'mute', title: '🔇 Mute Alarm' },
            ],
          } as any)
        })
      } else {
        new Notification(title, {
          body,
          icon: '/logo.png?v=2',
          requireInteraction: true,
        } as any)
      }
    } catch (err) {
      console.warn('Background notification error:', err)
    }
  }

  // Trigger bell sound continuously, native notification, and open reminder modal
  const triggerBellAlert = (schedule: LiveClassSchedule, type: 'starting_now' | '10min_warning' = 'starting_now') => {
    setActiveAlert(schedule)
    setAlertType(type)
    setIsRinging(true)

    // Continuous ringing loop until user mutes or acknowledges
    if (!bellMuted) {
      startContinuousSchoolBell()
    }

    const notifTitle = type === '10min_warning'
      ? `🔔 Class in 10 Mins: ${schedule.course}`
      : `🔔 Live Class Starting Now: ${schedule.course}`

    const notifBody = type === '10min_warning'
      ? `Your live lecture with ${schedule.instructor} begins in 10 minutes (${schedule.startTime}). Prepare your workspace!`
      : `Class is live now! Join your interactive video lecture with ${schedule.instructor}.`

    sendBackgroundNotification(notifTitle, notifBody, schedule.joinUrl)
  }

  // Handle Mute / Dismiss actions
  const handleAcknowledgeAndClose = () => {
    stopContinuousSchoolBell()
    setIsRinging(false)
    setActiveAlert(null)
  }

  const handleMuteOnly = () => {
    stopContinuousSchoolBell()
    setIsRinging(false)
  }

  const handleTestRing = () => {
    setIsRinging(true)
    startContinuousSchoolBell()
  }

  // Periodic automatic class time detector configured to student's program and time
  useEffect(() => {
    const checkSchedule = () => {
      const scheduledClasses = getStudentScheduledClasses(profile)
      const now = new Date()
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' })
      const currentHours = now.getHours().toString().padStart(2, '0')
      const currentMinutes = now.getMinutes().toString().padStart(2, '0')
      const currentTimeStr = `${currentHours}:${currentMinutes}`

      for (const cls of scheduledClasses) {
        if (!cls.days.includes(currentDay)) continue

        const timeSinceLastRing = Date.now() - lastRingTimestamp.current
        if (timeSinceLastRing < 120000) continue // Prevent re-triggering within 2 minutes

        // 1. Check exact Start Time
        if (cls.startTime === currentTimeStr) {
          lastRingTimestamp.current = Date.now()
          triggerBellAlert(cls, 'starting_now')
          break
        }

        // 2. Check 10-Minute Prior Warning Time
        if (cls.warningTime === currentTimeStr) {
          lastRingTimestamp.current = Date.now()
          triggerBellAlert(cls, '10min_warning')
          break
        }
      }
    }

    const interval = setInterval(checkSchedule, 15000) // Check every 15 seconds
    checkSchedule()
    return () => clearInterval(interval)
  }, [profile, bellMuted])

  // Listen for manual trigger (e.g. from School Bell button in Navbar)
  useEffect(() => {
    const handleManualRing = () => {
      if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission().catch(() => {})
      }
      const scheduledClasses = getStudentScheduledClasses(profile)
      const activeOrFirst = scheduledClasses[0]
      triggerBellAlert(activeOrFirst, 'starting_now')
    }

    window.addEventListener('gc-ring-school-bell', handleManualRing)
    return () => window.removeEventListener('gc-ring-school-bell', handleManualRing)
  }, [profile, bellMuted])

  // Stop audio loop if component unmounts
  useEffect(() => {
    return () => {
      stopContinuousSchoolBell()
    }
  }, [])

  if (!activeAlert) {
    return null
  }

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 99999,
        background: 'rgba(9, 13, 22, 0.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.75rem',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="modal-content animate-scale-up"
        style={{
          maxWidth: '460px',
          width: '100%',
          maxHeight: 'min(92vh, 640px)',
          overflowY: 'auto',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '20px',
          border: '3px solid #f59e0b',
          boxShadow: '0 25px 50px -12px rgba(245, 158, 11, 0.45)',
          padding: '1.5rem 1.25rem',
          textAlign: 'center',
          position: 'relative',
          boxSizing: 'border-box',
        }}
      >
        {/* Animated Ringing Bell Header */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.85rem' }}>
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '3px solid #f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              margin: '0 auto',
              animation: isRinging ? 'bell-shake 0.35s infinite alternate ease-in-out' : 'none',
              boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4)',
            }}
          >
            🔔
          </div>
          {isRinging && (
            <div
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#ef4444',
                color: '#fff',
                borderRadius: '999px',
                padding: '2px 8px',
                fontSize: '0.7rem',
                fontWeight: 900,
                animation: 'pulse 1s infinite',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5)',
              }}
            >
              RINGING!
            </div>
          )}
        </div>

        {/* Title & Badge */}
        <div style={{
          display: 'inline-block',
          background: alertType === '10min_warning' ? '#fef3c7' : '#dcfce7',
          color: alertType === '10min_warning' ? '#92400e' : '#166534',
          padding: '4px 12px',
          borderRadius: '999px',
          fontSize: '0.75rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: '0.4rem',
        }}>
          {alertType === '10min_warning' ? '⏳ 10-Minute Warning Alert' : '⚡ Live Virtual Class Starting Now!'}
        </div>

        <h2 style={{ fontSize: 'clamp(1.15rem, 4.5vw, 1.4rem)', fontWeight: 900, color: '#1e3a8a', margin: '0 0 0.35rem', lineHeight: 1.25, fontFamily: 'var(--font-heading)' }}>
          {activeAlert.title}
        </h2>
        <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, marginBottom: '1rem' }}>
          {activeAlert.shift}
        </div>

        {/* Class Details Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '12px',
            padding: '0.85rem 1rem',
            marginBottom: '1.25rem',
            textAlign: 'left',
            fontSize: '0.82rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.35rem', gap: '8px' }}>
            <span style={{ color: '#64748b', flexShrink: 0 }}>Your Enrolled Program:</span>
            <strong style={{ color: '#1e3a8a', textAlign: 'right', wordBreak: 'break-word' }}>{activeAlert.course}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.35rem', gap: '8px' }}>
            <span style={{ color: '#64748b', flexShrink: 0 }}>Faculty Lecturer:</span>
            <strong style={{ color: '#334155', textAlign: 'right' }}>{activeAlert.instructor}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ color: '#64748b', flexShrink: 0 }}>Scheduled Class Time:</span>
            <span style={{ color: '#2563eb', fontWeight: 800, textAlign: 'right' }}>
              {activeAlert.startTime} - {activeAlert.endTime}
            </span>
          </div>
        </div>

        {/* Action Buttons Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', width: '100%', boxSizing: 'border-box' }}>
          {/* Primary Action: Join Classroom */}
          <a
            href={activeAlert.joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleAcknowledgeAndClose}
            className="btn btn-primary"
            style={{
              width: '100%',
              fontWeight: 800,
              fontSize: 'clamp(0.85rem, 3.8vw, 0.98rem)',
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              boxShadow: '0 6px 16px rgba(37, 99, 235, 0.35)',
              boxSizing: 'border-box',
              textAlign: 'center',
              lineHeight: 1.25,
            }}
          >
            <span>🚀</span>
            <span>Join Live Classroom (Zoom / Meet)</span>
            <span>→</span>
          </a>

          {/* Secondary Control Row: Responsive 2-button layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', width: '100%', boxSizing: 'border-box' }}>
            <button
              type="button"
              onClick={isRinging ? handleMuteOnly : handleTestRing}
              className={`btn ${isRinging ? 'btn-danger' : 'btn-secondary'}`}
              style={{
                fontSize: 'clamp(0.75rem, 3.2vw, 0.84rem)',
                fontWeight: 800,
                padding: '0.75rem 0.5rem',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxSizing: 'border-box',
                lineHeight: 1.2,
                cursor: 'pointer',
              }}
            >
              <span>{isRinging ? '🔇' : '🔔'}</span>
              <span>{isRinging ? 'Mute Alarm' : 'Ring Bell'}</span>
            </button>

            <button
              type="button"
              onClick={handleAcknowledgeAndClose}
              className="btn btn-outline"
              style={{
                fontSize: 'clamp(0.75rem, 3.2vw, 0.84rem)',
                fontWeight: 800,
                padding: '0.75rem 0.5rem',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxSizing: 'border-box',
                borderColor: '#94a3b8',
                color: '#1e293b',
                lineHeight: 1.2,
                cursor: 'pointer',
              }}
            >
              <span>✓</span>
              <span>Acknowledge</span>
            </button>
          </div>
        </div>

        {/* Mute Setting & Ringing Status Helper */}
        <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontSize: '0.74rem', color: '#64748b' }}>
          <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={bellMuted}
              onChange={(e) => {
                setBellMuted(e.target.checked)
                if (e.target.checked) {
                  stopContinuousSchoolBell()
                  setIsRinging(false)
                }
              }}
              style={{ accentColor: '#2563eb', width: '15px', height: '15px' }}
            />
            <span>Mute future class bell alarms</span>
          </label>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
            🔔 Alarm loops continuously until muted or acknowledged
          </span>
        </div>
      </div>

      <style>{`
        @keyframes bell-shake {
          0% { transform: rotate(-16deg); }
          50% { transform: rotate(16deg); }
          100% { transform: rotate(-12deg); }
        }
      `}</style>
    </div>
  )
}

/**
 * Helper to manually dispatch school bell alert anywhere in the app
 */
export function dispatchSchoolBellAlert() {
  window.dispatchEvent(new CustomEvent('gc-ring-school-bell'))
}

