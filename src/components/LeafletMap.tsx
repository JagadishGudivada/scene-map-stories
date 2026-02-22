import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MediaType } from "@/lib/mockData";
import { useTheme } from "@/hooks/use-theme";

export interface MapPin {
  lat: number;
  lng: number;
  label: string;
  title?: string;
  type: MediaType;
}

const typeColors: Record<MediaType, string> = {
  Movie: "hsl(38, 80%, 56%)",
  Series: "hsl(180, 38%, 39%)",
  Book: "hsl(270, 60%, 70%)",
};

function createPinIcon(type: MediaType, isDark: boolean) {
  const color = typeColors[type];
  const border = isDark ? "hsl(0,0%,5%)" : "hsl(0,0%,100%)";
  return L.divIcon({
    className: "custom-map-pin",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid ${border};box-shadow:0 0 12px ${color}80;"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

interface LeafletMapProps {
  pins: MapPin[];
  className?: string;
  zoom?: number;
  center?: [number, number];
}

const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const LIGHT_TILES = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

export default function LeafletMap({
  pins,
  className = "",
  zoom = 2,
  center = [30, 10],
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
    });

    const tile = L.tileLayer(isDark ? DARK_TILES : LIGHT_TILES, { maxZoom: 18 }).addTo(map);
    tileLayerRef.current = tile;

    L.control.zoom({ position: "bottomright" }).addTo(map);
    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // Swap tiles on theme change
  useEffect(() => {
    if (!leafletMap.current || !tileLayerRef.current) return;
    tileLayerRef.current.setUrl(isDark ? DARK_TILES : LIGHT_TILES);
  }, [isDark]);

  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    const popupBg = isDark ? "hsl(0,0%,8%)" : "hsl(0,0%,100%)";
    const popupText = isDark ? "#F5F0E8" : "#1a1a1a";
    const popupBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
    const popupMuted = isDark ? "hsl(40,10%,58%)" : "hsl(220,8%,46%)";

    pins.forEach((pin) => {
      const marker = L.marker([pin.lat, pin.lng], {
        icon: createPinIcon(pin.type, isDark),
      }).addTo(map);

      marker.bindPopup(
        `<div style="font-family:Inter,sans-serif;font-size:13px;color:${popupText};background:${popupBg};padding:8px 12px;border-radius:8px;border:1px solid ${popupBorder};min-width:120px;">
          <strong>${pin.label}</strong>
          ${pin.title ? `<br/><span style="color:${popupMuted};font-size:11px;">${pin.title}</span>` : ""}
          <br/><span style="font-size:10px;color:${typeColors[pin.type]};">${pin.type}</span>
        </div>`,
        {
          className: "sarevista-popup",
          closeButton: false,
        }
      );
    });
  }, [pins, isDark]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-border ${className}`}>
      <div ref={mapRef} className="w-full h-full" />
      {/* Legend overlay */}
      <div className="absolute top-4 right-4 z-[1000] glass rounded-xl px-3 py-2 border border-border">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber" />
            <span className="text-xs text-muted-foreground">Movie</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal" />
            <span className="text-xs text-muted-foreground">Series</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(270, 60%, 70%)" }} />
            <span className="text-xs text-muted-foreground">Book</span>
          </div>
        </div>
      </div>
    </div>
  );
}
