import type { AggregateResult } from '../hooks/usePhp'
import { encodeSelection } from '../lib/shareCodes'

export function buildPostText(result: AggregateResult): string {
  return `あなたの北海道は面積${result.area_pct.toFixed(2)}%、人口${result.population_pct.toFixed(2)}%でした！ #あなたの北海道は何パーセント`
}

export function buildXUrl(text: string, url?: string): string {
  let xUrl = `https://x.com/intent/post?text=${encodeURIComponent(text)}`
  if (url) xUrl += `&url=${encodeURIComponent(url)}`
  return xUrl
}

// 選択状態をビットセットへ圧縮し ?m= パラメータとして付与する．
// allCodes は復元側（App）と同一の並び順を渡す前提とする．
export function buildShareUrl(
  selectedCodes: readonly string[],
  allCodes: readonly string[],
): string {
  const base = typeof window !== 'undefined'
    ? window.location.href.split('?')[0]
    : ''
  const token = encodeSelection(selectedCodes, allCodes)
  if (!token) return base
  return `${base}?m=${token}`
}

type Props = {
  result: AggregateResult
  selectedCodes?: readonly string[]
  allCodes?: readonly string[]
}

export default function ShareButton({ result, selectedCodes = [], allCodes = [] }: Props) {
  const shareUrl = buildShareUrl(selectedCodes, allCodes)
  const url = buildXUrl(buildPostText(result), shareUrl)
  return (
    <div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="X に投稿する（新しいタブで開きます）"
        class="inline-block rounded-md bg-accent-yellow px-5 py-2 font-medium text-on-yellow hover:bg-accent-yellow/70 transition-colors"
      >
        X に投稿する
      </a>
    </div>
  )
}
