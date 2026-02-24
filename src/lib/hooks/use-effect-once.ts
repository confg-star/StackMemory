'use client'

import { useEffect, useRef } from 'react'

export function useEffectOnce(effect: () => void) {
  const initialized = useRef(false)
  
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      effect()
    }
  }, [effect])
}
