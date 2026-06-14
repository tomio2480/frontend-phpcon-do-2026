import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useRef } from 'preact/hooks'

/*
 * stroke color:
 *   Light #8B7000 — 深いゴールド（白背景比 4.5:1 / 薄緑比 3.3:1 ≥ WCAG 3:1）
 *   Dark  #F5C800 — 明るいゴールド（暗背景比 11:1）
 */
const LIGHT_STROKE = { color: '#8B7000', weight: 0.8, opacity: 1 }
const DARK_STROKE  = { color: '#F5C800', weight: 0.8, opacity: 1 }

function buildStyles(dark: boolean) {
  const S = dark ? DARK_STROKE : LIGHT_STROKE
  return dark ? {
    SELECTED: { ...S, fillColor: '#9B7BB0', fillOpacity: 1 },
    HOVER:    { ...S, fillColor: '#B68CDD', fillOpacity: 1 },  /* 明化方向（Opus 指摘） */
    DEFAULT:  { ...S, fillColor: '#33493B', fillOpacity: 1 },  /* 薄い緑（ダーク） */
  } : {
    SELECTED: { ...S, fillColor: '#D8B7DD', fillOpacity: 0.85 },
    HOVER:    { ...S, fillColor: '#BFB3E0', fillOpacity: 0.85 },
    DEFAULT:  { ...S, fillColor: '#CCDDC0', fillOpacity: 1 },  /* 薄い緑（ライト） */
  }
}

interface Props {
  isDark?: boolean
  onHover?: (code: string | null) => void
  onClick?: (code: string) => void
  selected?: Set<string>
}

function applyAriaPressed(el: Element, isSelected: boolean) {
  el.setAttribute('aria-pressed', String(isSelected))
}

export default function HokkaidoMap({ isDark = false, onHover, onClick, selected }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onHoverRef = useRef(onHover)
  const onClickRef = useRef(onClick)
  const selectedRef = useRef(selected)
  const layersRef = useRef<Map<string, L.Path[]>>(new Map())
  const stylesRef = useRef(buildStyles(isDark))

  useEffect(() => { onHoverRef.current = onHover }, [onHover])
  useEffect(() => { onClickRef.current = onClick }, [onClick])

  useEffect(() => {
    selectedRef.current = selected
    layersRef.current.forEach((layers, code) => {
      const targetStyle = selected?.has(code) ? stylesRef.current.SELECTED : stylesRef.current.DEFAULT
      const isSelected = selected?.has(code) ?? false
      layers.forEach(layer => {
        if (layer.options?.fillColor !== targetStyle.fillColor) {
          layer.setStyle(targetStyle)
        }
        const el = layer.getElement()
        if (el) applyAriaPressed(el, isSelected)
      })
    })
  }, [selected])

  // isDark prop の変化に追従してポリゴンスタイルを更新する
  useEffect(() => {
    stylesRef.current = buildStyles(isDark)
    layersRef.current.forEach((layers, code) => {
      const isSelected = selectedRef.current?.has(code) ?? false
      layers.forEach(layer => layer.setStyle(
        isSelected ? stylesRef.current.SELECTED : stylesRef.current.DEFAULT
      ))
    })
  }, [isDark])

  useEffect(() => {
    if (!containerRef.current) return

    const map = L.map(containerRef.current, {
      center: [43.5, 142.5],
      zoom: 7,
    })

    let isMounted = true

    fetch(import.meta.env.BASE_URL + 'data/hokkaido.geojson')
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      })
      .then(geojson => {
        if (!isMounted) return
        L.geoJSON(geojson, {
          onEachFeature: (feature, layer) => {
            const code: string | undefined = feature.properties?.code
            const name: string = feature.properties?.name ?? code ?? ''
            if (code && 'setStyle' in layer) {
              const path = layer as L.Path
              const existing = layersRef.current.get(code)
              if (existing) existing.push(path)
              else layersRef.current.set(code, [path])
              path.setStyle(selectedRef.current?.has(code) ? stylesRef.current.SELECTED : stylesRef.current.DEFAULT)

              layer.on('add', () => {
                const el = path.getElement()
                if (!el) return
                if ((el as HTMLElement & { _a11yInitialized?: boolean })._a11yInitialized) return
                ;(el as HTMLElement & { _a11yInitialized?: boolean })._a11yInitialized = true
                el.setAttribute('role', 'button')
                el.setAttribute('tabindex', '0')
                el.setAttribute('aria-label', name)
                el.setAttribute('aria-pressed', String(selectedRef.current?.has(code) ?? false))
                el.addEventListener('keydown', (e: Event) => {
                  const ke = e as KeyboardEvent
                  if (ke.key === 'Enter' || ke.key === ' ') {
                    ke.preventDefault()
                    onClickRef.current?.(code)
                  }
                })
                el.addEventListener('focus', () => {
                  onHoverRef.current?.(code)
                  if (!selectedRef.current?.has(code)) path.setStyle(stylesRef.current.HOVER)
                })
                el.addEventListener('blur', () => {
                  onHoverRef.current?.(null)
                  if (!selectedRef.current?.has(code)) path.setStyle(stylesRef.current.DEFAULT)
                })
              })

              layer.on('mouseover', () => {
                onHoverRef.current?.(code)
                if (!selectedRef.current?.has(code)) path.setStyle(stylesRef.current.HOVER)
              })
              layer.on('mouseout', () => {
                onHoverRef.current?.(null)
                if (!selectedRef.current?.has(code)) path.setStyle(stylesRef.current.DEFAULT)
              })
              layer.on('click', () => {
                onClickRef.current?.(code)
              })
            }
          },
        }).addTo(map)
      })
      .catch(() => {})

    return () => {
      isMounted = false
      layersRef.current.clear()
      map.remove()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      data-testid="hokkaido-map"
      class="map-container"
      aria-label="北海道地図"
      role="application"
    />
  )
}
