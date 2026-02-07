'use client'

import { toast } from 'sonner'

interface ToastProps {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

// 模拟 use-toast hook
export function useToast() {
  return {
    toast: ({ title, description, variant = 'default' }: ToastProps) => {
      if (variant === 'destructive') {
        toast.error(title, { description })
      } else {
        toast.success(title, { description })
      }
    },
  }
}
