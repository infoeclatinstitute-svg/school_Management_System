// ============================================================
// Global College — Authentic Web Audio School Bell Synthesizer
// Zero external mp3 dependencies; works 100% offline & in all modern browsers.
// ============================================================

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    audioCtx = new AudioContextClass()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

/**
 * Rings an authentic electric school bell / gong.
 * Uses dual-frequency metal resonance + rapid clapper amplitude modulation (18Hz).
 * Duration: ~2.8 seconds.
 */
export function ringSchoolBell(durationSec = 2.8) {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Master Volume Gain
    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0.65, now)
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + durationSec)
    masterGain.connect(ctx.destination)

    // Clapper Modulation (Tremolo 18Hz)
    const tremoloOsc = ctx.createOscillator()
    const tremoloGain = ctx.createGain()
    tremoloOsc.type = 'square'
    tremoloOsc.frequency.setValueAtTime(18, now) // 18 strikes per second
    tremoloGain.gain.setValueAtTime(0.4, now)
    tremoloOsc.connect(tremoloGain.gain)

    // Bell Metallic Frequencies (Fundamental + Harmonics)
    const bellFrequencies = [
      { freq: 659.25, gain: 0.4 },  // E5
      { freq: 783.99, gain: 0.35 }, // G5
      { freq: 1046.5, gain: 0.3 },  // C6
      { freq: 1318.5, gain: 0.25 }, // E6
      { freq: 2093.0, gain: 0.15 }, // C7 (Metallic sheen)
    ]

    bellFrequencies.forEach(({ freq, gain }) => {
      const osc = ctx.createOscillator()
      const oscGain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now)
      // Slight pitch drift simulating metal physical vibration
      osc.frequency.linearRampToValueAtTime(freq - 2, now + durationSec)

      oscGain.gain.setValueAtTime(gain, now)
      tremoloGain.connect(oscGain.gain)

      osc.connect(oscGain)
      oscGain.connect(masterGain)

      osc.start(now)
      osc.stop(now + durationSec)
    })

    tremoloOsc.start(now)
    tremoloOsc.stop(now + durationSec)
  } catch (err) {
    console.warn('School bell audio synthesis error:', err)
  }
}

/**
 * Plays a pleasant 2-tone pre-announcement chime (Ding-Dong)
 */
export function playChime() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    const playTone = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)

      gain.gain.setValueAtTime(0.4, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(start)
      osc.stop(start + dur)
    }

    playTone(880, now, 0.8) // High Tone (A5)
    playTone(659.25, now + 0.35, 1.2) // Low Tone (E5)
  } catch (err) {
    console.warn('Chime audio error:', err)
  }
}

let bellIntervalTimer: any = null
let isBellContinuousRunning = false

/**
 * Starts an authentic continuous school bell alarm loop that keeps ringing
 * and vibrating the device repeatedly until stopContinuousSchoolBell() is called.
 */
export function startContinuousSchoolBell() {
  if (isBellContinuousRunning) return
  isBellContinuousRunning = true

  // Initial immediate ring
  ringSchoolBell(2.6)

  // Trigger continuous vibration pattern on mobile devices
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([500, 200, 500, 200, 800])
    } catch {}
  }

  // Repeat every 3.2 seconds until explicitly muted or dismissed
  bellIntervalTimer = setInterval(() => {
    if (!isBellContinuousRunning) {
      if (bellIntervalTimer) clearInterval(bellIntervalTimer)
      return
    }
    ringSchoolBell(2.6)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([500, 200, 500, 200, 800])
      } catch {}
    }
  }, 3200)
}

/**
 * Immediately silences and halts the continuous school bell alarm and cancels vibration.
 */
export function stopContinuousSchoolBell() {
  isBellContinuousRunning = false
  if (bellIntervalTimer) {
    clearInterval(bellIntervalTimer)
    bellIntervalTimer = null
  }
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0)
    } catch {}
  }
}

export function isContinuousBellRinging() {
  return isBellContinuousRunning
}

