import { useState, useEffect, useMemo, useCallback } from 'preact/hooks'
import HokkaidoMap from './components/HokkaidoMap'
import CheckboxList from './components/CheckboxList'
import ResultPanel from './components/ResultPanel'
import ShareButton from './components/ShareButton'
import LoadingOverlay from './components/LoadingOverlay'
import { useSelection } from './hooks/useSelection'
import { useAggregate } from './hooks/usePhp'
import { SAPPORO_CODES } from './constants'
import type { Municipality } from './components/CheckboxList'

export default function App() {
  const { selected, toggle, toggleCodes } = useSelection()
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const selectedCodes = useMemo(() => Array.from(selected), [selected])
  const { result, isCalculating, error, isPhpLoading, isPhpError } = useAggregate(selectedCodes)

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
    <main class="min-h-screen bg-background text-text">
      <LoadingOverlay isLoading={isPhpLoading} />
      <div class="p-4 max-w-5xl mx-auto">
        <h1 class="text-2xl font-bold mb-4">あなたの北海道は何 %？</h1>
        {isPhpError && (
          <p role="alert" class="mt-2 p-3 rounded-lg bg-red-100 text-red-700 text-sm">
            PHP エンジンの読み込みに失敗しました．ページを再読み込みしてください．
          </p>
        )}
        <div inert={isPhpLoading || isPhpError || undefined}>
          <HokkaidoMap onClick={toggle} selected={selected} />
          {error && <p class="mt-2 text-red-600 text-sm">集計エラー: {error.message}</p>}
          <ResultPanel result={result} isCalculating={isCalculating} />
          {result && !isCalculating && <ShareButton result={result} />}
          <CheckboxList municipalities={municipalities} selected={selected} onToggle={toggle} regionActions={regionActions} />
        </div>
      </div>
    </main>
  )
}
