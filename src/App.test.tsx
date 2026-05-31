import { render, screen, cleanup } from '@testing-library/preact'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./php/runtime', () => ({
  getPhp: vi.fn().mockReturnValue(new Promise(() => {})),
}))

afterEach(cleanup)

describe('App', () => {
  it('renders the app heading', () => {
    render(<App />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.textContent).toContain('北海道')
  })

  it('PHP WASM の loading 状態を表示する', () => {
    render(<App />)
    expect(screen.getByText(/PHP WASM ステータス: loading/)).toBeDefined()
  })
})