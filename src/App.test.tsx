import { cleanup, render, screen, waitFor } from '@testing-library/preact'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { useAggregate } from './hooks/usePhp'

vi.mock('./components/HokkaidoMap', () => ({
  default: ({ onClick }: { onClick?: (code: string) => void }) => (
    <button type="button" aria-label="地図" data-testid="hokkaido-map-mock" onClick={() => onClick?.('01101')} />
  ),
}))

vi.mock('./php/runtime', () => ({
  getPhp: vi.fn().mockReturnValue(new Promise(() => {})),
}))

vi.mock('./hooks/usePhp', () => ({
  useAggregate: vi.fn().mockReturnValue({ result: null, error: null, isCalculating: false }),
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
    vi.mocked(useAggregate).mockReturnValue({ result: null, error: null, isCalculating: false })
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

  it('初期状態の ResultPanel に選択を促すメッセージを表示する', () => {
    render(<App />)
    expect(screen.getByText('市区町村を選択してください')).toBeTruthy()
  })

  it('集計中は ShareButton を表示しない', () => {
    vi.mocked(useAggregate).mockReturnValue({ result: sampleResult, error: null, isCalculating: true })
    render(<App />)
    expect(screen.queryByRole('link', { name: 'X に投稿する' })).toBeNull()
  })

  it('集計完了後に ShareButton を表示する', () => {
    vi.mocked(useAggregate).mockReturnValue({ result: sampleResult, error: null, isCalculating: false })
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
})
