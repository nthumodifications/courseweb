import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { CityBusVehicle } from "@/libs/citybus";

export interface CityBusMapStop {
  id: string;
  name: string;
  position: { lat: number; lon: number };
}

interface CityBusMapProps {
  line: Array<[number, number]>;
  stops: CityBusMapStop[];
  selectedStopId: string;
  nearestStopId?: string;
  vehicles: CityBusVehicle[];
  user?: { lat: number; lon: number };
  busLabel: (vehicle: CityBusVehicle) => string;
  onSelectStop: (stopId: string) => void;
}

const HSINCHU_CENTER: [number, number] = [24.8, 120.97];

function busIcon(azimuth: number | null) {
  // A divIcon avoids Leaflet's default marker images, which bundlers break.
  const rotation = azimuth ?? 0;
  return L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<div style="width:28px;height:28px;border-radius:50%;background:#7c3aed;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;transform:rotate(${rotation}deg)"><div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:9px solid #fff"></div></div>`,
  });
}

function FitLine({ line }: { line: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (line.length > 1)
      map.fitBounds(L.latLngBounds(line), { padding: [24, 24] });
  }, [line, map]);
  return null;
}

export default function CityBusMap({
  line,
  stops,
  selectedStopId,
  nearestStopId,
  vehicles,
  user,
  busLabel,
  onSelectStop,
}: Readonly<CityBusMapProps>) {
  const icons = useMemo(
    () =>
      new Map(
        vehicles.map((vehicle) => [vehicle.plate, busIcon(vehicle.azimuth)]),
      ),
    [vehicles],
  );
  return (
    <MapContainer
      center={line[0] ?? HSINCHU_CENTER}
      zoom={14}
      scrollWheelZoom={false}
      className="z-0 h-[22rem] w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitLine line={line} />
      {line.length > 1 && (
        <Polyline
          positions={line}
          pathOptions={{ color: "#7c3aed", weight: 4, opacity: 0.8 }}
        />
      )}
      {stops.map((stop) => {
        const selected = stop.id === selectedStopId;
        const nearest = stop.id === nearestStopId;
        return (
          <CircleMarker
            key={stop.id}
            center={[stop.position.lat, stop.position.lon]}
            radius={selected || nearest ? 8 : 4}
            pathOptions={{
              color: nearest ? "#16a34a" : "#7c3aed",
              weight: selected || nearest ? 3 : 2,
              fillColor: selected ? "#7c3aed" : "#fff",
              fillOpacity: 1,
            }}
            eventHandlers={{ click: () => onSelectStop(stop.id) }}
          >
            <Tooltip direction="top" permanent={selected || nearest}>
              {stop.name}
            </Tooltip>
          </CircleMarker>
        );
      })}
      {vehicles.map((vehicle) => (
        <Marker
          key={vehicle.plate}
          position={[vehicle.lat, vehicle.lon]}
          icon={icons.get(vehicle.plate)}
          zIndexOffset={1000}
        >
          <Tooltip direction="top" offset={[0, -14]}>
            {busLabel(vehicle)}
          </Tooltip>
        </Marker>
      ))}
      {user && (
        <CircleMarker
          center={[user.lat, user.lon]}
          radius={7}
          pathOptions={{
            color: "#fff",
            weight: 3,
            fillColor: "#2563eb",
            fillOpacity: 1,
          }}
        />
      )}
    </MapContainer>
  );
}
