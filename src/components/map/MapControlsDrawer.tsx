import { LocateFixed, MapPin, Navigation, Route } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

interface MapControlsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathMode: boolean;
  onPathModeChange: (on: boolean) => void;
  nearMeMode: boolean;
  onNearMeChange: (on: boolean) => void;
  nearMeRadius: number;
  onNearMeRadiusChange: (km: number) => void;
  onUseMyLocation: () => void;
  nearMeCenter: { lat: number; lng: number } | null;
  nearbyLoading: boolean;
  nearbyCount: number;
  pinCount: number;
}

export default function MapControlsDrawer({
  open,
  onOpenChange,
  pathMode,
  onPathModeChange,
  nearMeMode,
  onNearMeChange,
  nearMeRadius,
  onNearMeRadiusChange,
  onUseMyLocation,
  nearMeCenter,
  nearbyLoading,
  nearbyCount,
  pinCount,
}: MapControlsDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="md:hidden">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="font-serif text-lg">Map controls</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 flex flex-col gap-3">
          <div className="rounded-xl px-4 py-3 border border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <Route className="w-4 h-4 text-amber shrink-0" />
              <span className="text-sm font-medium text-foreground flex-1">Path Mode</span>
              <Switch checked={pathMode} onCheckedChange={onPathModeChange} />
            </div>
          </div>

          <div className="rounded-xl px-4 py-3 border border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <Navigation className="w-4 h-4 text-amber shrink-0" />
              <span className="text-sm font-medium text-foreground flex-1">Near Me</span>
              <Switch checked={nearMeMode} onCheckedChange={onNearMeChange} />
            </div>
            {nearMeMode && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Radius</span>
                  <span className="text-xs font-semibold text-amber">{nearMeRadius} km</span>
                </div>
                <Slider
                  value={[nearMeRadius]}
                  onValueChange={(v) => onNearMeRadiusChange(v[0])}
                  min={5}
                  max={200}
                  step={5}
                />
                <button
                  onClick={onUseMyLocation}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-amber/10 hover:bg-amber/20 border border-amber/30 text-amber text-sm font-medium transition-colors"
                >
                  <LocateFixed className="w-4 h-4" />
                  Use my location
                </button>
                {!nearMeCenter && (
                  <p className="mt-2 text-xs text-muted-foreground leading-snug">
                    Click anywhere on the map to find filming spots nearby.
                  </p>
                )}
                {nearMeCenter && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {nearbyLoading
                      ? "Searching…"
                      : `${nearbyCount} spot${nearbyCount === 1 ? "" : "s"} within ${nearMeRadius} km`}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl px-4 py-3 border border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber shrink-0" />
              <span className="text-sm font-medium text-foreground">{pinCount}</span>
              <span className="text-xs text-muted-foreground">locations</span>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
