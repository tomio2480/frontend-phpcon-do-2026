# Phase 7 札幌市まとめ選択の実装知見

Phase 7（PR #32）で得た設計判断・レビュー対応の記録．

## 目次

- [背景](#背景)
- [判断](#判断)
- [代替案と棄却理由](#代替案と棄却理由)
- [レビューで得た学び](#レビューで得た学び)
- [参照](#参照)

## 背景

石狩振興局グループ内の「札幌市 10 区（01101〜01110）」を，
1 つのボタンで一括選択・解除できるようにした．
チェックボックスと地図は既存の `useSelection` フックを介して連動する．

## 判断

### toggleCodes を汎用関数として実装する

当初は `toggleSapporo()` というドメイン固有関数を `useSelection` に直接実装した．
Gemini レビューで「フックにドメイン知識を混入すべきでない」という指摘を受け，
汎用の `toggleCodes(codes: string[])` に変更した．

`SAPPORO_CODES` は `src/constants.ts` に移動し，
`App.tsx` 側で `useCallback(() => toggleCodes(SAPPORO_CODES), [toggleCodes])` として組み立てる設計にした．

### regionActions パターンで CheckboxList を汎用化する

当初 `CheckboxList` は `ISHIKARI_REGION`・`SAPPORO_CODES`・`allSapporoSelected` を
コンポーネント内に直接持っていた．
Gemini レビューで「UI コンポーネントにドメインロジックを持たせるべきでない」という指摘を受け，
`regionActions?: Record<string, { label: string; onClick: () => void }>` プロップに変更した．

ボタンのラベルと動作を呼び出し側（`App.tsx`）が決定し，
`CheckboxList` はキーに対応するアクションがあればボタンを表示するだけにした．

`allSapporoSelected` と `regionActions` の構築は `App.tsx` 側で `useMemo` を使う．

### toggleCodes の空配列ガード

空配列を渡すと `[].every(...)` が `true`（vacuous truth）を返し，
`setSelected` が呼ばれて不要な再レンダリングが発生する問題があった．
Gemini の指摘を受け，`codes.length === 0` のとき早期リターンするよう修正した．

## 代替案と棄却理由

### allSapporoSelected を CheckboxList のプロップとして渡す

`allSapporoSelected: boolean` を `CheckboxList` のプロップとして渡し，
コンポーネント内でラベル切り替えを行う案を検討した．
しかし `regionActions` パターンの方がラベルの決定権を完全に呼び出し側に集約できるため棄却した．

### エッジケース（石狩グループに札幌区が含まれない）への対応

Gemini から「municipalities に札幌区が含まれないケースへの防御」が提案された．
固定データを使うプロジェクトであり実際には発生しないため YAGNI として却下した．
`regionActions` パターンへの変更により，このエッジケース問題も自然に解消されている
（ボタンはラベルと onClick の有無でのみ制御されるため）．

## レビューで得た学び

### ドメイン知識の置き場所

カスタムフックは状態管理とロジックのみを担い，ドメイン定数は持たせない．
定数は `src/constants.ts` など専用ファイルに置き，
フックを他の文脈でも再利用できる状態に保つ．

### UI コンポーネントへのドメイン依存の混入

コンポーネントが特定のドメイン名（`石狩振興局`）や定数（`SAPPORO_CODES`）を
直接参照しているとき，そのコンポーネントは「汎用 UI 部品」ではなく
「ドメイン固有部品」になってしまう．
汎用プロップ（`regionActions`）を通じて振る舞いを外から注入する設計にすると，
コンポーネント自体はどのドメインでも再利用できる．

### vacuous truth の罠

`[].every(predicate)` は常に `true` を返す（空集合への全称命題は真）．
「全コード選択済みなら解除」という分岐に `codes.length === 0` のガードがないと，
空配列で呼ぶたびに state 更新が走る．
汎用関数を実装する際は空入力時の挙動を必ず確認する．

## 参照

- PR #32（Phase 7 実装）
- Issue #9（Phase 7: 札幌市まとめ選択）
