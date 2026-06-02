import { cleanup, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HokkaidoMap from './HokkaidoMap'

vi.mock('leaflet/dist/leaflet.css', () => ({}))

const mockSetStyle = vi.hoisted(() => vi.fn())

vi.mock('leaflet', () => {
  return {
    default: {
      map: vi.fn(() => ({ remove: vi.fn() })),
      geoJSON: vi.fn((
        geojson: { features?: unknown[] },
        options?: { onEachFeature?: (f: unknown, l: unknown) => void },
      ) => {
        const features = geojson?.features ?? []
        features.forEach(f => {
          const layer = { on: vi.fn().mockReturnThis(), setStyle: mockSetStyle }
          options?.onEachFeature?.(f, layer)
        })
        return { addTo: vi.fn() }
      }),
    },
  }
})

describe('HokkaidoMap', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    mockSetStyle.mockClear()
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

  it('onHover と onClick を渡してもクラッシュしない', () => {
    const onHover = vi.fn()
    const onClick = vi.fn()
    render(<HokkaidoMap onHover={onHover} onClick={onClick} />)
    expect(screen.getByTestId('hokkaido-map')).toBeTruthy()
  })

  it('selected を渡してもクラッシュしない', () => {
    render(<HokkaidoMap selected={new Set(['01101'])} />)
    expect(screen.getByTestId('hokkaido-map')).toBeTruthy()
  })

  it('GeoJSON 読み込み後に selected のポリゴンに選択スタイルを適用する', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: { code: '01101' }, geometry: null }],
      }),
    } as unknown as Response)

    render(<HokkaidoMap selected={new Set(['01101'])} />)

    await waitFor(() => {
      expect(mockSetStyle).toHaveBeenCalledWith({ fillColor: '#3b82f6', fillOpacity: 0.6 })
    })
  })

  it('selected 変化時に同一コードの複数フィーチャすべてに新スタイルを適用する', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { code: '01101' }, geometry: null },
          { type: 'Feature', properties: { code: '01101' }, geometry: null },
        ],
      }),
    } as unknown as Response)

    const { rerender } = render(<HokkaidoMap selected={new Set()} />)

    await waitFor(() => expect(mockSetStyle).toHaveBeenCalledTimes(2))
    mockSetStyle.mockClear()

    rerender(<HokkaidoMap selected={new Set(['01101'])} />)

    expect(mockSetStyle).toHaveBeenCalledTimes(2)
    expect(mockSetStyle).toHaveBeenCalledWith({ fillColor: '#3b82f6', fillOpacity: 0.6 })
  })
})
