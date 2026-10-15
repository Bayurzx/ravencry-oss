import Link from 'next/link'
import { SightingForm } from '@/components/SightingForm'

export default async function SightingPage({
  params,
}: {
  params: Promise<{ caseId: string }>
}) {
  const { caseId } = await params
  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-4 pb-16 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/alert/${caseId}`}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Case
        </Link>
        <span className="text-xs font-semibold uppercase tracking-wider text-accent">
          RAVENCRY
        </span>
      </div>

      <h1 className="mb-1 text-2xl font-bold text-foreground">Report a Sighting</h1>
      <p className="mb-5 text-sm text-muted">
        Case <span className="font-mono text-foreground">{caseId}</span>
      </p>

      <SightingForm caseId={caseId} />
    </main>
  )
}
