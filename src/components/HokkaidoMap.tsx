import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useRef } from 'preact/hooks'

const STYLE_SELECTED = { fillColor: '#3b82f6', fillOpacity: 0.6 }
const STYLE_DEFAULT = { fillColor: '#666666', fillOpacity: 0.2 }

interface Props {
  onHover?: (code: string | null) => void
  onClick?: (code: string) => void
  selected?: Set<string>
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
      layers.forEach(layer => {
        if (layer.options?.fillColor !== targetStyle.fillColor) {
          layer.setStyle(targetStyle)
        }
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
            if (code && 'setStyle' in layer) {
              const path = layer as L.Path
              const existing = layersRef.current.get(code)
              if (existing) existing.push(path)
              else layersRef.current.set(code, [path])
              path.setStyle(selectedRef.current?.has(code) ? STYLE_SELECTED : STYLE_DEFAULT)
            }
            layer.on('mouseover', () => onHoverRef.current?.(feature.properties?.code ?? null))
            layer.on('mouseout', () => onHoverRef.current?.(null))
            layer.on('click', () => {
              if (code) onClickRef.current?.(code)
            })
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
      style={{ width: '100%', height: '500px' }}
    />
  )
}
