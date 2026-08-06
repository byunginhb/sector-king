import { LineChart, BarChart3, type LucideIcon } from 'lucide-react'
import type { CalendarCategoryValue } from '@/types'

/**
 * 카테고리 표시 메타 SoT — 필터 pill · 범례 · 이벤트 항목이 같은 아이콘/라벨을 쓴다.
 *
 * 구분을 **색이 아니라 아이콘**으로 하는 이유: 항목의 색 dot 은 이미 국가(US/KR)에
 * 배정돼 있다. 예전 범례는 존재하지도 않는 "카테고리 색"을 설명하고 있었다.
 */
export const CATEGORY_META: Record<
  CalendarCategoryValue,
  { label: string; icon: LucideIcon }
> = {
  indicator: { label: '경제지표', icon: LineChart },
  earnings: { label: '실적발표', icon: BarChart3 },
}
