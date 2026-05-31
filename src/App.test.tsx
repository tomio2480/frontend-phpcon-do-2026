import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./components/HokkaidoMap', () => ({
  default: () => <div data-testid="hokkaido-map-mock" />,
}))

describe('App', () => {
  afterEach(() => cleanup())

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
})
