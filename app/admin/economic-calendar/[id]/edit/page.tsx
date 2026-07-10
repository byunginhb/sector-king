/**
 * /admin/economic-calendar/[id]/edit — 경제 이벤트 편집 페이지.
 *
 * id 는 정수(bigint) → `/^\d+$/` 검증(뉴스 UUID 정규식 아님). 404 처리.
 */
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EVENT_FULL_COLUMNS, rowToDto } from '@/lib/economic-calendar/dto'
import { EventEditor } from '@/components/economic-calendar/admin/event-editor'

export const dynamic = 'force-dynamic'

const ID_RE = /^\d+$/

export default async function EditEconomicEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!ID_RE.test(id)) notFound()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('economic_events')
    .select(EVENT_FULL_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) notFound()

  const event = rowToDto(data as Parameters<typeof rowToDto>[0])
  return <EventEditor initial={event} />
}
