'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo } from 'react'
import 'leaflet/dist/leaflet.css'

const NIGERIA_CENTER: [number, number] = [9.082, 8.6753]

const MapContainer = dynamic(
  () => import('react-leaflet').then((m) => m.MapContainer),
  { ssr: false },
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((m) => m.TileLayer),
  { ssr: false },
)
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), {
  ssr: false,
})

// Client-only click handler component
const ClickHandler = dynamic(() => import('./MapClickHandler'), { ssr: false })

export default function LocationPicker({
  value,
  onChange,
}: {
  value?: { lat: number; lng: number }
  onChange: (coords: { lat: number; lng: number }) => void
}) {
  const center = useMemo<[number, number]>(
    () => (value ? [value.lat, value.lng] : NIGERIA_CENTER),
    [value],
  )

  useEffect(() => {
    import('leaflet').then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
    })
  }, [])

  return (
    <div>
      <div className="overflow-hidden rounded-md border border-border">
        <MapContainer
          center={center}
          zoom={value ? 13 : 6}
          style={{ height: 250, width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={onChange} />
          {value && <Marker position={[value.lat, value.lng]} />}
        </MapContainer>
      </div>
      <p className="mt-1 text-xs text-muted">
        {value
          ? `Selected: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
          : 'Tap the map to drop a pin.'}
      </p>
    </div>
  )
}
