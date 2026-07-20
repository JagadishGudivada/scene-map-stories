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

/** Skip OSRM for legs above this — long-haul stops stay as pins only. */
const MAX_LEG_KM_FOR_OSRM = 400;
/** OSRM caps URL length; batch waypoints so requests stay comfortably small. */
const MAX_WAYPOINTS_PER_REQUEST = 25;

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

/** Straight-line fallback when OSRM can't (or shouldn't) route a leg. */
function straightSegments(stops: TrailStop[]): [number, number][][] {
  const segs: [number, number][][] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (haversineKm(a.lat, a.lng, b.lat, b.lng) <= MAX_LEG_KM_FOR_OSRM) {
      segs.push([
        [a.lng, a.lat],
        [b.lng, b.lat],
      ]);
    }
  }
  return segs;
}

function emptyFeature(): GeoJSON.Feature {
  return {
    type: "Feature",
    geometry: { type: "MultiLineString", coordinates: [] },
    properties: {},
  };
}

function toFeature(coords: [number, number][][]): GeoJSON.Feature {
  return {
    type: "Feature",
    geometry: { type: "MultiLineString", coordinates: coords },
    properties: {},
  };
}

/**
 * Fetch real road/foot geometry via OSRM's public router. Batches large trails
 * into overlapping chunks so each request stays under the URL limit.
 */
async function fetchOsrmSegments(
  stops: TrailStop[],
  profile: "foot" | "driving",
  signal: AbortSignal,
): Promise<[number, number][][] | null> {
  if (stops.length < 2) return [];
  const segments: [number, number][][] = [];

  for (let start = 0; start < stops.length - 1; start += MAX_WAYPOINTS_PER_REQUEST - 1) {
    const chunk = stops.slice(start, start + MAX_WAYPOINTS_PER_REQUEST);
    if (chunk.length < 2) break;

    // Skip the whole chunk if any leg is intercontinental — OSRM would fail or
    // return an absurd detour; the straight-line fallback handles those.
    let skipChunk = false;
    for (let i = 0; i < chunk.length - 1; i++) {
      const a = chunk[i];
      const b = chunk[i + 1];
      if (haversineKm(a.lat, a.lng, b.lat, b.lng) > MAX_LEG_KM_FOR_OSRM) {
        skipChunk = true;
        break;
      }
    }
    if (skipChunk) continue;

    const coordString = chunk.map((s) => `${s.lng},${s.lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/${profile}/${coordString}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const data = await res.json();
    const geom = data?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
    if (!geom || geom.length < 2) throw new Error("OSRM: empty geometry");
    segments.push(geom);
  }

  return segments;
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
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": AMBER, "line-width": 8, "line-opacity": 0.18, "line-blur": 2 },
    });
  }
  if (!map.getLayer(ROUTE_LAYER)) {
    map.addLayer({
      id: ROUTE_LAYER,
      type: "line",
      source: ROUTE_SOURCE,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": AMBER,
        "line-width": 3.2,
        "line-opacity": 0.95,
      },
    });
  }
}

interface TrailMapProps {
  stops: TrailStop[];
  /** Determines OSRM profile — walking trails use foot routing, drives use car. */
  kind?: "walking" | "drive";
  /** Stop currently in focus (scroll-synced from the list); highlighted + panned to. */
  activeIndex: number | null;
  onStopClick?: (index: number) => void;
  className?: string;
}

export default function TrailMap({
  stops,
  kind = "walking",
  activeIndex,
  onStopClick,
  className = "",
}: TrailMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const rafRef = useRef(0);
  const stopsRef = useRef(stops);
  stopsRef.current = stops;
  const kindRef = useRef(kind);
  kindRef.current = kind;
  const onStopClickRef = useRef(onStopClick);
  onStopClickRef.current = onStopClick;
  /** Cached routed geometry for the current stops; re-applied on style/theme swaps. */
  const routeFeatureRef = useRef<GeoJSON.Feature>(emptyFeature());
  /** true once OSRM succeeds — dashed animation only runs on straight-line fallback. */
  const isRoutedRef = useRef(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const appliedDarkRef = useRef<boolean | null>(null);
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;

  const setStaticDash = (map: MapLibreMap, dash: number[] | null) => {
    if (!map.getLayer(ROUTE_LAYER)) return;
    try {
      map.setPaintProperty(ROUTE_LAYER, "line-dasharray", dash);
    } catch {
      // layer may be gone if the style just swapped
    }
  };

  /** Push cached geometry back onto the map after a style swap or fresh mount. */
  const reapplyCurrentRoute = (map: MapLibreMap) => {
    applyRoute(map, routeFeatureRef.current);
    // Static dashed line while falling back to straight legs, solid once routed.
    setStaticDash(map, isRoutedRef.current ? null : [2, 2]);
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

    // Seed the fallback route immediately, then upgrade to real OSRM geometry.
    routeFeatureRef.current = toFeature(straightSegments(stops));
    isRoutedRef.current = false;

    const controller = new AbortController();

    const initialiseRoute = () => {
      reapplyCurrentRoute(map!);
      // Fetch real routing in the background — falls through to dashed straight
      // lines if the router is unreachable or a leg is too long to route.
      fetchOsrmSegments(stops, kindRef.current === "drive" ? "driving" : "foot", controller.signal)
        .then((segments) => {
          if (!segments || segments.length === 0 || controller.signal.aborted) return;
          routeFeatureRef.current = toFeature(segments);
          isRoutedRef.current = true;
          const m = mapRef.current;
          if (m && m.getSource(ROUTE_SOURCE)) {
            (m.getSource(ROUTE_SOURCE) as GeoJSONSource).setData(routeFeatureRef.current);
            stopDashAnimation();
            setStaticDash(m, null);
          }
        })
        .catch(() => {
          // Silent fallback — the dashed straight-line route is already visible.
        });
    };

    if (!created && map.isStyleLoaded()) {
      initialiseRoute();
    } else {
      map.once("load", initialiseRoute);
    }

    return () => {
      controller.abort();
      map!.off("load", initialiseRoute);
    };
  }, [stops, kind]);

  // Theme lifecycle: swap the base style in place; setStyle wipes custom
  // sources/layers, so the route is re-applied once the new style loads.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || appliedDarkRef.current === isDark) return;
    appliedDarkRef.current = isDark;
    map.setStyle(getMapStyle(isDark), { diff: false });
    const onStyleLoad = () => reapplyCurrentRoute(map);
    map.once("style.load", onStyleLoad);
    return () => {
      map.off("style.load", onStyleLoad);
    };
  }, [isDark]);

  // Unmount: cancel the dash rAF, destroy markers, and tear the canvas down.
  useEffect(() => {
    return () => {
      stopDashAnimation();
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
