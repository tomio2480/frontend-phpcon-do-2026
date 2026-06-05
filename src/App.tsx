import { useState, useEffect, useMemo, useCallback } from 'preact/hooks'
import HokkaidoMap from './components/HokkaidoMap'
import CheckboxList from './components/CheckboxList'
import ResultPanel from './components/ResultPanel'
import { useSelection } from './hooks/useSelection'
import { useAggregate } from './hooks/usePhp'
import { SAPPORO_CODES } from './constants'
import type { Municipality } from './components/CheckboxList'

export default function App() {
  const { selected, toggle, toggleCodes } = useSelection()
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const selectedCodes = useMemo(() => Array.from(selected), [selected])
  const { result, isCalculating, error } = useAggregate(selectedCodes)

  const toggleSapporo = useCallback(() => toggleCodes(SAPPORO_CODES), [toggleCodes])

  const allSapporoSelected = useMemo(
    () => SAPPORO_CODES.every(code => selected.has(code)),
    [selected],
  )

  const regionActions = useMemo(() => ({
    '石狩振興局': {
      label: allSapporoSelected ? '札幌市の選択を解除' : '札幌市を一括選択',
      onClick: toggleSapporo,
    },
  }), [allSapporoSelected, toggleSapporo])

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
      <CheckboxList municipalities={municipalities} selected={selected} onToggle={toggle} regionActions={regionActions} />
      {error && <p>集計エラー: {error.message}</p>}
      <ResultPanel result={result} isCalculating={isCalculating} />
    </main>
  )
}
