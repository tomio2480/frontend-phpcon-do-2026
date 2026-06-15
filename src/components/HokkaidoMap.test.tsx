import { cleanup, render, screen, waitFor } from '@testing-library/preact'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HokkaidoMap from './HokkaidoMap'

vi.mock('leaflet/dist/leaflet.css', () => ({}))

const mockSetStyle = vi.hoisted(() => vi.fn())
const capturedHandlers = vi.hoisted<{ current: Array<Record<string, () => void>> }>(() => ({ current: [] }))
const mapInstances = vi.hoisted<{ current: Array<{
  options: Record<string, unknown>
  scrollWheelZoom: { enable: ReturnType<typeof vi.fn>; disable: ReturnType<typeof vi.fn>; enabled: () => boolean }
}> }>(() => ({ current: [] }))

const mockSetAttribute = vi.hoisted(() => vi.fn())
const mockGetElement = vi.hoisted(() => vi.fn().mockReturnValue({
  setAttribute: mockSetAttribute,
  addEventListener: vi.fn(),
}))

vi.mock('leaflet', () => {
  return {
    default: {
      map: vi.fn((_el: unknown, options: Record<string, unknown> = {}) => {
        // Leaflet 既定では scrollWheelZoom は true．options で false を渡せる挙動を模す．
        let enabled = options.scrollWheelZoom !== false
        const instance = {
          options,
          scrollWheelZoom: {
            enable: vi.fn(() => { enabled = true }),
            disable: vi.fn(() => { enabled = false }),
            enabled: () => enabled,
          },
          remove: vi.fn(),
        }
        mapInstances.current.push(instance)
        return instance
      }),
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
            bindTooltip: vi.fn(),
            openTooltip: vi.fn(),
            closeTooltip: vi.fn(),
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
    mapInstances.current = []
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
      expect(mockSetStyle).toHaveBeenCalledWith({ color: '#8B7000', weight: 0.8, opacity: 1, fillColor: '#D8B7DD', fillOpacity: 0.85 })
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
    expect(mockSetStyle).toHaveBeenCalledWith({ color: '#8B7000', weight: 0.8, opacity: 1, fillColor: '#D8B7DD', fillOpacity: 0.85 })
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

    expect(mockSetStyle).toHaveBeenCalledWith({ color: '#8B7000', weight: 0.8, opacity: 1, fillColor: '#BFB3E0', fillOpacity: 0.85 })
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

  it('地図は scrollWheelZoom 無効で生成する（通常スクロールでズームしない）', () => {
    render(<HokkaidoMap />)
    expect(mapInstances.current[0].options.scrollWheelZoom).toBe(false)
  })

  it('Ctrl なしの wheel ではズームを有効化せずページスクロールを妨げない', () => {
    render(<HokkaidoMap />)
    const container = screen.getByTestId('hokkaido-map')
    const map = mapInstances.current[0]
    const ev = new WheelEvent('wheel', { bubbles: true, cancelable: true, ctrlKey: false })
    container.dispatchEvent(ev)
    expect(map.scrollWheelZoom.enable).not.toHaveBeenCalled()
    expect(ev.defaultPrevented).toBe(false)
  })

  it('Ctrl+wheel でズームを有効化しブラウザの既定動作を抑止する', () => {
    render(<HokkaidoMap />)
    const container = screen.getByTestId('hokkaido-map')
    const map = mapInstances.current[0]
    const ev = new WheelEvent('wheel', { bubbles: true, cancelable: true, ctrlKey: true })
    container.dispatchEvent(ev)
    expect(map.scrollWheelZoom.enable).toHaveBeenCalled()
    expect(ev.defaultPrevented).toBe(true)
  })

  it('メタキー（Cmd）+wheel でもズームを有効化する', () => {
    render(<HokkaidoMap />)
    const container = screen.getByTestId('hokkaido-map')
    const map = mapInstances.current[0]
    const ev = new WheelEvent('wheel', { bubbles: true, cancelable: true, metaKey: true })
    container.dispatchEvent(ev)
    expect(map.scrollWheelZoom.enable).toHaveBeenCalled()
    expect(ev.defaultPrevented).toBe(true)
  })

  it('Ctrl なしの wheel でズーム操作ヒントを表示する', () => {
    render(<HokkaidoMap />)
    const container = screen.getByTestId('hokkaido-map')
    const hint = screen.getByTestId('map-zoom-hint')
    container.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, ctrlKey: false }))
    expect(hint.classList.contains('is-visible')).toBe(true)
  })

  it('Ctrl+wheel ではズーム操作ヒントを表示しない', () => {
    render(<HokkaidoMap />)
    const container = screen.getByTestId('hokkaido-map')
    const hint = screen.getByTestId('map-zoom-hint')
    container.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, ctrlKey: true }))
    expect(hint.classList.contains('is-visible')).toBe(false)
  })

  it('Ctrl 押下後に離して通常 wheel するとズームを無効化する', () => {
    render(<HokkaidoMap />)
    const container = screen.getByTestId('hokkaido-map')
    const map = mapInstances.current[0]
    container.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, ctrlKey: true }))
    container.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, ctrlKey: false }))
    expect(map.scrollWheelZoom.disable).toHaveBeenCalled()
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

    expect(mockSetStyle).toHaveBeenCalledWith({ color: '#8B7000', weight: 0.8, opacity: 1, fillColor: '#CCDDC0', fillOpacity: 1 })
  })
})
