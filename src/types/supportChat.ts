// ============================================================
// Global College — Support Chat & Directorate Messaging Types
// ============================================================

export type SupportSenderType = 'client' | 'admin'
export type SupportThreadStatus = 'open' | 'resolved' | 'pending_admin' | 'pending_client'

export interface SupportMessage {
  id: string
  threadId: string
  sender: SupportSenderType
  senderName: string
  senderEmail?: string
  senderSchool?: string
  senderRole?: string
  text: string
  timestamp: number
}

export interface SupportThread {
  id: string
  clientName: string
  clientEmail?: string
  clientSchool: string
  clientRole: string
  status: SupportThreadStatus
  createdAt: number
  updatedAt: number
  unreadAdminCount: number
  unreadClientCount: number
  lastMessage: string
  messages: SupportMessage[]
}

export interface ClientSupportInput {
  threadId?: string
  clientName: string
  clientEmail?: string
  clientSchool?: string
  clientRole?: string
  text: string
}

export interface AdminReplyInput {
  threadId: string
  adminName?: string
  text: string
}
