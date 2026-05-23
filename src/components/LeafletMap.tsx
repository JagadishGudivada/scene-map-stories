import { useEffect, useRef } from "react";
import maplibregl, { type Map as MapLibreMap, type StyleSpecification } from "maplibre-gl";
import type { Feature, LineString, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MediaType } from "@/lib/mockData";
import { useTheme } from "@/hooks/use-theme";

export interface MapPin {
  lat: number;
  lng: number;
  label: string;
  title?: string;
  city?: string;
  country?: string;
  type: MediaType;
  image?: string;
  visited?: boolean;
}

export interface VisitedCityRegion {
  name: string;
  lat: number;
  lng: number;
  count?: number;
  radiusKm?: number;
}

export type AppMap = MapLibreMap;

const VISITED_COLOR = "hsl(150, 60%, 50%)";

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

interface LeafletMapProps {
  pins: MapPin[];
  className?: string;
  zoom?: number;
  center?: [number, number];
  onPinClick?: (pin: MapPin) => void;
  pathMode?: boolean;
  pathPins?: MapPin[];
  onMapReady?: (map: AppMap) => void;
  highlightedPin?: MapPin | null;
  visitedCities?: VisitedCityRegion[];
}

const DARK_TILES = [
  "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
  "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
  "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
];

const LIGHT_TILES = [
  "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
];

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getCountryColor(country?: string) {
  if (!country) return VISITED_COLOR;
  const hue = hashString(country.toLowerCase()) % 360;
  return `hsl(${hue}, 72%, 56%)`;
}

function getMapStyle(isDark: boolean): StyleSpecification {
  const tiles = isDark ? DARK_TILES : LIGHT_TILES;
  return {
    version: 8,
    sources: {
      carto: {
        type: "raster",
        tiles,
        tileSize: 256,
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      },
    },
    layers: [{ id: "carto", type: "raster", source: "carto" }],
  };
}

function createCategoryMarkerElement(type: MediaType, isDark: boolean, visited = false, country?: string) {
  const visitedColor = getCountryColor(country);
  const color = visited ? visitedColor : typeColors[type];
  const bg = isDark ? "hsl(0,0%,8%)" : "hsl(0,0%,100%)";
  const border = visited ? visitedColor : isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
  const ring = visited
    ? `0 0 0 2px ${visitedColor}55, 0 0 18px ${color}66, 0 4px 12px rgba(0,0,0,0.35)`
    : `0 0 16px ${color}40, 0 4px 12px rgba(0,0,0,0.3)`;

  const el = document.createElement("button");
  el.type = "button";
  el.className = "custom-category-pin";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.width = "36px";
  el.style.height = "36px";
  el.style.borderRadius = "12px";
  el.style.background = bg;
  el.style.border = `2px solid ${border}`;
  el.style.boxShadow = ring;
  el.style.cursor = "pointer";
  el.style.transition = "transform 0.2s";
  el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" style="color:${color};">${typeSvgPaths[type]}</svg>`;
  return el;
}

function removeLayerAndSource(map: AppMap, layerId: string, sourceId: string) {
  try {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  } catch {
    // map was already removed during component unmount – safe to ignore
  }
}

function haversineKm(a: MapPin, b: MapPin) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

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
  visitedCities,
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<AppMap | null>(null);
  const pinMarkersRef = useRef<maplibregl.Marker[]>([]);
  const visitedLabelsRef = useRef<maplibregl.Marker[]>([]);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    if (!mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: getMapStyle(isDark),
      center: [center[1], center[0]],
      zoom,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "bottom-right");
    mapInstanceRef.current = map;
    onMapReady?.(map);

    return () => {
      pinMarkersRef.current.forEach((marker) => marker.remove());
      pinMarkersRef.current = [];
      visitedLabelsRef.current.forEach((marker) => marker.remove());
      visitedLabelsRef.current = [];
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isDark]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    pinMarkersRef.current.forEach((marker) => marker.remove());
    pinMarkersRef.current = [];

    pins.forEach((pin) => {
      const el = createCategoryMarkerElement(pin.type, isDark, pin.visited, pin.country);
      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: true, offset: 16 }).setHTML(
        `<span>${pin.visited ? "✓ " : ""}${pin.label}</span>`
      );

      if (onPinClick) {
        el.addEventListener("click", () => onPinClick(pin));
      }

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([pin.lng, pin.lat])
        .setPopup(popup)
        .addTo(map);

      pinMarkersRef.current.push(marker);
    });
  }, [pins, isDark, onPinClick]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const PATH_SOURCE_ID = "path-lines-source";
    const PATH_LAYER_ID = "path-lines-layer";
    const PATH_LABEL_SOURCE_ID = "path-labels-source";
    const PATH_LABEL_LAYER_ID = "path-labels-layer";

    const renderPath = () => {
      removeLayerAndSource(map, PATH_LAYER_ID, PATH_SOURCE_ID);
      removeLayerAndSource(map, PATH_LABEL_LAYER_ID, PATH_LABEL_SOURCE_ID);

      if (!pathMode || !pathPins || pathPins.length < 2) return;

      const lineFeatures: Feature<LineString>[] = [];
      const labelFeatures: Feature<Point, { label: string }>[] = [];

      for (let i = 0; i < pathPins.length; i++) {
        for (let j = i + 1; j < pathPins.length; j++) {
          const dist = haversineKm(pathPins[i], pathPins[j]);
          if (dist <= 10) {
            lineFeatures.push({
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: [
                  [pathPins[i].lng, pathPins[i].lat],
                  [pathPins[j].lng, pathPins[j].lat],
                ],
              },
              properties: {},
            });

            labelFeatures.push({
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [
                  (pathPins[i].lng + pathPins[j].lng) / 2,
                  (pathPins[i].lat + pathPins[j].lat) / 2,
                ],
              },
              properties: { label: `${dist.toFixed(1)} km` },
            });
          }
        }
      }

      if (!lineFeatures.length) return;

      map.addSource(PATH_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: lineFeatures },
      });

      map.addLayer({
        id: PATH_LAYER_ID,
        type: "line",
        source: PATH_SOURCE_ID,
        paint: {
          "line-color": typeColors.Movie,
          "line-width": 2,
          "line-opacity": 0.7,
          "line-dasharray": [4, 4],
        },
      });

      if (labelFeatures.length) {
        map.addSource(PATH_LABEL_SOURCE_ID, {
          type: "geojson",
          data: { type: "FeatureCollection", features: labelFeatures },
        });

        map.addLayer({
          id: PATH_LABEL_LAYER_ID,
          type: "symbol",
          source: PATH_LABEL_SOURCE_ID,
          layout: {
            "text-field": ["get", "label"],
            "text-size": 10,
            "text-offset": [0, 0],
            "text-anchor": "center",
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "hsl(38, 80%, 56%)",
            "text-halo-color": isDark ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.85)",
            "text-halo-width": 1,
          },
          minzoom: 10,
        });
      }
    };

    if (map.isStyleLoaded()) renderPath();
    else map.once("load", renderPath);

    return () => {
      removeLayerAndSource(map, PATH_LAYER_ID, PATH_SOURCE_ID);
      removeLayerAndSource(map, PATH_LABEL_LAYER_ID, PATH_LABEL_SOURCE_ID);
    };
  }, [pathMode, pathPins, isDark]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const SOURCE_ID = "highlight-source";
    const LAYER_ID = "highlight-layer";

    const renderHighlight = () => {
      removeLayerAndSource(map, LAYER_ID, SOURCE_ID);
      if (!highlightedPin) return;

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [highlightedPin.lng, highlightedPin.lat],
              },
              properties: {},
            },
          ],
        },
      });

      map.addLayer({
        id: LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-color": typeColors[highlightedPin.type],
          "circle-radius": 22,
          "circle-opacity": 0.18,
          "circle-stroke-color": typeColors[highlightedPin.type],
          "circle-stroke-width": 2,
          "circle-stroke-opacity": 0.8,
        },
      });
    };

    if (map.isStyleLoaded()) renderHighlight();
    else map.once("load", renderHighlight);

    return () => {
      removeLayerAndSource(map, LAYER_ID, SOURCE_ID);
    };
  }, [highlightedPin]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const SOURCE_ID = "visited-cities-source";
    const LAYER_ID = "visited-cities-layer";

    const renderVisitedCities = () => {
      removeLayerAndSource(map, LAYER_ID, SOURCE_ID);
      visitedLabelsRef.current.forEach((label) => label.remove());
      visitedLabelsRef.current = [];

      if (!visitedCities || !visitedCities.length) return;

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: visitedCities.map((city) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [city.lng, city.lat],
            },
            properties: { radiusKm: city.radiusKm ?? 6 },
          })),
        },
      });

      map.addLayer({
        id: LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-color": VISITED_COLOR,
          "circle-opacity": 0.12,
          "circle-stroke-color": VISITED_COLOR,
          "circle-stroke-width": 1.5,
          "circle-stroke-opacity": 0.75,
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            2,
            8,
            8,
            26,
            12,
            42,
          ],
        },
      });

      visitedCities.forEach((city) => {
        const label = document.createElement("div");
        label.className = "visited-city-label";
        label.style.display = "inline-flex";
        label.style.alignItems = "center";
        label.style.gap = "4px";
        label.style.padding = "2px 8px";
        label.style.borderRadius = "9999px";
        label.style.background = VISITED_COLOR;
        label.style.color = "hsl(0,0%,8%)";
        label.style.fontWeight = "700";
        label.style.fontSize = "10px";
        label.style.fontFamily = "Inter, sans-serif";
        label.style.letterSpacing = "0.04em";
        label.style.textTransform = "uppercase";
        label.style.boxShadow = `0 2px 8px ${VISITED_COLOR}66`;
        label.style.whiteSpace = "nowrap";
        label.textContent = `✓ ${city.name}${city.count ? ` · ${city.count}` : ""}`;

        const marker = new maplibregl.Marker({ element: label, anchor: "left" })
          .setLngLat([city.lng, city.lat])
          .addTo(map);
        visitedLabelsRef.current.push(marker);
      });
    };

    if (map.isStyleLoaded()) renderVisitedCities();
    else map.once("load", renderVisitedCities);

    return () => {
      removeLayerAndSource(map, LAYER_ID, SOURCE_ID);
      visitedLabelsRef.current.forEach((label) => label.remove());
      visitedLabelsRef.current = [];
    };
  }, [visitedCities]);

  return (
    <div className={`relative z-0 rounded-2xl overflow-hidden border border-border ${className}`}>
      <div ref={mapRef} className="w-full h-full" />
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
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: VISITED_COLOR }} />
            <span className="text-xs text-muted-foreground">Been here</span>
          </div>
        </div>
      </div>
    </div>
  );
}
