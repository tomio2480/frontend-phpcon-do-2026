import { useState, useCallback } from 'preact/hooks'

export const SAPPORO_CODES = [
  '01101', '01102', '01103', '01104', '01105',
  '01106', '01107', '01108', '01109', '01110',
]

export type SelectionState = Set<string>

export type UseSelectionResult = {
  selected: SelectionState
  toggle: (code: string) => void
  selectAll: (codes: string[]) => void
  clearAll: () => void
  toggleSapporo: () => void
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

  const toggleSapporo = useCallback(() => {
    setSelected(prev => {
      const allSelected = SAPPORO_CODES.every(code => prev.has(code))
      const next = new Set(prev)
      if (allSelected) {
        SAPPORO_CODES.forEach(code => next.delete(code))
      } else {
        SAPPORO_CODES.forEach(code => next.add(code))
      }
      return next
    })
  }, [])

  return { selected, toggle, selectAll, clearAll, toggleSapporo }
}
