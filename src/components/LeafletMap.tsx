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
  onMapClick?: (lng: number, lat: number) => void;
  radiusCircle?: { lat: number; lng: number; km: number } | null;
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
  onMapClick,
  radiusCircle,
}: LeafletMapProps) {

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<AppMap | null>(null);
  const visitedLabelsRef = useRef<maplibregl.Marker[]>([]);
  const mapPopupRef = useRef<maplibregl.Popup | null>(null);
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
      mapPopupRef.current?.remove();
      mapPopupRef.current = null;
      visitedLabelsRef.current.forEach((marker) => marker.remove());
      visitedLabelsRef.current = [];
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isDark]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const SOURCE_ID = "pins-source";
    const CLUSTER_LAYER_ID = "pins-clusters-layer";
    const CLUSTER_COUNT_LAYER_ID = "pins-cluster-count-layer";
    const UNCLUSTERED_LAYER_ID = "pins-unclustered-layer";

    const clearPinLayers = () => {
      mapPopupRef.current?.remove();
      mapPopupRef.current = null;

      try {
        if (map.getLayer(CLUSTER_COUNT_LAYER_ID)) map.removeLayer(CLUSTER_COUNT_LAYER_ID);
        if (map.getLayer(CLUSTER_LAYER_ID)) map.removeLayer(CLUSTER_LAYER_ID);
        if (map.getLayer(UNCLUSTERED_LAYER_ID)) map.removeLayer(UNCLUSTERED_LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        // Map/style can already be disposed during theme swap unmount.
      }
    };

    const handleClusterClick = (event: any) => {
      const features = map.queryRenderedFeatures(event.point, { layers: [CLUSTER_LAYER_ID, CLUSTER_COUNT_LAYER_ID] });
      if (!features.length) return;

      const feature = features[0];
      const clusterId = feature.properties?.cluster_id;
      if (clusterId == null) return;

      const source = map.getSource(SOURCE_ID) as any;
      if (!source) return;
      const geometry = feature.geometry as any;
      if (!geometry?.coordinates) return;

      const flyToZoom = (expansionZoom: number) => {
        map.easeTo({ center: geometry.coordinates, zoom: expansionZoom + 0.4, duration: 500 });
      };

      try {
        const result = source.getClusterExpansionZoom(clusterId, (err: Error | null, expansionZoom: number) => {
          if (err) return;
          flyToZoom(expansionZoom);
        });
        // MapLibre v3+ returns a Promise instead of using the callback
        if (result && typeof result.then === "function") {
          result.then(flyToZoom).catch(() => {
            map.easeTo({ center: geometry.coordinates, zoom: map.getZoom() + 2, duration: 500 });
          });
        }
      } catch {
        map.easeTo({ center: geometry.coordinates, zoom: map.getZoom() + 2, duration: 500 });
      }
    };

    const handleUnclusteredPinClick = (event: any) => {
      const features = map.queryRenderedFeatures(event.point, { layers: [UNCLUSTERED_LAYER_ID] });
      const feature = features[0];
      if (!feature) return;
    const handleMapClick = (event: any) => {
      const clusterFeatures = map.queryRenderedFeatures(event.point, { layers: [CLUSTER_LAYER_ID, CLUSTER_COUNT_LAYER_ID] });
      if (clusterFeatures.length) {
        handleClusterClick(event);
        return;
      }

      const pointFeatures = map.queryRenderedFeatures(event.point, { layers: [UNCLUSTERED_LAYER_ID] });
      if (pointFeatures.length) {
        handleUnclusteredPinClick(event);
      }
    };


      const pinIndex = Number(feature.properties?.pinIndex);
      const pin = Number.isFinite(pinIndex) ? pins[pinIndex] : null;
      if (!pin) return;

      onPinClick?.(pin);

      const coordinates = (feature.geometry as any)?.coordinates;
      if (!coordinates) return;

      mapPopupRef.current?.remove();
      mapPopupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: true, offset: 14, className: "sarevista-popup" })
        .setLngLat(coordinates)
        .setHTML(`<div class="sarevista-map-popup">${pin.visited ? "✓ " : ""}${pin.label}</div>`)
        .addTo(map);
    };

    const handleMapClick = (event: any) => {
      const clusterFeatures = map.queryRenderedFeatures(event.point, { layers: [CLUSTER_LAYER_ID, CLUSTER_COUNT_LAYER_ID] });
      if (clusterFeatures.length) {
        handleClusterClick(event);
        return;
      }

      const pointFeatures = map.queryRenderedFeatures(event.point, { layers: [UNCLUSTERED_LAYER_ID] });
      if (pointFeatures.length) {
        handleUnclusteredPinClick(event);
      }
    };

    const onMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };

    const onMouseLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    const renderPinLayers = () => {
      clearPinLayers();
      if (!pins.length) return;

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: pins.map((pin, pinIndex) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [pin.lng, pin.lat],
            },
            properties: {
              pinIndex,
              type: pin.type,
              visited: pin.visited ? 1 : 0,
              countryColor: getCountryColor(pin.country),
            },
          })),
        },
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 54,
      });

      map.addLayer({
        id: CLUSTER_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            isDark ? "rgba(10, 10, 10, 0.92)" : "rgba(255, 255, 255, 0.95)",
            8,
            "rgba(245, 158, 11, 0.92)",
            20,
            "rgba(20, 184, 166, 0.92)",
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            18,
            8,
            22,
            20,
            28,
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": isDark ? "rgba(255,255,255,0.22)" : "rgba(15, 23, 42, 0.16)",
          "circle-stroke-opacity": 1,
        },
      });

      map.addLayer({
        id: CLUSTER_COUNT_LAYER_ID,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["to-string", ["get", "point_count"]],
          "text-font": ["Noto Serif Bold", "Noto Serif Regular", "Arial Unicode MS Bold"],
          "text-size": 13,
          "text-letter-spacing": 0.02,
        },
        paint: {
          "text-color": "hsl(38, 80%, 56%)",
          "text-halo-color": isDark ? "rgba(13, 13, 13, 0.92)" : "rgba(248, 245, 240, 0.95)",
          "text-halo-width": 1.2,
        },
      });

      map.addLayer({
        id: UNCLUSTERED_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 10,
          "circle-color": [
            "case",
            ["==", ["get", "visited"], 1],
            ["get", "countryColor"],
            ["match", ["get", "type"], "Movie", typeColors.Movie, "Series", typeColors.Series, "Book", typeColors.Book, typeColors.Movie],
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": isDark ? "hsl(0,0%,8%)" : "hsl(0,0%,100%)",
          "circle-stroke-opacity": 0.95,
        },
      });

      map.on("click", handleMapClick);
      map.on("mouseenter", CLUSTER_LAYER_ID, onMouseEnter);
      map.on("mouseenter", CLUSTER_COUNT_LAYER_ID, onMouseEnter);
      map.on("mouseenter", UNCLUSTERED_LAYER_ID, onMouseEnter);
      map.on("mouseleave", CLUSTER_LAYER_ID, onMouseLeave);
      map.on("mouseleave", CLUSTER_COUNT_LAYER_ID, onMouseLeave);
      map.on("mouseleave", UNCLUSTERED_LAYER_ID, onMouseLeave);
    };

    if (map.isStyleLoaded()) renderPinLayers();
    else map.once("load", renderPinLayers);

    return () => {
      map.off("click", handleMapClick);
      map.off("mouseenter", CLUSTER_LAYER_ID, onMouseEnter);
      map.off("mouseenter", CLUSTER_COUNT_LAYER_ID, onMouseEnter);
      map.off("mouseenter", UNCLUSTERED_LAYER_ID, onMouseEnter);
      map.off("mouseleave", CLUSTER_LAYER_ID, onMouseLeave);
      map.off("mouseleave", CLUSTER_COUNT_LAYER_ID, onMouseLeave);
      map.off("mouseleave", UNCLUSTERED_LAYER_ID, onMouseLeave);
      clearPinLayers();
    };
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
