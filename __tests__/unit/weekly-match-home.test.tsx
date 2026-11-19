import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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
  it("shows a separate virtual practice link without inventing real participation", async () => {
    mount();
    expect(await screen.findByText("접수 준비 중")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "연습으로 먼저 골라보기" }),
    ).toHaveAttribute("href", "/weekly-match#practice");
    expect(screen.queryByText("선택하러 가기")).not.toBeInTheDocument();
    expect(
      screen.getByText(/실제 참여·보상에 합산되지 않습니다/),
    ).toBeInTheDocument();
  });
  it("shows actual API participation without inventing49users",async()=>{
    mount([{...round,participantCount:2}]);
    expect(await screen.findByText('2명 참여 중')).toBeVisible();
    expect(screen.queryByText('49명 참여 중')).not.toBeInTheDocument();
    expect(screen.getByRole('link',{name:'시즌 순위 보기'})).toHaveAttribute('href','/weekly-match#rankings');
  });
  it("preserves query failures and allows retry rather than showing preparation", async () => {
    mount([], true);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "대진을 불러오지 못했습니다",
    );
    expect(screen.queryByText("접수 준비 중")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "다시 불러오기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "연습으로 먼저 골라보기" }),
    ).toBeInTheDocument();
  });
  it("floats only after the main card exits above the viewport; collapse and dismissal work", async () => {
    mount([round]);
    await screen.findByText("선택 접수 중");
    act(() => observe(false, 900));
    expect(
      screen.queryByRole("complementary", { name: "섹터 매치 빠른 이동" }),
    ).not.toBeInTheDocument();
    act(() => observe(true, 300));
    act(() => observe(true, 200));
    expect(trackEvent).toHaveBeenCalledTimes(1);
    act(() => observe(false, -1));
    const floating = screen.getByRole("complementary", {
      name: "섹터 매치 빠른 이동",
    });
    expect(floating.className).toContain("lg:block");
    fireEvent.click(screen.getByRole("button", { name: "섹터 매치 접기" }));
    expect(
      screen.getByRole("button", { name: "섹터 매치 펼치기" }),
    ).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: "섹터 매치 펼치기" }));
    fireEvent.click(screen.getByRole("button", { name: "섹터 매치 닫기" }));
    act(() => observe(true, 100));
    act(() => observe(false, -1));
    expect(
      screen.queryByRole("complementary", { name: "섹터 매치 빠른 이동" }),
    ).not.toBeInTheDocument();
    expect(trackEvent).toHaveBeenCalledWith("weekly_match_dismiss", {
      placement: "home_floating",
    });
  });
  it("hides the floating card while a dialog or onboarding overlay is open", async () => {
    mount([round]);
    await screen.findByText("선택 접수 중");
    act(() => observe(false, -1));
    expect(screen.getByRole("complementary")).toBeInTheDocument();
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    act(() => {
      document.body.append(dialog);
    });
    await waitFor(() =>
      expect(screen.queryByRole("complementary")).not.toBeInTheDocument(),
    );
    act(() => dialog.remove());
    await waitFor(() =>
      expect(screen.getByRole("complementary")).toBeInTheDocument(),
    );
    const overlay = document.createElement("div");
    overlay.className = "driver-overlay";
    act(() => document.body.append(overlay));
    await waitFor(() =>
      expect(screen.queryByRole("complementary")).not.toBeInTheDocument(),
    );
    await act(async () => overlay.remove());
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
