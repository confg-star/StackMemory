'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { trackEvent } from '@/lib/telemetry'

interface Route {
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

interface RouteContextType {
  currentRoute: Route | null
  routes: Route[]
  loading: boolean
  switchingRoute: boolean
  refreshRoutes: () => Promise<void>
  switchRoute: (routeId: string) => Promise<boolean>
  appendAndSelectRoute: (route: Route) => void
}

const RouteContext = createContext<RouteContextType | null>(null)

export function RouteProvider({ children }: { children: ReactNode }) {
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null)
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [switchingRoute, setSwitchingRoute] = useState(false)
  const refreshVersionRef = useRef(0)
  const refreshAbortRef = useRef<AbortController | null>(null)
  const switchVersionRef = useRef(0)
  const switchAbortRef = useRef<AbortController | null>(null)

  const dispatchRouteChanged = useCallback((route: Route | null) => {
    window.dispatchEvent(new CustomEvent('route-changed', { detail: route }))
  }, [])

  const resolveCurrentRoute = useCallback((nextRoutes: Route[]) => {
    if (nextRoutes.length === 0) {
      return null
    }

    const serverCurrentRoute = nextRoutes.find((r: Route) => r.is_current)
    if (serverCurrentRoute) {
      return serverCurrentRoute
    }

    const storedRouteId = typeof window !== 'undefined'
      ? localStorage.getItem('stackmemory-current-route')
      : null
    const storedRoute = storedRouteId
      ? nextRoutes.find((r: Route) => r.id === storedRouteId)
      : null

    return storedRoute || nextRoutes[0]
  }, [])

  const refreshRoutes = useCallback(async () => {
    const requestVersion = ++refreshVersionRef.current
    refreshAbortRef.current?.abort()
    const controller = new AbortController()
    refreshAbortRef.current = controller

    setLoading(true)
    try {
      const res = await fetch(`/api/routes?limit=50&offset=0`, {
        signal: controller.signal,
      })
      const result = await res.json()

      if (requestVersion !== refreshVersionRef.current) {
        return
      }

      if (!res.ok || !result.success || !result.data) {
        setRoutes([])
        setCurrentRoute(null)
        dispatchRouteChanged(null)
        return
      }

      const nextRoutes: Route[] = result.data.routes || []
      setRoutes(nextRoutes)

      const current = resolveCurrentRoute(nextRoutes)
      setCurrentRoute(current)
      dispatchRouteChanged(current)

      if (typeof window !== 'undefined') {
        if (current) {
          localStorage.setItem('stackmemory-current-route', current.id)
        } else {
          localStorage.removeItem('stackmemory-current-route')
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        return
      }
      console.error('获取路线失败:', err)
      setRoutes([])
      setCurrentRoute(null)
      dispatchRouteChanged(null)
    } finally {
      if (requestVersion === refreshVersionRef.current) {
        setLoading(false)
      }
    }
  }, [dispatchRouteChanged, resolveCurrentRoute])

  useEffect(() => {
    refreshRoutes()
  }, [refreshRoutes])

  const switchRoute = useCallback(async (routeId: string): Promise<boolean> => {
    if (!routeId) {
      return false
    }

    const requestVersion = ++switchVersionRef.current
    switchAbortRef.current?.abort()
    const controller = new AbortController()
    switchAbortRef.current = controller

    const optimisticRoute = routes.find((r) => r.id === routeId) || null
    const switchStart = performance.now()
    if (optimisticRoute) {
      setRoutes((prev) => prev.map((route) => ({
        ...route,
        is_current: route.id === routeId,
      })))
      setCurrentRoute({ ...optimisticRoute, is_current: true })
      dispatchRouteChanged({ ...optimisticRoute, is_current: true })
    }

    try {
      setSwitchingRoute(true)
      const res = await fetch('/api/routes/switch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ route_id: routeId }),
        signal: controller.signal,
      })
      const result = await res.json()

      if (requestVersion !== switchVersionRef.current) {
        return false
      }

      if (res.ok && result.success) {
        const routeFromApi = result.data as Route | null
        const routeFromState = routes.find((r) => r.id === routeId) || null
        const newCurrent = routeFromApi || routeFromState

        setRoutes((prev) => {
          const next = prev.map((route) => ({
            ...route,
            is_current: route.id === routeId,
          }))
          if (newCurrent && !next.some((route) => route.id === newCurrent.id)) {
            return [{ ...newCurrent, is_current: true }, ...next]
          }
          return next
        })
        setCurrentRoute(newCurrent)
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('stackmemory-current-route', routeId)
        }
        dispatchRouteChanged(newCurrent)

        trackEvent('route_switch_latency_ms', {
          latencyMs: Math.round(performance.now() - switchStart),
          success: true,
          routeId,
        })

        return true
      }
      trackEvent('route_switch_latency_ms', {
        latencyMs: Math.round(performance.now() - switchStart),
        success: false,
        routeId,
      })
      return false
    } catch (err) {
      if (controller.signal.aborted) {
        return false
      }
      console.error('切换路线失败:', err)
      trackEvent('route_switch_latency_ms', {
        latencyMs: Math.round(performance.now() - switchStart),
        success: false,
        routeId,
      })
      return false
    } finally {
      if (requestVersion === switchVersionRef.current) {
        setSwitchingRoute(false)
      }
    }
  }, [dispatchRouteChanged, routes])

  const appendAndSelectRoute = useCallback((route: Route) => {
    const selectedRoute: Route = {
      ...route,
      is_current: true,
    }

    setRoutes((prev) => {
      const rest = prev.filter((item) => item.id !== selectedRoute.id).map((item) => ({
        ...item,
        is_current: false,
      }))
      return [selectedRoute, ...rest]
    })
    setCurrentRoute(selectedRoute)

    if (typeof window !== 'undefined') {
      localStorage.setItem('stackmemory-current-route', selectedRoute.id)
    }

    dispatchRouteChanged(selectedRoute)
  }, [dispatchRouteChanged])

  useEffect(() => {
    return () => {
      refreshAbortRef.current?.abort()
      switchAbortRef.current?.abort()
    }
  }, [])

  return (
    <RouteContext.Provider value={{ currentRoute, routes, loading, switchingRoute, refreshRoutes, switchRoute, appendAndSelectRoute }}>
      {children}
    </RouteContext.Provider>
  )
}

export function useRoute() {
  const context = useContext(RouteContext)
  if (!context) {
    throw new Error('useRoute must be used within a RouteProvider')
  }
  return context
}
