// ============================================================
// Global College — Intake Scheduler & Marketing Store
// Handles Database Persistence (Supabase) + Offline LocalStorage Cache
// ============================================================

import { supabase } from './supabase'
import type { IntakeSchedule } from '@/types/intake'

const INTAKE_STORAGE_KEY = 'gc_v2_intake_schedules'

export const INITIAL_INTAKE_SCHEDULES: IntakeSchedule[] = []

class IntakeStore {
  private intakes: IntakeSchedule[] = []
  private initialized = false

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(INTAKE_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          this.intakes = parsed
          this.initialized = true
          return
        }
      }
    } catch {
      // ignore
    }
    this.intakes = [...INITIAL_INTAKE_SCHEDULES]
    this.saveToStorage()
    this.initialized = true
  }

  private saveToStorage() {
    try {
      localStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify(this.intakes))
    } catch {
      // ignore
    }
  }

  private async pushToCloud() {
    try {
      await supabase.from('app_cloud_sync').upsert(
        {
          key: 'gc_v2_intake_schedules',
          data: this.intakes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
    } catch {}
  }

  public initRealtimeSync() {
    if (typeof window === 'undefined') return
    try {
      supabase
        .channel('intake_schedules_realtime_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'app_cloud_sync' },
          async () => {
            await this.fetchCloudIntakes()
            window.dispatchEvent(new CustomEvent('gc-intakes-updated', { detail: this.intakes }))
            window.dispatchEvent(new CustomEvent('gc-data-synced'))
          }
        )
        .subscribe()
    } catch (err) {
      console.warn('Realtime subscription notice:', err)
    }
  }

  public async fetchCloudIntakes(): Promise<IntakeSchedule[]> {
    try {
      const { data: syncRow, error } = await supabase
        .from('app_cloud_sync')
        .select('data')
        .eq('key', 'gc_v2_intake_schedules')
        .maybeSingle()

      if (!error && syncRow?.data && Array.isArray(syncRow.data)) {
        this.intakes = syncRow.data
        this.saveToStorage()
        window.dispatchEvent(new CustomEvent('gc-intakes-updated', { detail: this.intakes }))
      }
    } catch {
      // Fallback to local
    }
    return this.getIntakes()
  }

  public getIntakes(): IntakeSchedule[] {
    if (!this.initialized) this.loadFromStorage()
    return [...this.intakes]
  }

  public getPublishedIntakes(): IntakeSchedule[] {
    const list = this.getIntakes().filter((i) => i.is_published)
    return list.sort((a, b) => {
      const aClosed = a.status === 'Closed' || a.status === 'Archived'
      const bClosed = b.status === 'Closed' || b.status === 'Archived'
      if (aClosed && !bClosed) return 1
      if (!aClosed && bClosed) return -1

      const dateA = new Date(a.commencement_date || 0).getTime()
      const dateB = new Date(b.commencement_date || 0).getTime()
      return dateA - dateB
    })
  }

  public async addIntake(intake: IntakeSchedule): Promise<void> {
    const cleanedIntake: IntakeSchedule = {
      ...intake,
      promo_video_url: intake.promo_video_url?.trim() || undefined,
      poster_image_url: intake.poster_image_url?.trim() || undefined,
      updated_at: new Date().toISOString(),
    }
    this.intakes = [cleanedIntake, ...this.intakes.filter((i) => i.id !== intake.id)]
    this.saveToStorage()
    window.dispatchEvent(new CustomEvent('gc-intakes-updated', { detail: this.intakes }))
    window.dispatchEvent(new CustomEvent('gc-data-synced'))
    await this.pushToCloud()
  }

  public async updateIntake(id: string, updates: Partial<IntakeSchedule>): Promise<void> {
    const nowIso = new Date().toISOString()
    this.intakes = this.intakes.map((i) => {
      if (i.id !== id) return i
      const updatedItem = { ...i, ...updates, updated_at: nowIso }
      if ('promo_video_url' in updates) {
        updatedItem.promo_video_url = updates.promo_video_url?.trim() || undefined
      }
      if ('poster_image_url' in updates) {
        updatedItem.poster_image_url = updates.poster_image_url?.trim() || undefined
      }
      return updatedItem
    })
    this.saveToStorage()
    window.dispatchEvent(new CustomEvent('gc-intakes-updated', { detail: this.intakes }))
    window.dispatchEvent(new CustomEvent('gc-data-synced'))
    await this.pushToCloud()
  }

  public async deleteIntake(id: string): Promise<void> {
    this.intakes = this.intakes.filter((i) => i.id !== id)
    this.saveToStorage()
    window.dispatchEvent(new CustomEvent('gc-intakes-updated', { detail: this.intakes }))
    window.dispatchEvent(new CustomEvent('gc-data-synced'))
    await this.pushToCloud()
  }

  public async togglePublishIntake(id: string): Promise<void> {
    const target = this.intakes.find((i) => i.id === id)
    if (!target) return
    const nextState = !target.is_published
    await this.updateIntake(id, { is_published: nextState })
  }
}

export const intakeStore = new IntakeStore()
