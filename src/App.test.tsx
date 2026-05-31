import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const { mockRun } = vi.hoisted(() => ({ mockRun: vi.fn() }))

vi.mock('./php/runtime', () => ({
  getPhp: vi.fn().mockResolvedValue({ run: mockRun }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('App', () => {
  it('renders the app heading', () => {
    render(<App />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.textContent).toContain('北海道')
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
    await waitFor(() => document.querySelector('strong'))
    expect(document.querySelector('strong')?.textContent).toBe('2')
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
