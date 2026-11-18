import type { Metadata } from "next";
import Link from "next/link";
import { GlobalTopBar } from "@/components/layout/global-top-bar";
import { WeeklyMatchBoard } from "@/components/weekly-match/weekly-match-board";
import styles from "./weekly-match.module.css";
import pilot from "@/config/weekly-match-pilot.json";

const title = "섹터 매치 · 베타";
const description =
  "대진에 표시된 비교 기간 동안 더 높은 가격 변동률을 기록할 국내 섹터를 선택하고 내 결과를 확인하세요.";
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sector-king.com";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${baseUrl}/weekly-match` },
  robots: { index: false, follow: true },
  openGraph: { title, description, url: `${baseUrl}/weekly-match` },
};

export default function WeeklyMatchPage() {
  return (
    <div className={`${styles.page} min-h-screen`}>
      <GlobalTopBar subtitle="섹터 매치 · 베타" hasPageHeading />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <header className="max-w-2xl">
          <h1 className="min-w-0 break-words font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
            어느 섹터가 더 강할까요?
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            더 높은 가격 변동률을 기록할 국내 섹터를 고르고 내 결과를
            확인하세요.
          </p>
        </header>

        <aside aria-label="베타 운영 안내" className="mt-6 rounded-lg border border-border bg-surface-2 p-4 text-sm leading-relaxed text-muted-foreground">
          단기 베타는 한 거래일을 비교하는 대진입니다. 대진마다 표시된 비교
          기간과 마감 시간을 확인해 주세요. 실제 기준 종가가 준비된 대진부터
          접수를 시작하며, 결과 검증이 끝나면 내 결과가 표시됩니다.
          {!pilot.enabled && (
            <p className="mt-2">
              단기 베타는 가격 기준을 확인 중입니다. 접수 준비가 끝나면 새 대진이
              표시됩니다.
            </p>
          )}
        </aside>

        <div className="mt-8">
          <WeeklyMatchBoard />
        </div>

        <section
          aria-labelledby="match-rules"
          className="mt-10 border-t border-border pt-6"
        >
          <h2 id="match-rules" className="font-display text-xl font-semibold">
            참여와 결과 산정
          </h2>
          <ul className="mt-3 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>
              로그인 후 한 섹터를 선택합니다. 마감 전까지 바꿀 수 있으며 선택과
              결과는 본인에게만 표시됩니다.
            </li>
            <li>
              각 대진에 표시된 기준일 종가부터 종료일 종가까지,
              고정된 구성 종목의 가격 변동률을 같은 비중으로 평균합니다. 배당
              포함 총수익률이나 순매수가 아닙니다.
            </li>
            <li>
              두 섹터의 변동률을 소수 여섯 자리로 반올림한 값으로 비교합니다.
              동률과 무효는 적중·실패에 포함하지 않습니다.
            </li>
            <li>
              결측·거래정지·분할·병합은 확인될 때까지 집계를 보류하며, 종료 후
              7일 안에 해결되지 않으면 무효 처리합니다. 정정 시 최신 결과 버전을
              표시합니다.
            </li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            학습을 위한 비교이며 투자 권유가 아닙니다.
          </p>
          <Link
            href="/sectors"
            className="mt-4 inline-flex min-h-11 items-center rounded-sm text-sm text-info hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
          >
            섹터와 구성 종목 살펴보기
          </Link>
        </section>
        <noscript>
          <p className="mt-6">
            대진 조회와 선택 저장은 자바스크립트를 켠 뒤 이용할 수 있습니다.
          </p>
        </noscript>
      </main>
    </div>
  );
}
