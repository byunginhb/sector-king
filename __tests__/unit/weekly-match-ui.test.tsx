import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WeeklyMatchBoard } from "@/components/weekly-match/weekly-match-board";
import type {
  WeeklyMatchEntry,
  WeeklyMatchRound,
} from "@/lib/weekly-match/types";

const auth = vi.hoisted(() => ({
  user: null as { id: string } | null,
  isLoading: false,
}));
vi.mock("@/hooks/use-current-user", () => ({ useCurrentUser: () => auth }));

const round: WeeklyMatchRound = {
  id: "round-test",
  title: "은행 대 조선",
  baseDate: "2026-11-06",
  endDate: "2026-11-13",
  opensAt: "2020-01-01T00:00:00Z",
  closesAt: "2099-01-01T00:00:00Z",
  endsAt: "2099-01-08T00:00:00Z",
  left: {
    id: "korea_banks",
    name: "은행",
    tickers: [{ ticker: "105560.KS", name: "KB금융" }],
  },
  right: {
    id: "korea_shipbuilding",
    name: "조선",
    tickers: [{ ticker: "329180.KS", name: "HD현대중공업" }],
  },
  settlement: null,
};
let rounds: WeeklyMatchRound[];
let entries: WeeklyMatchEntry[];
let publicStatus: number;
let saveStatus: number;

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrap = () => (
    <QueryClientProvider client={client}>
      <WeeklyMatchBoard />
    </QueryClientProvider>
  );
  return { ...render(wrap()), refresh: wrap, client };
}

beforeEach(() => {
  auth.user = null;
  rounds = [structuredClone(round)];
  entries = [];
  publicStatus = 200;
  saveStatus = 200;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/weekly-match")
        return Response.json(
          { success: publicStatus === 200, data: { rounds } },
          { status: publicStatus },
        );
      if (init?.method === "POST") {
        const input = JSON.parse(init.body as string);
        const entry = { ...input, updatedAt: new Date().toISOString() };
        if (saveStatus === 200) entries = [entry];
        return Response.json(
          { success: saveStatus === 200, data: { entry } },
          { status: saveStatus },
        );
      }
      return Response.json({ success: true, data: { entries } });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("주간 매치 화면", () => {
  it("비로그인은 개인 API를 요청하지 않고 복귀 주소가 있는 로그인 링크를 제공한다", async () => {
    mount();
    expect(
      await screen.findByRole("link", { name: "로그인하고 선택하기" }),
    ).toHaveAttribute("href", "/login?redirect=%2Fweekly-match");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("radio", { name: /은행/ })).toBeDisabled();
  });

  it("저장 응답 후 선택을 표시하고 마감 전 다른 섹터로 변경한다", async () => {
    auth.user = { id: "user-a" };
    mount();
    const left = await screen.findByRole("radio", { name: /은행/ });
    await waitFor(() => expect(left).not.toBeDisabled());
    fireEvent.click(left);
    fireEvent.click(screen.getByRole("button", { name: /^선택 저장$/ }));
    expect(await screen.findByText("은행 선택을 저장했습니다.")).toBeVisible();
    expect(screen.getByText("내 선택:")).toHaveTextContent("은행");
    fireEvent.click(screen.getByRole("radio", { name: /조선/ }));
    fireEvent.click(screen.getByRole("button", { name: "선택 변경 저장" }));
    expect(await screen.findByText("조선 선택을 저장했습니다.")).toBeVisible();
    expect(fetch).toHaveBeenLastCalledWith(
      "/api/me/weekly-match",
      expect.objectContaining({
        body: JSON.stringify({ roundId: round.id, side: "right" }),
        cache: "no-store",
      }),
    );
  });

  it("마감은 잠그고 확정 전에는 결과를 만들지 않는다", async () => {
    auth.user = { id: "user-a" };
    rounds[0].closesAt = "2020-01-01T00:00:00Z";
    entries = [
      { roundId: round.id, side: "left", updatedAt: "2020-01-01T00:00:00Z" },
    ];
    mount();
    expect(await screen.findByText(/내 선택:/)).toHaveTextContent(
      "은행 (잠김)",
    );
    expect(screen.getByText("접수 마감")).toBeVisible();
    expect(screen.getByRole("radio", { name: /은행/ })).toBeDisabled();
    expect(screen.queryByText(/내 결과:/)).not.toBeInTheDocument();
  });

  it("저장 실패는 성공으로 표시하지 않고 409는 서버 기준으로 잠근다", async () => {
    auth.user = { id: "user-a" };
    saveStatus = 409;
    mount();
    const radio = await screen.findByRole("radio", { name: /조선/ });
    await waitFor(() => expect(radio).not.toBeDisabled());
    fireEvent.click(radio);
    fireEvent.click(screen.getByRole("button", { name: /^선택 저장$/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "접수가 마감되었습니다.",
    );
    expect(screen.queryByText(/선택을 저장했습니다/)).not.toBeInTheDocument();
    expect(radio).toBeDisabled();
  });

  it.each(["tie", "void"] as const)(
    "%s 결과는 적중·실패에서 제외하고 최신 버전을 보여준다",
    async (outcome) => {
      auth.user = { id: "user-a" };
      entries = [
        { roundId: round.id, side: "left", updatedAt: "2020-01-01T00:00:00Z" },
      ];
      rounds[0].settlement = {
        version: 2,
        outcome,
        leftReturn: null,
        rightReturn: null,
        reason: "검증된 정정 사유",
        settledAt: "2026-11-13T09:00:00Z",
      };
      mount();
      expect(
        await screen.findByText("적중·실패 집계에서 제외됩니다."),
      ).toBeVisible();
      expect(screen.getByText("결과 버전 2 (정정된 최신 결과)")).toBeVisible();
      expect(screen.queryByText(/내 결과:/)).not.toBeInTheDocument();
    },
  );

  it("빈 대진과 서비스 실패를 구분한다", async () => {
    rounds = [];
    const empty = mount();
    expect(
      await screen.findByRole("heading", {
        name: "다음 대진을 준비하고 있습니다",
      }),
    ).toBeVisible();
    empty.unmount();
    publicStatus = 503;
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "대진을 불러오지 못했습니다.",
    );
    expect(screen.getByRole("button", { name: "다시 불러오기" })).toBeVisible();
  });

  it("로그아웃하면 이전 사용자의 선택과 성공 메시지를 즉시 가린다", async () => {
    auth.user = { id: "user-a" };
    entries = [
      { roundId: round.id, side: "left", updatedAt: "2020-01-01T00:00:00Z" },
    ];
    const view = mount();
    expect(await screen.findByText("내 선택:")).toHaveTextContent("은행");
    auth.user = null;
    view.rerender(view.refresh());
    expect(screen.queryByText("내 선택:")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "로그인하고 선택하기" }),
    ).toBeVisible();
  });
});
