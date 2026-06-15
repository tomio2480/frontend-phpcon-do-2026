import { useState, useEffect, useMemo, useCallback } from 'preact/hooks'
import HokkaidoMap from './components/HokkaidoMap'
import CheckboxList from './components/CheckboxList'
import ResultPanel from './components/ResultPanel'
import ShareButton from './components/ShareButton'
import LoadingOverlay from './components/LoadingOverlay'
import ThemeToggle from './components/ThemeToggle'
import Footer from './components/Footer'
import AboutTool from './components/AboutTool'
import { useSelection } from './hooks/useSelection'
import { useTheme } from './hooks/useTheme'
import { useAggregate } from './hooks/usePhp'
import { SAPPORO_CODES } from './constants'
import type { Municipality } from './components/CheckboxList'

const ZERO_RESULT = { area_pct: 0, population_pct: 0, furusato_amount_pct: 0, furusato_count_pct: 0 }

export default function App() {
  const { pref, isDark, cycleTheme } = useTheme()
  const { selected, toggle, toggleCodes, selectAll } = useSelection()
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const [mapReady, setMapReady] = useState(false)
  const handleMapReady = useCallback(() => setMapReady(true), [])
  const selectedCodes = useMemo(() => Array.from(selected), [selected])
  const { result, isCalculating, error, isPhpLoading, isPhpError } = useAggregate(selectedCodes)

  // PHP・地図の双方が整うまでローディング画面のみを表示する（画面のちらつき防止）
  // PHP エラー時は読み込みを終え，エラーメッセージを表示する
  const isInitializing = !isPhpError && (isPhpLoading || !mapReady)

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
    fetch(import.meta.env.BASE_URL + 'data/municipalities.json')
      .then(r => r.json() as Promise<Record<string, Municipality>>)
      .then(data => setMunicipalities(Object.values(data)))
      .catch(console.error)
  }, [])

  // URL パラメータ ?codes=... から初期選択を復元する
  useEffect(() => {
    const codes = new URLSearchParams(window.location.search).get('codes')
    if (!codes) return
    const parsed = codes.split(',').filter(c => /^\d{5}$/.test(c))
    if (parsed.length > 0) selectAll(parsed)
  }, [selectAll])

  return (
    <div class="min-h-screen bg-background text-text">
      {/* ヘッダー: テーマ切り替えボタン */}
      <header class="border-b border-text/10">
        <div class="max-w-5xl mx-auto px-4 py-2 flex justify-end">
          <ThemeToggle pref={pref} onCycle={cycleTheme} />
        </div>
      </header>

      <main>
        <LoadingOverlay isLoading={isInitializing} />
        <div class="p-4 max-w-5xl mx-auto">
          <h1 class="text-2xl font-bold mb-2">あなたの北海道は何 %？</h1>
          <p class="text-sm text-text-2 mb-4 leading-relaxed">
            選んだ市町村が北海道全体に占める割合を集計するツールです．
            面積・人口・ふるさと納税（受入額・件数）の4指標を，選択した市町村の合計値で表示します．
            地図の地域をクリックするか，下の一覧でチェックを入れると結果が自動で更新されます．
          </p>
          {isPhpError && (
            <p role="alert" class="mt-2 p-3 rounded-lg bg-red-100 text-red-700 text-sm">
              PHP エンジンの読み込みに失敗しました．ページを再読み込みしてください．
            </p>
          )}
          <div inert={isInitializing || isPhpError || undefined}>
            {/* モバイルでは結果パネルを上部に固定する */}
            <div aria-live="polite" aria-atomic="true" class="sticky top-0 z-10 bg-background pb-2 md:static md:pb-0">
              <ResultPanel result={result} isCalculating={isCalculating} />
            </div>
            <HokkaidoMap isDark={isDark} onClick={toggle} onReady={handleMapReady} selected={selected} />
            {error && <p class="mt-2 text-red-600 text-sm">集計エラー: {error.message}</p>}
            <ShareButton result={result ?? ZERO_RESULT} selectedCodes={selectedCodes} />
            <CheckboxList municipalities={municipalities} selected={selected} onToggle={toggle} regionActions={regionActions} />
          </div>
        </div>
      </main>

      <div class="max-w-5xl mx-auto px-4">
        <AboutTool />
        <Footer />
      </div>
    </div>
  )
}
