'use client'

export type TelemetryEventName =
  | 'route_create_success'
  | 'route_create_fail'
  | 'route_switch_latency_ms'
  | 'task_jump_success'
  | 'task_jump_fail'
  | 'ui_crash_captured'
  | string

export interface TelemetryRecord {
  name: TelemetryEventName
  payload: Record<string, unknown>
  ts: number
}

declare global {
  interface Window {
    __stackmemoryTelemetry?: TelemetryRecord[]
  }
}

export function trackEvent(name: TelemetryEventName, payload: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') {
    return
  }

  const record: TelemetryRecord = {
    name,
    payload,
    ts: Date.now(),
  }

  const bucket = window.__stackmemoryTelemetry || []
  bucket.push(record)
  window.__stackmemoryTelemetry = bucket
  window.dispatchEvent(new CustomEvent('stackmemory-telemetry', { detail: record }))

  if (process.env.NODE_ENV !== 'production') {
    console.info('[telemetry]', record)
  }
}
