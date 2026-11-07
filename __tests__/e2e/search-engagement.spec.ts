import { test, expect, type Page } from '@playwright/test'

async function openPage(page: Page, path: string) {
  await page.goto(path)
  await page.getByRole('button', { name: '건너뛰기', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '온보딩', exact: true })).not.toBeVisible()
}

test('기존 방법론 화면의 대표 제목을 유지한다', async ({ page }) => {
  await openPage(page, '/methodology')
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
})

for (const slug of ['how-to-read-money-flow', 'market-cap-change-vs-net-buying', 'sector-rotation']) {
  test(`가이드 ${slug}: 본문·관심 목록 안내가 모바일에서도 읽힌다`, async ({ page }) => {
    await openPage(page, `/guide/${slug}`)

    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await expect(page.getByText('최종 수정 2026-11-07', { exact: false })).toBeVisible()
    await expect(page.getByRole('link', { name: '섹터 살펴보기', exact: true })).toHaveAttribute('href', '/sectors')
    await expect(page.getByRole('link', { name: '내 관심 목록 열기', exact: true })).toHaveAttribute('href', '/me/watchlist')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
  })
}

test('관심 목록 안내는 비로그인 사용자의 복귀 목적지를 보존한다', async ({ page }) => {
  await openPage(page, '/guide/sector-rotation')
  await page.getByRole('link', { name: '내 관심 목록 열기', exact: true }).click()

  await expect(page).toHaveURL(/\/login\?redirect=%2Fme%2Fwatchlist/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

for (const path of ['/rankings', '/indices']) {
  test(`${path}: 실제 질문·답변과 JSON-LD가 일치한다`, async ({ page }) => {
    await openPage(page, path)
    await expect(page.getByRole('heading', { level: 2, name: '자주 묻는 질문' })).toBeVisible()

    const questions = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) => {
      const faq = scripts.map((script) => JSON.parse(script.textContent || '{}'))
        .find((data) => data['@type'] === 'FAQPage')
      return faq.mainEntity as { name: string; acceptedAnswer: { text: string } }[]
    })
    expect(questions.length).toBeGreaterThan(0)
    for (const question of questions) {
      await expect(page.getByRole('heading', { level: 3, name: question.name, exact: true })).toBeVisible()
      await expect(page.getByText(question.acceptedAnswer.text, { exact: true })).toBeVisible()
    }
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  })
}
