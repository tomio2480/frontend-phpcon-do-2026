import { cleanup, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HokkaidoMap from './HokkaidoMap'

vi.mock('leaflet/dist/leaflet.css', () => ({}))

const mockSetStyle = vi.hoisted(() => vi.fn())
const capturedHandlers = vi.hoisted<{ current: Array<Record<string, () => void>> }>(() => ({ current: [] }))

const mockSetAttribute = vi.hoisted(() => vi.fn())
const mockGetElement = vi.hoisted(() => vi.fn().mockReturnValue({
  setAttribute: mockSetAttribute,
  addEventListener: vi.fn(),
}))

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
          const handlers: Record<string, () => void> = {}
          capturedHandlers.current.push(handlers)
          const layer = {
            on: vi.fn().mockImplementation((event: string, handler: () => void) => {
              handlers[event] = handler
            }),
            setStyle: mockSetStyle,
            getElement: mockGetElement,
          }
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
    mockSetAttribute.mockClear()
    capturedHandlers.current = []
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
      expect(mockSetStyle).toHaveBeenCalledWith({ color: '#F5C800', weight: 0.8, opacity: 1, fillColor: '#D8B7DD', fillOpacity: 0.85 })
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
    expect(mockSetStyle).toHaveBeenCalledWith({ color: '#F5C800', weight: 0.8, opacity: 1, fillColor: '#D8B7DD', fillOpacity: 0.85 })
  })

  it('ホバー時に未選択ポリゴンにホバースタイルを適用する', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: { code: '01101' }, geometry: null }],
      }),
    } as unknown as Response)

    render(<HokkaidoMap selected={new Set()} />)

    await waitFor(() => expect(capturedHandlers.current.length).toBeGreaterThan(0))
    mockSetStyle.mockClear()
    capturedHandlers.current[0].mouseover?.()

    expect(mockSetStyle).toHaveBeenCalledWith({ color: '#F5C800', weight: 0.8, opacity: 1, fillColor: '#BFB3E0', fillOpacity: 0.85 })
  })

  it('selected 変化時に aria-pressed を更新する', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: { code: '01101', name: '札幌市中央区' }, geometry: null }],
      }),
    } as unknown as Response)

    const { rerender } = render(<HokkaidoMap selected={new Set()} />)
    await waitFor(() => expect(mockSetStyle).toHaveBeenCalled())
    mockSetAttribute.mockClear()

    rerender(<HokkaidoMap selected={new Set(['01101'])} />)

    expect(mockSetAttribute).toHaveBeenCalledWith('aria-pressed', 'true')
  })

  it('マウスアウト時に未選択ポリゴンをデフォルトスタイルに戻す', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: { code: '01101' }, geometry: null }],
      }),
    } as unknown as Response)

    render(<HokkaidoMap selected={new Set()} />)

    await waitFor(() => expect(capturedHandlers.current.length).toBeGreaterThan(0))
    mockSetStyle.mockClear()
    capturedHandlers.current[0].mouseout?.()

    expect(mockSetStyle).toHaveBeenCalledWith({ color: '#F5C800', weight: 0.8, opacity: 1, fillColor: '#CCDDC0', fillOpacity: 1 })
  })
})
