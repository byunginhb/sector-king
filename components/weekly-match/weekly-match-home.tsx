"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Swords } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { getWeeklyMatchHomeState } from "@/lib/weekly-match/home-state";
import type { WeeklyMatchRound } from "@/lib/weekly-match/types";
import type { ApiResponse } from "@/types";

const copy = {
  preparing: { label: "접수 준비 중", action: "대진 살펴보기", description: "거래 일정과 기준 가격을 확인한 대진부터 접수합니다." },
  open: { label: "선택 접수 중", action: "선택하러 가기", description: "비교 기간 동안 더 강할 섹터를 골라보세요." },
  closed: { label: "접수 마감", action: "진행 상황 보기", description: "선택이 마감됐습니다. 확정된 결과를 기다리고 있습니다." },
  settled: { label: "결과 확정", action: "결과 확인하기", description: "비교가 끝났습니다. 확정 결과와 내 기록을 확인하세요." },
};

export function WeeklyMatchHome() {
  const card = useRef<HTMLElement>(null);
  const impressionSent = useRef(false);
  const [now, setNow] = useState<number | null>(null);
  const query = useQuery({
    queryKey: ["weekly-match"],
    queryFn: async () => {
      const response = await fetch("/api/weekly-match", {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      const body = (await response.json()) as ApiResponse<{ rounds: WeeklyMatchRound[] }>;
      if (!response.ok || !body.success || !body.data)
        throw new Error("대진 조회 실패");
      return body.data;
    },
    retry: false,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!card.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !impressionSent.current) {
        impressionSent.current = true;
        trackEvent("view_promotion", { promotion_name: "weekly_match", placement: "home_card" });
      }
    });
    observer.observe(card.current);
    return () => observer.disconnect();
  }, []);

  const state = getWeeklyMatchHomeState(query.data?.rounds ?? [], now);
  const currentCopy = copy[state.status];
  const count = state.round?.participantCount;

  return (
    <section ref={card} aria-labelledby="home-weekly-match-title" className="sk-card border-primary/30 bg-surface-2 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="home-weekly-match-title" className="flex items-center gap-2 font-display text-xl font-semibold">
          <Swords className="h-5 w-5 text-primary" aria-hidden />
          섹터 매치 <span className="text-xs font-normal text-muted-foreground">베타</span>
        </h2>
        <p className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {query.isError ? "조회 오류" : query.isPending ? "대진 확인 중" : currentCopy.label}
          {!query.isError && !query.isPending && count !== undefined && count >= 40 && (
            <span className="ml-2 tabular-nums">{count.toLocaleString("ko-KR")}명 {state.status === "open" ? "참여 중" : "참여"}</span>
          )}
        </p>
      </div>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {state.round && <>
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-display text-xl font-semibold sm:text-2xl">
              <span>{state.round.left.name}</span><span className="text-sm text-primary">VS</span><span>{state.round.right.name}</span>
            </p>
            <p className="mt-2 text-xs tabular-nums text-muted-foreground sm:text-sm">비교 기간 {state.round.baseDate} ~ {state.round.endDate}</p>
          </>}
          <p role={query.isError ? "alert" : query.isPending ? "status" : undefined} className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {query.isError ? "대진을 불러오지 못했습니다." : query.isPending ? "대진을 불러오는 중입니다." : currentCopy.description}
          </p>
        </div>
      {query.isError ? (
        <Button variant="outline" className="min-h-11 w-full shrink-0 sm:w-auto" onClick={() => query.refetch()}>다시 불러오기</Button>
      ) : !query.isPending && (
        <Button asChild className="min-h-11 w-full shrink-0 sm:w-auto">
          <Link href="/weekly-match" onClick={() => trackEvent("select_content", { content_type: "weekly_match", placement: "home_card" })}>
            {currentCopy.action}<ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      )}
      </div>
    </section>
  );
}
