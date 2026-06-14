import { useState, useEffect, useCallback, useRef } from 'preact/hooks'
import type { PHP } from '@php-wasm/universal'
import { getPhp } from '../php/runtime'

export type AggregateResult = {
  area_pct: number
  population_pct: number
  furusato_amount_pct: number
  furusato_count_pct: number
}

type PhpStatus = 'loading' | 'ready' | 'error'

type PhpState = {
  status: PhpStatus
  php: PHP | null
  error: Error | null
}

export type UsePhpResult = PhpState & {
  run: (code: string) => Promise<string>
}

export function usePhp(): UsePhpResult {
  const [state, setState] = useState<PhpState>({
    status: 'loading',
    php: null,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    getPhp()
      .then(php => {
        if (!cancelled) setState({ status: 'ready', php, error: null })
      })
      .catch(error => {
        if (!cancelled)
          setState({ status: 'error', php: null, error: error instanceof Error ? error : new Error(String(error)) })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const run = useCallback(async (code: string): Promise<string> => {
    if (state.status === 'error') throw new Error('PHP ランタイムの初期化に失敗しました')
    if (!state.php) throw new Error('PHP runtime not ready')
    const result = await state.php.run({ code })
    return result.text
  }, [state.php, state.status])

  return { ...state, run }
}

type MunicipalityRow = {
  area: number
  population: number
  furusato_amount: number
  furusato_count: number
}

export type UseAggregateResult = {
  result: AggregateResult | null
  error: Error | null
  isCalculating: boolean
  isPhpLoading: boolean
  isPhpError: boolean
}

export function useAggregate(selectedCodes: readonly string[]): UseAggregateResult {
  const { status: phpStatus, run } = usePhp()
  const [result, setResult] = useState<AggregateResult | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const executionIdRef = useRef(0)

  useEffect(() => {
    if (phpStatus !== 'ready') return

    if (selectedCodes.length === 0) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      setResult(null)
      setError(null)
      setIsCalculating(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    setError(null)

    debounceRef.current = setTimeout(async () => {
      const executionId = ++executionIdRef.current
      setIsCalculating(true)
      try {
        const [phpContent, data] = await Promise.all([
          fetch(import.meta.env.BASE_URL + 'php/aggregate.php').then(r => r.text()),
          fetch(import.meta.env.BASE_URL + 'data/municipalities.json').then(r => r.json() as Promise<Record<string, MunicipalityRow>>),
        ])
        const rows: Record<string, MunicipalityRow> = {}
        for (const [code, m] of Object.entries(data)) {
          rows[code] = { area: m.area, population: m.population, furusato_amount: m.furusato_amount, furusato_count: m.furusato_count }
        }
        const functions = phpContent.replace(/^<\?php\s*/i, '')
        const code = `<?php
${functions}
$rows = json_decode('${JSON.stringify(rows)}', true);
$codes = json_decode('${JSON.stringify(Array.from(selectedCodes))}', true);
$sum = calc_total($rows, $codes);
$total = calc_total($rows, array_keys($rows));
echo json_encode(calc_percentages($sum, $total));`
        const output = await run(code)
        if (executionId !== executionIdRef.current) return
        setResult(JSON.parse(output) as AggregateResult)
        setError(null)
      } catch (e) {
        if (executionId !== executionIdRef.current) return
        setResult(null)
        setError(e instanceof Error ? e : new Error(String(e)))
      } finally {
        if (executionId === executionIdRef.current) setIsCalculating(false)
      }
    }, 75)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [selectedCodes, phpStatus, run])

  return { result, error, isCalculating, isPhpLoading: phpStatus === 'loading', isPhpError: phpStatus === 'error' }
}
