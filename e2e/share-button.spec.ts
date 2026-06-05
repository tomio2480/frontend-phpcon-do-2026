import { test, expect } from '@playwright/test'

test('ShareButton が市区町村選択後に表示される', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.leaflet-pane path', { timeout: 10000 })

  const checkbox = page.locator('input[type="checkbox"]').first()
  await checkbox.waitFor({ state: 'visible', timeout: 10000 })
  await checkbox.check()

  const link = page.getByRole('link', { name: 'X に投稿する' })
  await expect(link).toBeVisible({ timeout: 30000 })
})

test('ShareButton の href が x.com/intent/post を含む', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.leaflet-pane path', { timeout: 10000 })

  const checkbox = page.locator('input[type="checkbox"]').first()
  await checkbox.waitFor({ state: 'visible', timeout: 10000 })
  await checkbox.check()

  const link = page.getByRole('link', { name: 'X に投稿する' })
  await expect(link).toBeVisible({ timeout: 30000 })

  const href = await link.getAttribute('href')
  expect(href).toContain('https://x.com/intent/post')
  expect(href).toContain(encodeURIComponent('#あなたの北海道は何パーセント'))
  expect(href).toContain(encodeURIComponent('#frontend_phpcon_do'))
})
