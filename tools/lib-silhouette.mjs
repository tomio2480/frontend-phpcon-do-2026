// 北海道 GeoJSON から島のシルエットを表す SVG パス文字列を生成する補助モジュール．
// 市区町村ポリゴンを polygon-clipping で union し，真の島輪郭（少数リング）を得る．
// 投影と Douglas-Peucker 簡略化は依存を増やさないため自前実装する．
import { readFileSync } from 'node:fs'
import polygonClipping from 'polygon-clipping'

/** Douglas-Peucker による折れ線簡略化（投影後の平面座標で適用）． */
function simplify(points, tol) {
  if (points.length < 3) return points
  const sqTol = tol * tol
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  while (stack.length) {
    const [first, last] = stack.pop()
    let maxSq = 0
    let idx = -1
    const [ax, ay] = points[first]
    const [bx, by] = points[last]
    const dx = bx - ax
    const dy = by - ay
    const len = dx * dx + dy * dy
    for (let i = first + 1; i < last; i++) {
      const [px, py] = points[i]
      let t = len ? ((px - ax) * dx + (py - ay) * dy) / len : 0
      t = t < 0 ? 0 : t > 1 ? 1 : t
      const cx = ax + t * dx
      const cy = ay + t * dy
      const sq = (px - cx) ** 2 + (py - cy) ** 2
      if (sq > maxSq) { maxSq = sq; idx = i }
    }
    if (maxSq > sqTol && idx !== -1) {
      keep[idx] = 1
      stack.push([first, idx], [idx, last])
    }
  }
  return points.filter((_, i) => keep[i])
}

/**
 * GeoJSON を読み，union・投影・簡略化したシルエットのパス情報を返す．
 * @returns {{ d: string, viewBox: string, width: number, height: number, stats: object }}
 */
/** 多角形リングの符号なし面積（靴ひも公式）． */
function ringArea(pts) {
  let a = 0
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1])
  }
  return Math.abs(a) / 2
}

export function buildSilhouette(geojsonPath, {
  tol = 0.0016,     // 簡略化トレランス（投影平面，約 180m 相当）
  minDiag = 0.02,   // この対角長未満のリング（微小な飛び地）は除外する
  topN = Infinity,  // 面積上位 N リングのみ残す（favicon は主島だけにする用途）
  size = 1000,      // 出力 viewBox の長辺
  margin = 0.05,    // 長辺に対する余白比
  decimals = 1,     // パス座標の小数桁
} = {}) {
  const gj = JSON.parse(readFileSync(geojsonPath, 'utf-8'))

  // 全市区町村ポリゴンを MultiPolygon 形式へ整形して union する．
  const polys = []
  for (const f of gj.features) {
    const g = f.geometry
    if (!g) continue
    if (g.type === 'Polygon') polys.push(g.coordinates)
    else if (g.type === 'MultiPolygon') for (const p of g.coordinates) polys.push(p)
  }
  const merged = polygonClipping.union(polys) // → MultiPolygon: [[outer, ...holes], ...]

  // union 後の外輪リングのみ採用（穴は塗りつぶしのため無視する）．
  const rings = merged.map((poly) => poly[0])

  // 緯度補正付き正距円筒図法．経度を中央緯度の cos で縮め横伸びを防ぐ．
  let latSum = 0, latN = 0
  for (const ring of rings) for (const [, lat] of ring) { latSum += lat; latN++ }
  const midLat = latSum / latN
  const kx = Math.cos((midLat * Math.PI) / 180)
  const project = ([lon, lat]) => [lon * kx, -lat]

  // まず簡略化したリング候補を面積付きで集める．
  const candidates = []
  for (const ring of rings) {
    const pr = ring.map(project)
    let rMinX = Infinity, rMinY = Infinity, rMaxX = -Infinity, rMaxY = -Infinity
    for (const [x, y] of pr) {
      if (x < rMinX) rMinX = x; if (x > rMaxX) rMaxX = x
      if (y < rMinY) rMinY = y; if (y > rMaxY) rMaxY = y
    }
    const diag = Math.hypot(rMaxX - rMinX, rMaxY - rMinY)
    if (diag < minDiag) continue
    const s = simplify(pr, tol)
    if (s.length < 3) continue
    candidates.push({ ring: s, area: ringArea(s) })
  }

  // 面積上位 N リングのみ採用（favicon では主島だけに絞り判読性を上げる）．
  candidates.sort((a, b) => b.area - a.area)
  const kept = candidates.slice(0, topN)

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const projected = []
  for (const { ring } of kept) {
    projected.push(ring)
    for (const [x, y] of ring) {
      if (x < minX) minX = x; if (x > maxX) maxX = x
      if (y < minY) minY = y; if (y > maxY) maxY = y
    }
  }

  // 投影座標を viewBox 内に正規化（アスペクト比保持・中央寄せ）．
  const spanX = maxX - minX
  const spanY = maxY - minY
  const span = Math.max(spanX, spanY)
  const inner = size * (1 - margin * 2)
  const scale = inner / span
  const offX = (size - spanX * scale) / 2
  const offY = (size - spanY * scale) / 2
  const tx = (x) => +(offX + (x - minX) * scale).toFixed(decimals)
  const ty = (y) => +(offY + (y - minY) * scale).toFixed(decimals)

  let d = ''
  let points = 0
  for (const ring of projected) {
    d += `M${tx(ring[0][0])} ${ty(ring[0][1])}`
    for (let i = 1; i < ring.length; i++) d += `L${tx(ring[i][0])} ${ty(ring[i][1])}`
    d += 'Z'
    points += ring.length
  }

  return {
    d,
    viewBox: `0 0 ${size} ${size}`,
    width: size,
    height: size,
    stats: { ringsKept: projected.length, points, bytes: d.length, midLat },
  }
}
