import type { AggregateResult } from '../hooks/usePhp'

export function buildPostText(result: AggregateResult): string {
  return `あなたの北海道は面積${result.area_pct.toFixed(2)}%、人口${result.population_pct.toFixed(2)}%でした！ #あなたの北海道は何パーセント`
}

export function buildXUrl(text: string, url?: string): string {
  let xUrl = `https://x.com/intent/post?text=${encodeURIComponent(text)}`
  if (url) xUrl += `&url=${encodeURIComponent(url)}`
  return xUrl
}

export function buildShareUrl(selectedCodes: readonly string[]): string {
  const base = typeof window !== 'undefined'
    ? window.location.href.split('?')[0]
    : ''
  if (selectedCodes.length === 0) return base
  return `${base}?codes=${selectedCodes.join(',')}`
}

type Props = {
  result: AggregateResult
  selectedCodes?: readonly string[]
}

export default function ShareButton({ result, selectedCodes = [] }: Props) {
  const shareUrl = buildShareUrl(selectedCodes)
  const url = buildXUrl(buildPostText(result), shareUrl)
  return (
    <div class="mt-4">
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
