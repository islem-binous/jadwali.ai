'use client'

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { useUserStore } from '@/store/userStore'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  ArrowUp,
  Calendar,
  AlertTriangle,
  BarChart3,
  UserSearch,
  Download,
  ChevronDown,
  ExternalLink,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

/** Render basic markdown-style bold (**text**) and line breaks */
function renderMarkdown(text: string) {
  const lines = text.split('\n')
  return lines.map((line, li) => {
    // Split on **bold** markers
    const parts = line.split(/(\*\*[^*]+\*\*)/)
    const rendered = parts.map((part, pi) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={pi} className="font-semibold text-text-primary">
            {part.slice(2, -2)}
          </strong>
        )
      }
      return <span key={pi}>{part}</span>
    })
    return (
      <span key={li}>
        {rendered}
        {li < lines.length - 1 && <br />}
      </span>
    )
  })
}

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const },
}

/* ------------------------------------------------------------------ */
/*  Typing indicator                                                   */
/* ------------------------------------------------------------------ */

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border-subtle bg-bg-card px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-text-muted"
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function AiPage() {
  const t = useTranslations()
  const router = useRouter()
  const user = useUserStore((s) => s.user)

  /* ---- State ---- */
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedTimetableId, setGeneratedTimetableId] = useState<string | null>(null)
  const [availableProviders, setAvailableProviders] = useState<string[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [providerMenuOpen, setProviderMenuOpen] = useState(false)

  /* ---- Fetch available AI providers ---- */
  useEffect(() => {
    fetch('/api/ai/chat')
      .then((r) => r.json())
      .then((data) => {
        const providers: string[] = data.providers ?? []
        setAvailableProviders(providers)
        // Default to first available, or empty (mock)
        if (providers.length > 0) setSelectedProvider(providers[0])
      })
      .catch(() => {})
  }, [])

  /* ---- Refs ---- */
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /* ---- Auto-scroll ---- */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, scrollToBottom])

  /* ---- Textarea auto-resize ---- */
  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [])

  /* ---- Quick-action pills ---- */
  const quickActions = [
    { key: 'quick_generate', icon: Calendar, action: 'generate' as const },
    { key: 'quick_conflict', icon: AlertTriangle, action: 'chat' as const },
    { key: 'quick_optimize', icon: BarChart3, action: 'chat' as const },
    { key: 'quick_sub', icon: UserSearch, action: 'chat' as const },
    { key: 'quick_export', icon: Download, action: 'chat' as const },
  ]

  /* ---- Generate timetable (real DB action) ---- */
  const handleGenerateTimetable = useCallback(async () => {
    if (isLoading || isGenerating) return
    setIsGenerating(true)

    // Show user message
    const userMsg: Message = {
      id: uid(),
      role: 'user',
      content: t('ai.quick_generate'),
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])

    // Show assistant progress message
    const assistantId = uid()
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: t('ai.gen_step_fetching'), timestamp: new Date() },
    ])

    try {
      const res = await fetch('/api/ai/generate-timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: user?.schoolId ?? '',
          provider: selectedProvider || undefined,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setGeneratedTimetableId(data.timetableId)
        const summary = data.conflictsFound > 0
          ? t('ai.gen_success', { name: data.timetableName, lessons: String(data.lessonsCreated), conflicts: String(data.conflictsFound) })
          : t('ai.gen_success_no_conflicts', { name: data.timetableName, lessons: String(data.lessonsCreated) })
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: summary } : m))
        )
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: `**${t('app.error')}:** ${data.error}` } : m
          )
        )
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: t('ai.gen_failed') } : m
        )
      )
    } finally {
      setIsGenerating(false)
    }
  }, [isLoading, isGenerating, user?.schoolId, selectedProvider, t])

  /* ---- Send message ---- */
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      // Add user message
      const userMsg: Message = {
        id: uid(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMsg])
      setInputValue('')
      setIsLoading(true)

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }

      // Create placeholder assistant message
      const assistantId = uid()
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
      ])

      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            schoolId: user?.schoolId ?? '',
            provider: selectedProvider || undefined,
          }),
        })

        if (!res.ok || !res.body) {
          throw new Error('Failed to fetch')
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          accumulated += decoder.decode(value, { stream: true })
          const current = accumulated
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: current } : m
            )
          )
        }
      } catch {
        // On error, show a fallback message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    'Sorry, I encountered an error processing your request. Please try again.',
                }
              : m
          )
        )
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, user?.schoolId, selectedProvider]
  )

  /* ---- Keyboard handler ---- */
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputValue)
    }
  }

  /* ---- Derived ---- */
  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  const isBusy = isLoading || isGenerating
  const showQuickActions = messages.length === 0 || (!isBusy && messages.length > 0)

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col lg:h-[calc(100vh-6rem)]">
      {/* ---- Header ---- */}
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20">
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-text-primary">
              {t('ai.title')}
            </h1>
            <p className="text-xs text-text-secondary">{t('ai.subtitle')}</p>
          </div>
        </div>

        {/* AI Provider Selector */}
        {availableProviders.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setProviderMenuOpen(!providerMenuOpen)}
              className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-secondary transition hover:border-accent/30 hover:text-text-primary"
            >
              <span className={`inline-block h-2 w-2 rounded-full ${
                selectedProvider === 'claude' ? 'bg-[#D97706]' :
                selectedProvider === 'openai' ? 'bg-[#10A37F]' :
                'bg-text-muted'
              }`} />
              {selectedProvider === 'claude' ? 'Claude' :
               selectedProvider === 'openai' ? 'GPT-4o' :
               t('ai.mock_mode')}
              {availableProviders.length > 1 && (
                <ChevronDown className={`h-3.5 w-3.5 transition ${providerMenuOpen ? 'rotate-180' : ''}`} />
              )}
            </button>

            {providerMenuOpen && availableProviders.length > 1 && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProviderMenuOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-border-subtle bg-bg-card py-1 shadow-lg">
                  {availableProviders.map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setSelectedProvider(p)
                        setProviderMenuOpen(false)
                      }}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-bg-surface ${
                        selectedProvider === p ? 'text-accent font-medium' : 'text-text-secondary'
                      }`}
                    >
                      <span className={`inline-block h-2 w-2 rounded-full ${
                        p === 'claude' ? 'bg-[#D97706]' : 'bg-[#10A37F]'
                      }`} />
                      {p === 'claude' ? 'Claude (Anthropic)' : 'GPT-4o (OpenAI)'}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ---- Messages area ---- */}
      <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-border-subtle bg-bg-elevated/50 p-4">
        {/* Greeting (always shown first) */}
        <motion.div {...fadeUp} className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20">
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <div className="max-w-[80%] rounded-2xl rounded-bl-md border border-border-subtle bg-bg-card px-4 py-3 text-sm leading-relaxed text-text-primary">
            {t('ai.greeting')}
          </div>
        </motion.div>

        {/* Chat messages */}
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => {
            if (msg.role === 'user') {
              return (
                <motion.div
                  key={msg.id}
                  {...fadeUp}
                  layout
                  className="flex items-start justify-end gap-3"
                >
                  <div className="max-w-[80%] rounded-2xl rounded-br-md bg-accent px-4 py-3 text-sm leading-relaxed text-white">
                    {msg.content}
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-surface text-xs font-semibold text-text-secondary">
                    {userInitials}
                  </div>
                </motion.div>
              )
            }

            // Assistant message
            const isLastMsg = msg.id === messages[messages.length - 1]?.id
            const showViewTimetable = isLastMsg && generatedTimetableId && msg.content && !isGenerating
              && (msg.content.includes(t('ai.gen_view_timetable')) || msg.content.includes('**'))

            return (
              <motion.div
                key={msg.id}
                {...fadeUp}
                layout
                className="flex items-start gap-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20">
                  <Sparkles className="h-4 w-4 text-accent" />
                </div>
                <div className="max-w-[80%]">
                  <div className="rounded-2xl rounded-bl-md border border-border-subtle bg-bg-card px-4 py-3 text-sm leading-relaxed text-text-primary">
                    {msg.content ? renderMarkdown(msg.content) : <TypingIndicator />}
                  </div>
                  {showViewTimetable && (
                    <button
                      onClick={() => router.push('/timetable')}
                      className="mt-2 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {t('ai.gen_view_timetable')}
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Typing indicator when loading and the last assistant msg already has content */}
        {isLoading &&
          messages.length > 0 &&
          messages[messages.length - 1].content === '' && null}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* ---- Quick action pills ---- */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="mt-3 flex gap-2 overflow-x-auto pb-1"
          >
            {quickActions.map((qa) => {
              const Icon = qa.icon
              return (
                <button
                  key={qa.key}
                  onClick={() => {
                    if (qa.action === 'generate') {
                      handleGenerateTimetable()
                    } else {
                      sendMessage(t(`ai.${qa.key}`))
                    }
                  }}
                  disabled={isLoading || isGenerating}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-border-default bg-bg-surface px-4 py-2 text-sm text-text-secondary transition hover:border-accent/30 hover:text-accent disabled:opacity-50"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t(`ai.${qa.key}`)}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Input area ---- */}
      <div className="mt-3 shrink-0">
        <div className="flex items-end gap-2 rounded-2xl border border-border-subtle bg-bg-card p-2">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              resizeTextarea()
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('ai.placeholder')}
            rows={1}
            className="max-h-[120px] flex-1 resize-none bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <button
            onClick={() => sendMessage(inputValue)}
            disabled={!inputValue.trim() || isBusy}
            aria-label={t('ai.send')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition hover:bg-accent-hover disabled:opacity-50"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
        {isBusy && (
          <p className="mt-1.5 text-center text-xs text-text-muted">
            {isGenerating ? t('ai.gen_in_progress') : t('ai.typing')}
          </p>
        )}
      </div>
    </div>
  )
}
