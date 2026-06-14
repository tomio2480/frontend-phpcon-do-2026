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

// php_8_5 の WASM アセットに <link rel="preload"> を注入する
// ctx.bundle を使うことで外部変数不要・フック実行順序への依存を排除する
// configResolved で base と assetsDir を取得しサブディレクトリデプロイ・設定変更に対応する
function injectWasmPreload(): Plugin {
  let base = '/'
  let assetsDir = 'assets'
  return {
    name: 'inject-wasm-preload',
    apply: 'build',
    configResolved(config) {
      base = config.base || '/'
      assetsDir = config.build?.assetsDir || 'assets'
    },
    transformIndexHtml: {
      order: 'post',
      handler(_, ctx) {
        if (!ctx.bundle) return []
        const escapedDir = assetsDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp('^' + escapedDir + '/php_8_5-[^/]+\\.wasm$')
        return Object.keys(ctx.bundle)
          .filter(fileName => regex.test(fileName))
          .map(fileName => ({
            tag: 'link',
            attrs: { rel: 'preload', href: base + fileName, as: 'fetch', crossorigin: '' },
            injectTo: 'head' as const,
          }))
      },
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
    injectWasmPreload(),
    copyCoisw(),
    // テスト環境では zimmerframe (CJS 非対応) を要求する devtools を無効化する
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
    // @php-wasm/web・web-8-5 は WASM バイナリや動的インポートの複雑な構造を持つため
    // rolldown 最適化を除外し，ブラウザからの要求時に直接 Vite が変換する
    // @php-wasm/universal は CJS 依存（ini）のインタロップのため事前バンドル対象に残す
    exclude: ['@php-wasm/web', '@php-wasm/web-8-5'],
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test-setup.ts'],
  },
})
