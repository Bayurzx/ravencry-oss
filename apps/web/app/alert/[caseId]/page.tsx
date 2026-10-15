import Link from "next/link"
import { AlertDetail } from "@/components/AlertDetail"

export default async function AlertPage({
  params,
}: {
  params: Promise<{ caseId: string }>
}) {
  const { caseId } = await params
  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-4 pb-16 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          ← Alerts
        </Link>
        <span className="text-xs font-semibold uppercase tracking-wider text-accent">RAVENCRY</span>
      </div>
      <AlertDetail caseId={caseId} />
    </main>
  )
}
