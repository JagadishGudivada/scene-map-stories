import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Globe } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import type { MapPin as PinType } from "@/components/LeafletMap";

const COUNTRIES_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";
const CACHE_KEY = "sarevista:world-countries-v1";
const TOTAL_COUNTRIES = 195;

const COUNTRY_ALIASES: Record<string, string> = {
  usa: "united states of america",
  us: "united states of america",
  "united states": "united states of america",
  uk: "united kingdom",
  "great britain": "united kingdom",
  england: "united kingdom",
  scotland: "united kingdom",
  wales: "united kingdom",
  "czech republic": "czechia",
  burma: "myanmar",
  "south korea": "south korea",
  "north korea": "north korea",
  "ivory coast": "côte d'ivoire",
  "cote d'ivoire": "côte d'ivoire",
  vatican: "vatican",
  uae: "united arab emirates",
  drc: "democratic republic of the congo",
  "dr congo": "democratic republic of the congo",
  "republic of the congo": "republic of congo",
};

function normalize(name?: string | null) {
  if (!name) return "";
  const n = name.trim().toLowerCase();
  return COUNTRY_ALIASES[n] ?? n;
}

let cachedGeoJson: any = null;
async function loadCountries(): Promise<any> {
  if (cachedGeoJson) return cachedGeoJson;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      cachedGeoJson = JSON.parse(cached);
      return cachedGeoJson;
    }
  } catch {}
  const res = await fetch(COUNTRIES_URL);
  const json = await res.json();
  cachedGeoJson = json;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(json));
  } catch {}
  return json;
}

export interface FogOfWarMapProps {
  pins: PinType[];
  visitedCountries: string[]; // raw country strings from visited_spots
  className?: string;
  focusPin?: { lat: number; lng: number } | null;
}

export default function FogOfWarMap({ pins = [], visitedCountries = [], className, focusPin }: FogOfWarMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [ready, setReady] = useState(false);
  const [drop, setDrop] = useState<{ lat: number; lng: number } | null>(null);

  const visitedSet = useMemo(
    () => new Set((visitedCountries ?? []).map(normalize).filter(Boolean)),
    [visitedCountries]
  );

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const tiles = isDark
      ? "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
      : "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png";
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          base: { type: "raster", tiles: [tiles], tileSize: 256, attribution: "© CARTO © OpenStreetMap" },
        },
        layers: [{ id: "base", type: "raster", source: "base" }],
      } as any,
      center: [10, 25],
      zoom: 1.2,
      attributionControl: false,
    });
    mapRef.current = map;

    map.on("load", async () => {
      const geo = await loadCountries();
      if (!mapRef.current) return;
      // Attach visited flag per feature
      const features = geo.features.map((f: any) => {
        const name = normalize(f.properties?.ADMIN || f.properties?.NAME || f.properties?.NAME_LONG);
        const isVisited = visitedSet.has(name);
        return { ...f, properties: { ...f.properties, _visited: isVisited ? 1 : 0, _key: name } };
      });
      const fc = { type: "FeatureCollection", features };
      map.addSource("countries", { type: "geojson", data: fc as any });

      // Dim overlay for unvisited
      map.addLayer({
        id: "countries-dim",
        type: "fill",
        source: "countries",
        paint: {
          "fill-color": isDark ? "#0D0D0D" : "#3a3a3a",
          "fill-opacity": ["case", ["==", ["get", "_visited"], 1], 0, 0.55],
        },
      });
      // Gold highlight for visited
      map.addLayer({
        id: "countries-visited",
        type: "fill",
        source: "countries",
        paint: {
          "fill-color": "#F4C77B",
          "fill-opacity": ["case", ["==", ["get", "_visited"], 1], 0.35, 0],
        },
      });
      map.addLayer({
        id: "countries-visited-outline",
        type: "line",
        source: "countries",
        paint: {
          "line-color": "#F4C77B",
          "line-width": ["case", ["==", ["get", "_visited"], 1], 1.2, 0],
          "line-opacity": 0.9,
        },
      });
      setReady(true);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update visited set on data change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("countries") as maplibregl.GeoJSONSource | undefined;
    if (!src || !cachedGeoJson?.features) return;
    const updated = {
      type: "FeatureCollection" as const,
      features: cachedGeoJson.features.map((f: any) => {
        const name = normalize(f.properties?.ADMIN || f.properties?.NAME || f.properties?.NAME_LONG);
        return {
          ...f,
          properties: { ...f.properties, _visited: visitedSet.has(name) ? 1 : 0, _key: name },
        };
      }),
    };
    src.setData(updated as any);
  }, [visitedSet, ready]);

  // Render pins
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    pins.forEach((p, idx) => {
      const el = document.createElement("div");
      el.style.width = "12px";
      el.style.height = "12px";
      el.style.borderRadius = "9999px";
      el.style.background = "#FFB800";
      el.style.boxShadow = "0 0 0 3px rgba(255,184,0,0.25), 0 0 12px rgba(255,184,0,0.7)";
      el.style.border = "2px solid #0D0D0D";
      el.style.transformOrigin = "50% 100%";
      el.style.animation = `pin-drop 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) both`;
      el.style.animationDelay = `${Math.min(idx * 0.06, 1.2)}s`;
      const marker = new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);
      markersRef.current.push(marker);
    });
  }, [pins, ready]);

  // Focus / drop animation
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !focusPin) return;
    map.flyTo({ center: [focusPin.lng, focusPin.lat], zoom: 5, duration: 1800, essential: true });
    setDrop(focusPin);
    const t = setTimeout(() => setDrop(null), 1500);
    return () => clearTimeout(t);
  }, [focusPin, ready]);

  const unlockedCount = visitedSet.size;
  const pct = Math.min(100, (unlockedCount / TOTAL_COUNTRIES) * 100);

  return (
    <div className={`relative ${className ?? ""}`}>
      {/* Stat bar */}
      <div className="absolute top-3 left-3 right-3 z-10 glass rounded-xl px-4 py-2.5 flex items-center gap-3 border border-border/60">
        <Globe className="w-4 h-4 text-amber shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Countries unlocked
            </span>
            <span className="font-mono text-xs text-foreground">
              <span className="text-amber font-semibold">{unlockedCount}</span> / {TOTAL_COUNTRIES}
            </span>
          </div>
          <div className="mt-1 h-1 rounded-full bg-border/60 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber to-[#D3771F]"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden" />

      {/* Bouncing drop pin overlay */}
      <AnimatePresence>
        {drop && mapRef.current && (
          <motion.div
            key={`${drop.lat}-${drop.lng}`}
            initial={{ y: -80, opacity: 0, scale: 0.5 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 12 }}
            className="pointer-events-none absolute z-20"
            style={{
              left: mapRef.current.project([drop.lng, drop.lat]).x,
              top: mapRef.current.project([drop.lng, drop.lat]).y,
              transform: "translate(-50%, -100%)",
            }}
          >
            <MapPin className="w-8 h-8 text-amber drop-shadow-[0_0_12px_rgba(244,199,123,0.8)]" fill="#F4C77B" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
