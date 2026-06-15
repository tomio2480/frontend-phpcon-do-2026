// favicon・OGP 画像・各種アイコン PNG を一括生成するビルドスクリプト．
// 北海道シルエットを「容器」に見立て，下から塗り上げて割合を表現する意匠で統一する．
// ラスタライズは既存依存の Playwright（Chromium）で行い，新規依存を増やさない．
//
// 使い方: node tools/build-brand-assets.mjs
import { chromium } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'node:fs'
import { buildSilhouette } from './lib-silhouette.mjs'

const OUT = 'public'
mkdirSync(OUT, { recursive: true })

// ブランドカラー（src/styles/tokens.css と一致）．
const C = {
  bgTop: '#FBF8FF',
  bgBottom: '#ECE0F8',
  tileTop: '#FCFAFF',
  tileBottom: '#EDE2F8',
  filled: '#A880C8',     // 塗り上げ済み（accent-lavender）
  filledDeep: '#9168B6', // 塗り上げ部の下側グラデーション
  unfilled: '#E0CDEE',   // 未到達部（薄ライラック）
  outline: '#6E2A9E',    // 輪郭線（link）
  level: '#F4D35E',      // 水位ライン（菜の花イエロー）
  text: '#1C1230',
  text2: '#4B4070',
  accentText: '#6E2A9E',
}

// 高精細（OGP 用）と簡略（favicon 用）の 2 種を生成する．
const sil = buildSilhouette('public/data/hokkaido.geojson', { tol: 0.0016, decimals: 1 })
// favicon は主島のみ（topN:1）に絞り，小サイズでの判読性を確保する．
const silLite = buildSilhouette('public/data/hokkaido.geojson', { tol: 0.005, topN: 1, margin: 0.02, decimals: 1 })
console.log('silhouette  :', JSON.stringify(sil.stats))
console.log('silhouetteLt:', JSON.stringify(silLite.stats))

/**
 * 北海道ゲージ（容器＋塗り上げ）の SVG 内部要素を返す．
 * @param {object} s buildSilhouette の戻り値
 * @param {number} level 塗り上げ割合（0..1）
 * @param {string} id clipPath 等の一意 id 接頭辞
 */
function gauge(s, level, id, { outlineWidth = 3.5 } = {}) {
  const top = s.height * (1 - level) // 水位の y 座標
  return `
    <defs>
      <clipPath id="${id}-clip"><path d="${s.d}"/></clipPath>
      <linearGradient id="${id}-fill" x1="0" y1="${top}" x2="0" y2="${s.height}" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${C.filled}"/>
        <stop offset="1" stop-color="${C.filledDeep}"/>
      </linearGradient>
    </defs>
    <g clip-path="url(#${id}-clip)">
      <rect x="0" y="0" width="${s.width}" height="${s.height}" fill="${C.unfilled}"/>
      <rect x="0" y="${top}" width="${s.width}" height="${s.height - top}" fill="url(#${id}-fill)"/>
      <rect x="0" y="${top - s.height * 0.012}" width="${s.width}" height="${s.height * 0.024}" fill="${C.level}"/>
    </g>
    <path d="${s.d}" fill="none" stroke="${C.outline}" stroke-width="${outlineWidth}" stroke-linejoin="round"/>`
}

/** 角丸タイルの favicon SVG を組み立てる． */
function faviconSvg(s, level) {
  const sz = s.width
  const r = sz * 0.2
  // ゲージをタイル内側にやや縮めて配置する余白を作る．
  const pad = sz * 0.05
  const inner = sz - pad * 2
  const scale = inner / sz
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sz} ${sz}" width="${sz}" height="${sz}">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.tileTop}"/>
      <stop offset="1" stop-color="${C.tileBottom}"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${sz}" height="${sz}" rx="${r}" ry="${r}" fill="url(#tile)"/>
  <g transform="translate(${pad} ${pad}) scale(${scale})">
    ${gauge(s, level, 'fav', { outlineWidth: 5 })}
  </g>
</svg>`
}

/** 全面塗り（角丸なし）のアイコン SVG．iOS の apple-touch-icon と PWA 用． */
function iconSquareSvg(s, level) {
  const sz = s.width
  const pad = sz * 0.13
  const inner = sz - pad * 2
  const scale = inner / sz
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sz} ${sz}" width="${sz}" height="${sz}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.tileTop}"/>
      <stop offset="1" stop-color="${C.tileBottom}"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${sz}" height="${sz}" fill="url(#bg)"/>
  <g transform="translate(${pad} ${pad}) scale(${scale})">
    ${gauge(s, level, 'ico', { outlineWidth: 5 })}
  </g>
</svg>`
}

/** OGP 画像（1200x630）の HTML を組み立てる． */
function ogHtml(s, level) {
  const gaugeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s.width} ${s.height}" width="430" height="430">${gauge(s, level, 'og', { outlineWidth: 3 })}</svg>`
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 1200px; height: 630px; }
    body {
      display: flex; align-items: center; gap: 8px;
      font-family: 'Yu Gothic UI','Yu Gothic','Meiryo',sans-serif;
      background: linear-gradient(135deg, ${C.bgTop} 0%, ${C.bgBottom} 100%);
      padding: 56px 64px;
      position: relative; overflow: hidden;
    }
    .left { flex: 0 0 460px; display: flex; flex-direction: column; align-items: center; }
    .left .cap { margin-top: 4px; font-size: 26px; font-weight: 700; color: ${C.accentText}; letter-spacing: .04em; }
    .right { flex: 1; padding-left: 20px; }
    .title { font-size: 76px; font-weight: 800; color: ${C.text}; line-height: 1.18; letter-spacing: .01em; }
    .title .pct { color: ${C.accentText}; }
    .uline { width: 132px; height: 14px; border-radius: 7px; background: ${C.level}; margin: 26px 0 28px; }
    .sub { font-size: 30px; font-weight: 600; color: ${C.text2}; line-height: 1.6; }
    .foot { position: absolute; right: 64px; bottom: 40px; font-size: 24px; font-weight: 700; color: ${C.accentText}; opacity: .9; }
    .tags { margin-top: 30px; display: flex; gap: 14px; }
    .tag { font-size: 24px; font-weight: 700; color: ${C.text}; background: rgba(168,128,200,.18); border: 2px solid rgba(110,42,158,.25); border-radius: 999px; padding: 8px 20px; }
  </style></head><body>
    <div class="left">
      ${gaugeSvg}
      <div class="cap">市区町村を選ぶ</div>
    </div>
    <div class="right">
      <div class="title">あなたの北海道は<br><span class="pct">何 %</span>？</div>
      <div class="uline"></div>
      <div class="sub">選んだ市区町村が全道に占める割合を<br>その場で集計して可視化する</div>
      <div class="tags"><span class="tag">面積</span><span class="tag">人口</span><span class="tag">ふるさと納税</span></div>
    </div>
    <div class="foot">tomio2480.github.io/frontend-phpcon-do-2026</div>
  </body></html>`
}

const LEVEL = 0.62

// --- favicon.svg を書き出す ---
const favSvg = faviconSvg(silLite, LEVEL)
writeFileSync(`${OUT}/favicon.svg`, favSvg)
console.log('wrote favicon.svg', favSvg.length, 'bytes')

// --- Playwright で各 PNG をラスタライズ ---
const browser = await chromium.launch()

async function renderSvgToPng(svg, file, size) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
  await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`, { waitUntil: 'networkidle' })
  await page.locator('svg').first().evaluate((el, sz) => { el.setAttribute('width', sz); el.setAttribute('height', sz) }, size)
  await page.screenshot({ path: `${OUT}/${file}`, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } })
  await page.close()
  console.log('wrote', file)
}

// apple-touch-icon・PWA は全面塗り（角丸なし），タブ用 PNG は角丸タイル．
const squareLite = iconSquareSvg(silLite, LEVEL)
await renderSvgToPng(squareLite, 'apple-touch-icon.png', 180)
await renderSvgToPng(squareLite, 'icon-192.png', 192)
await renderSvgToPng(squareLite, 'icon-512.png', 512)
await renderSvgToPng(favSvg, 'favicon-32.png', 32)
await renderSvgToPng(favSvg, 'favicon-16.png', 16)

// --- OGP 画像（1200x630）---
{
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await page.setContent(ogHtml(sil, LEVEL), { waitUntil: 'networkidle' })
  await page.screenshot({ path: `${OUT}/og-image.png`, clip: { x: 0, y: 0, width: 1200, height: 630 } })
  await page.close()
  console.log('wrote og-image.png')
}

await browser.close()
console.log('done')
