// ============================================================
// Global College — High Performance Reactive Event Bus
// ============================================================

type SchoolEventType =
  | 'STUDENT_ADDED'
  | 'STUDENT_UPDATED'
  | 'STUDENT_DELETED'
  | 'PAYMENT_RECORDED'
  | 'INVOICE_CREATED'
  | 'TIMETABLE_UPDATED'
  | 'NOTICE_POSTED'
  | 'REMINDER_SENT'
  | 'INQUIRY_LOGGED'
  | 'ACID_TRANSACTION_COMMITTED'

type EventHandler<T = any> = (payload: T) => void

class SchoolEventBus {
  private listeners: Map<SchoolEventType, Set<EventHandler>> = new Map()

  subscribe<T = any>(event: SchoolEventType, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)

    // Return cleanup unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(handler)
    }
  }

  publish<T = any>(event: SchoolEventType, payload?: T): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(payload)
        } catch (err) {
          console.error(`[EventBus] Handler error for ${event}:`, err)
        }
      })
    }
  }
}

export const schoolEventBus = new SchoolEventBus()
