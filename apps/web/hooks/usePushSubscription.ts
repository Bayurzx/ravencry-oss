'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getExistingPushToken,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push'

interface UsePushSubscription {
  isSubscribed: boolean
  isSupported: boolean
  pushToken: string | null
  subscribe: () => Promise<string | null>
  unsubscribe: () => Promise<void>
}

export function usePushSubscription(): UsePushSubscription {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [pushToken, setPushToken] = useState<string | null>(null)

  useEffect(() => {
    const supported = isPushSupported()
    setIsSupported(supported)
    if (supported) {
      void getExistingPushToken().then((token) => {
        setPushToken(token)
        setIsSubscribed(!!token)
      })
    }
  }, [])

  const subscribe = useCallback(async () => {
    const token = await subscribeToPush()
    if (token) {
      setPushToken(token)
      setIsSubscribed(true)
    }
    return token
  }, [])

  const unsubscribe = useCallback(async () => {
    await unsubscribeFromPush()
    setPushToken(null)
    setIsSubscribed(false)
  }, [])

  return { isSubscribed, isSupported, pushToken, subscribe, unsubscribe }
}
