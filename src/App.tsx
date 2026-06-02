import { useState, useEffect, useMemo } from 'preact/hooks'
import HokkaidoMap from './components/HokkaidoMap'
import CheckboxList from './components/CheckboxList'
import ResultPanel from './components/ResultPanel'
import { useSelection } from './hooks/useSelection'
import { useAggregate } from './hooks/usePhp'
import type { Municipality } from './components/CheckboxList'

export default function App() {
  const { selected, toggle } = useSelection()
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const selectedCodes = useMemo(() => Array.from(selected), [selected])
  const { result, isCalculating, error } = useAggregate(selectedCodes)

  useEffect(() => {
    fetch('/data/municipalities.json')
      .then(r => r.json() as Promise<Record<string, Municipality>>)
      .then(data => setMunicipalities(Object.values(data)))
      .catch(console.error)
  }, [])

  return (
    <main>
      <h1>あなたの北海道は何 %？</h1>
      <HokkaidoMap onClick={toggle} selected={selected} />
      <CheckboxList municipalities={municipalities} selected={selected} onToggle={toggle} />
      {error && <p>集計エラー: {error.message}</p>}
      <ResultPanel result={result} isCalculating={isCalculating} />
    </main>
  )
}