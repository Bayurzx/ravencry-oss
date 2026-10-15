import type { Metadata } from "next"
import Link from "next/link"
import ReportWizard from "@/components/ReportWizard"

export const metadata: Metadata = {
  title: "Report an Incident — RAVENCRY",
  description: "Report a kidnapping or missing person. Works offline.",
}

export default function ReportPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-4 pb-16 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          ← Back
        </Link>
        <span className="text-xs font-semibold uppercase tracking-wider text-accent">RAVENCRY</span>
      </div>
      <ReportWizard />
    </main>
  )
}
