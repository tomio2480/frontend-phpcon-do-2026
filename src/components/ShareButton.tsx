import type { AggregateResult } from '../hooks/usePhp'

export function buildPostText(result: AggregateResult): string {
  return `あなたの北海道は面積${result.area_pct.toFixed(2)}%、人口${result.population_pct.toFixed(2)}%でした！ #あなたの北海道は何パーセント #frontend_phpcon_do`
}

export function buildXUrl(text: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`
}

type Props = {
  result: AggregateResult
}

export default function ShareButton({ result }: Props) {
  const url = buildXUrl(buildPostText(result))
  return (
    <div class="mt-4">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="X に投稿する（新しいタブで開きます）"
        class="inline-block rounded-md bg-accent-yellow px-5 py-2 font-medium text-text hover:bg-accent-yellow/70 transition-colors"
      >
        X に投稿する
      </a>
    </div>
  )
}
