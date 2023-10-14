'use client'
import { Marker, Popup } from 'react-leaflet';
import { MapContainer } from 'react-leaflet/MapContainer';
import { TileLayer } from 'react-leaflet/TileLayer';
import 'leaflet/dist/leaflet.css';
import { FC } from 'react';

const NTHUMap:FC<{ marker: [number, number]}> = ({ marker }) => {
    return <MapContainer center={[24.791513, 120.994123]} zoom={17} scrollWheelZoom={false} style={{ height: 700, maxHeight: '100vh', width: "100%" }}>
        <TileLayer 
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains={'abcd'}
            maxZoom={20}
        />
        <Marker position={marker}>
            <Popup>
                A pretty CSS3 popup. <br /> Easily customizable.
            </Popup>
        </Marker>
    </MapContainer>
}

export default NTHUMap;