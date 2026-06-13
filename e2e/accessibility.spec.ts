import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('axe-core 自動検査', () => {
  test('アクセシビリティ違反がない', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })
    await page.waitForSelector('.leaflet-pane path', { timeout: 10000 })

    const results = await new AxeBuilder({ page })
      .exclude('.leaflet-control-attribution')
      .analyze()

    expect(results.violations).toEqual([])
  })
})

test.describe('地図のアクセシビリティ', () => {
  test('地図コンテナに aria-label が付与されている', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })

    const mapContainer = page.locator('[data-testid="hokkaido-map"]')
    await expect(mapContainer).toHaveAttribute('aria-label', '北海道地図')
  })

  test('地図ポリゴンに aria-label が付与されている', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.leaflet-pane path', { timeout: 10000 })

    const firstPath = page.locator('.leaflet-pane path[aria-label]').first()
    await expect(firstPath).toHaveAttribute('aria-label')
    const label = await firstPath.getAttribute('aria-label')
    expect(label).toBeTruthy()
  })

  test('地図ポリゴンがキーボード（Enter）で選択できる', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.leaflet-pane path[tabindex="0"]', { timeout: 10000 })

    const firstPath = page.locator('.leaflet-pane path[tabindex="0"]').first()
    await firstPath.focus()
    // SVG 要素では dispatchEvent で確実にキーダウンイベントを発火する
    await firstPath.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true })

    await expect(firstPath).toHaveAttribute('aria-pressed', 'true', { timeout: 10000 })
  })
})

test.describe('モバイルレイアウト', () => {
  test('375px 幅で結果パネルが地図より上に表示される', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })

    const resultPanel = page.locator('[data-testid="result-panel"]')
    const mapContainer = page.locator('[data-testid="hokkaido-map"]')

    const resultBox = await resultPanel.boundingBox()
    const mapBox = await mapContainer.boundingBox()

    expect(resultBox).not.toBeNull()
    expect(mapBox).not.toBeNull()
    expect(resultBox!.y).toBeLessThan(mapBox!.y)
  })
})

test.describe('キーボード操作', () => {
  test('チェックボックスが Tab 順序に含まれる（tabindex=-1 でない）', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('input[type="checkbox"]', { timeout: 10000 })

    const firstCheckbox = page.locator('input[type="checkbox"]').first()
    const tabindex = await firstCheckbox.getAttribute('tabindex')
    expect(tabindex).not.toBe('-1')
  })

  test('チェックボックスに紐付く label テキストが存在する', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('label', { timeout: 10000 })

    const firstLabel = page.locator('label').first()
    const text = await firstLabel.textContent()
    expect(text?.trim()).toBeTruthy()
  })
})
