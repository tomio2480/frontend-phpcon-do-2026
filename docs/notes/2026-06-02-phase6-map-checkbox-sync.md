# Phase 6 地図↔チェックボックス同期の実装知見

Phase 6（PR #30）で得た設計判断・テスト技法・レビュー対応の記録．

## 目次

- [背景](#背景)
- [判断](#判断)
- [代替案と棄却理由](#代替案と棄却理由)
- [レビューで得た学び](#レビューで得た学び)
- [参照](#参照)

## 背景

Phase 4b でチェックボックス UI，Phase 5 で Leaflet 地図をそれぞれ実装したが，
両者は独立しており選択状態を共有していなかった．
Phase 6 では地図クリックとチェックボックス操作を `useSelection` フック 1 箇所に集約し，
双方向に連動させることを目的とした．

## 判断

### selectedRef パターン

Leaflet の `geoJSON` コールバック（`onEachFeature`）は非同期の `fetch` チェーン内で呼ばれる．
`useEffect(callback, [selected])` で更新される `selected` の最新値を，
この非同期コールバック内で参照するために `selectedRef` を導入した．
`useRef` で current を保持し，`useEffect(callback, [selected])` の先頭で同期することで，
GeoJSON 読み込み完了時に初期の選択状態を即時スタイルへ反映できる．

### duck-typing ガード

`onEachFeature` で渡される `layer` は `L.Layer` 型だが，
ポリゴン以外の GeoJSON フィーチャでは `setStyle` を持たない `L.Marker` になる．
`instanceof L.Path` を使うとモック環境でクラス参照が一致しないため，
`'setStyle' in layer` による duck-typing で安全にガードした．

### `Map<string, L.Path[]>` による複数フィーチャ対応

`Map<string, L.Path>` では同一コードの 2 つ目以降のフィーチャが上書きされる．
離島など複数ポリゴンで構成される自治体に対応するため，
値を配列 `L.Path[]` に変更し，`onEachFeature` で `push` する設計を採用した．

### setStyle 差分最適化

`selected` が変化するたびに全レイヤー（北海道で最大 179 件）へ
`setStyle` を呼ぶと，変化のないポリゴンでも SVG/Canvas の再描画が走る．
`layer.options.fillColor` と目標スタイルを比較し，
差分がある場合のみ `setStyle` を呼ぶよう最適化した．
`fillColor` の比較だけで済む理由は，`STYLE_SELECTED` と `STYLE_DEFAULT` が
`fillColor` と `fillOpacity` を常にペアで更新するためである．

## 代替案と棄却理由

### instanceof L.Path によるガード

モック環境で `vi.mock('leaflet', ...)` が返すオブジェクトに `Path` クラスを持たせれば実現できるが，
モックが複雑になりメンテナンスコストが増す．
duck-typing の方が実装とモックの双方で扱いやすいため棄却した．

### GeoJSON の再初期化による色変更

`selected` 変化のたびに `L.geoJSON` を作り直してスタイルを再適用する案は，
Leaflet のマップ状態（ズーム・パン位置）がリセットされるため棄却した．

## レビューで得た学び

### vi.hoisted を使ったスパイの参照

`vi.mock` のファクトリ関数はモジュールスコープ外にホイストされる．
ファクトリ外で宣言した変数をそのまま参照するとアクセスできないため，
`vi.hoisted(() => vi.fn())` でスパイを宣言してから `vi.mock` 内で参照するパターンを習得した．

### フィーチャごとに独立したレイヤーモックを生成する

共有の `mockPath` をすべてのフィーチャに渡すモックでは，
同一コードの複数フィーチャがあっても `setStyle` の呼び出し回数を区別できない．
`geoJSON` ファクトリ内でフィーチャごとに新しいレイヤーオブジェクトを生成し，
スパイだけを共有することで回数を正確にカウントできるようになった．

## 参照

- PR #30（Phase 6 実装）
- Issue #8（Phase 6: 地図↔チェックボックス同期）
