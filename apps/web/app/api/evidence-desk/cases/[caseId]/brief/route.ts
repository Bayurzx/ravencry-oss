import { NextResponse } from 'next/server'
import type { EvidenceBriefResponse } from '@/types'

const CASE_ID_PATTERN = /^NR-\d{4}-\d{6}$/

const API_BASE =
  process.env.RAVENCRY_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3003'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params

  if (!CASE_ID_PATTERN.test(caseId)) {
    return NextResponse.json(
      { error: 'invalid_case_id_format', code: 'ERR_BAD_REQUEST' },
      { status: 400 },
    )
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/ops/cases/${caseId}/brief`, {
      method: 'POST',
      cache: 'no-store',
    })
  } catch {
    return NextResponse.json(
      { error: 'briefing_unavailable', code: 'ERR_BRIEFING_UNAVAILABLE' },
      { status: 503 },
    )
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: 'briefing_unavailable', code: 'ERR_BRIEFING_UNAVAILABLE' },
      { status: 503 },
    )
  }

  const data: EvidenceBriefResponse = await res.json()
  return NextResponse.json(data)
}
