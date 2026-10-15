import type { AlertTier } from '@/types'

const STYLES: Record<AlertTier, { cls: string; icon: string; label: string }> = {
  FLASH: {
    cls: 'bg-flash text-flash-foreground',
    icon: '🚨',
    label: 'FLASH',
  },
  PRIORITY: {
    cls: 'bg-priority text-priority-foreground',
    icon: '⚠️',
    label: 'PRIORITY',
  },
  ROUTINE: {
    cls: 'bg-routine text-routine-foreground',
    icon: 'ℹ️',
    label: 'ROUTINE',
  },
}

export default function AlertBadge({
  tier,
  label,
}: {
  tier: AlertTier
  label?: string
}) {
  const s = STYLES[tier]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${s.cls}`}
    >
      <span aria-hidden>{s.icon}</span>
      {label ?? s.label}
    </span>
  )
}
