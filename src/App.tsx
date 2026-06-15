import { useState, useEffect, useMemo, useCallback, useRef } from 'preact/hooks'
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
import { decodeSelection } from './lib/shareCodes'
import type { Municipality } from './components/CheckboxList'

const ZERO_RESULT = { area_pct: 0, population_pct: 0, furusato_amount_pct: 0, furusato_count_pct: 0 }

export default function App() {
  const { pref, isDark, cycleTheme } = useTheme()
  const { selected, toggle, toggleCodes, selectAll, clearAll } = useSelection()
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const [mapReady, setMapReady] = useState(false)
  const handleMapReady = useCallback(() => setMapReady(true), [])
  const selectedCodes = useMemo(() => Array.from(selected), [selected])
  // ビットセット共有 URL のビット位置を定める安定した並び順
  const allCodes = useMemo(
    () => municipalities.map(m => m.code).sort(),
    [municipalities],
  )
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

  // URL パラメータから初期選択を復元する（?m= はビットセット，?codes= は旧形式）．
  // ?m= の復元には allCodes が要るため，自治体データの読み込み後に一度だけ実行する．
  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current || allCodes.length === 0) return
    const params = new URLSearchParams(window.location.search)
    const bits = params.get('m')
    const legacy = params.get('codes')
    let codes: string[] = []
    if (bits) {
      codes = decodeSelection(bits, allCodes)
    } else if (legacy) {
      codes = legacy.split(',').filter(c => /^\d{5}$/.test(c))
    }
    if (codes.length > 0) selectAll(codes)
    restoredRef.current = true
  }, [allCodes, selectAll])

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
            <div class="mt-4 flex flex-wrap items-center gap-3">
              <ShareButton result={result ?? ZERO_RESULT} selectedCodes={selectedCodes} allCodes={allCodes} />
              <button
                type="button"
                onClick={clearAll}
                disabled={selected.size === 0}
                class="rounded-md border border-text/30 px-4 py-2 text-sm font-medium text-text hover:bg-text/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                すべての選択を解除
              </button>
            </div>
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
