'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Plus, Loader2, X, Map } from 'lucide-react'
import { toast } from 'sonner'
import { trackEvent } from '@/lib/telemetry'

interface CreateRouteDialogProps {
  onRouteCreated?: (route: CreatedRoute) => Promise<void> | void
}

interface CreatedRoute {
  id: string
  user_id: string
  topic: string
  background: string | null
  goals: string | null
  weeks: number
  roadmap_data: Record<string, unknown> | null
  is_current: boolean
  created_at: string
  updated_at: string
}

export function CreateRouteDialog({ onRouteCreated }: CreateRouteDialogProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [topic, setTopic] = useState('')
  const [topicError, setTopicError] = useState<string | null>(null)
  const [background, setBackground] = useState('')
  const [goals, setGoals] = useState('')
  const [weeksInput, setWeeksInput] = useState('12')
  const [weeksError, setWeeksError] = useState<string | null>(null)
  const inFlightRequestKeyRef = useRef<string | null>(null)
  const loadingRef = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    loadingRef.current = loading
  }, [loading])

  const resetForm = useCallback(() => {
    setTopic('')
    setTopicError(null)
    setBackground('')
    setGoals('')
    setWeeksInput('12')
    setWeeksError(null)
  }, [])

  const handleClose = useCallback(() => {
    if (loading) {
      return
    }
    setOpen(false)
    resetForm()
  }, [loading, resetForm])

  useEffect(() => {
    if (!open) {
      return
    }

    const html = document.documentElement
    const body = document.body
    const scrollbarWidth = window.innerWidth - html.clientWidth
    const previousOverflow = body.style.overflow
    const previousPaddingRight = body.style.paddingRight
    const lockCount = Number.parseInt(body.dataset.modalLockCount || '0', 10)

    body.dataset.modalLockCount = String(lockCount + 1)
    body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }

    const handleEscClose = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (loadingRef.current) {
          return
        }
        setOpen(false)
        resetForm()
      }
    }

    window.addEventListener('keydown', handleEscClose)

    return () => {
      window.removeEventListener('keydown', handleEscClose)
      const nextLockCount = Math.max(Number.parseInt(body.dataset.modalLockCount || '1', 10) - 1, 0)
      body.dataset.modalLockCount = String(nextLockCount)

      if (nextLockCount === 0) {
        body.style.overflow = previousOverflow
        body.style.paddingRight = previousPaddingRight
      }
    }
  }, [open, resetForm])

  const parsedWeeks = Number.parseInt(weeksInput, 10)
  const normalizedWeeks = Number.isFinite(parsedWeeks) ? parsedWeeks : NaN

  const normalizedPayload = useMemo(
    () => ({
      topic: topic.trim(),
      background: background.trim() || undefined,
      goals: goals.trim() || undefined,
      weeks: normalizedWeeks,
    }),
    [topic, background, goals, normalizedWeeks]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    let hasValidationError = false
    const trimmedTopic = topic.trim()
    if (!trimmedTopic) {
      setTopicError('请输入学习主题')
      hasValidationError = true
    }

    if (!Number.isInteger(normalizedWeeks) || normalizedWeeks < 1 || normalizedWeeks > 52) {
      setWeeksError('学习周期需在 1 到 52 周之间')
      hasValidationError = true
    }

    if (hasValidationError) {
      toast.error('请修正表单校验错误后重试')
      return
    }

    setTopicError(null)
    setWeeksError(null)

    const requestKey = JSON.stringify(normalizedPayload)
    if (inFlightRequestKeyRef.current === requestKey) {
      return
    }

    inFlightRequestKeyRef.current = requestKey
    setLoading(true)
    try {
      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': requestKey,
        },
        body: JSON.stringify(normalizedPayload),
      })

      const result = await res.json().catch(() => ({ success: false, error: '创建路线失败：服务响应异常' }))

      if (result.success) {
        toast.success('路线创建成功')
        trackEvent('route_create_success', {
          topic: trimmedTopic,
          weeks: normalizedWeeks,
        })
        const createdRoute = result.data as CreatedRoute | undefined
        if (createdRoute?.id) {
          try {
            await onRouteCreated?.(createdRoute)
          } catch (syncError) {
            console.error('创建后联动刷新失败:', syncError)
            toast.error('路线已创建，但自动切换失败，请手动切换')
          }
        }
        setOpen(false)
        resetForm()
      } else {
        trackEvent('route_create_fail', {
          topic: trimmedTopic,
          weeks: normalizedWeeks,
          reason: result.error || 'unknown_error',
        })
        toast.error(result.error || '创建路线失败，请重试')
      }
    } catch (err) {
      console.error('创建路线失败:', err)
      trackEvent('route_create_fail', {
        topic: trimmedTopic,
        weeks: normalizedWeeks,
        reason: err instanceof Error ? err.message : 'network_or_unknown_error',
      })
      toast.error('创建路线失败，请重试')
    } finally {
      inFlightRequestKeyRef.current = null
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={loading}>
        <Plus className="h-4 w-4 mr-1" />
        新建路线
      </Button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
            <div className="relative z-10 w-full max-w-md mx-4 bg-background rounded-lg border shadow-lg p-6 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Map className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">新建学习路线</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose} disabled={loading}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="topic">学习主题 *</Label>
                  <Input
                    id="topic"
                    placeholder="例如：Python 入门"
                    value={topic}
                    onChange={(e) => {
                      setTopic(e.target.value)
                      if (topicError) {
                        setTopicError(null)
                      }
                    }}
                    required
                    aria-invalid={Boolean(topicError)}
                  />
                  {topicError && <p className="text-xs text-red-500">{topicError}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="background">背景/基础</Label>
                  <Textarea
                    id="background"
                    placeholder="你的技术背景、已掌握的技能..."
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goals">学习目标</Label>
                  <Textarea
                    id="goals"
                    placeholder="你想达到什么水平？薄弱点有哪些？"
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weeks">学习周期（周）</Label>
                  <Input
                    id="weeks"
                    type="number"
                    min={1}
                    max={52}
                    value={weeksInput}
                    onChange={(e) => {
                      setWeeksInput(e.target.value)
                      if (weeksError) {
                        setWeeksError(null)
                      }
                    }}
                    aria-invalid={Boolean(weeksError)}
                  />
                  {weeksError && <p className="text-xs text-red-500">{weeksError}</p>}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                    取消
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {loading ? '创建中...' : '创建路线'}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
