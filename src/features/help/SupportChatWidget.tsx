import { useState, useEffect, useRef } from 'react'
import { supportChatService } from '@/lib/supportChatService'
import type { SupportThread } from '@/types/supportChat'
import { useAuth } from '@/hooks/useAuth'

interface SupportChatWidgetProps {
  isOpen?: boolean
  onClose?: () => void
  onOpen?: () => void
  showFloatingButton?: boolean
}

export function SupportChatWidget({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onOpen: controlledOnOpen,
  showFloatingButton = true,
}: SupportChatWidgetProps) {
  const { profile } = useAuth()
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isChatOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen

  const handleOpen = () => {
    if (controlledOnOpen) {
      controlledOnOpen()
    } else {
      setInternalIsOpen(true)
    }
  }

  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose()
    } else {
      setInternalIsOpen(false)
    }
  }

  // Active Thread & Messages
  const [thread, setThread] = useState<SupportThread | null>(() => supportChatService.getClientThread())
  const [unreadCount, setUnreadCount] = useState<number>(() => {
    const t = supportChatService.getClientThread()
    return t ? t.unreadClientCount || 0 : 0
  })

  // Sender metadata form
  const savedInfo = supportChatService.getSavedClientInfo()
  const [clientName, setClientName] = useState(() => profile?.full_name || savedInfo.name || '')
  const [clientSchool, setClientSchool] = useState(() => savedInfo.school || 'Global College Campus')
  const [clientRole, setClientRole] = useState(() => profile?.role ? profile.role.toUpperCase() : savedInfo.role || 'Campus User')
  const [clientEmail, setClientEmail] = useState(() => savedInfo.email || '')
  const [showMetaEdit, setShowMetaEdit] = useState(false)

  // Message composer
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // Sync state on updates
  useEffect(() => {
    const refresh = () => {
      const active = supportChatService.getClientThread()
      setThread(active)
      setUnreadCount(active ? active.unreadClientCount || 0 : 0)
    }

    const unsub = supportChatService.subscribe(refresh)
    return () => unsub()
  }, [])

  // Clear unread client messages when modal opens
  useEffect(() => {
    if (isChatOpen) {
      supportChatService.markClientThreadRead()
      setUnreadCount(0)
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [isChatOpen, thread?.messages?.length])

  // Handle message dispatch
  const handleSendMessage = (textToSend?: string) => {
    const content = (textToSend || messageText).trim()
    if (!content) return

    setIsSending(true)
    try {
      const { thread: updated } = supportChatService.sendMessageFromClient({
        threadId: thread?.id,
        clientName: clientName.trim() || profile?.full_name || 'Campus Member',
        clientSchool: clientSchool.trim() || 'Global College Campus',
        clientRole: clientRole.trim() || 'Student/Faculty',
        clientEmail: clientEmail.trim() || undefined,
        text: content,
      })
      setThread(updated)
      setMessageText('')
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const QUICK_QUESTIONS = [
    '🔑 Campus Product Key & License Help',
    '💳 Bursar & M-Pesa Fee Sync Question',
    '📊 CAT Exam Gradebook & Transcripts',
    '🚀 New Campus Module Feature Request',
  ]

  return (
    <>
      {/* =========================================================================
          FLOATING ACTION BUTTON (BOTTOM-RIGHT)
          ========================================================================= */}
      {showFloatingButton && !isChatOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
          }}
        >
          <button
            type="button"
            onClick={handleOpen}
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '999px',
              padding: '0.85rem 1.4rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontWeight: 800,
              fontSize: '0.92rem',
              cursor: 'pointer',
              boxShadow: '0 8px 30px rgba(37, 99, 235, 0.45)',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>💬</span>
            <span>Directorate Support</span>
            {unreadCount > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  borderRadius: '999px',
                  padding: '2px 7px',
                  boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
                  animation: 'pulse 1.8s infinite',
                }}
              >
                {unreadCount} NEW
              </span>
            )}
          </button>
        </div>
      )}

      {/* =========================================================================
          INTERACTIVE CHAT MODAL / DRAWER
          ========================================================================= */}
      {isChatOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: 'min(440px, calc(100vw - 32px))',
            height: 'min(620px, calc(100vh - 48px))',
            zIndex: 10000,
            background: '#0c1222',
            borderRadius: '24px',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            boxShadow: '0 24px 60px -10px rgba(0, 0, 0, 0.75), 0 0 30px rgba(37, 99, 235, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {/* HEADER */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
              padding: '1.1rem 1.25rem',
              borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                }}
              >
                💬
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#f8fafc' }}>
                    Platform Directorate Support
                  </h4>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#10b981',
                      boxShadow: '0 0 8px #10b981',
                      display: 'inline-block',
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                  Direct line to SaaS Owner &amp; Support Engineers
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowMetaEdit((prev) => !prev)}
                title="Edit your contact details"
                style={{
                  background: showMetaEdit ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  color: '#94a3b8',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '5px 8px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                ⚙️ Info
              </button>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#cbd5e1',
                  border: 'none',
                  borderRadius: '8px',
                  width: '28px',
                  height: '28px',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* SENDER INFO EDIT DRAWER */}
          {showMetaEdit && (
            <div
              style={{
                background: '#090e1a',
                borderBottom: '1px solid #1e293b',
                padding: '0.85rem 1.15rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ fontWeight: 700, color: '#38bdf8' }}>Your Contact Information:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  style={{
                    background: '#131b2e',
                    border: '1px solid #1e293b',
                    color: '#f8fafc',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                  }}
                />
                <input
                  type="text"
                  placeholder="Campus Name"
                  value={clientSchool}
                  onChange={(e) => setClientSchool(e.target.value)}
                  style={{
                    background: '#131b2e',
                    border: '1px solid #1e293b',
                    color: '#f8fafc',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Role (e.g. Principal, Bursar)"
                  value={clientRole}
                  onChange={(e) => setClientRole(e.target.value)}
                  style={{
                    background: '#131b2e',
                    border: '1px solid #1e293b',
                    color: '#f8fafc',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                  }}
                />
                <input
                  type="email"
                  placeholder="Email / Phone (Optional)"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  style={{
                    background: '#131b2e',
                    border: '1px solid #1e293b',
                    color: '#f8fafc',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                  }}
                />
              </div>
            </div>
          )}

          {/* MESSAGES LIST */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              background: '#090e1a',
            }}
          >
            {/* WELCOME CALLOUT */}
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.6)',
                borderRadius: '14px',
                padding: '0.85rem',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                fontSize: '0.82rem',
                color: '#cbd5e1',
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 800, color: '#60a5fa', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>👋 Welcome to Global College Live Support</span>
              </div>
              Send questions directly to the SaaS Platform Administrator regarding institutional billing, licenses, CAT gradebook sync, or technical support. Replies appear live right here.
            </div>

            {/* MESSAGE BUBBLES */}
            {thread && thread.messages && thread.messages.length > 0 ? (
              thread.messages.map((msg) => {
                const isAdmin = msg.sender === 'admin'
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isAdmin ? 'flex-start' : 'flex-end',
                      gap: '3px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.7rem',
                        color: '#64748b',
                        padding: '0 4px',
                      }}
                    >
                      {isAdmin ? (
                        <>
                          <span style={{ fontWeight: 800, color: '#34d399' }}>🎓 SaaS Admin</span>
                          <span style={{ background: '#064e3b', color: '#6ee7b7', padding: '1px 5px', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 800 }}>
                            DIRECTORATE
                          </span>
                        </>
                      ) : (
                        <span style={{ fontWeight: 700, color: '#94a3b8' }}>You ({msg.senderName})</span>
                      )}
                      <span>&bull;</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div
                      style={{
                        maxWidth: '85%',
                        padding: '0.75rem 1rem',
                        borderRadius: isAdmin ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                        background: isAdmin
                          ? 'linear-gradient(135deg, #132438 0%, #1e293b 100%)'
                          : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        border: isAdmin ? '1px solid rgba(16, 185, 129, 0.35)' : 'none',
                        color: '#f8fafc',
                        fontSize: '0.88rem',
                        lineHeight: 1.5,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                )
              })
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  color: '#64748b',
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💬</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#94a3b8' }}>No messages yet</div>
                <div style={{ fontSize: '0.78rem', marginTop: '4px', maxWidth: '280px' }}>
                  Write a question below or choose a quick suggestion chip to connect with the platform directorate.
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* QUICK PROMPT CHIPS */}
          <div
            style={{
              padding: '0.5rem 0.75rem',
              background: '#0c1222',
              borderTop: '1px solid #1e293b',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            {QUICK_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(q)}
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  color: '#93c5fd',
                  borderRadius: '999px',
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* COMPOSER */}
          <div
            style={{
              padding: '0.75rem 0.9rem',
              background: '#090e1a',
              borderTop: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'flex-end',
              gap: '8px',
            }}
          >
            <textarea
              rows={2}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a message to platform directorate..."
              style={{
                flex: 1,
                background: '#131b2e',
                border: '1px solid #1e293b',
                color: '#f8fafc',
                borderRadius: '12px',
                padding: '8px 12px',
                fontSize: '0.86rem',
                resize: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.4,
              }}
            />
            <button
              type="button"
              disabled={isSending || !messageText.trim()}
              onClick={() => handleSendMessage()}
              style={{
                background: messageText.trim()
                  ? 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)'
                  : '#1e293b',
                color: messageText.trim() ? '#ffffff' : '#64748b',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 14px',
                fontWeight: 800,
                fontSize: '0.86rem',
                cursor: messageText.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: messageText.trim() ? '0 4px 12px rgba(37, 99, 235, 0.35)' : 'none',
              }}
            >
              <span>Send</span>
              <span>✈️</span>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
