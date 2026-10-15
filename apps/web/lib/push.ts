export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY || ''

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return (await navigator.serviceWorker.getRegistration()) ?? null
  } catch {
    return null
  }
}

/**
 * Requests notification permission and creates a push subscription.
 * Returns a serializable push token (the subscription JSON) or null.
 */
export async function subscribeToPush(): Promise<string | null> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return null
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const registration = await getRegistration()
  if (!registration) return null

  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }))

  return JSON.stringify(subscription.toJSON())
}

export async function unsubscribeFromPush(): Promise<void> {
  const registration = await getRegistration()
  if (!registration) return
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) await subscription.unsubscribe()
}

export async function getExistingPushToken(): Promise<string | null> {
  if (!isPushSupported()) return null
  const registration = await getRegistration()
  if (!registration) return null
  const subscription = await registration.pushManager.getSubscription()
  return subscription ? JSON.stringify(subscription.toJSON()) : null
}
