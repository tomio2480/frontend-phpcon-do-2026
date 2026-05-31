import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useRef } from 'preact/hooks'

interface Props {
  onHover?: (code: string | null) => void
  onClick?: (code: string) => void
}

export default function HokkaidoMap({ onHover, onClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onHoverRef = useRef(onHover)
  const onClickRef = useRef(onClick)

  useEffect(() => { onHoverRef.current = onHover }, [onHover])
  useEffect(() => { onClickRef.current = onClick }, [onClick])

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
            layer.on('mouseover', () => onHoverRef.current?.(feature.properties?.code ?? null))
            layer.on('mouseout', () => onHoverRef.current?.(null))
            layer.on('click', () => {
              const code: string | undefined = feature.properties?.code
              if (code) onClickRef.current?.(code)
            })
          },
        }).addTo(map)
      })
      .catch(() => {})

    return () => {
      isMounted = false
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
