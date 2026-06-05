/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'
import { createRequire } from 'module'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
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
// ハッシュ付きファイル名は generateBundle 時に確定するため，HTML 変換を post 順で行う
function injectWasmPreload(): Plugin {
  const wasmUrls: string[] = []
  return {
    name: 'inject-wasm-preload',
    apply: 'build',
    generateBundle(_, bundle) {
      wasmUrls.length = 0
      for (const fileName of Object.keys(bundle)) {
        if (/^assets\/php_8_5-[^/]+\.wasm$/.test(fileName)) {
          wasmUrls.push('/' + fileName)
        }
      }
    },
    transformIndexHtml: {
      order: 'post',
      handler() {
        return wasmUrls.map(href => ({
          tag: 'link',
          attrs: { rel: 'preload', href, as: 'fetch', crossorigin: '' },
          injectTo: 'head' as const,
        }))
      },
    },
  }
}

export default defineConfig({
  plugins: [
    resolveIcuDat(),
    injectWasmPreload(),
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
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test-setup.ts'],
  },
})
