/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'
import { createRequire } from 'module'
import { dirname, join } from 'path'
import type { Plugin } from 'vite'

const require = createRequire(import.meta.url)

/**
 * @php-wasm/web は intl 拡張モジュール用に `../intl/shared/icu.dat` を動的インポートするが，
 * intl パッケージは別途インストールが必要で，今回は未使用のため存在しない．
 * Vite の変換フェーズでこのインポートを実際の icu.dat ファイルパスへリダイレクトする．
 *
 * `@php-wasm/web` の exports に `shared/icu.dat` は含まれないため require.resolve で直接は解決できない．
 * メインエントリ（index.cjs）を resolve してその dirname でパッケージルートを特定する．
 * `./package.json` サブパスは exports に含まれない場合 ERR_PACKAGE_PATH_NOT_EXPORTED を
 * 投げる Node.js 環境があるため，パッケージ本体のエントリポイント経由で解決する．
 */
function resolveIcuDat(): Plugin {
  const webPkgRoot = dirname(require.resolve('@php-wasm/web'))
  const icuDatPath = join(webPkgRoot, 'shared', 'icu.dat').replace(/\\/g, '/')
  return {
    name: 'resolve-icu-dat',
    resolveId(source) {
      if (source === '../intl/shared/icu.dat') {
        return icuDatPath
      }
    },
  }
}

export default defineConfig({
  plugins: [
    resolveIcuDat(),
    // テスト環境では zimmerframe (CJS 非対応) を要求する devtools を無効化する
    preact({ devToolsEnabled: !process.env.VITEST }),
    tailwindcss(),
  ],
  assetsInclude: ['**/*.wasm', '**/*.php', '**/*.dat'],
  optimizeDeps: {
    // @php-wasm/web・web-8-5 は WASM バイナリや動的インポートの複雑な構造を持つため
    // rolldown 最適化を除外し，ブラウザからの要求時に直接 Vite が変換する
    // @php-wasm/universal は CJS 依存（ini）のインタロップのため事前バンドル対象に残す
    exclude: ['@php-wasm/web', '@php-wasm/web-8-5'],
  },
  test: {
    environment: 'jsdom',
  },
})