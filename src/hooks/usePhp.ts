import { useState, useEffect, useCallback } from 'preact/hooks'
import type { PHP } from '@php-wasm/universal'
import { getPhp } from '../php/runtime'

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
    if (!state.php) throw new Error('PHP runtime not ready')
    const result = await state.php.run({ code })
    return result.text
  }, [state.php])

  return { ...state, run }
}
