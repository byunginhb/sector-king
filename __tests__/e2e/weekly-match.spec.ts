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

test.beforeEach(async ({page}) => {
  await page.route('**/api/weekly-match/leaderboard', route=>route.fulfill({json:{success:true,data:{leaderboard:{season:'2026-11',total:0,entries:[]}}}}));
});

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
  let profile: {nickname:string,isPublic:boolean}|null=null;
  await page.route('**/api/me/weekly-match/profile', async route=>{
    if(route.request().method()==='PUT')profile=route.request().postDataJSON();
    return route.fulfill({json:{success:true,data:{profile}}});
  });
  let entries = initialEntries;
  await page.route("**/api/me/weekly-match/rewards", (route) => route.fulfill({json:{success:true,data:{rewards:{season:"2026-11",firstPick:entries.length>0,participations:entries.length,points:0,wins:0,losses:0,excluded:0,pending:entries.length,cards:[]}}}}));
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

test("모바일 메뉴에서 베타에 접근하고 단기 비교 기간 안내를 확인한다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await publicRounds(page, [round]);
  await openPage(page);
  await expect(page.getByRole('complementary', { name: '베타 운영 안내' })).toContainText('한 거래일');
  await expect(page.getByRole('complementary', { name: '베타 운영 안내' })).toContainText('가격 기준을 확인 중');
  await page.getByRole('button', { name: '메뉴 열기' }).click();
  const menu = page.getByRole('navigation', { name: '모바일 주요 메뉴' });
  const match = menu.getByRole('link', { name: /섹터 매치.*BETA/ });
  await expect(match).toHaveAttribute('href', '/weekly-match');
  await match.click();
  await expect(page.getByRole('dialog', { name: '메뉴', exact: true })).not.toBeVisible();
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


test("49명 가상 체험은 로그인이나 실제 선택 저장 없이 이용한다", async ({ page }) => {
  await publicRounds(page, []);
  const writes:string[]=[];
  page.on('request', request=>{if(request.method()==='POST' && request.url().includes('/api/me/weekly-match'))writes.push(request.url())});
  await openPage(page);
  const practice=page.locator('#practice');
  await expect(practice).toContainText('가상 참가자 49명');
  await practice.getByRole('button',{name:'연습으로 한국 은행 선택'}).click();
  await expect(practice.getByRole('status')).toContainText('연습 선택: 한국 은행');
  await expect(practice).toContainText('가상 은행 선택 26명');
  await practice.getByRole('button',{name:'연습으로 조선 선택'}).click();
  await expect(practice.getByRole('status')).toContainText('연습 선택: 조선');
  expect(writes).toEqual([]);
  await expect(page.getByText(/로그인 후 실제 참여 기록/)).toBeVisible();
});

test("본인 확정 결과의 PNG 카드와 최신 월별 점수를 확인한다", async ({ page }) => {
  await signedInFixture(page,[{roundId:round.id,side:'left',updatedAt:'2026-11-01T09:00:00Z'}]);
  await publicRounds(page,[round]);
  const card={roundId:round.id,title:'은행 대 조선',baseDate:'2026-11-06',endDate:'2026-11-13',sideName:'은행',outcome:'hit',leftName:'은행',rightName:'조선',leftReturn:1.2,rightReturn:-0.2,version:2,settledAt:'2026-11-13T09:00:00Z'};
  await page.route('**/api/me/weekly-match/rewards',route=>route.fulfill({json:{success:true,data:{rewards:{season:'2026-11',firstPick:true,participations:1,points:1,wins:1,losses:0,excluded:0,pending:0,cards:[card]}}}}));
  await openPage(page);
  await expect(page.getByText('첫 참여 배지 획득')).toBeVisible();
  await expect(page.getByText('1점',{exact:true})).toBeVisible();
  await page.getByText('은행 대 조선 · 내 결과 카드 만들기',{exact:true}).click();
  const preview=page.getByLabel('공유할 결과 미리보기');
  await expect(preview).toContainText('결과 버전 2');
  await expect(preview).not.toContainText('fixture@example.test');
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'결과 카드 PNG 내려받기'}).click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toBe('sector-match-fixture-round-v2.png');
  await download.saveAs(test.info().outputPath('result-card.png'));
  await expect(page.getByText('카드 내려받기를 시작했습니다.')).toBeVisible();
});

test('홈 대진은 중간 크기로 읽기 쉽고 스크롤해도 플로팅이 없다',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await publicRounds(page,[round]);
  await page.goto('/');
  await page.getByRole('button',{name:'건너뛰기',exact:true}).click();
  const home=page.locator('section[aria-labelledby="home-weekly-match-title"]');
  await expect(home).toBeVisible();
  await expect(home).toContainText('선택 접수 중');
  await expect(home.getByRole('link')).toHaveCount(1);
  await expect(home.getByRole('link',{name:'선택하러 가기'})).toHaveAttribute('href','/weekly-match');
  expect((await home.boundingBox())!.height).toBeGreaterThanOrEqual(140);
  expect((await home.boundingBox())!.height).toBeLessThanOrEqual(220);
  await page.evaluate(()=>window.scrollTo(0,1500));
  await expect(page.getByRole('complementary',{name:'섹터 매치 빠른 이동'})).toHaveCount(0);
});

test('소규모 참여 숫자는 숨기고 실제 49명일 때만49명을 표시한다',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await publicRounds(page,[{...round,participantCount:2}]);
 await page.goto('/');await page.getByRole('button',{name:'건너뛰기',exact:true}).click();
 const home=page.locator('section[aria-labelledby="home-weekly-match-title"]');
 await expect(home).toContainText('선택 접수 중');
 await expect(home.getByText(/\d+명 참여/)).toHaveCount(0);
 expect((await home.boundingBox())!.height).toBeGreaterThanOrEqual(180);
 expect((await home.boundingBox())!.height).toBeLessThanOrEqual(300);
 await home.getByRole('link',{name:'선택하러 가기'}).click();
 await page.waitForURL('**/weekly-match');
 const ranks=page.locator('#rankings');
 await expect(ranks).toContainText('확정 결과가 모이면 월별 순위를 확인할 수 있습니다');
 await expect(ranks.getByText('공개 순위 참여자 0명')).toHaveCount(0);
 await expect(page.getByText('2명 참여 중',{exact:true})).toHaveCount(0);
 await publicRounds(page,[{...round,participantCount:49}]);
 await page.reload();
 await expect(page.getByText('49명 참여 중',{exact:true})).toBeVisible();
});

test('명시적으로 별명과 성적 공개에 동의한 뒤 철회할 수 있다',async({page})=>{
 await signedInFixture(page);await publicRounds(page,[]);
 let isPublic=false;let nickname='';
 await page.route('**/api/me/weekly-match/profile',async route=>{
  if(route.request().method()==='PUT'){const body=route.request().postDataJSON();isPublic=body.isPublic;nickname=body.nickname;}
  await route.fulfill({json:{success:true,data:{profile:nickname?{nickname,isPublic}:null}}});
 });
 await page.route('**/api/weekly-match/leaderboard',route=>route.fulfill({json:{success:true,data:{leaderboard:{season:'2026-11',total:isPublic?1:0,entries:isPublic?[{rank:1,nickname,points:1,wins:1,losses:0,validEntries:1}]:[]}}}}));
 await openPage(page);const ranks=page.locator('#rankings');
 const consent=ranks.getByRole('checkbox',{name:'별명과 월별 성적을 공개 순위에 표시합니다'});
 await expect(consent).not.toBeChecked();
 await ranks.getByRole('textbox',{name:'공개 별명'}).fill('테스트팬');await consent.check();
 await ranks.getByRole('button',{name:'공개 설정 저장',exact:true}).click();
 await expect(ranks.getByRole('cell',{name:'테스트팬',exact:true})).toBeVisible();
 await consent.uncheck();await ranks.getByRole('button',{name:'공개 설정 저장',exact:true}).click();
 await expect(ranks.getByRole('cell',{name:'테스트팬',exact:true})).toHaveCount(0);
 await expect(ranks).toContainText('확정 결과가 모이면 월별 순위를 확인할 수 있습니다');
});
