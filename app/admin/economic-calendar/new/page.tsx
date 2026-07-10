/**
 * /admin/economic-calendar/new — 신규 경제 이벤트 등록 페이지.
 */
import { EventEditor } from '@/components/economic-calendar/admin/event-editor'

export const dynamic = 'force-dynamic'

export default function NewEconomicEventPage() {
  return <EventEditor initial={null} />
}
