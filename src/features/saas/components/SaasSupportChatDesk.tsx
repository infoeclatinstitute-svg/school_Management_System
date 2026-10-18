import React, { useState, useEffect, useMemo, useRef } from 'react'
import { supportChatService } from '@/lib/supportChatService'
import type { SupportThread, SupportThreadStatus } from '@/types/supportChat'

export function SaasSupportChatDesk() {
  const [threads, setThreads] = useState<SupportThread[]>(() => supportChatService.getAllThreads())
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(() => {
    const all = supportChatService.getAllThreads()
    return all[0]?.id || null
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'open' | 'resolved'>('all')
  const [replyText, setReplyText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // Subscribe to live chat updates
  useEffect(() => {
    const refresh = () => {
      const all = supportChatService.getAllThreads()
      setThreads(all)
      if (selectedThreadId && !all.some((t) => t.id === selectedThreadId)) {
        setSelectedThreadId(all[0]?.id || null)
      }
    }

    const unsub = supportChatService.subscribe(refresh)
    return () => unsub()
  }, [selectedThreadId])

  // Mark thread read by admin when selected
  useEffect(() => {
    if (selectedThreadId) {
      supportChatService.markThreadReadByAdmin(selectedThreadId)
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    }
  }, [selectedThreadId, threads.find((t) => t.id === selectedThreadId)?.messages?.length])

  // Filtered threads list
  const filteredThreads = useMemo(() => {
    return threads.filter((t) => {
      if (statusFilter === 'unread' && (t.unreadAdminCount || 0) === 0) return false
      if (statusFilter === 'open' && t.status === 'resolved') return false
      if (statusFilter === 'resolved' && t.status !== 'resolved') return false

      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        t.clientName.toLowerCase().includes(q) ||
        t.clientSchool.toLowerCase().includes(q) ||
        t.clientRole.toLowerCase().includes(q) ||
        t.lastMessage.toLowerCase().includes(q)
      )
    })
  }, [threads, statusFilter, searchQuery])

  const selectedThread = threads.find((t) => t.id === selectedThreadId) || null

  // Telemetry metrics
  const totalInquiries = threads.length
  const totalUnread = threads.reduce((acc, t) => acc + (t.unreadAdminCount || 0), 0)
  const openThreadsCount = threads.filter((t) => t.status !== 'resolved').length
  const resolvedThreadsCount = threads.filter((t) => t.status === 'resolved').length

  // Quick Preset Replies
  const PRESET_REPLIES = [
    '✅ Your campus product key license has been generated and activated.',
    '🔄 Please clear your browser web cache and refresh to receive the latest OTA update.',
    '💳 Bursar payment verified. Your campus billing record has been marked clear.',
    '🛠️ The platform engineering team is investigating this request and will deploy a fix.',
    '👍 Thank you for contacting the Directorate. Let us know if you have any other questions!',
  ]

  const handleSendReply = (customText?: string) => {
    const textToSend = (customText || replyText).trim()
    if (!textToSend || !selectedThreadId) return

    setIsSending(true)
    try {
      supportChatService.sendMessageFromAdmin({
        threadId: selectedThreadId,
        adminName: 'Global College Platform Directorate',
        text: textToSend,
      })
      setReplyText('')
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSendReply()
    }
  }

  const handleToggleStatus = (threadId: string, currentStatus: SupportThreadStatus) => {
    const newStatus: SupportThreadStatus = currentStatus === 'resolved' ? 'open' : 'resolved'
    supportChatService.setThreadStatus(threadId, newStatus)
  }

  const handleDeleteThread = (threadId: string) => {
    if (window.confirm('Are you sure you want to delete this conversation thread permanently?')) {
      supportChatService.deleteThread(threadId)
      if (selectedThreadId === threadId) {
        setSelectedThreadId(null)
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* =========================================================================
          TOP COMMAND & TELEMETRY STRIP
          ========================================================================= */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.75) 0%, rgba(15, 23, 42, 0.95) 100%)',
          borderRadius: '24px',
          padding: '1.75rem 2rem',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.45rem',
                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
              }}
            >
              💬
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                  Client Support &amp; Inquiries Desk
                </h2>
                <span
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    textTransform: 'uppercase',
                  }}
                >
                  Live Two-Way Channel
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: '#94a3b8' }}>
                Receive direct messages from Principals, Bursars, and Staff across all client campuses and respond in real-time.
              </p>
            </div>
          </div>

          {/* Unread Alert Indicator */}
          {totalUnread > 0 ? (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                padding: '0.65rem 1.25rem',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#f87171',
                fontWeight: 800,
                fontSize: '0.85rem',
                boxShadow: '0 4px 16px rgba(239, 68, 68, 0.25)',
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>🔔</span>
              <span>{totalUnread} Unread Client Message{totalUnread > 1 ? 's' : ''} Awaiting Reply</span>
            </div>
          ) : (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10b981',
                padding: '0.65rem 1.25rem',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#34d399',
                fontWeight: 800,
                fontSize: '0.85rem',
              }}
            >
              <span>✓ All Inquiries Answered</span>
            </div>
          )}
        </div>

        {/* Telemetry Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          <div style={{ background: '#090e1a', borderRadius: '16px', padding: '1.1rem 1.25rem', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
              Total Campus Inquiries
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f8fafc', marginTop: '4px' }}>
              {totalInquiries}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Client conversation threads</div>
          </div>

          <div style={{ background: '#090e1a', borderRadius: '16px', padding: '1.1rem 1.25rem', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
              Unread Messages
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: totalUnread > 0 ? '#ef4444' : '#10b981', marginTop: '4px' }}>
              {totalUnread}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Awaiting Directorate review</div>
          </div>

          <div style={{ background: '#090e1a', borderRadius: '16px', padding: '1.1rem 1.25rem', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
              Active Open Tickets
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#38bdf8', marginTop: '4px' }}>
              {openThreadsCount}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>In progress / follow-up</div>
          </div>

          <div style={{ background: '#090e1a', borderRadius: '16px', padding: '1.1rem 1.25rem', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
              Resolved Inquiries
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#34d399', marginTop: '4px' }}>
              {resolvedThreadsCount}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Closed with confirmation</div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TWO-COLUMN WORKSPACE: THREAD LIST & CHAT VIEW
          ========================================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 360px) 1fr',
          gap: '1.5rem',
          minHeight: '620px',
        }}
      >
        {/* LEFT COLUMN: CONVERSATION LIST */}
        <div
          style={{
            background: '#0d1527',
            borderRadius: '24px',
            border: '1px solid #1e293b',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
          }}
        >
          {/* SEARCH & FILTERS */}
          <div style={{ padding: '1.25rem', borderBottom: '1px solid #1e293b', background: '#090e1a' }}>
            <input
              type="text"
              placeholder="Search by school, client or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: '#131b2e',
                border: '1px solid #1e293b',
                color: '#f8fafc',
                borderRadius: '12px',
                padding: '8px 12px',
                fontSize: '0.84rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', gap: '6px', marginTop: '0.75rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {(['all', 'unread', 'open', 'resolved'] as const).map((filter) => {
                const isSelected = statusFilter === filter
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setStatusFilter(filter)}
                    style={{
                      background: isSelected ? 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' : '#1e293b',
                      color: isSelected ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      flexShrink: 0,
                    }}
                  >
                    {filter === 'unread' ? `Unread (${totalUnread})` : filter}
                  </button>
                )
              })}
            </div>
          </div>

          {/* THREAD CARDS LIST */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredThreads.length > 0 ? (
              filteredThreads.map((t) => {
                const isSelected = t.id === selectedThreadId
                const unread = t.unreadAdminCount || 0
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedThreadId(t.id)}
                    style={{
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(124, 58, 237, 0.2) 100%)'
                        : '#131b2e',
                      border: isSelected ? '1.5px solid #3b82f6' : '1px solid #1e293b',
                      borderRadius: '16px',
                      padding: '0.95rem 1rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: isSelected ? '#ffffff' : '#e2e8f0' }}>
                        {t.clientName}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {unread > 0 && (
                          <span
                            style={{
                              background: '#ef4444',
                              color: '#ffffff',
                              fontSize: '0.66rem',
                              fontWeight: 900,
                              borderRadius: '999px',
                              padding: '1px 6px',
                            }}
                          >
                            {unread} NEW
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '6px',
                            background: t.status === 'resolved' ? '#064e3b' : '#1e3a8a',
                            color: t.status === 'resolved' ? '#6ee7b7' : '#93c5fd',
                          }}
                        >
                          {t.status === 'resolved' ? 'RESOLVED' : 'OPEN'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#38bdf8', marginTop: '3px' }}>
                      <span>🏫</span>
                      <span style={{ fontWeight: 700 }}>{t.clientSchool}</span>
                      <span style={{ color: '#64748b' }}>&bull; {t.clientRole}</span>
                    </div>

                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: '#94a3b8',
                        marginTop: '6px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t.lastMessage}
                    </div>

                    <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '6px' }}>
                      {new Date(t.updatedAt).toLocaleDateString()} {new Date(t.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )
              })
            ) : (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#94a3b8' }}>No inquiries found</div>
                <div style={{ fontSize: '0.76rem', marginTop: '4px' }}>
                  Client support messages will appear here as soon as they write from their Help section.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE THREAD CONVERSATION */}
        {selectedThread ? (
          <div
            style={{
              background: '#0d1527',
              borderRadius: '24px',
              border: '1px solid #1e293b',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
            }}
          >
            {/* THREAD BANNER / CLIENT PROFILE */}
            <div
              style={{
                background: '#090e1a',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#f8fafc' }}>
                    {selectedThread.clientName}
                  </h3>
                  <span
                    style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {selectedThread.clientRole}
                  </span>
                  <span
                    style={{
                      background: selectedThread.status === 'resolved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                      color: selectedThread.status === 'resolved' ? '#34d399' : '#60a5fa',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {selectedThread.status === 'resolved' ? '✓ RESOLVED' : '● ACTIVE OPEN'}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px' }}>
                  Campus: <strong style={{ color: '#cbd5e1' }}>{selectedThread.clientSchool}</strong>
                  {selectedThread.clientEmail && (
                    <span style={{ marginLeft: '8px', color: '#64748b' }}>
                      &bull; Contact: <code>{selectedThread.clientEmail}</code>
                    </span>
                  )}
                </div>
              </div>

              {/* Thread Action Controls */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleToggleStatus(selectedThread.id, selectedThread.status)}
                  style={{
                    background: selectedThread.status === 'resolved' ? '#1e293b' : 'rgba(16, 185, 129, 0.2)',
                    color: selectedThread.status === 'resolved' ? '#94a3b8' : '#34d399',
                    border: `1px solid ${selectedThread.status === 'resolved' ? '#334155' : 'rgba(16, 185, 129, 0.4)'}`,
                    borderRadius: '10px',
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {selectedThread.status === 'resolved' ? '↺ Re-open Inquiry' : '✓ Mark as Resolved'}
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteThread(selectedThread.id)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '10px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Delete thread"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* MESSAGES LOG */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                background: '#090e1a',
              }}
            >
              {selectedThread.messages.map((msg) => {
                const isAdmin = msg.sender === 'admin'
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isAdmin ? 'flex-end' : 'flex-start',
                      gap: '4px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.72rem',
                        color: '#64748b',
                        padding: '0 6px',
                      }}
                    >
                      {isAdmin ? (
                        <>
                          <span style={{ fontWeight: 800, color: '#34d399' }}>🎓 SaaS Admin (You)</span>
                          <span style={{ background: '#064e3b', color: '#6ee7b7', padding: '1px 5px', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 800 }}>
                            DIRECTORATE
                          </span>
                        </>
                      ) : (
                        <>
                          <span style={{ fontWeight: 800, color: '#38bdf8' }}>{msg.senderName}</span>
                          <span style={{ color: '#64748b' }}>({selectedThread.clientSchool})</span>
                        </>
                      )}
                      <span>&bull;</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div
                      style={{
                        maxWidth: '78%',
                        padding: '0.85rem 1.15rem',
                        borderRadius: isAdmin ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: isAdmin
                          ? 'linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)'
                          : '#131b2e',
                        border: isAdmin ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid #1e293b',
                        color: '#f8fafc',
                        fontSize: '0.92rem',
                        lineHeight: 1.55,
                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.25)',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* PRESET REPLY SHORTCUTS */}
            <div
              style={{
                padding: '0.6rem 1rem',
                background: '#0d1527',
                borderTop: '1px solid #1e293b',
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
              }}
            >
              {PRESET_REPLIES.map((reply, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendReply(reply)}
                  style={{
                    background: 'rgba(30, 41, 59, 0.85)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#93c5fd',
                    borderRadius: '999px',
                    padding: '5px 12px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {reply}
                </button>
              ))}
            </div>

            {/* RESPONSE COMPOSER */}
            <div
              style={{
                padding: '1rem 1.25rem',
                background: '#090e1a',
                borderTop: '1px solid #1e293b',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-end',
              }}
            >
              <textarea
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your official Directorate response here... (Press Ctrl+Enter to send)"
                style={{
                  flex: 1,
                  background: '#131b2e',
                  border: '1px solid #1e293b',
                  color: '#f8fafc',
                  borderRadius: '14px',
                  padding: '10px 14px',
                  fontSize: '0.9rem',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                  lineHeight: 1.45,
                }}
              />
              <button
                type="button"
                disabled={isSending || !replyText.trim()}
                onClick={() => handleSendReply()}
                style={{
                  background: replyText.trim()
                    ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                    : '#1e293b',
                  color: replyText.trim() ? '#ffffff' : '#64748b',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '12px 18px',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: replyText.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: replyText.trim() ? '0 4px 16px rgba(16, 185, 129, 0.35)' : 'none',
                  height: '48px',
                }}
              >
                <span>Send Reply</span>
                <span>✈️</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: '#0d1527',
              borderRadius: '24px',
              border: '1px solid #1e293b',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4rem 2rem',
              color: '#64748b',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
              Select a conversation to reply
            </h3>
            <p style={{ margin: '8px 0 0', fontSize: '0.88rem', maxWidth: '360px', lineHeight: 1.5 }}>
              Choose any inquiry from the left panel to review client details and transmit instant Directorate responses.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
