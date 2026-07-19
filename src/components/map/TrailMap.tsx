import { useEffect, useRef } from "react";
import maplibregl, {
  type GeoJSONSource,
  type LngLatBoundsLike,
  type Map as MapLibreMap,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapStyle } from "@/components/LeafletMap";
import { useTheme } from "@/hooks/use-theme";
import { haversineKm } from "@/lib/geo";
import type { TrailStop } from "@/lib/trails";

/** Consecutive stops farther apart than this get no connecting line — pins only. */
const NEAR_LEG_KM = 10;

const ROUTE_SOURCE = "trail-route";
const ROUTE_GLOW_LAYER = "trail-route-glow";
const ROUTE_LAYER = "trail-route-line";
const AMBER = "hsl(38, 80%, 56%)";
const FIT_OPTIONS = { padding: 56, maxZoom: 13.5 };

// Marching-ants dash phases (standard MapLibre animated-dash technique).
const DASH_SEQUENCE: number[][] = [
  [0, 4, 3],
  [0.5, 4, 2.5],
  [1, 4, 2],
  [1.5, 4, 1.5],
  [2, 4, 1],
  [2.5, 4, 0.5],
  [3, 4, 0],
  [0, 0.5, 3, 3.5],
  [0, 1, 3, 3],
  [0, 1.5, 3, 2.5],
  [0, 2, 3, 2],
  [0, 2.5, 3, 1.5],
  [0, 3, 3, 1],
  [0, 3.5, 3, 0.5],
];

function stopBounds(stops: TrailStop[]): LngLatBoundsLike {
  let minLat = stops[0].lat;
  let maxLat = stops[0].lat;
  let minLng = stops[0].lng;
  let maxLng = stops[0].lng;
  for (const s of stops) {
    minLat = Math.min(minLat, s.lat);
    maxLat = Math.max(maxLat, s.lat);
    minLng = Math.min(minLng, s.lng);
    maxLng = Math.max(maxLng, s.lng);
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

function routeFeature(stops: TrailStop[]): GeoJSON.Feature {
  const segments: [number, number][][] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (haversineKm(a.lat, a.lng, b.lat, b.lng) <= NEAR_LEG_KM) {
      segments.push([
        [a.lng, a.lat],
        [b.lng, b.lat],
      ]);
    }
  }
  return {
    type: "Feature",
    geometry: { type: "MultiLineString", coordinates: segments },
    properties: {},
  };
}

/** Idempotent: setData on the live source, or create source + layers on a fresh style. */
function applyRoute(map: MapLibreMap, data: GeoJSON.Feature) {
  const source = map.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined;
  if (source) {
    source.setData(data);
  } else {
    map.addSource(ROUTE_SOURCE, { type: "geojson", data });
  }
  if (!map.getLayer(ROUTE_GLOW_LAYER)) {
    map.addLayer({
      id: ROUTE_GLOW_LAYER,
      type: "line",
      source: ROUTE_SOURCE,
      layout: { "line-cap": "round" },
      paint: { "line-color": AMBER, "line-width": 7, "line-opacity": 0.15, "line-blur": 2 },
    });
  }
  if (!map.getLayer(ROUTE_LAYER)) {
    map.addLayer({
      id: ROUTE_LAYER,
      type: "line",
      source: ROUTE_SOURCE,
      paint: {
        "line-color": AMBER,
        "line-width": 2.2,
        "line-opacity": 0.85,
        "line-dasharray": DASH_SEQUENCE[0],
      },
    });
  }
}

interface TrailMapProps {
  stops: TrailStop[];
  /** Stop currently in focus (scroll-synced from the list); highlighted + panned to. */
  activeIndex: number | null;
  onStopClick?: (index: number) => void;
  className?: string;
}

export default function TrailMap({ stops, activeIndex, onStopClick, className = "" }: TrailMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const rafRef = useRef(0);
  const stopsRef = useRef(stops);
  stopsRef.current = stops;
  const onStopClickRef = useRef(onStopClick);
  onStopClickRef.current = onStopClick;
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const appliedDarkRef = useRef<boolean | null>(null);
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;

  const startDashAnimation = (map: MapLibreMap) => {
    cancelAnimationFrame(rafRef.current);
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let step = 0;
    const animate = (ts: number) => {
      const next = Math.floor((ts / 90) % DASH_SEQUENCE.length);
      if (next !== step) {
        step = next;
        try {
          if (map.getLayer(ROUTE_LAYER)) {
            map.setPaintProperty(ROUTE_LAYER, "line-dasharray", DASH_SEQUENCE[step]);
          }
        } catch {
          // map torn down mid-frame during unmount — the rAF is cancelled in cleanup
        }
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
  };

  // Data lifecycle: lazily create the map on first stops, then push updates into
  // the persistent instance (markers rebuilt, route via setData) — no teardown.
  useEffect(() => {
    if (!containerRef.current || !stops.length) return;

    let map = mapRef.current;
    const created = !map;
    if (!map) {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: getMapStyle(isDarkRef.current),
        bounds: stopBounds(stops),
        fitBoundsOptions: FIT_OPTIONS,
        attributionControl: false,
        // Ctrl/two-finger to zoom, so the embedded map never hijacks page scroll.
        cooperativeGestures: true,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
      mapRef.current = map;
      appliedDarkRef.current = isDarkRef.current;
    } else {
      map.fitBounds(stopBounds(stops), FIT_OPTIONS);
    }

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = stops.map((s, i) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "trail-map-marker";
      el.textContent = String(i + 1).padStart(2, "0");
      el.dataset.name = s.name.split(",")[0]?.trim() || s.name;
      el.setAttribute("aria-label", `Stop ${i + 1}: ${s.name}`);
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onStopClickRef.current?.(i);
      });
      return new maplibregl.Marker({ element: el }).setLngLat([s.lng, s.lat]).addTo(map!);
    });

    const drawRoute = () => {
      applyRoute(map!, routeFeature(stops));
      startDashAnimation(map!);
    };
    if (!created && map.isStyleLoaded()) {
      drawRoute();
      return;
    }
    map.once("load", drawRoute);
    return () => {
      map!.off("load", drawRoute);
    };
  }, [stops]);

  // Theme lifecycle: swap the base style in place; setStyle wipes custom
  // sources/layers, so the route is re-applied once the new style loads.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedDarkRef.current === isDark) return;
    appliedDarkRef.current = isDark;
    // diff:false forces a full style reload so "style.load" fires; the default
    // diff path strips custom layers without ever emitting the event.
    map.setStyle(getMapStyle(isDark), { diff: false });
    const reapplyRoute = () => {
      applyRoute(map, routeFeature(stopsRef.current));
      startDashAnimation(map);
    };
    map.once("style.load", reapplyRoute);
    return () => {
      map.off("style.load", reapplyRoute);
    };
  }, [isDark]);

  // Unmount: cancel the dash rAF, destroy markers, and tear the canvas down.
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    markersRef.current.forEach((m, i) => {
      const el = m.getElement();
      el.classList.toggle("is-active", i === activeIndex);
      el.style.zIndex = i === activeIndex ? "5" : "";
    });
    const map = mapRef.current;
    const stop = activeIndex != null ? stops[activeIndex] : null;
    if (map && stop) {
      map.easeTo({ center: [stop.lng, stop.lat], duration: 700 });
    }
  }, [activeIndex, stops]);

  return <div ref={containerRef} className={className} />;
}
