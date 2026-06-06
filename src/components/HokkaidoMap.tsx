import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useRef } from 'preact/hooks'

/* トークン対応: --color-accent-lilac / --color-accent-lavender / --color-map-default */
const STYLE_SELECTED = { fillColor: '#D8B7DD', fillOpacity: 0.6 }
const STYLE_HOVER    = { fillColor: '#BFB3E0', fillOpacity: 0.5 }
const STYLE_DEFAULT  = { fillColor: '#666666',  fillOpacity: 0.2 }

interface Props {
  onHover?: (code: string | null) => void
  onClick?: (code: string) => void
  selected?: Set<string>
}

function applyAriaPressed(el: Element, isSelected: boolean) {
  el.setAttribute('aria-pressed', String(isSelected))
}

export default function HokkaidoMap({ onHover, onClick, selected }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onHoverRef = useRef(onHover)
  const onClickRef = useRef(onClick)
  const selectedRef = useRef(selected)
  const layersRef = useRef<Map<string, L.Path[]>>(new Map())

  useEffect(() => { onHoverRef.current = onHover }, [onHover])
  useEffect(() => { onClickRef.current = onClick }, [onClick])

  useEffect(() => {
    selectedRef.current = selected
    layersRef.current.forEach((layers, code) => {
      const targetStyle = selected?.has(code) ? STYLE_SELECTED : STYLE_DEFAULT
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

  useEffect(() => {
    if (!containerRef.current) return

    const map = L.map(containerRef.current, {
      center: [43.5, 142.5],
      zoom: 7,
    })

    let isMounted = true

    fetch('/data/hokkaido.geojson')
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
              path.setStyle(selectedRef.current?.has(code) ? STYLE_SELECTED : STYLE_DEFAULT)

              layer.on('add', () => {
                const el = path.getElement()
                if (!el) return
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
                  if (!selectedRef.current?.has(code)) path.setStyle(STYLE_HOVER)
                })
                el.addEventListener('blur', () => {
                  onHoverRef.current?.(null)
                  if (!selectedRef.current?.has(code)) path.setStyle(STYLE_DEFAULT)
                })
              })

              layer.on('mouseover', () => {
                onHoverRef.current?.(code)
                if (!selectedRef.current?.has(code)) path.setStyle(STYLE_HOVER)
              })
              layer.on('mouseout', () => {
                onHoverRef.current?.(null)
                if (!selectedRef.current?.has(code)) path.setStyle(STYLE_DEFAULT)
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
