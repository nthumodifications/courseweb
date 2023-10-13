'use client';
import { Marker, Popup } from 'react-leaflet'
import { MapContainer } from 'react-leaflet/MapContainer'
import { TileLayer } from 'react-leaflet/TileLayer'
import { useParams } from 'next/navigation'
import 'leaflet/dist/leaflet.css'

const MapPage = () => {
    const { locationId } = useParams()
    return (
        <div className='py-4 flex flex-col items-center space-y-2'>
            <h2 className='font-semibold text-xl'>Location for {locationId}</h2>
            <MapContainer center={[24.791513, 120.994123]} zoom={17} scrollWheelZoom={false} style={{height: 600, width: "100%"}}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[24.791513, 120.994123]}>
                    <Popup>
                    A pretty CSS3 popup. <br /> Easily customizable.
                    </Popup>
                </Marker>
            </MapContainer>
        </div>
    )
}

export default MapPage;