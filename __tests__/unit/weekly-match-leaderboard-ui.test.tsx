import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WeeklyMatchLeaderboard } from "@/components/weekly-match/weekly-match-leaderboard";

const auth = vi.hoisted(() => ({
  user: null as { id: string } | null,
  isLoading: false,
}));
vi.mock("@/hooks/use-current-user", () => ({ useCurrentUser: () => auth }));
const clients: QueryClient[] = [];
const profileUrl = "/api/me/weekly-match/profile";
const boardUrl = "/api/weekly-match/leaderboard";
const empty = { season: "2026-11", total: 0, entries: [] };
const ok = (data: unknown) => Response.json({ success: true, data });
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  clients.push(client);
  const view = render(
    <QueryClientProvider client={client}>
      <WeeklyMatchLeaderboard />
    </QueryClientProvider>,
  );
  return {
    ...view,
    client,
    refresh: () =>
      view.rerender(
        <QueryClientProvider client={client}>
          <WeeklyMatchLeaderboard />
        </QueryClientProvider>,
      ),
  };
}
function mockApi(
  profile: { nickname: string; isPublic: boolean } | null = null,
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === boardUrl) return ok({ leaderboard: empty });
      if (url === profileUrl && init?.method === "PUT") {
        profile = JSON.parse(init.body as string);
        return ok({ profile });
      }
      if (url === profileUrl) return ok({ profile });
      throw new Error(`Unexpected URL ${url}`);
    }),
  );
}
beforeEach(() => {
  auth.user = null;
  auth.isLoading = false;
  vi.clearAllMocks();
  mockApi();
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  vi.unstubAllGlobals();
});

describe("public monthly ranking", () => {
  it("shows truthful zero with no private requests while logged out", async () => {
    mount();
    expect(await screen.findByText("공개 순위 참여자 0명")).toBeVisible();
    expect(
      screen.getByText(/아직 공개 순위에 오른 참여자가 없습니다/),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "로그인하고 공개 설정하기" }),
    ).toHaveAttribute("href", "/login?redirect=%2Fweekly-match%23rankings");
    expect(vi.mocked(fetch).mock.calls.every(([url]) => url === boardUrl)).toBe(
      true,
    );
    expect(screen.getByText(/공개하지 않아도 선택과 보상/)).toBeVisible();
  });
  it("renders tied ranks and server supplied scores in a semantic table", async () => {
    vi.mocked(fetch).mockResolvedValue(
      ok({
        leaderboard: {
          season: "2026-11",
          total: 51,
          entries: [
            {
              rank: 1,
              nickname: "은행_친구",
              points: 2,
              wins: 2,
              losses: 1,
              validEntries: 3,
            },
            {
              rank: 1,
              nickname: "조선 친구",
              points: 2,
              wins: 2,
              losses: 0,
              validEntries: 2,
            },
          ],
        },
      }),
    );
    mount();
    expect(
      await screen.findByRole("table", { name: "2026-11 월별 공개 순위" }),
    ).toBeVisible();
    expect(screen.getAllByRole("cell", { name: "공동 1위" })).toHaveLength(2);
    expect(screen.getByText("공개 순위 참여자 51명")).toBeVisible();
    expect(screen.getByText(/상위 50명/)).toBeVisible();
  });
  it("preserves an outage as unknown and provides retry", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ success: false }, { status: 503 }),
    );
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "공개 순위를 불러오지 못했습니다",
    );
    expect(screen.queryByText("공개 순위 참여자 0명")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "순위 다시 불러오기" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });
});

describe("own opt-in profile", () => {
  it("starts unchecked and trims a valid alias; success refreshes own profile and public ranking", async () => {
    auth.user = { id: "own" };
    const { client } = mount();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const alias = await screen.findByRole("textbox", { name: "공개 별명" });
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    fireEvent.change(alias, { target: { value: "  섹터 친구  " } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "공개 설정 저장" }));
    await screen.findByText("공개 설정을 저장했습니다.");
    expect(fetch).toHaveBeenCalledWith(
      profileUrl,
      expect.objectContaining({
        method: "PUT",
        cache: "no-store",
        body: JSON.stringify({ nickname: "섹터 친구", isPublic: true }),
      }),
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["me", "weekly-match-profile", "own"],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["weekly-match-leaderboard"],
    });
  });
  it("does not replace loading or failed profile reads with a blank false form", async () => {
    auth.user = { id: "own" };
    let finish!: (r: Response) => void;
    vi.mocked(fetch).mockImplementation(async (url) =>
      url === boardUrl
        ? ok({ leaderboard: empty })
        : new Promise((resolve) => {
            finish = resolve;
          }),
    );
    mount();
    expect(
      await screen.findByText("공개 설정을 불러오는 중입니다."),
    ).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    finish(Response.json({ success: false }, { status: 503 }));
    expect(
      await screen.findByText(/공개 설정을 불러오지 못했습니다/),
    ).toBeVisible();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "공개 설정 다시 불러오기" }),
    ).toBeVisible();
  });
  it("allows withdrawal while keeping the registered alias", async () => {
    auth.user = { id: "own" };
    mockApi({ nickname: "선박_친구", isPublic: true });
    mount();
    expect(await screen.findByRole("textbox")).toHaveValue("선박_친구");
    expect(screen.getByRole("checkbox")).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "공개 설정 저장" }));
    await screen.findByText("공개 설정을 저장했습니다.");
    expect(fetch).toHaveBeenCalledWith(
      profileUrl,
      expect.objectContaining({
        body: JSON.stringify({ nickname: "선박_친구", isPublic: false }),
      }),
    );
  });
  it("allows an existing public Hangul jamo alias to withdraw", async () => {
    auth.user = { id: "own" };
    mockApi({ nickname: "ㄱㄴ", isPublic: true });
    mount();
    expect(await screen.findByRole("textbox")).toHaveValue("ㄱㄴ");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "공개 설정 저장" }));
    await screen.findByText("공개 설정을 저장했습니다.");
    expect(fetch).toHaveBeenCalledWith(
      profileUrl,
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ nickname: "ㄱㄴ", isPublic: false }),
      }),
    );
  });
  it("rejects a malformed alias before sending a write", async () => {
    auth.user = { id: "own" };
    mount();
    fireEvent.change(await screen.findByRole("textbox"), {
      target: { value: "<email@user>" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "공개 설정 저장" }).closest("form")!,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("별명은 2~16자");
    expect(
      vi.mocked(fetch).mock.calls.some(([, init]) => init?.method === "PUT"),
    ).toBe(false);
  });
  it.each([
    [409, "이미 사용 중인 별명입니다"],
    [401, "로그인이 만료되었습니다"],
    [503, "공개 설정을 저장하지 못했습니다"],
  ])("reports PUT %i without claiming success", async (status, message) => {
    auth.user = { id: "own" };
    mockApi({ nickname: "기존별명", isPublic: false });
    const original = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation(async (url, init) =>
      init?.method === "PUT"
        ? Response.json({ success: false }, { status })
        : original(url, init),
    );
    mount();
    await screen.findByRole("textbox");
    fireEvent.click(screen.getByRole("button", { name: "공개 설정 저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(
      screen.queryByText("공개 설정을 저장했습니다."),
    ).not.toBeInTheDocument();
    if (status === 401)
      expect(
        screen.getByRole("link", { name: "다시 로그인하기" }),
      ).toHaveAttribute("href", "/login?redirect=%2Fweekly-match%23rankings");
  });
  it("drops edited aliases and opt-in immediately on account switch and logout", async () => {
    auth.user = { id: "first" };
    mockApi({ nickname: "첫계정", isPublic: true });
    const view = mount();
    fireEvent.change(await screen.findByRole("textbox"), {
      target: { value: "편집중" },
    });
    mockApi(null);
    auth.user = { id: "second" };
    view.refresh();
    expect(screen.queryByDisplayValue("편집중")).not.toBeInTheDocument();
    expect(await screen.findByRole("textbox")).toHaveValue("");
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    auth.user = null;
    view.refresh();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
