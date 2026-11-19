"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { ApiResponse } from "@/types";
import { publicProfileSchema } from "@/lib/weekly-match/ranking";
import type {
  WeeklyMatchLeaderboard as Leaderboard,
  WeeklyMatchPublicProfile,
} from "@/lib/weekly-match/types";

const loginHref = "/login?redirect=%2Fweekly-match%23rankings";
const leaderboardKey = ["weekly-match-leaderboard"];

async function readData<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    ...init,
  });
  const body = (await response
    .json()
    .catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok || !body?.success || !body.data)
    throw new Error("PROFILE_REQUEST_FAILED", { cause: response.status });
  return body.data;
}

export function WeeklyMatchLeaderboard() {
  const { user, isLoading } = useCurrentUser();
  const board = useQuery({
    queryKey: leaderboardKey,
    queryFn: async () =>
      (
        await readData<{ leaderboard: Leaderboard }>(
          "/api/weekly-match/leaderboard",
        )
      ).leaderboard,
    retry: false,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  return (
    <section
      id="rankings"
      aria-labelledby="weekly-rankings-title"
      className="mt-10 scroll-mt-24 rounded-xl border border-border bg-surface-2 p-5 sm:p-7"
    >
      <h2
        id="weekly-rankings-title"
        className="flex items-center gap-2 font-display text-2xl font-semibold"
      >
        <Trophy className="h-5 w-5 text-primary" aria-hidden />
        월별 공개 순위
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        한국시간 현재 월에 종료된 대진의 최신 확정 결과로 적중당 1점을
        계산합니다. 유효 확정 참여가 1회 이상이고 공개에 동의한 참여자만
        표시합니다. 동률·무효와 가상 연습은 제외합니다.
      </p>
      <div className="mt-5">
        {board.isPending ? (
          <p role="status">공개 순위를 불러오는 중입니다.</p>
        ) : board.isError ? (
          <div role="alert">
            <p>
              공개 순위를 불러오지 못했습니다. 참여 인원과 순위는 확인 후
              표시합니다.
            </p>
            <Button
              variant="outline"
              className="mt-3 min-h-11"
              onClick={() => board.refetch()}
            >
              순위 다시 불러오기
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold">{board.data.season} 시즌</p>
            <p className="mt-1 text-sm tabular-nums">
              공개 순위 참여자 {board.data.total.toLocaleString("ko-KR")}명
            </p>
            {board.data.entries.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                아직 공개 순위에 오른 참여자가 없습니다. 실제 확정 기록이 쌓이면
                순위를 표시합니다.
              </p>
            ) : (
              <>
                <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-background">
                  <table
                    aria-label={`${board.data.season} 월별 공개 순위`}
                    className="w-full min-w-[30rem] text-left text-sm"
                  >
                    <thead className="border-b border-border bg-surface-2 text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-4 py-3">
                          순위
                        </th>
                        <th scope="col" className="px-4 py-3">
                          별명
                        </th>
                        <th scope="col" className="px-4 py-3 text-right">
                          점수
                        </th>
                        <th scope="col" className="px-4 py-3 text-right">
                          적중
                        </th>
                        <th scope="col" className="px-4 py-3 text-right">
                          실패
                        </th>
                        <th scope="col" className="px-4 py-3 text-right">
                          유효 참여
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {board.data.entries.map((entry) => (
                        <tr
                          key={entry.nickname}
                          className="border-b border-border-subtle last:border-0"
                        >
                          <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                            {board.data.entries.filter(
                              (other) => other.rank === entry.rank,
                            ).length > 1
                              ? "공동 "
                              : ""}
                            {entry.rank}위
                          </td>
                          <td className="max-w-48 break-words px-4 py-3 font-semibold">
                            {entry.nickname}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-primary">
                            {entry.points}점
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {entry.wins}회
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {entry.losses}회
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {entry.validEntries}회
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  상위 50명까지 표시합니다. 같은 점수는 공동 순위이며 결과 정정
                  시 순위도 바뀔 수 있습니다.
                </p>
              </>
            )}
          </>
        )}
      </div>
      <div className="mt-6 border-t border-border pt-5">
        <h3 className="font-semibold">내 순위 공개 설정</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          공개 별명과 월별 성적만 순위에 표시합니다. 실명·이메일·개별 선택은
          공개하지 않습니다. 공개하지 않아도 선택과 보상은 그대로 이용하며,
          언제든 공개를 해제할 수 있습니다.
        </p>
        {isLoading ? (
          <p role="status" className="mt-4 text-sm">
            로그인 확인 중
          </p>
        ) : !user ? (
          <Button asChild variant="outline" className="mt-4 min-h-11">
            <Link href={loginHref}>로그인하고 공개 설정하기</Link>
          </Button>
        ) : (
          <OwnProfile key={user.id} userId={user.id} />
        )}
      </div>
    </section>
  );
}

function OwnProfile({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const key = ["me", "weekly-match-profile", userId];
  const [saved, setSaved] = useState(false);
  const profile = useQuery({
    queryKey: key,
    queryFn: async () =>
      (
        await readData<{ profile: WeeklyMatchPublicProfile | null }>(
          "/api/me/weekly-match/profile",
        )
      ).profile,
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });
  if (profile.isPending)
    return (
      <p role="status" className="mt-4 text-sm">
        공개 설정을 불러오는 중입니다.
      </p>
    );
  if (profile.isError)
    return (
      <div role="alert" className="mt-4 text-sm">
        <p>
          공개 설정을 불러오지 못했습니다. 기존 공개 여부를 확인한 뒤 변경할 수
          있습니다.
        </p>
        {profile.error.cause === 401 ? (
          <Button asChild variant="outline" className="mt-3 min-h-11">
            <Link href={loginHref}>다시 로그인하기</Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            className="mt-3 min-h-11"
            onClick={() => profile.refetch()}
          >
            공개 설정 다시 불러오기
          </Button>
        )}
      </div>
    );
  return (
    <>
      <ProfileForm
        key={`${profile.data?.nickname ?? ""}:${profile.data?.isPublic ?? false}`}
        profile={profile.data}
        onSaved={(next) => {
          queryClient.setQueryData(key, next);
          setSaved(true);
          void queryClient.invalidateQueries({ queryKey: key });
          void queryClient.invalidateQueries({ queryKey: leaderboardKey });
        }}
        onEdit={() => setSaved(false)}
      />
      {saved && (
        <p role="status" className="mt-3 text-sm text-success">
          공개 설정을 저장했습니다.
        </p>
      )}
    </>
  );
}

function ProfileForm({
  profile,
  onSaved,
  onEdit,
}: {
  profile: WeeklyMatchPublicProfile | null;
  onSaved: (profile: WeeklyMatchPublicProfile) => void;
  onEdit: () => void;
}) {
  const [nickname, setNickname] = useState(profile?.nickname ?? "");
  const [isPublic, setIsPublic] = useState(profile?.isPublic ?? false);
  const [validation, setValidation] = useState("");
  const save = useMutation({
    mutationFn: async (input: WeeklyMatchPublicProfile) =>
      (
        await readData<{ profile: WeeklyMatchPublicProfile }>(
          "/api/me/weekly-match/profile",
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          },
        )
      ).profile,
    onSuccess: onSaved,
  });
  const error =
    save.error?.cause === 409
      ? "이미 사용 중인 별명입니다. 다른 별명을 입력해 주세요."
      : save.error?.cause === 401
        ? "로그인이 만료되었습니다. 다시 로그인해 주세요."
        : "공개 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  const edit = () => {
    onEdit();
    setValidation("");
    save.reset();
  };
  return (
    <form
      className="mt-4"
      onSubmit={(event) => {
        event.preventDefault();
        onEdit();
        const parsed = publicProfileSchema.safeParse({ nickname, isPublic });
        if (!parsed.success) {
          setValidation(
            "별명은 2~16자 한글·영문·숫자·공백·밑줄·하이픈으로 입력해 주세요.",
          );
          return;
        }
        setValidation("");
        save.mutate(parsed.data);
      }}
    >
      <fieldset disabled={save.isPending} className="space-y-4">
        <div>
          <label
            htmlFor="weekly-public-nickname"
            className="block text-sm font-medium"
          >
            공개 별명
          </label>
          <input
            id="weekly-public-nickname"
            type="text"
            autoComplete="off"
            value={nickname}
            onChange={(event) => {
              setNickname(event.target.value);
              edit();
            }}
            aria-describedby="weekly-nickname-help"
            className="mt-2 min-h-11 w-full max-w-sm rounded-md border border-border bg-background px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          />
          <p
            id="weekly-nickname-help"
            className="mt-2 text-xs text-muted-foreground"
          >
            2~16자, 한글·영문·숫자·공백·_·- 사용 가능. 실명이나 이메일 대신
            별명을 사용하세요.
          </p>
        </div>
        <label className="flex min-h-11 items-start gap-3 text-sm leading-relaxed">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(event) => {
              setIsPublic(event.target.checked);
              edit();
            }}
            className="mt-1 h-5 w-5 shrink-0 accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          />
          <span>별명과 월별 성적을 공개 순위에 표시합니다</span>
        </label>
        <Button type="submit" className="min-h-11" aria-busy={save.isPending}>
          {save.isPending ? "공개 설정 저장 중" : "공개 설정 저장"}
        </Button>
      </fieldset>
      {validation && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {validation}
        </p>
      )}
      {save.isError && (
        <div role="alert" className="mt-3 text-sm text-danger">
          <p>{error}</p>
          {save.error.cause === 401 && (
            <Link
              href={loginHref}
              className="mt-2 inline-flex min-h-11 items-center underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            >
              다시 로그인하기
            </Link>
          )}
        </div>
      )}
    </form>
  );
}
