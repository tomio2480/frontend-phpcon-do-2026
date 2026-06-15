import { cleanup, render, screen, waitFor } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { useAggregate } from './hooks/usePhp'

vi.mock('./components/HokkaidoMap', async () => {
  const { useEffect } = await import('preact/hooks')
  return {
    default: ({ onClick, onReady }: { onClick?: (code: string) => void; onReady?: () => void }) => {
      useEffect(() => { onReady?.() }, [])
      return <button type="button" aria-label="地図" data-testid="hokkaido-map-mock" onClick={() => onClick?.('01101')} />
    },
  }
})

vi.mock('./php/runtime', () => ({
  getPhp: vi.fn().mockReturnValue(new Promise(() => {})),
}))

vi.mock('./hooks/usePhp', () => ({
  useAggregate: vi.fn().mockReturnValue({ result: null, error: null, isCalculating: false, isPhpLoading: false, isPhpError: false, phpError: null }),
}))

const FAKE_MUNICIPALITIES = {
  '01101': { code: '01101', name: '中央区', display_name: '札幌市 中央区', region: '石狩振興局', area: 46.42, population: 255288, furusato_amount: 506610766, furusato_count: 26995 },
  '01102': { code: '01102', name: '北区', display_name: '札幌市 北区', region: '石狩振興局', area: 63.57, population: 287436, furusato_amount: 570407431, furusato_count: 30394 },
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const sampleResult = {
  area_pct: 1.0,
  population_pct: 2.0,
  furusato_amount_pct: 3.0,
  furusato_count_pct: 4.0,
}

describe('App', () => {
  beforeEach(() => {
    vi.mocked(useAggregate).mockReturnValue({ result: null, error: null, isCalculating: false, isPhpLoading: false, isPhpError: false, phpError: null })
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/data/municipalities.json') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(FAKE_MUNICIPALITIES),
        } as unknown as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ type: 'FeatureCollection', features: [] }),
        text: () => Promise.resolve(''),
      } as unknown as Response)
    })
  })

  it('見出しに「北海道」を含む', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('北海道')
  })

  it('タイトル下に操作方法の説明を表示する', () => {
    render(<App />)
    expect(screen.getByText(/クリックするか，下の一覧でチェック/)).toBeTruthy()
  })

  it('LT 動画へのリンクを表示する', () => {
    render(<App />)
    expect(screen.getByRole('link', { name: /上川空知駆動開発/ })).toBeTruthy()
  })

  it('HokkaidoMap を表示する', () => {
    render(<App />)
    expect(screen.getByTestId('hokkaido-map-mock')).toBeTruthy()
  })

  it('自治体の読み込み後に CheckboxList を表示する', async () => {
    render(<App />)
    await waitFor(() => screen.getByLabelText('中央区'))
    expect(screen.getByLabelText('中央区')).toBeTruthy()
    expect(screen.getByLabelText('北区')).toBeTruthy()
  })

  it('初期状態の ResultPanel に 0.00% を表示する', () => {
    render(<App />)
    const zeros = screen.getAllByText('0.00%')
    expect(zeros.length).toBe(4)
  })

  it('PHP 初期化中は LoadingOverlay を表示する', () => {
    vi.mocked(useAggregate).mockReturnValue({ result: null, error: null, isCalculating: false, isPhpLoading: true, isPhpError: false, phpError: null })
    render(<App />)
    expect(screen.getByRole('status')).toBeTruthy()
  })

  it('PHP 初期化完了後は LoadingOverlay を表示しない', () => {
    render(<App />)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('PHP 初期化エラー時はエラーメッセージを表示する', () => {
    vi.mocked(useAggregate).mockReturnValue({ result: null, error: null, isCalculating: false, isPhpLoading: false, isPhpError: true, phpError: null })
    render(<App />)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText(/PHP エンジンの読み込みに失敗/)).toBeTruthy()
  })

  it('PHP 初期化中はインタラクティブ領域に inert を付与する', () => {
    vi.mocked(useAggregate).mockReturnValue({ result: null, error: null, isCalculating: false, isPhpLoading: true, isPhpError: false, phpError: null })
    const { container } = render(<App />)
    const inertDiv = container.querySelector('[inert]')
    expect(inertDiv).not.toBeNull()
  })

  it('PHP 初期化エラー時はインタラクティブ領域に inert を付与する', () => {
    vi.mocked(useAggregate).mockReturnValue({ result: null, error: null, isCalculating: false, isPhpLoading: false, isPhpError: true, phpError: null })
    const { container } = render(<App />)
    const inertDiv = container.querySelector('[inert]')
    expect(inertDiv).not.toBeNull()
  })

  it('PHP 正常時はインタラクティブ領域に inert を付与しない', () => {
    const { container } = render(<App />)
    const inertDiv = container.querySelector('[inert]')
    expect(inertDiv).toBeNull()
  })

  it('集計中も ShareButton を表示する', () => {
    vi.mocked(useAggregate).mockReturnValue({ result: sampleResult, error: null, isCalculating: true, isPhpLoading: false, isPhpError: false, phpError: null })
    render(<App />)
    expect(screen.getByRole('link', { name: /X に投稿する/ })).toBeTruthy()
  })

  it('集計完了後に ShareButton を表示する', () => {
    vi.mocked(useAggregate).mockReturnValue({ result: sampleResult, error: null, isCalculating: false, isPhpLoading: false, isPhpError: false, phpError: null })
    render(<App />)
    expect(screen.getByRole('link', { name: /X に投稿する/ })).toBeTruthy()
  })

  it('地図クリックで対応するチェックボックスが切り替わる', async () => {
    render(<App />)
    await waitFor(() => screen.getByLabelText('中央区'))

    expect(screen.getByLabelText<HTMLInputElement>('中央区').checked).toBe(false)

    await userEvent.click(screen.getByTestId('hokkaido-map-mock'))

    expect(screen.getByLabelText<HTMLInputElement>('中央区').checked).toBe(true)
  })

  it('未選択時はすべての選択を解除ボタンを無効にする', () => {
    render(<App />)
    const clear = screen.getByRole('button', { name: /すべての選択を解除/ }) as HTMLButtonElement
    expect(clear.disabled).toBe(true)
  })

  it('すべての選択を解除ボタンで全選択を解除する', async () => {
    render(<App />)
    await waitFor(() => screen.getByLabelText('中央区'))

    await userEvent.click(screen.getByTestId('hokkaido-map-mock'))
    expect(screen.getByLabelText<HTMLInputElement>('中央区').checked).toBe(true)

    const clear = screen.getByRole('button', { name: /すべての選択を解除/ }) as HTMLButtonElement
    expect(clear.disabled).toBe(false)

    await userEvent.click(clear)
    expect(screen.getByLabelText<HTMLInputElement>('中央区').checked).toBe(false)
  })
})
