import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./components/HokkaidoMap', () => ({
  default: () => <div data-testid="hokkaido-map-mock" />,
}))

const { mockRun } = vi.hoisted(() => ({ mockRun: vi.fn() }))

vi.mock('./php/runtime', () => ({
  getPhp: vi.fn().mockResolvedValue({ run: mockRun }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('App', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ type: 'FeatureCollection', features: [] }),
    } as unknown as Response)
  })

  it('renders the app heading', () => {
    render(<App />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.textContent).toContain('北海道')
  })

  it('HokkaidoMap を含む', () => {
    render(<App />)
    expect(screen.getByTestId('hokkaido-map-mock')).toBeTruthy()
  })

  it('PHP WASM の ready 状態になるとボタンを表示する', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('button'))
    expect(screen.getByRole('button').textContent).toContain('PHP を実行')
  })

  it('ボタンクリックで PHP 出力を表示する', async () => {
    mockRun.mockResolvedValue({ text: '2' })
    render(<App />)
    await waitFor(() => screen.getByRole('button'))
    fireEvent.click(screen.getByRole('button'))
    expect(await screen.findByText('2')).toBeDefined()
  })

  it('2 回目の実行開始時に前回の出力をクリアする', async () => {
    mockRun.mockResolvedValueOnce({ text: '2' })
    render(<App />)
    await waitFor(() => screen.getByRole('button'))
    fireEvent.click(screen.getByRole('button'))
    await screen.findByText('2')

    mockRun.mockReturnValueOnce(new Promise(() => {}))
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(screen.queryByText('2')).toBeNull())
  })

  it('run() が例外を投げたときエラーメッセージを表示する', async () => {
    mockRun.mockRejectedValue(new Error('PHP parse error'))
    render(<App />)
    await waitFor(() => screen.getByRole('button'))
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => screen.getByText(/PHP parse error/))
    expect(screen.getByText(/PHP parse error/)).toBeDefined()
  })
})
