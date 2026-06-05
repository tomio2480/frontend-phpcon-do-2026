import type { AggregateResult } from '../hooks/usePhp'

type Props = {
  result: AggregateResult | null
  isCalculating: boolean
}

const METRICS: { key: keyof AggregateResult; label: string }[] = [
  { key: 'area_pct',             label: '面積' },
  { key: 'population_pct',       label: '人口' },
  { key: 'furusato_amount_pct',  label: 'ふるさと納税額' },
  { key: 'furusato_count_pct',   label: 'ふるさと納税件数' },
]

export default function ResultPanel({ result, isCalculating }: Props) {
  if (isCalculating) {
    return (
      <p class="mt-4 p-4 rounded-lg bg-accent-lilac/20 text-text text-sm">集計中…</p>
    )
  }
  if (!result) {
    return (
      <p class="mt-4 p-4 rounded-lg bg-accent-lilac/20 text-text text-sm">
        市区町村を選択してください
      </p>
    )
  }

  return (
    <dl class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {METRICS.map(({ key, label }) => (
        <div key={key} class="rounded-lg bg-white/60 border border-accent-lavender/40 p-3 text-center">
          <dt class="text-xs text-text/60 mb-1">{label}</dt>
          <dd class="text-xl font-bold text-text">{result[key].toFixed(2)}%</dd>
        </div>
      ))}
    </dl>
  )
}
