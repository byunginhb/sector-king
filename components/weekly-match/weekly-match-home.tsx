"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, ChevronUp, Swords, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { getWeeklyMatchHomeState } from "@/lib/weekly-match/home-state";
import type { WeeklyMatchRound } from "@/lib/weekly-match/types";
import type { ApiResponse } from "@/types";

const copy = {
  preparing: {
    label: "접수 준비 중",
    description: "거래 일정과 기준 종가 확인을 마친 대진부터 접수합니다.",
    action: "대진 살펴보기",
  },
  open: {
    label: "선택 접수 중",
    description: "더 강할 섹터를 골라 두고, 확정된 결과를 확인하세요.",
    action: "선택하러 가기",
  },
  closed: {
    label: "접수 마감",
    description:
      "선택은 잠겼습니다. 비교 종료 후 확인된 종가로 결과를 확정합니다.",
    action: "진행 상황 보기",
  },
  settled: {
    label: "결과 확정",
    description: "확정된 대진 결과와 내 선택 기록을 확인하세요.",
    action: "결과 확인하기",
  },
};

export function WeeklyMatchHome() {
  const card = useRef<HTMLElement>(null);
  const impressionSent = useRef(false);
  const [now, setNow] = useState<number | null>(null);
  const [aboveViewport, setAboveViewport] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const query = useQuery({
    queryKey: ["weekly-match"],
    queryFn: async () => {
      const response = await fetch("/api/weekly-match", {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      const body = (await response.json()) as ApiResponse<{
        rounds: WeeklyMatchRound[];
      }>;
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
      setAboveViewport(
        !entry.isIntersecting && entry.boundingClientRect.bottom <= 0,
      );
      if (entry.isIntersecting && !impressionSent.current) {
        impressionSent.current = true;
        trackEvent("view_promotion", {
          promotion_name: "weekly_match",
          placement: "home_card",
        });
      }
    });
    observer.observe(card.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Dialogs and driver.js tours have no shared open-state context.
    let blocked = false;
    const update = () => {
      const next = !!document.querySelector(
        '[role="dialog"], [role="alertdialog"], .driver-overlay',
      );
      if (next !== blocked) {
        blocked = next;
        setOverlayOpen(next);
      }
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["role", "class"],
    });
    return () => observer.disconnect();
  }, []);

  const state = getWeeklyMatchHomeState(query.data?.rounds ?? [], now);
  const currentCopy = copy[state.status];
  const floatingPractice =
    state.status === "preparing" || query.isError || query.isPending;
  const label = query.isPending
    ? "대진 확인 중"
    : query.isError
      ? "대진 조회 장애"
      : currentCopy.label;
  const visit = (placement: string, practice = false) =>
    trackEvent("select_content", {
      content_type: practice ? "weekly_match_practice" : "weekly_match",
      placement,
    });

  return (
    <>
      <section
        ref={card}
        aria-labelledby="home-weekly-match-title"
        className="sk-card overflow-hidden border-primary/40 bg-surface-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
      >
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_1.1fr_1fr] lg:items-center">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Swords className="h-4 w-4" aria-hidden />
              섹터 매치 · 베타
            </p>
            <h2
              id="home-weekly-match-title"
              className="mt-3 font-display text-2xl font-semibold leading-tight"
            >
              어느 섹터가
              <br className="hidden lg:block" /> 더 강할까요?
            </h2>
            <p className="mt-3 text-sm font-medium">{label}</p>
            {state.round && <p className="mt-2 text-sm text-muted-foreground">{state.round.participantCount === undefined ? '참여 인원 확인 중' : `${state.round.participantCount.toLocaleString('ko-KR')}명 ${state.status === 'open' ? '참여 중' : '참여'}`}</p>}
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-y border-border-subtle py-5 text-center lg:border-y-0 lg:border-x lg:px-4">
            <p className="min-w-0 break-words font-display text-xl font-semibold sm:text-2xl">
              {state.round?.left.name ?? "한국 은행"}
            </p>
            <span className="font-display text-sm font-semibold italic text-primary">
              VS
            </span>
            <p className="min-w-0 break-words font-display text-xl font-semibold sm:text-2xl">
              {state.round?.right.name ?? "조선"}
            </p>
            <p className="col-span-3 text-xs tabular-nums text-muted-foreground">
              {state.round
                ? `비교 기간 ${state.round.baseDate} ~ ${state.round.endDate}`
                : "실제 접수 전에는 가상 체험으로 둘러보세요"}
            </p>
          </div>
          <div>
            {query.isError ? (
              <div role="alert">
                <p className="text-sm leading-relaxed">
                  대진을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
                </p>
                <Button
                  variant="outline"
                  className="mt-3 min-h-11"
                  onClick={() => query.refetch()}
                >
                  다시 불러오기
                </Button>
              </div>
            ) : query.isPending ? (
              <p role="status" className="text-sm text-muted-foreground">
                대진을 불러오는 중입니다.
              </p>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {currentCopy.description}
                </p>
                <Button asChild className="mt-3 min-h-11">
                  <Link href="/weekly-match" onClick={() => visit("home_card")}>
                    {currentCopy.action}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </>
            )}
            <Link
              href="/weekly-match#practice"
              onClick={() => visit("home_card", true)}
              className="mt-3 block min-h-11 py-3 text-sm font-medium underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            >
              연습으로 먼저 골라보기
            </Link>
            <Link href="/weekly-match#rankings" className="block min-h-11 py-3 text-sm text-primary underline underline-offset-4">시즌 순위 보기</Link>
            <p className="text-xs leading-relaxed text-muted-foreground">
              연습은 실제 참여·보상에 합산되지 않습니다.
            </p>
          </div>
        </div>
      </section>
      {aboveViewport && !dismissed && !overlayOpen && (
        <aside
          aria-label="섹터 매치 빠른 이동"
          className="fixed bottom-6 right-6 z-30 hidden w-72 max-w-[calc(100vw-3rem)] border border-primary/50 bg-background p-4 shadow-lg lg:block"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Swords className="h-4 w-4 text-primary" aria-hidden />
              섹터 매치
            </span>
            <div className="flex">
              <button
                type="button"
                aria-label={collapsed ? "섹터 매치 펼치기" : "섹터 매치 접기"}
                aria-expanded={!collapsed}
                onClick={() => setCollapsed(!collapsed)}
                className="inline-flex h-11 w-11 items-center justify-center hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                {collapsed ? (
                  <ChevronUp className="h-4 w-4" aria-hidden />
                ) : (
                  <ChevronDown className="h-4 w-4" aria-hidden />
                )}
              </button>
              <button
                type="button"
                aria-label="섹터 매치 닫기"
                onClick={() => {
                  setDismissed(true);
                  trackEvent("weekly_match_dismiss", {
                    placement: "home_floating",
                  });
                }}
                className="inline-flex h-11 w-11 items-center justify-center hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
          {!collapsed && (
            <div>
              <p className="mt-2 text-xs text-muted-foreground">{label}{state.round?.participantCount !== undefined ? ` · ${state.round.participantCount.toLocaleString('ko-KR')}명 참여` : ''}</p>
              <p className="mt-2 font-display text-lg font-semibold">
                {state.round?.left.name ?? "한국 은행"}{" "}
                <span className="px-1 text-xs italic text-primary">VS</span>{" "}
                {state.round?.right.name ?? "조선"}
              </p>
              <Link
                href={
                  floatingPractice ? "/weekly-match#practice" : "/weekly-match"
                }
                onClick={() => visit("home_floating", floatingPractice)}
                className="mt-3 flex min-h-11 items-center justify-between border-t border-border-subtle pt-3 text-sm font-semibold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                {floatingPractice ? "가상 체험 둘러보기" : currentCopy.action}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/weekly-match#rankings" className="flex min-h-11 items-center text-sm text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
                월별 순위 보기
              </Link>
            </div>
          )}
        </aside>
      )}
    </>
  );
}
