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

const ZERO_RESULT: AggregateResult = {
  area_pct: 0,
  population_pct: 0,
  furusato_amount_pct: 0,
  furusato_count_pct: 0,
}

export default function ResultPanel({ result, isCalculating }: Props) {
  const displayResult = result ?? ZERO_RESULT

  return (
    <dl
      data-testid="result-panel"
      class={`mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 transition-opacity duration-150 ${isCalculating ? 'opacity-50' : 'opacity-100'}`}
    >
      {METRICS.map(({ key, label }) => (
        <div key={key} class="rounded-lg bg-white/60 border border-accent-lavender/40 p-3 text-center">
          <dt class="text-xs text-text/60 mb-1">{label}</dt>
          <dd class="text-xl font-bold text-text">{displayResult[key].toFixed(2)}%</dd>
        </div>
      ))}
    </dl>
  )
}
