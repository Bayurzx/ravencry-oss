'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { errorClass, fieldClass, labelClass } from '@/lib/ui'
import type { Gender, ReportFormData } from '@/types'

export default function Step2Who({
  data,
  update,
  showErrors,
}: {
  data: ReportFormData
  update: (patch: Partial<ReportFormData>) => void
  showErrors: boolean
}) {
  const { t } = useTranslation()
  const [preview, setPreview] = useState<string | null>(null)

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo must be under 5MB.')
      e.target.value = ''
      return
    }
    update({ photo: file })
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const nameError = showErrors && !data.person_name.trim()

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">{t('step2_title')}</h2>

      <div>
        <label htmlFor="name" className={labelClass}>
          {t('person_name')} *
        </label>
        <input
          id="name"
          type="text"
          value={data.person_name}
          onChange={(e) => update({ person_name: e.target.value })}
          className={fieldClass}
          autoComplete="name"
        />
        {nameError && <p className={errorClass}>{t('person_name')} is required.</p>}
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="age" className={labelClass}>
            {t('age')}
          </label>
          <input
            id="age"
            type="number"
            min={0}
            max={120}
            inputMode="numeric"
            value={data.age ?? ''}
            onChange={(e) =>
              update({
                age: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className={fieldClass}
          />
        </div>
        <div className="flex-1">
          <label htmlFor="gender" className={labelClass}>
            {t('gender')}
          </label>
          <select
            id="gender"
            value={data.gender ?? 'unknown'}
            onChange={(e) => update({ gender: e.target.value as Gender })}
            className={fieldClass}
          >
            <option value="unknown">Unknown</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="clothing" className={labelClass}>
          {t('clothing')}
        </label>
        <textarea
          id="clothing"
          rows={3}
          value={data.description}
          onChange={(e) => update({ description: e.target.value })}
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="photo" className={labelClass}>
          {t('photo_upload')}
        </label>
        <input
          id="photo"
          type="file"
          accept="image/*"
          onChange={onPhoto}
          className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-card file:px-4 file:py-2 file:text-foreground"
        />
        <p className="mt-1 text-xs text-muted">{t('photo_hint')}</p>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Preview"
            className="mt-2 h-24 w-24 rounded-md object-cover"
          />
        )}
      </div>
    </div>
  )
}
