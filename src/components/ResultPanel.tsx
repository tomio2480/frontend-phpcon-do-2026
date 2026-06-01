import type { AggregateResult } from '../hooks/usePhp'

type Props = {
  result: AggregateResult | null
  isCalculating: boolean
}

export default function ResultPanel({ result, isCalculating }: Props) {
  if (isCalculating) return <p>集計中…</p>
  if (!result) return <p>市区町村を選択してください</p>

  return (
    <dl>
      <dt>面積</dt>
      <dd>{result.area_pct.toFixed(2)}%</dd>
      <dt>人口</dt>
      <dd>{result.population_pct.toFixed(2)}%</dd>
      <dt>ふるさと納税額</dt>
      <dd>{result.furusato_amount_pct.toFixed(2)}%</dd>
      <dt>ふるさと納税件数</dt>
      <dd>{result.furusato_count_pct.toFixed(2)}%</dd>
    </dl>
  )
}