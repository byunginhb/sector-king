import { test, expect, type Page } from "@playwright/test";
import type {
  WeeklyMatchEntry,
  WeeklyMatchRound,
} from "@/lib/weekly-match/types";

const round: WeeklyMatchRound = {
  id: "fixture-round",
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

test.afterEach(async ({ page }, testInfo) => {
  await page.screenshot({
    path: testInfo.outputPath("weekly-match.png"),
    fullPage: true,
  });
});

async function openPage(page: Page) {
  await page.goto("/weekly-match");
  await page.getByRole("button", { name: "건너뛰기", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "온보딩", exact: true }),
  ).not.toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
}

async function publicRounds(
  page: Page,
  rounds: WeeklyMatchRound[],
  status = 200,
) {
  await page.route("**/api/weekly-match", (route) =>
    route.fulfill({
      status,
      json: { success: status === 200, data: { rounds } },
    }),
  );
}

async function signedInFixture(
  page: Page,
  initialEntries: WeeklyMatchEntry[] = [],
  saveStatus = 200,
) {
  const supabaseUrl =
    process.env.WEEKLY_MATCH_TEST_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://example.supabase.co";
  const storageKey = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
  const user = {
    id: "00000000-0000-4000-8000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: "fixture@example.test",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const accessToken = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, exp: 4070908800, aud: "authenticated" })}.fixture`;
  const session = {
    access_token: accessToken,
    refresh_token: "fixture-refresh-token",
    expires_at: 4070908800,
    expires_in: 3600,
    token_type: "bearer",
    user,
  };
  await page.addInitScript(
    ({ key, value }) => {
      document.cookie = `${key}=${value}; path=/; SameSite=Lax`;
    },
    { key: storageKey, value: `base64-${encode(session)}` },
  );
  await page.route(`${supabaseUrl}/auth/v1/user`, (route) =>
    route.fulfill({ json: user }),
  );
  await page.route(`${supabaseUrl}/rest/v1/profiles**`, (route) =>
    route.fulfill({
      json: {
        id: user.id,
        email: user.email,
        role: "user",
        name: "테스트 사용자",
        avatar_url: null,
      },
    }),
  );
  let entries = initialEntries;
  await page.route("**/api/me/weekly-match", async (route) => {
    if (route.request().method() !== "POST")
      return route.fulfill({ json: { success: true, data: { entries } } });
    const input = route.request().postDataJSON();
    const entry = { ...input, updatedAt: new Date().toISOString() };
    if (saveStatus === 200) entries = [entry];
    return route.fulfill({
      status: saveStatus,
      json: { success: saveStatus === 200, data: { entry } },
    });
  });
}

test("실제 비로그인 조회: 안내와 규칙을 렌더하고 장애를 빈 대진으로 숨기지 않는다", async ({
  page,
}) => {
  await openPage(page);
  await expect(
    page.getByRole("heading", { name: "참여와 결과 산정" }),
  ).toBeVisible();
  await expect(page.getByText("대진을 불러오는 중입니다.")).not.toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page
      .getByRole("heading", { name: "다음 대진을 준비하고 있습니다" })
      .or(page.getByRole("main").getByRole("alert"))
      .or(page.getByRole("heading", { name: /은행 대 조선/ })),
  ).toBeVisible();
});

test("빈 대진은 섹터 탐색으로 연결한다", async ({ page }) => {
  await publicRounds(page, []);
  await openPage(page);
  await expect(
    page.getByRole("heading", { name: "다음 대진을 준비하고 있습니다" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "섹터 살펴보기", exact: true }),
  ).toHaveAttribute("href", "/sectors");
});

test("대진 조회 장애에는 다시 불러오기를 제공한다", async ({ page }) => {
  await publicRounds(page, [], 503);
  await openPage(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "대진을 불러오지 못했습니다.",
  );
  await expect(
    page.getByRole("button", { name: "다시 불러오기" }),
  ).toBeVisible();
});

test("비로그인 대진은 선택 잠금과 로그인 복귀 주소를 제공한다", async ({
  page,
}) => {
  await publicRounds(page, [round]);
  await openPage(page);
  await expect(
    page.getByRole("link", { name: "로그인하고 선택하기" }),
  ).toHaveAttribute("href", "/login?redirect=%2Fweekly-match");
  await expect(page.getByRole("radio", { name: /은행/ })).toBeDisabled();
  await page.getByText("고정 구성 종목 확인", { exact: true }).click();
  await expect(page.getByText("KB금융", { exact: false })).toBeVisible();
});

test("격리된 로그인 fixture: 선택 저장과 변경은 서버 응답 뒤 표시한다", async ({
  page,
}) => {
  await signedInFixture(page);
  await publicRounds(page, [round]);
  await openPage(page);
  await page.getByRole("radio", { name: /은행/ }).check();
  await page.getByRole("button", { name: "선택 저장", exact: true }).click();
  await expect(
    page.getByText("은행 선택을 저장했습니다.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("radio", { name: /조선/ }).check();
  await page.getByRole("button", { name: "선택 변경 저장" }).click();
  await expect(
    page.getByText("조선 선택을 저장했습니다.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("내 선택:", { exact: false })).toContainText(
    "조선",
  );
});

test("서버 마감 거부는 성공 문구 없이 선택을 잠근다", async ({ page }) => {
  await signedInFixture(page, [], 409);
  await publicRounds(page, [round]);
  await openPage(page);
  await page.getByRole("radio", { name: /은행/ }).check();
  await page.getByRole("button", { name: "선택 저장", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "접수가 마감되었습니다.",
  );
  await expect(page.getByRole("radio", { name: /은행/ })).toBeDisabled();
  await expect(
    page.getByText("은행 선택을 저장했습니다.", { exact: true }),
  ).not.toBeVisible();
});

test("마감된 미확정 대진은 승패를 표시하지 않는다", async ({ page }) => {
  await signedInFixture(page, [
    { roundId: round.id, side: "left", updatedAt: "2026-11-06T09:00:00Z" },
  ]);
  await publicRounds(page, [{ ...round, closesAt: "2020-01-01T00:00:00Z" }]);
  await openPage(page);
  await expect(page.getByText("내 선택:", { exact: false })).toContainText(
    "(잠김)",
  );
  await expect(page.getByRole("radio", { name: /은행/ })).toBeDisabled();
  await expect(page.getByText(/내 결과:/)).not.toBeVisible();
});

for (const outcome of ["left", "tie", "void"] as const) {
  test(`최신 ${outcome} 결과와 개인 집계를 표시한다`, async ({ page }) => {
    await signedInFixture(page, [
      { roundId: round.id, side: "left", updatedAt: "2026-11-06T09:00:00Z" },
    ]);
    await publicRounds(page, [
      {
        ...round,
        settlement: {
          version: 2,
          outcome,
          leftReturn: outcome === "void" ? null : 1.234567,
          rightReturn:
            outcome === "void" ? null : outcome === "tie" ? 1.234567 : -0.5,
          reason: "검증된 fixture 정정 사유",
          settledAt: "2026-11-13T09:00:00Z",
        },
      },
    ]);
    await openPage(page);
    await expect(
      page.getByText("결과 버전 2 (정정된 최신 결과)", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        outcome === "left" ? "내 결과: 적중" : "적중·실패 집계에서 제외됩니다.",
        { exact: true },
      ),
    ).toBeVisible();
  });
}
