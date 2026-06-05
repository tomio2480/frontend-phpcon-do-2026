import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/preact'
import { usePhp, useAggregate } from './usePhp'
import type { AggregateResult } from './usePhp'

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

  it('error 状態のとき run() を呼ぶと初期化失敗メッセージを投げる', async () => {
    mockedGetPhp.mockRejectedValue(new Error('load failed'))
    const { result } = renderHook(() => usePhp())
    await waitFor(() => expect(result.current.status).toBe('error'))
    await expect(result.current.run('<?php echo 1; ?>')).rejects.toThrow('PHP ランタイムの初期化に失敗しました')
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

const FAKE_RESULT: AggregateResult = {
  area_pct: 12.34,
  population_pct: 56.78,
  furusato_amount_pct: 3.0,
  furusato_count_pct: 100.0,
}

const FAKE_MUNICIPALITIES = {
  '01101': { code: '01101', name: '中央区', display_name: '札幌市 中央区', region: '石狩振興局', area: 46.42, population: 255288, furusato_amount: 506610766, furusato_count: 26995 },
}

describe('useAggregate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/data/municipalities.json') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(FAKE_MUNICIPALITIES),
        } as Response)
      }
      if (url === '/php/aggregate.php') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('<?php function calc_total($r,$c){return ["area"=>0.0,"population"=>0,"furusato_amount"=>0,"furusato_count"=>0];} function calc_percentages($s,$t){return ["area_pct"=>12.34,"population_pct"=>56.78,"furusato_amount_pct"=>3.0,"furusato_count_pct"=>100.0];}'),
        } as Response)
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('初期状態は result が null', () => {
    mockedGetPhp.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useAggregate([]))
    expect(result.current.result).toBeNull()
  })

  it('PHP 初期化中は isPhpLoading が true', () => {
    mockedGetPhp.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useAggregate([]))
    expect(result.current.isPhpLoading).toBe(true)
  })

  it('PHP 準備完了後は isPhpLoading が false', async () => {
    mockedGetPhp.mockResolvedValue(mockPhp as never)
    const { result } = renderHook(() => useAggregate([]))
    await act(async () => {})
    expect(result.current.isPhpLoading).toBe(false)
  })

  it('PHP 準備完了後にデバウンスを経て result が更新される', async () => {
    mockRun.mockResolvedValue({ text: JSON.stringify(FAKE_RESULT) })
    mockedGetPhp.mockResolvedValue(mockPhp as never)
    const { result } = renderHook(() => useAggregate(['01101']))
    await act(async () => {})
    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.result?.area_pct).toBeCloseTo(12.34)
  })

  it('デバウンス前に selectedCodes が変わったら前の計算はキャンセルされる', async () => {
    mockRun.mockResolvedValue({ text: JSON.stringify(FAKE_RESULT) })
    mockedGetPhp.mockResolvedValue(mockPhp as never)
    const { rerender } = renderHook(
      ({ codes }: { codes: string[] }) => useAggregate(codes),
      { initialProps: { codes: ['01101'] } },
    )
    await act(async () => {})
    act(() => { vi.advanceTimersByTime(30) })
    rerender({ codes: ['01101', '01102'] })
    await act(async () => { await vi.runAllTimersAsync() })
    expect(mockRun).toHaveBeenCalledTimes(1)
  })
})
