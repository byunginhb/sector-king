import { Metadata } from 'next'
import { StatisticsPage } from '@/components/statistics/statistics-page'

export const metadata: Metadata = {
  title: '회사 등장 통계 | Sector King',
}

export default function StatisticsPageRoute() {
  return <StatisticsPage />
}
