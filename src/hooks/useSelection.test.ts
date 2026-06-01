import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/preact'
import { useSelection } from './useSelection'

describe('useSelection', () => {
  it('初期選択は空集合', () => {
    const { result } = renderHook(() => useSelection())
    expect(result.current.selected.size).toBe(0)
  })

  it('toggle で未選択コードを追加する', () => {
    const { result } = renderHook(() => useSelection())
    act(() => result.current.toggle('01101'))
    expect(result.current.selected.has('01101')).toBe(true)
  })

  it('toggle で選択済みコードを削除する', () => {
    const { result } = renderHook(() => useSelection())
    act(() => result.current.toggle('01101'))
    act(() => result.current.toggle('01101'))
    expect(result.current.selected.has('01101')).toBe(false)
  })

  it('selectAll で複数コードを一括選択する', () => {
    const { result } = renderHook(() => useSelection())
    act(() => result.current.selectAll(['01101', '01102', '01103']))
    expect(result.current.selected.size).toBe(3)
    expect(result.current.selected.has('01102')).toBe(true)
  })

  it('clearAll で選択をすべて解除する', () => {
    const { result } = renderHook(() => useSelection())
    act(() => result.current.selectAll(['01101', '01102']))
    act(() => result.current.clearAll())
    expect(result.current.selected.size).toBe(0)
  })

  it('toggle で複数の選択・解除操作が正しく動作する', () => {
    const { result } = renderHook(() => useSelection())
    act(() => result.current.toggle('01101'))
    act(() => result.current.toggle('01102'))
    expect(result.current.selected.size).toBe(2)
    act(() => result.current.toggle('01101'))
    expect(result.current.selected.size).toBe(1)
    expect(result.current.selected.has('01102')).toBe(true)
    expect(result.current.selected.has('01101')).toBe(false)
  })

  it('toggle は再レンダリングをまたいで同一参照を維持する', () => {
    const { result, rerender } = renderHook(() => useSelection())
    const toggle1 = result.current.toggle
    rerender()
    expect(result.current.toggle).toBe(toggle1)
  })
})