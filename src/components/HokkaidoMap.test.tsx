import { cleanup, render, screen } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HokkaidoMap from './HokkaidoMap'

vi.mock('leaflet/dist/leaflet.css', () => ({}))

vi.mock('leaflet', () => {
  const mockLayer = { on: vi.fn().mockReturnThis(), addTo: vi.fn().mockReturnThis() }
  return {
    default: {
      map: vi.fn(() => ({ remove: vi.fn() })),
      geoJSON: vi.fn(() => mockLayer),
    },
  }
})

describe('HokkaidoMap', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ type: 'FeatureCollection', features: [] }),
    } as unknown as Response)
  })

  it('地図コンテナ div を描画する', () => {
    render(<HokkaidoMap />)
    const container = screen.getByTestId('hokkaido-map')
    expect(container).toBeTruthy()
  })

  it('onHover と onClick の props を受け取る', () => {
    const onHover = vi.fn()
    const onClick = vi.fn()
    render(<HokkaidoMap onHover={onHover} onClick={onClick} />)
    expect(screen.getByTestId('hokkaido-map')).toBeTruthy()
  })
})
