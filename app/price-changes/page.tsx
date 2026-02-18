import { Metadata } from 'next'
import { PriceChangesPageContent } from '@/components/price-changes/price-changes-page-content'

export const metadata: Metadata = {
  title: '가격 변화율 | Sector King',
}

export default function PriceChangesPage() {
  return <PriceChangesPageContent />
}
