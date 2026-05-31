import { test, expect } from '@playwright/test'

test('北海道地図コンテナが DOM に存在する', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 })
})

test('地図にポリゴンが描画される', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('.leaflet-pane path', { timeout: 10000 })
  const paths = page.locator('.leaflet-pane path')
  await expect(paths.first()).toBeVisible()
})
