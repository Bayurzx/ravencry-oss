export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return 'Unknown time'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'Unknown time'
  const diff = Date.now() - then
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export function formatAge(age: number | null | undefined): string {
  if (age == null) return 'Age unknown'
  return `Age ~${age}`
}

export function genderAgeLabel(
  age: number | null,
  gender: string | null | undefined,
): string {
  const parts: string[] = []
  if (age != null) parts.push(`Age ${age}`)
  if (gender && gender !== 'unknown') {
    parts.push(gender.charAt(0).toUpperCase() + gender.slice(1))
  }
  return parts.join(' · ')
}
