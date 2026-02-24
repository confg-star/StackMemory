'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { trackEvent } from '@/lib/telemetry'

interface ModuleErrorBoundaryProps {
  moduleName: string
  fallback?: ReactNode
  children: ReactNode
}

interface ModuleErrorBoundaryState {
  hasError: boolean
}

export class ModuleErrorBoundary extends Component<ModuleErrorBoundaryProps, ModuleErrorBoundaryState> {
  state: ModuleErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(): ModuleErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[module-error:${this.props.moduleName}]`, {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    })

    trackEvent('ui_crash_captured', {
      moduleName: this.props.moduleName,
      message: error.message,
    })
  }

  private handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    if (this.props.fallback) {
      return this.props.fallback
    }

    return (
      <div className="rounded-lg border border-red-300/60 bg-red-50/50 p-4 text-sm text-red-700">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-2">
            <p>模块加载异常：{this.props.moduleName}</p>
            <Button type="button" variant="outline" size="sm" onClick={this.handleRetry}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              重试
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
