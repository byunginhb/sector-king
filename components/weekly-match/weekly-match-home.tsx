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
  preparing: { label: "접수 준비 중", action: "대진 살펴보기" },
  open: { label: "선택 접수 중", action: "선택하러 가기" },
  closed: { label: "접수 마감", action: "진행 상황 보기" },
  settled: { label: "결과 확정", action: "결과 확인하기" },
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
    <section ref={card} aria-labelledby="home-weekly-match-title" className="sk-card flex items-center justify-between gap-4 bg-surface-2 px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 id="home-weekly-match-title" className="flex items-center gap-2 text-sm font-semibold">
            <Swords className="h-4 w-4 text-primary" aria-hidden />
            섹터 매치 <span className="text-xs font-normal text-muted-foreground">베타</span>
          </h2>
          {state.round && <p className="text-sm">{state.round.left.name} vs {state.round.right.name}</p>}
        </div>
        <p role={query.isError ? "alert" : query.isPending ? "status" : undefined} className="mt-1 text-xs text-muted-foreground">
          {query.isError ? "대진을 불러오지 못했습니다." : query.isPending ? "대진을 불러오는 중입니다." : currentCopy.label}
          {!query.isError && !query.isPending && count !== undefined && count >= 40 && (
            <span className="ml-2 tabular-nums">{count.toLocaleString("ko-KR")}명 {state.status === "open" ? "참여 중" : "참여"}</span>
          )}
        </p>
      </div>
      {query.isError ? (
        <Button variant="outline" className="min-h-11 shrink-0" onClick={() => query.refetch()}>다시 불러오기</Button>
      ) : !query.isPending && (
        <Button asChild variant="outline" className="min-h-11 shrink-0">
          <Link href="/weekly-match" onClick={() => trackEvent("select_content", { content_type: "weekly_match", placement: "home_card" })}>
            {currentCopy.action}<ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      )}
    </section>
  );
}
