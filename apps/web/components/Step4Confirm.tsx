'use client'

import { useTranslation } from 'react-i18next'
import { fieldClass, labelClass } from '@/lib/ui'
import type { ReportFormData } from '@/types'

function Row({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === '' || value === null) return null
  return (
    <div className="flex justify-between gap-3 border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

export default function Step4Confirm({
  data,
  update,
  onSubmit,
  isPending,
}: {
  data: ReportFormData
  update: (patch: Partial<ReportFormData>) => void
  onSubmit: (anonymous: boolean) => void
  isPending: boolean
}) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">{t('step4_title')}</h2>

      <div className="rounded-lg border border-border bg-card p-4">
        <Row label={t('person_name')} value={data.person_name} />
        <Row label={t('age')} value={data.age} />
        <Row label={t('gender')} value={data.gender} />
        <Row label={t('clothing')} value={data.description} />
        <Row label="Location" value={data.last_seen_location} />
        <Row
          label={t('when_hint')}
          value={
            data.last_seen_time
              ? new Date(data.last_seen_time).toLocaleString()
              : undefined
          }
        />
        <Row label={t('extra_details')} value={data.extra} />
        <Row
          label="Coordinates"
          value={
            data.coordinates
              ? `${data.coordinates.lat.toFixed(4)}, ${data.coordinates.lng.toFixed(4)}`
              : undefined
          }
        />
      </div>

      {data.photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={URL.createObjectURL(data.photo)}
          alt="Report photo"
          className="h-28 w-28 rounded-md object-cover"
        />
      )}

      <div>
        <label htmlFor="phone" className={labelClass}>
          {t('your_phone')}
        </label>
        <input
          id="phone"
          type="tel"
          inputMode="tel"
          value={data.reporter_phone ?? ''}
          onChange={(e) => update({ reporter_phone: e.target.value })}
          className={fieldClass}
          autoComplete="tel"
        />
        <p className="mt-1 text-xs text-muted">{t('phone_hint')}</p>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => onSubmit(false)}
          className="flex min-h-[56px] w-full items-center justify-center rounded-lg bg-flash text-base font-bold text-flash-foreground disabled:opacity-60"
        >
          {isPending ? t('loading') : t('submit_report')}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => onSubmit(true)}
          className="flex min-h-[44px] w-full items-center justify-center rounded-lg border border-border font-semibold text-foreground disabled:opacity-60"
        >
          {t('submit_anonymous')}
        </button>
      </div>
    </div>
  )
}
