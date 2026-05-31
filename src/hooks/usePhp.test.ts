import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/preact'
import { usePhp } from './usePhp'

const mockRun = vi.fn()
const mockPhp = { run: mockRun }

vi.mock('../php/runtime', () => ({
  getPhp: vi.fn(),
}))

import { getPhp } from '../php/runtime'
const mockedGetPhp = vi.mocked(getPhp)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('usePhp', () => {
  it('初期状態は loading', () => {
    mockedGetPhp.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePhp())
    expect(result.current.status).toBe('loading')
  })

  it('getPhp が解決したら ready になる', async () => {
    mockedGetPhp.mockResolvedValue(mockPhp as never)
    const { result } = renderHook(() => usePhp())
    await waitFor(() => expect(result.current.status).toBe('ready'))
  })

  it('getPhp が失敗したら error になる', async () => {
    mockedGetPhp.mockRejectedValue(new Error('load failed'))
    const { result } = renderHook(() => usePhp())
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error?.message).toBe('load failed')
  })

  it('ready のとき run() が PHP コードを実行して出力を返す', async () => {
    mockRun.mockResolvedValue({ text: '2' })
    mockedGetPhp.mockResolvedValue(mockPhp as never)
    const { result } = renderHook(() => usePhp())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    const output = await result.current.run('<?php echo 1+1; ?>')
    expect(mockRun).toHaveBeenCalledWith({ code: '<?php echo 1+1; ?>' })
    expect(output).toBe('2')
  })

  it('loading のとき run() を呼ぶとエラー', async () => {
    mockedGetPhp.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePhp())
    await expect(result.current.run('<?php echo 1; ?>')).rejects.toThrow('PHP runtime not ready')
  })

  it('run() は再レンダリングをまたいで同一参照を維持する', async () => {
    mockedGetPhp.mockResolvedValue(mockPhp as never)
    const { result, rerender } = renderHook(() => usePhp())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    const run1 = result.current.run
    rerender()
    const run2 = result.current.run
    expect(run1).toBe(run2)
  })

  it('run() 呼び出し後はスローではなく act 内で実行できる', async () => {
    mockRun.mockResolvedValue({ text: '2' })
    mockedGetPhp.mockResolvedValue(mockPhp as never)
    const { result } = renderHook(() => usePhp())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    let output: string | undefined
    await act(async () => {
      output = await result.current.run('<?php echo 1+1; ?>')
    })
    expect(output).toBe('2')
  })
})
