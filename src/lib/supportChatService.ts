// ============================================================
// Global College — Support Chat & Directorate Messaging Service
// ============================================================

import type {
  SupportMessage,
  SupportThread,
  SupportThreadStatus,
  ClientSupportInput,
  AdminReplyInput,
} from '@/types/supportChat'

const STORAGE_THREADS_KEY = 'gc_support_threads'
const CLIENT_THREAD_ID_KEY = 'gc_client_support_thread_id'
const CLIENT_INFO_KEY = 'gc_client_support_info'

class SupportChatService {
  private listeners: Array<() => void> = []

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_THREADS_KEY) {
          this.notifyListeners()
        }
      })
      window.addEventListener('gc_support_chat_update', () => {
        this.notifyListeners()
      })
    }
  }

  // -------------------------------------------------------------
  // Subscription & Event Emitter
  // -------------------------------------------------------------
  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener()
      } catch (err) {
        console.error('[SupportChatService] Listener callback error:', err)
      }
    }
  }

  private broadcastChange(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gc_support_chat_update'))
    }
    this.notifyListeners()
  }

  // -------------------------------------------------------------
  // Data Access & Storage
  // -------------------------------------------------------------
  public getAllThreads(): SupportThread[] {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(STORAGE_THREADS_KEY)
      if (!raw) return []
      const threads: SupportThread[] = JSON.parse(raw)
      return Array.isArray(threads) ? threads.sort((a, b) => b.updatedAt - a.updatedAt) : []
    } catch {
      return []
    }
  }

  private saveThreads(threads: SupportThread[]): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_THREADS_KEY, JSON.stringify(threads))
      this.broadcastChange()
    } catch (err) {
      console.error('[SupportChatService] Failed to persist threads:', err)
    }
  }

  public getThreadById(threadId: string): SupportThread | null {
    const threads = this.getAllThreads()
    return threads.find((t) => t.id === threadId) || null
  }

  // -------------------------------------------------------------
  // Client Methods
  // -------------------------------------------------------------
  public getClientThreadId(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(CLIENT_THREAD_ID_KEY) || null
  }

  public setClientThreadId(threadId: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(CLIENT_THREAD_ID_KEY, threadId)
  }

  public getSavedClientInfo(): { name: string; school: string; role: string; email: string } {
    if (typeof window === 'undefined') {
      return { name: '', school: '', role: 'Guest', email: '' }
    }
    try {
      const raw = localStorage.getItem(CLIENT_INFO_KEY)
      if (!raw) return { name: '', school: '', role: 'Guest', email: '' }
      return JSON.parse(raw)
    } catch {
      return { name: '', school: '', role: 'Guest', email: '' }
    }
  }

  public saveClientInfo(info: { name: string; school: string; role: string; email: string }): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(CLIENT_INFO_KEY, JSON.stringify(info))
    } catch {}
  }

  public getClientThread(): SupportThread | null {
    const threadId = this.getClientThreadId()
    if (!threadId) return null
    return this.getThreadById(threadId)
  }

  public sendMessageFromClient(input: ClientSupportInput): { thread: SupportThread; message: SupportMessage } {
    const threads = this.getAllThreads()
    const now = Date.now()

    let activeThreadId = input.threadId || this.getClientThreadId()
    let thread = activeThreadId ? threads.find((t) => t.id === activeThreadId) : null

    const message: SupportMessage = {
      id: `msg_${now}_${Math.random().toString(36).substring(2, 7)}`,
      threadId: activeThreadId || '',
      sender: 'client',
      senderName: input.clientName || 'Campus User',
      senderEmail: input.clientEmail,
      senderSchool: input.clientSchool || 'Global College Campus',
      senderRole: input.clientRole || 'Client',
      text: input.text.trim(),
      timestamp: now,
    }

    if (!thread) {
      activeThreadId = `thread_${now}_${Math.random().toString(36).substring(2, 7)}`
      message.threadId = activeThreadId
      thread = {
        id: activeThreadId,
        clientName: input.clientName || 'Campus User',
        clientEmail: input.clientEmail || '',
        clientSchool: input.clientSchool || 'Global College Campus',
        clientRole: input.clientRole || 'User',
        status: 'open',
        createdAt: now,
        updatedAt: now,
        unreadAdminCount: 1,
        unreadClientCount: 0,
        lastMessage: input.text.trim(),
        messages: [message],
      }
      threads.unshift(thread)
      this.setClientThreadId(activeThreadId)
    } else {
      message.threadId = thread.id
      thread.messages.push(message)
      thread.lastMessage = input.text.trim()
      thread.updatedAt = now
      thread.status = 'open'
      thread.unreadAdminCount = (thread.unreadAdminCount || 0) + 1
      if (input.clientName) thread.clientName = input.clientName
      if (input.clientEmail) thread.clientEmail = input.clientEmail
      if (input.clientSchool) thread.clientSchool = input.clientSchool
      if (input.clientRole) thread.clientRole = input.clientRole
    }

    this.saveClientInfo({
      name: input.clientName || thread.clientName,
      school: input.clientSchool || thread.clientSchool,
      role: input.clientRole || thread.clientRole,
      email: input.clientEmail || thread.clientEmail || '',
    })

    this.saveThreads(threads)
    return { thread, message }
  }

  public markClientThreadRead(): void {
    const threadId = this.getClientThreadId()
    if (!threadId) return
    const threads = this.getAllThreads()
    const target = threads.find((t) => t.id === threadId)
    if (target && target.unreadClientCount > 0) {
      target.unreadClientCount = 0
      this.saveThreads(threads)
    }
  }

  // -------------------------------------------------------------
  // SaaS Admin Methods
  // -------------------------------------------------------------
  public getUnreadAdminCount(): number {
    const threads = this.getAllThreads()
    return threads.reduce((acc, t) => acc + (t.unreadAdminCount || 0), 0)
  }

  public sendMessageFromAdmin(input: AdminReplyInput): { thread: SupportThread; message: SupportMessage } | null {
    const threads = this.getAllThreads()
    const target = threads.find((t) => t.id === input.threadId)
    if (!target) return null

    const now = Date.now()
    const message: SupportMessage = {
      id: `msg_${now}_${Math.random().toString(36).substring(2, 7)}`,
      threadId: target.id,
      sender: 'admin',
      senderName: input.adminName || 'Global College Platform Directorate',
      text: input.text.trim(),
      timestamp: now,
    }

    target.messages.push(message)
    target.lastMessage = `[Admin] ${input.text.trim()}`
    target.updatedAt = now
    target.status = 'pending_client'
    target.unreadAdminCount = 0
    target.unreadClientCount = (target.unreadClientCount || 0) + 1

    this.saveThreads(threads)
    return { thread: target, message }
  }

  public markThreadReadByAdmin(threadId: string): void {
    const threads = this.getAllThreads()
    const target = threads.find((t) => t.id === threadId)
    if (target && target.unreadAdminCount > 0) {
      target.unreadAdminCount = 0
      this.saveThreads(threads)
    }
  }

  public setThreadStatus(threadId: string, status: SupportThreadStatus): void {
    const threads = this.getAllThreads()
    const target = threads.find((t) => t.id === threadId)
    if (target) {
      target.status = status
      target.updatedAt = Date.now()
      this.saveThreads(threads)
    }
  }

  public deleteThread(threadId: string): void {
    const threads = this.getAllThreads().filter((t) => t.id !== threadId)
    if (this.getClientThreadId() === threadId) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(CLIENT_THREAD_ID_KEY)
      }
    }
    this.saveThreads(threads)
  }
}

export const supportChatService = new SupportChatService()
