'use client'

import { useMapEvents } from 'react-leaflet'

export default function MapClickHandler({
  onPick,
}: {
  onPick: (coords: { lat: number; lng: number }) => void
}) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}
