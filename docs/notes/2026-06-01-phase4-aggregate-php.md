# Phase 4 - 集計関数の PHP 実装

PHP WASM プロジェクトにおける PHP 関数の単体テスト戦略と，Gemini レビューへの設計判断を記録する．

## 目次

1. PHP WASM プロジェクトでの PHPUnit 導入
2. `composer.json` の autoload 設定
3. Gemini レビューへの判断：`??` によるデフォルト値
4. Gemini レビューへの判断：`> 0` vs `!= 0`

## PHP WASM プロジェクトでの PHPUnit 導入

### 背景

本プロジェクトの PHP コードはブラウザ上の WASM として実行される．
テストするには PHP WASM をブラウザ環境で動かすか，
ローカルの PHP CLI を使うかの選択が必要だった．

### 判断

ローカル PHP CLI（8.5.0）と PHPUnit 12 で単体テストを行う方針を採用した．
`calc_total` / `calc_percentages` はグローバル関数で，
引数と戻り値だけで完結する純粋関数である．
I/O や DOM を持たないため，実行環境を問わず同じ挙動が保証できる．

### 代替案と棄却理由

- **ブラウザ環境でのテスト（Playwright + PHP WASM）**：
  実行環境が増え，セットアップとデバッグが複雑になる．
  関数の純粋性を活かせば CLI テストで十分な検証ができるため不採用．
- **テストを書かない（WASM 統合時に確認する）**：
  TDD 規律に反するため不採用．

### 参照

- #26
- [PHPUnit 12 ドキュメント](https://docs.phpunit.de/)

---

## `composer.json` の autoload 設定

### 背景

`aggregate.php` はクラスを持たないグローバル関数ファイルである．
PSR-4 オートロードはクラス名とファイル名の対応を前提とするため，
関数ファイルのオートロードには別の仕組みが必要だった．

### 判断

`autoload.files` へ `public/php/aggregate.php` を列挙する方式とした．
`vendor/autoload.php` を `require` すると自動的に関数が読み込まれる．
PHPUnit は `phpunit.xml` の `bootstrap="vendor/autoload.php"` を通じて
テスト実行前に関数を読み込む．

```json
{
    "autoload": {
        "files": ["public/php/aggregate.php"]
    }
}
```

### 代替案と棄却理由

- **PHPUnit の `bootstrap` ファイルで個別に `require` する**：
  `vendor/autoload.php` 経由でまとめて管理できる方が一貫性があるため不採用．

---

## Gemini レビューへの判断：`??` によるデフォルト値

2 ラウンドにわたり，`$row` および `$sum`/`$total` の各キーに
`??` でデフォルト値を設定するよう提案された（計 4 件）．

### 判断

すべて却下した．

`$rows` は `scripts/build_municipalities.py` が生成する管理下の固定スキーマ JSON である．
ユーザー入力や外部 API レスポンスではない．
`??` によるサイレント補完はデータパイプライン側のキー欠落を PHP 層で隠蔽し，
誤った集計値をそのまま返すリスクがある．

Fail Fast 原則に従い，スキーマ違反は集計前のバリデーション層で
早期に検出できる構造を保つべきと判断した．

### 適用できるケース

外部 API レスポンスやユーザー入力を直接受け取る場合は `??` によるガードが有効である．
管理下の固定スキーマには適用しない判断を今後も踏襲する．

---

## Gemini レビューへの判断：`> 0` vs `!= 0`

`calc_percentages` の分母チェック `$whole > 0` を
`$whole != 0` に変更するよう提案された（1 件）．

### 判断

却下した．

`$total` に含まれる値（面積・人口・ふるさと納税額・件数）は
実世界の非負データであり，北海道の合計値が負になることはドメイン上あり得ない．
`!= 0` へ変えると，万一 `$total` に負値が混入した場合，
`-300%` のような意味のない結果を返してしまう．

`> 0` は「ゼロ除算の防止」だけでなく，「負値を不正データとして扱う」ドメイン制約の役割もある．意図的に維持する．

### 参照

- [#26 discussion_r3331037490](https://github.com/tomio2480/frontend-phpcon-do-2026/pull/26#discussion_r3331037490)
- [#26 discussion_r3331073235](https://github.com/tomio2480/frontend-phpcon-do-2026/pull/26#discussion_r3331073235)
