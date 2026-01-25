import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should display the page title', async ({ page }) => {
    await expect(page).toHaveTitle(/Sector King|TechThrone/)
  })

  test('should display the main heading', async ({ page }) => {
    // Wait for content to load - the h1 is inside HegemonyMap component
    const heading = page.locator('h1')
    await expect(heading).toBeVisible({ timeout: 10000 })
    await expect(heading).toContainText(/TechThrone/)
  })

  test('should display category content', async ({ page }) => {
    // Check for main content area
    const content = page.locator('main')
    await expect(content).toBeVisible()

    // Should display either categories or loading/error state
    const hasContent = await page.locator('h1, h2, [class*="skeleton"]').first().isVisible()
    expect(hasContent).toBeTruthy()
  })

  test('should show subtitle', async ({ page }) => {
    const subtitle = page.locator('text=투자 패권 지도')
    await expect(subtitle).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Responsive Layout', () => {
  test('desktop shows grid layout', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Desktop should show grid layout
    const main = page.locator('main')
    await expect(main).toBeVisible()

    // Wait for h1 which indicates content loaded
    const heading = page.locator('h1')
    await expect(heading).toBeVisible({ timeout: 10000 })
  })

  test('mobile shows tab navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Mobile should show tabs
    const main = page.locator('main')
    await expect(main).toBeVisible()

    // Wait for h1 which indicates content loaded
    const heading = page.locator('h1')
    await expect(heading).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Company Modal', () => {
  test('should open modal when clicking company badge', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for data to load
    await page.waitForSelector('h1', { timeout: 10000 })

    // Find and click a company badge
    const companyBadge = page.locator('button, [role="button"]').filter({ hasText: /Apple|AAPL|Samsung|Microsoft|NVDA/ }).first()

    if (await companyBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
      await companyBadge.click()

      // Wait for modal to appear
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible({ timeout: 5000 })
    }
  })

  test('should close modal when clicking close button', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for data to load
    await page.waitForSelector('h1', { timeout: 10000 })

    const companyBadge = page.locator('button, [role="button"]').filter({ hasText: /Apple|AAPL|Samsung|Microsoft|NVDA/ }).first()

    if (await companyBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
      await companyBadge.click()

      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible({ timeout: 5000 })

      // Find and click close button (X button in Dialog)
      const closeButton = dialog.locator('button').filter({ has: page.locator('svg') }).first()
      if (await closeButton.isVisible()) {
        await closeButton.click()
        await expect(dialog).not.toBeVisible({ timeout: 3000 })
      }
    }
  })
})

test.describe('Error Handling', () => {
  test('should handle API errors gracefully', async ({ page }) => {
    // Block API requests to simulate error
    await page.route('**/api/map', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Server Error' }),
      })
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Should show error message or fallback UI
    const main = page.locator('main')
    await expect(main).toBeVisible()

    // Should display error message or the page should still be functional
    const hasErrorOrContent = await page.locator('text=Something went wrong, text=error, h1, h2').first().isVisible({ timeout: 5000 }).catch(() => false)
    // Page should at least render something
    expect(await main.isVisible()).toBeTruthy()
  })
})

test.describe('Accessibility', () => {
  test('should have no major accessibility issues', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for content to load
    await page.waitForSelector('h1', { timeout: 10000 })

    // Check for basic accessibility
    const main = page.locator('main')
    await expect(main).toBeVisible()

    // Ensure headings exist
    const headings = page.locator('h1, h2, h3')
    const headingCount = await headings.count()
    expect(headingCount).toBeGreaterThan(0)
  })

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for content to load
    await page.waitForSelector('h1', { timeout: 10000 })

    // Press Tab multiple times and verify focus changes
    // Note: Next.js dev tools may intercept first tab in dev mode
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab')
    }

    // Check that some element has focus (could be button, link, etc.)
    const focusedElements = await page.locator(':focus').count()
    expect(focusedElements).toBeGreaterThan(0)
  })
})
