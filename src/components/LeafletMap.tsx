import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import type { MediaType } from "@/lib/mockData";
import { useTheme } from "@/hooks/use-theme";

export interface MapPin {
  lat: number;
  lng: number;
  label: string;
  title?: string;
  type: MediaType;
  image?: string;
}

const typeColors: Record<MediaType, string> = {
  Movie: "hsl(38, 80%, 56%)",
  Series: "hsl(180, 38%, 39%)",
  Book: "hsl(270, 60%, 70%)",
};

const typeSvgPaths: Record<MediaType, string> = {
  Movie: `<path d="M7 4v16l6-4 6 4V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="9" y="6" width="2" height="2" rx=".5" fill="currentColor"/><rect x="13" y="6" width="2" height="2" rx=".5" fill="currentColor"/><rect x="9" y="10" width="2" height="2" rx=".5" fill="currentColor"/><rect x="13" y="10" width="2" height="2" rx=".5" fill="currentColor"/>`,
  Series: `<rect x="2" y="7" width="20" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><polyline points="17 2 12 7 7 2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  Book: `<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
};

function createCategoryIcon(type: MediaType, isDark: boolean) {
  const color = typeColors[type];
  const bg = isDark ? "hsl(0,0%,8%)" : "hsl(0,0%,100%)";
  const border = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
  return L.divIcon({
    className: "custom-category-pin",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:12px;background:${bg};border:2px solid ${border};box-shadow:0 0 16px ${color}40, 0 4px 12px rgba(0,0,0,0.3);cursor:pointer;transition:transform 0.2s;">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" style="color:${color};">${typeSvgPaths[type]}</svg>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

interface LeafletMapProps {
  pins: MapPin[];
  className?: string;
  zoom?: number;
  center?: [number, number];
  onPinClick?: (pin: MapPin) => void;
  pathMode?: boolean;
  pathPins?: MapPin[];
  onMapReady?: (map: L.Map) => void;
  highlightedPin?: MapPin | null;
}

const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const LIGHT_TILES = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

export default function LeafletMap({
  pins,
  className = "",
  zoom = 2,
  center = [30, 10],
  onPinClick,
  pathMode = false,
  pathPins,
  onMapReady,
  highlightedPin,
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polylineRef = useRef<(L.Polyline | L.Marker)[] | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const highlightRef = useRef<L.CircleMarker | null>(null);
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
    onMapReady?.(map);

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

  // Render markers with clustering
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    // Remove previous cluster group
    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
      clusterRef.current = null;
    }

    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        const size = count < 10 ? 36 : count < 50 ? 42 : 48;
        const bg = isDark ? "hsl(0,0%,8%)" : "hsl(0,0%,100%)";
        const border = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
        return L.divIcon({
          className: "custom-cluster-icon",
          html: `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:${size / 2}px;background:${bg};border:2px solid ${border};box-shadow:0 0 20px hsla(38,80%,56%,0.35),0 4px 12px rgba(0,0,0,0.3);color:hsl(38,80%,56%);font-weight:700;font-size:${size < 42 ? 13 : 15}px;font-family:Inter,sans-serif;">${count}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    });

    pins.forEach((pin) => {
      const marker = L.marker([pin.lat, pin.lng], {
        icon: createCategoryIcon(pin.type, isDark),
      });
      if (onPinClick) {
        marker.on("click", () => onPinClick(pin));
      }
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    clusterRef.current = clusterGroup;
  }, [pins, isDark, onPinClick]);

  // Path mode polyline — only connect pins within 10km
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    // Remove old lines
    if (polylineRef.current) {
      if (Array.isArray(polylineRef.current)) {
        polylineRef.current.forEach((l) => map.removeLayer(l));
      } else {
        map.removeLayer(polylineRef.current);
      }
      polylineRef.current = null;
    }

    if (pathMode && pathPins && pathPins.length > 1) {
      const toRad = (n: number) => (n * Math.PI) / 180;
      const haversine = (a: MapPin, b: MapPin) => {
        const R = 6371;
        const dLat = toRad(b.lat - a.lat);
        const dLng = toRad(b.lng - a.lng);
        const s =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(s));
      };

      const layers: (L.Polyline | L.Marker)[] = [];
      for (let i = 0; i < pathPins.length; i++) {
        for (let j = i + 1; j < pathPins.length; j++) {
          const dist = haversine(pathPins[i], pathPins[j]);
          if (dist <= 10) {
            layers.push(
              L.polyline(
                [[pathPins[i].lat, pathPins[i].lng], [pathPins[j].lat, pathPins[j].lng]],
                { color: typeColors.Movie, weight: 2, dashArray: "8, 8", opacity: 0.7 }
              ).addTo(map)
            );
            const midLat = (pathPins[i].lat + pathPins[j].lat) / 2;
            const midLng = (pathPins[i].lng + pathPins[j].lng) / 2;
            const label = L.marker([midLat, midLng], {
              interactive: false,
              icon: L.divIcon({
                className: "path-distance-label",
                html: `<span>${dist.toFixed(1)} km</span>`,
                iconSize: [60, 20],
                iconAnchor: [30, 10],
              }),
            }).addTo(map);
            layers.push(label);
          }
        }
      }
      polylineRef.current = layers.length ? layers : null;
    }
  }, [pathMode, pathPins, isDark]);

  // Highlighted pin pulsing ring
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    if (highlightRef.current) {
      map.removeLayer(highlightRef.current);
      highlightRef.current = null;
    }

    if (highlightedPin) {
      const color = typeColors[highlightedPin.type];
      highlightRef.current = L.circleMarker([highlightedPin.lat, highlightedPin.lng], {
        radius: 22,
        color,
        weight: 2,
        opacity: 0.8,
        fillColor: color,
        fillOpacity: 0.15,
        className: "highlight-pulse-ring",
      }).addTo(map);
    }
  }, [highlightedPin]);

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
