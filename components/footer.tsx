import Link from 'next/link'
import { SectorKingLogo } from './logo'
import { getSiteFacts, UPDATE_CADENCE, DATA_SOURCE } from '@/lib/site-facts'

export async function Footer() {
  const facts = await getSiteFacts()

  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <SectorKingLogo size={24} className="shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Sector King</p>
              <p className="text-sm text-muted-foreground">산업별 투자 패권 지도</p>
            </div>
          </div>
          <nav className="flex items-center gap-4 flex-wrap">
            <Link
              href="/about"
              className="text-sm text-info hover:underline"
            >
              소개
            </Link>
            <Link
              href="/sectors"
              className="text-sm text-info hover:underline"
            >
              섹터 목록
            </Link>
            <Link
              href="/guide"
              className="text-sm text-info hover:underline"
            >
              이용 안내
            </Link>
            <Link
              href="/methodology"
              className="text-sm text-info hover:underline"
            >
              방법론
            </Link>
            <Link
              href="/data-sources"
              className="text-sm text-info hover:underline"
            >
              데이터 출처
            </Link>
            <Link
              href="/editorial-policy"
              className="text-sm text-info hover:underline"
            >
              편집 방침
            </Link>
            <Link
              href="/methodology#scoring"
              className="text-sm text-info hover:underline"
            >
              점수 산출 공식
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 text-sm text-info hover:underline"
            >
              문의 / 제보
            </Link>
            <Link
              href="/terms"
              className="text-sm text-info hover:underline"
            >
              이용약관
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-info hover:underline"
            >
              개인정보 처리방침
            </Link>
          </nav>
        </div>

        <div className="mt-6 border-t border-border pt-4 space-y-2">
          <p className="text-xs text-muted-foreground">
            데이터 출처: {DATA_SOURCE} · 업데이트: {UPDATE_CADENCE} · 추적: {facts.companyCount.toLocaleString('ko-KR')}개 기업 /{' '}
            {facts.sectorCount.toLocaleString('ko-KR')}개 섹터 / {facts.industryCount}개 산업
            {facts.latestDataDate ? ` · 데이터 기준일: ${facts.latestDataDate}` : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            &copy; 2025 Sector King. 본 사이트의 정보는 투자 권유가 아니며, 투자 결정의 책임은 이용자에게 있습니다.
          </p>
        </div>
      </div>
    </footer>
  )
}
