import { useState, useCallback } from 'preact/hooks'

export type SelectionState = Set<string>

export type UseSelectionResult = {
  selected: SelectionState
  toggle: (code: string) => void
  selectAll: (codes: string[]) => void
  clearAll: () => void
  toggleCodes: (codes: string[]) => void
}

export function useSelection(): UseSelectionResult {
  const [selected, setSelected] = useState<SelectionState>(() => new Set())

  const toggle = useCallback((code: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }, [])

  const selectAll = useCallback((codes: string[]) => {
    setSelected(new Set(codes))
  }, [])

  const clearAll = useCallback(() => {
    setSelected(new Set())
  }, [])

  const toggleCodes = useCallback((codes: string[]) => {
    setSelected(prev => {
      const allSelected = codes.every(code => prev.has(code))
      const next = new Set(prev)
      if (allSelected) {
        codes.forEach(code => next.delete(code))
      } else {
        codes.forEach(code => next.add(code))
      }
      return next
    })
  }, [])

  return { selected, toggle, selectAll, clearAll, toggleCodes }
}
