"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { ApiResponse } from "@/types";
import type {
  WeeklyMatchEntry,
  WeeklyMatchRound,
  WeeklyMatchSide,
} from "@/lib/weekly-match/types";

const loginHref = "/login?redirect=%2Fweekly-match";
const dateTime = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

async function getData<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !body.success || !body.data)
    throw new Error("조회에 실패했습니다.", { cause: response.status });
  return body.data;
}

export function WeeklyMatchBoard() {
  const { user, isLoading: authLoading } = useCurrentUser();
  const rounds = useQuery({
    queryKey: ["weekly-match"],
    queryFn: () => getData<{ rounds: WeeklyMatchRound[] }>("/api/weekly-match"),
    retry: false,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const entries = useQuery({
    queryKey: ["me", "weekly-match", user?.id],
    queryFn: () =>
      getData<{ entries: WeeklyMatchEntry[] }>("/api/me/weekly-match"),
    enabled: !!user,
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  if (rounds.isPending)
    return (
      <p role="status" className="py-8 text-muted-foreground">
        대진을 불러오는 중입니다.
      </p>
    );
  if (rounds.isError)
    return (
      <div role="alert" className="border-y border-border py-6">
        <p className="mb-3">
          대진을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
        <Button
          variant="outline"
          className="min-h-11"
          onClick={() => rounds.refetch()}
        >
          다시 불러오기
        </Button>
      </div>
    );
  if (!rounds.data.rounds.length)
    return (
      <div className="border-y border-border py-8">
        <h2 className="font-display text-2xl font-semibold">
          다음 대진을 준비하고 있습니다
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          거래 일정과 기준 종가 확인을 마친 대진부터 접수합니다. 먼저 섹터
          구성을 살펴보세요.
        </p>
        <Button asChild variant="outline" className="mt-4 min-h-11">
          <Link href="/sectors">섹터 살펴보기</Link>
        </Button>
      </div>
    );

  return (
    <div className="space-y-8">
      {user && entries.isError && (
        <div role="alert" className="border-b border-border pb-4">
          <p>내 선택을 불러오지 못했습니다. 다시 불러온 뒤 선택해 주세요.</p>
          {entries.error.cause === 401 ? (
            <Button asChild className="mt-3 min-h-11">
              <Link href={loginHref}>다시 로그인하기</Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              className="mt-3 min-h-11"
              onClick={() => entries.refetch()}
            >
              내 선택 다시 불러오기
            </Button>
          )}
        </div>
      )}
      {rounds.data.rounds.map((round) => (
        <MatchRound
          key={`${round.id}:${user?.id ?? "anonymous"}`}
          round={round}
          entry={
            user && !entries.isError
              ? entries.data?.entries.find(
                  (entry) => entry.roundId === round.id,
                )
              : undefined
          }
          userId={user?.id ?? null}
          authLoading={authLoading}
          entriesLoading={!!user && (entries.isPending || entries.isError)}
          now={now}
        />
      ))}
    </div>
  );
}

function MatchRound({
  round,
  entry,
  userId,
  authLoading,
  entriesLoading,
  now,
}: {
  round: WeeklyMatchRound;
  entry?: WeeklyMatchEntry;
  userId: string | null;
  authLoading: boolean;
  entriesLoading: boolean;
  now: number | null;
}) {
  const queryClient = useQueryClient();
  const [choice, setChoice] = useState<WeeklyMatchSide | null>(null);
  const [message, setMessage] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [rejectedByServer, setRejectedByServer] = useState(false);
  const selected = choice ?? entry?.side ?? null;
  const settled = round.settlement;
  const beforeOpen = now === null || now < Date.parse(round.opensAt);
  const closed =
    now === null ||
    now >= Date.parse(round.closesAt) ||
    !!settled ||
    rejectedByServer;
  const save = useMutation({
    mutationFn: async (side: WeeklyMatchSide) => {
      const response = await fetch("/api/me/weekly-match", {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId: round.id, side }),
      }).catch(() => {
        throw new Error(
          "선택을 저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.",
        );
      });
      if (response.status === 401) {
        setNeedsLogin(true);
        throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
      }
      if (response.status === 409) {
        setRejectedByServer(true);
        void queryClient.invalidateQueries({ queryKey: ["weekly-match"] });
        throw new Error("접수가 마감되었습니다. 최신 대진을 확인해 주세요.");
      }
      const body = (await response.json().catch(() => null)) as ApiResponse<{
        entry: WeeklyMatchEntry;
      }> | null;
      if (!response.ok || !body?.success || !body.data)
        throw new Error("선택을 저장하지 못했습니다. 다시 시도해 주세요.");
      return body.data.entry;
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<{ entries: WeeklyMatchEntry[] }>(
        ["me", "weekly-match", userId],
        (previous) => ({
          entries: [
            ...(previous?.entries ?? []).filter(
              (item) => item.roundId !== saved.roundId,
            ),
            saved,
          ],
        }),
      );
      setMessage(`${round[saved.side].name} 선택을 저장했습니다.`);
      setChoice(null);
    },
  });
  const disabled =
    beforeOpen || closed || entriesLoading || save.isPending || needsLogin;
  const resultLabel = !settled
    ? null
    : settled.outcome === "tie"
      ? "동률"
      : settled.outcome === "void"
        ? "무효"
        : `${round[settled.outcome].name} 승리`;
  const personalResult =
    !entry || !settled
      ? null
      : settled.outcome === "tie" || settled.outcome === "void"
        ? "적중·실패 집계에서 제외됩니다."
        : settled.outcome === entry.side
          ? "내 결과: 적중"
          : "내 결과: 실패";

  return (
    <section
      aria-labelledby={`match-${round.id}`}
      className="border-y border-border py-6 sm:py-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id={`match-${round.id}`}
            className="min-w-0 break-words font-display text-2xl font-semibold"
          >
            {round.title}
          </h2>
          <p className="mt-2 text-sm tabular-nums text-muted-foreground">
            비교 기간 {round.baseDate} ~ {round.endDate}
          </p>
        </div>
        <p className="text-sm font-medium">
          {settled
            ? resultLabel
            : closed
              ? "접수 마감"
              : beforeOpen
                ? "접수 예정"
                : "선택 접수 중"}
        </p>
      </div>

      <form
        className="mt-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (selected && !disabled) {
            setMessage("");
            save.mutate(selected);
          }
        }}
      >
        <fieldset disabled={disabled || !userId || authLoading}>
          <legend className="mb-3 text-sm font-medium">
            더 높은 가격 변동률을 기록할 섹터를 선택하세요
          </legend>
          <div className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {(["left", "right"] as const).map((side) => (
              <label
                key={side}
                className="flex min-h-28 cursor-pointer gap-3 px-3 py-5 hover:bg-surface-2 active:bg-surface-3 has-[:checked]:bg-accent has-[:disabled]:cursor-not-allowed sm:px-5"
              >
                <input
                  className="mt-1 h-5 w-5 shrink-0 accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                  type="radio"
                  name={`side-${round.id}`}
                  value={side}
                  checked={selected === side}
                  onChange={() => {
                    setChoice(side);
                    setMessage("");
                    save.reset();
                  }}
                />
                <span className="min-w-0">
                  <span className="block text-xl font-semibold">
                    {round[side].name}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {round[side].tickers.length}개 구성 종목
                  </span>
                  {settled && (
                    <span className="mt-3 block text-xl tabular-nums">
                      {settled[`${side}Return`] === null
                        ? "변동률 미확정"
                        : `${settled[`${side}Return`]! > 0 ? "+" : ""}${settled[`${side}Return`]!.toFixed(6)}%`}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            마감{" "}
            <time dateTime={round.closesAt}>
              {dateTime.format(new Date(round.closesAt))}
            </time>{" "}
            (한국 시간)
          </p>
          {authLoading ? (
            <p role="status" className="text-sm text-muted-foreground">
              로그인 확인 중
            </p>
          ) : !userId || needsLogin ? (
            <Button asChild className="min-h-11">
              <Link href={loginHref}>
                {closed ? "로그인하고 내 결과 확인" : "로그인하고 선택하기"}
              </Link>
            </Button>
          ) : !closed && !beforeOpen && userId ? (
            <Button
              type="submit"
              className="min-h-11 active:bg-primary/80 disabled:cursor-not-allowed"
              disabled={disabled || !selected}
              aria-busy={save.isPending}
            >
              {save.isPending
                ? "선택 저장 중"
                : entry
                  ? "선택 변경 저장"
                  : "선택 저장"}
            </Button>
          ) : null}
        </div>
        {userId && entriesLoading && (
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            내 선택 확인 전에는 저장할 수 없습니다.
          </p>
        )}
        {entry && (
          <p className="mt-3 text-sm">
            내 선택: <strong>{round[entry.side].name}</strong>
            {closed ? " (잠김)" : ""}
          </p>
        )}
        {save.isError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {save.error.message}
          </p>
        )}
        <p role="status" className="mt-2 min-h-5 text-sm text-success">
          {message}
        </p>
      </form>

      {closed && !settled && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {now !== null && now < Date.parse(round.endsAt)
            ? "비교가 진행 중입니다. 종료 후 종가를 확인해 결과를 확정합니다."
            : "종가와 기업 행사를 확인하며 집계 중입니다. 확정 전에는 승패를 표시하지 않습니다."}
        </p>
      )}
      {settled && (
        <div className="mt-4 text-sm leading-relaxed">
          {personalResult && <p className="font-semibold">{personalResult}</p>}
          {userId && !entriesLoading && !entry && (
            <p>이 대진에는 참여하지 않았습니다.</p>
          )}
          {settled.reason && (
            <p className="mt-1 text-muted-foreground">{settled.reason}</p>
          )}
          <p className="mt-1 text-muted-foreground">
            결과 버전 {settled.version}
            {settled.version > 1 ? " (정정된 최신 결과)" : ""}
          </p>
        </div>
      )}

      <details className="mt-4 border-t border-border pt-3 text-sm">
        <summary className="min-h-11 cursor-pointer rounded-sm py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2">
          고정 구성 종목 확인
        </summary>
        <div className="grid gap-5 pb-2 sm:grid-cols-2">
          {(["left", "right"] as const).map((side) => (
            <div key={side}>
              <h3 className="mb-2 font-semibold">{round[side].name}</h3>
              <ul className="space-y-1 text-muted-foreground">
                {round[side].tickers.map((ticker) => (
                  <li key={ticker.ticker}>
                    {ticker.name}{" "}
                    <span className="tabular-nums">({ticker.ticker})</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
