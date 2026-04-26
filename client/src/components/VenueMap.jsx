import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { ExternalLink, Navigation } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const icon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
})

export default function VenueMap({ venue, schoolPostcode }) {
  if (!venue.latitude || !venue.longitude) {
    return (
      <div className="bg-subtle rounded-lg p-6 text-center text-secondary text-sm">
        No location data. Add a postcode to show the map.
      </div>
    )
  }

  const pos = [venue.latitude, venue.longitude]
  const directionsUrl = schoolPostcode
    ? `https://www.google.com/maps/dir/${encodeURIComponent(schoolPostcode)}/${venue.latitude},${venue.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`

  return (
    <div className="space-y-3">
      <div className="rounded-lg overflow-hidden border border-border-strong" style={{ height: 240 }}>
        <MapContainer center={pos} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={pos} icon={icon}>
            <Popup>{venue.name}</Popup>
          </Marker>
        </MapContainer>
      </div>
      <div className="flex gap-2">
        <a href={directionsUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-pitch-600 hover:bg-pitch-500 text-on-dark rounded-lg text-sm">
          <Navigation className="w-3.5 h-3.5" /> Get Directions
        </a>
        <a href={`https://www.openstreetmap.org/?mlat=${venue.latitude}&mlon=${venue.longitude}#map=16/${venue.latitude}/${venue.longitude}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-subtle hover:bg-border-default text-secondary rounded-lg text-sm border border-border-strong">
          <ExternalLink className="w-3.5 h-3.5" /> Open Map
        </a>
      </div>
    </div>
  )
}
