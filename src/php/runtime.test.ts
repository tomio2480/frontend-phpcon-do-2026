import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadWebRuntime } from '@php-wasm/web'
import { getPhp, _resetForTesting } from './runtime'

vi.mock('@php-wasm/web', () => ({
  loadWebRuntime: vi.fn(),
}))
vi.mock('@php-wasm/universal', () => ({
  PHP: function PHP() {},
}))

const mockedLoad = vi.mocked(loadWebRuntime)

beforeEach(() => {
  vi.clearAllMocks()
  _resetForTesting()
})

describe('getPhp', () => {
  it('初回呼び出しで PHP インスタンスを返す', async () => {
    mockedLoad.mockResolvedValue(1 as never)
    const php = await getPhp()
    expect(php).toBeDefined()
    expect(mockedLoad).toHaveBeenCalledTimes(1)
  })

  it('2 回目の呼び出しでは loadWebRuntime を再実行しない', async () => {
    mockedLoad.mockResolvedValue(1 as never)
    const php1 = await getPhp()
    const php2 = await getPhp()
    expect(php1).toBe(php2)
    expect(mockedLoad).toHaveBeenCalledTimes(1)
  })

  it('loadWebRuntime が失敗したら次回の呼び出しで再試行できる', async () => {
    mockedLoad.mockRejectedValueOnce(new Error('network error'))
    mockedLoad.mockResolvedValue(1 as never)

    await expect(getPhp()).rejects.toThrow('network error')
    const php = await getPhp()
    expect(php).toBeDefined()
    expect(mockedLoad).toHaveBeenCalledTimes(2)
  })

  it('並行呼び出しでも loadWebRuntime は 1 回のみ実行される', async () => {
    let resolve: (v: number) => void
    const pending = new Promise<number>(r => { resolve = r })
    mockedLoad.mockReturnValue(pending as never)

    const [p1, p2, p3] = [getPhp(), getPhp(), getPhp()]
    resolve!(42)
    const [r1, r2, r3] = await Promise.all([p1, p2, p3])

    expect(mockedLoad).toHaveBeenCalledTimes(1)
    expect(r1).toBe(r2)
    expect(r2).toBe(r3)
  })
})
