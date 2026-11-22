import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WeeklyMatchHome } from "@/components/weekly-match/weekly-match-home";
import { getWeeklyMatchHomeState } from "@/lib/weekly-match/home-state";
import type { WeeklyMatchRound } from "@/lib/weekly-match/types";
import { trackEvent } from "@/lib/analytics";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

const round: WeeklyMatchRound = {
  id: "test-round",
  title: "은행 대 조선",
  baseDate: "2026-11-18",
  endDate: "2026-11-19",
  opensAt: "2026-11-18T09:00:00Z",
  closesAt: "2026-11-19T00:00:00Z",
  endsAt: "2026-11-19T09:00:00Z",
  left: { id: "bank", name: "한국 은행", tickers: [] },
  right: { id: "ship", name: "조선", tickers: [] },
  settlement: null,
};
let observe: (visible: boolean, bottom: number) => void;
let clients: QueryClient[] = [];
function mount(rounds: WeeklyMatchRound[] = [], fails = false) {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: !fails,
        json: async () =>
          fails ? { success: false } : { success: true, data: { rounds } },
      }),
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>
      <div onClickCapture={(event) => event.preventDefault()}>
        <WeeklyMatchHome />
      </div>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-11-18T10:00:00Z"));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        observe = (visible, bottom) =>
          callback(
            [
              {
                isIntersecting: visible,
                boundingClientRect: { bottom },
              } as IntersectionObserverEntry,
            ],
            this as unknown as IntersectionObserver,
          );
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  clients.forEach((client) => client.clear());
  clients = [];
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("home match state", () => {
  it("distinguishes preparation, open, exact cutoff, and final results", () => {
    expect(getWeeklyMatchHomeState([], Date.now()).status).toBe("preparing");
    expect(
      getWeeklyMatchHomeState([round], Date.parse(round.opensAt) - 1).status,
    ).toBe("preparing");
    expect(
      getWeeklyMatchHomeState([round], Date.parse(round.opensAt)).status,
    ).toBe("open");
    expect(
      getWeeklyMatchHomeState([round], Date.parse(round.closesAt)).status,
    ).toBe("closed");
    expect(getWeeklyMatchHomeState([round], null).status).toBe("preparing");
    expect(
      getWeeklyMatchHomeState(
        [
          {
            ...round,
            settlement: {
              version: 1,
              outcome: "void",
              leftReturn: null,
              rightReturn: null,
              reason: "missing",
              settledAt: round.endsAt,
            },
          },
        ],
        Date.now(),
      ).status,
    ).toBe("settled");
  });
  it("prefers a live round over newer scheduled rounds without mutating the list", () => {
    const upcoming = {
      ...round,
      id: "next",
      opensAt: "2026-11-20T09:00:00Z",
      closesAt: "2026-11-21T00:00:00Z",
    };
    const rounds = [upcoming, round];
    expect(getWeeklyMatchHomeState(rounds, Date.now()).round?.id).toBe(
      round.id,
    );
    expect(rounds[0].id).toBe("next");
  });
});

describe("home match discovery", () => {
  it("keeps one entry link without practice or ranking promotions", async () => {
    mount();
    expect(await screen.findByText("접수 준비 중")).toBeVisible();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "대진 살펴보기" })).toHaveAttribute("href", "/weekly-match");
    expect(screen.queryByText("연습으로 먼저 골라보기")).not.toBeInTheDocument();
    expect(screen.queryByText("시즌 순위 보기")).not.toBeInTheDocument();
  });
  it.each(["closed", "settled"] as const)("shows period, readable guidance and a single action for %s", async (phase) => {
    mount([{ ...round, closesAt: "2026-11-18T09:00:00Z", settlement: phase === "settled" ? {version:2,outcome:"left",leftReturn:-3.21,rightReturn:-7.24,reason:"confirmed",settledAt:round.endsAt} : null }]);
    expect(await screen.findByRole("link",{name:phase === "settled" ? "결과 확인하기" : "진행 상황 보기"})).toHaveAttribute("href","/weekly-match");
    expect(screen.getByText("비교 기간 2026-11-18 ~ 2026-11-19")).toBeVisible();
    expect(screen.getByText(phase === "settled" ? "비교가 끝났습니다. 확정 결과와 내 기록을 확인하세요." : "선택이 마감됐습니다. 확정된 결과를 기다리고 있습니다.")).toBeVisible();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
  it.each([0, 2, 39, 40, 49])("shows count %i only once actual participation reaches40", async (count) => {
    mount([{ ...round, participantCount: count }]);
    await screen.findByText("선택 접수 중");
    if (count >= 40) expect(screen.getByText(`${count}명 참여 중`)).toBeVisible();
    else expect(screen.queryByText(/\d+명 참여/)).not.toBeInTheDocument();
    if (count !== 49) expect(screen.queryByText("49명 참여 중")).not.toBeInTheDocument();
  });
  it("keeps real failures and retry without inventing a count", async () => {
    mount([], true);
    expect(await screen.findByRole("alert")).toHaveTextContent("대진을 불러오지 못했습니다");
    expect(screen.queryByText("접수 준비 중")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 불러오기" })).toBeVisible();
    expect(screen.queryByText(/\d+명 참여/)).not.toBeInTheDocument();
  });
  it("tracks one impression and never floats after scrolling past the entry", async () => {
    mount([round]);
    await screen.findByText("선택 접수 중");
    act(() => observe(true, 300));
    act(() => observe(true, 200));
    expect(trackEvent).toHaveBeenCalledTimes(1);
    act(() => observe(false, -1));
    expect(screen.queryByRole("complementary", { name: "섹터 매치 빠른 이동" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "섹터 매치 접기" })).not.toBeInTheDocument();
  });
  it("tracks entering the real match independently from practice", async () => {
    mount([round]);
    await screen.findByText("선택 접수 중");
    fireEvent.click(screen.getByRole("link", { name: "선택하러 가기" }));
    expect(trackEvent).toHaveBeenCalledWith("select_content", {
      content_type: "weekly_match",
      placement: "home_card",
    });
  });
});
