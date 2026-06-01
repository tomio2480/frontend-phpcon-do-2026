import { cleanup, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./components/HokkaidoMap', () => ({
  default: () => <div data-testid="hokkaido-map-mock" />,
}))

vi.mock('./php/runtime', () => ({
  getPhp: vi.fn().mockReturnValue(new Promise(() => {})),
}))

const FAKE_MUNICIPALITIES = {
  '01101': { code: '01101', name: '中央区', display_name: '札幌市 中央区', region: '石狩振興局', area: 46.42, population: 255288, furusato_amount: 506610766, furusato_count: 26995 },
  '01102': { code: '01102', name: '北区', display_name: '札幌市 北区', region: '石狩振興局', area: 63.57, population: 287436, furusato_amount: 570407431, furusato_count: 30394 },
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('App', () => {
  beforeEach(() => {
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
})