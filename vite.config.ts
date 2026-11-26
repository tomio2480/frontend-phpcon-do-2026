/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'
import { createRequire } from 'module'
import { dirname, join } from 'path'
import { existsSync, readFileSync } from 'fs'
import type { Plugin } from 'vite'

const require = createRequire(import.meta.url)

/**
 * @php-wasm/web は intl 拡張モジュール用に `../intl/shared/icu.dat` を動的インポートするが，
 * intl パッケージは別途インストールが必要で，今回は未使用のため存在しない．
 * Vite の変換フェーズでこのインポートを実際の icu.dat ファイルパスへリダイレクトする．
 *
 * `@php-wasm/web` の exports に `shared/icu.dat` は含まれないため require.resolve で直接は解決できない．
 * メインエントリを resolve し，package.json が見つかるまで親を辿ってパッケージルートを特定する．
 * dirname だけではメインエントリがサブディレクトリにある場合に誤ったパスを返すため遡り探索を使う．
 */
function findPackageRoot(resolvedEntry: string): string {
  let dir = dirname(resolvedEntry)
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, 'package.json'))) return dir
    dir = dirname(dir)
  }
  throw new Error(`package.json not found from: ${resolvedEntry}`)
}

function resolveIcuDat(): Plugin {
  const webPkgRoot = findPackageRoot(require.resolve('@php-wasm/web'))
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

// GitHub Pages は COOP/COEP ヘッダーを設定できないため
// coi-serviceworker を build 時にルートへ出力して SharedArrayBuffer を有効化する
function copyCoisw(): Plugin {
  return {
    name: 'copy-coisw',
    apply: 'build',
    generateBundle() {
      const coiPath = require.resolve('coi-serviceworker/coi-serviceworker.min.js')
      this.emitFile({
        type: 'asset',
        fileName: 'coi-serviceworker.js',
        source: readFileSync(coiPath, 'utf-8'),
      })
    },
  }
}

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    resolveIcuDat(),
    copyCoisw(),
    // テスト環境では devtools を無効化する．
    // もとは ESM 専用の zimmerframe を require() する preset-vite 2.10.5 以前への回避策だった．
    // 2.10.6 で動的 import に変わり不要になったが，単体テストは devtools を使わないため無効のままとする．
    // テスト以外（本番ビルドを含む）では devtools を強制的に有効にする．preset-vite の既定は本番で無効である．
    preact({ devToolsEnabled: !process.env.VITEST }),
    tailwindcss(),
  ],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  assetsInclude: ['**/*.wasm', '**/*.php', '**/*.dat'],
  optimizeDeps: {
    // @php-wasm/web・web-8-4 は WASM バイナリや動的インポートの複雑な構造を持つため
    // rolldown 最適化を除外し，ブラウザからの要求時に直接 Vite が変換する
    // @php-wasm/universal は CJS 依存（ini）のインタロップのため事前バンドル対象に残す
    exclude: ['@php-wasm/web', '@php-wasm/web-8-4'],
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    // Node 25 以降は組み込みの localStorage が jsdom の実装を覆い隠す．
    // Node 26 では --localstorage-file 無しで触れると例外になるため，
    // テストのワーカーでは組み込みの Web Storage を無効にする．
    execArgv: ['--no-experimental-webstorage'],
  },
})
