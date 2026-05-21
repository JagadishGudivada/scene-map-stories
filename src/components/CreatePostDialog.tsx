import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, MapPin, X, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { invokeCached } from "@/lib/aiClientCache";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPosted: () => void;
}

type LocationHit = {
  lat: number;
  lng: number;
  label: string;
  title: string;
  type?: string;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export default function CreatePostDialog({ open, onOpenChange, onPosted }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Location search state
  const [locQuery, setLocQuery] = useState("");
  const [locResults, setLocResults] = useState<LocationHit[]>([]);
  const [locSearching, setLocSearching] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState<LocationHit | null>(null);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selectedLoc) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = locQuery.trim();
    if (q.length < 3) {
      setLocResults([]);
      setLocSearching(false);
      return;
    }
    setLocSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await invokeCached<any>(
          "search-locations",
          { query: q },
          q.toLowerCase(),
          { ttlSeconds: 60 * 60 * 24, persist: "session" }
        );
        setLocResults((data?.locations || []).slice(0, 6));
        setShowResults(true);
      } catch (e) {
        setLocResults([]);
      } finally {
        setLocSearching(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [locQuery, selectedLoc]);

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("post-images").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data } = supabase.storage.from("post-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
    }
    setUploading(false);
  };

  const reset = () => {
    setContent("");
    setImageUrl(null);
    setLocQuery("");
    setLocResults([]);
    setSelectedLoc(null);
    setShowResults(false);
  };

  const handlePost = async () => {
    if (!user || !content.trim()) return;
    setSaving(true);
    const locationSlug = selectedLoc ? slugify(selectedLoc.label) : null;
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: content.trim(),
      image_url: imageUrl,
      location_slug: locationSlug,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Post failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Posted" });
    reset();
    onPosted();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Create post</DialogTitle>
        </DialogHeader>

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share a scene, location memory, or a recommendation…"
          rows={4}
        />

        {imageUrl && (
          <div className="relative rounded-xl overflow-hidden border border-border">
            <img src={imageUrl} alt="" className="w-full max-h-64 object-cover" />
            <button
              onClick={() => setImageUrl(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {imageUrl ? "Replace photo" : "Add photo"}
          </Button>
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handlePick} />
        </div>

        <div className="relative">
          <Label htmlFor="loc" className="text-xs">Location</Label>
          {selectedLoc ? (
            <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{selectedLoc.label}</div>
                {selectedLoc.title && (
                  <div className="text-xs text-muted-foreground truncate">{selectedLoc.title}</div>
                )}
              </div>
              <button
                onClick={() => { setSelectedLoc(null); setLocQuery(""); }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Clear location"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="loc"
                value={locQuery}
                onChange={(e) => setLocQuery(e.target.value)}
                onFocus={() => locResults.length > 0 && setShowResults(true)}
                placeholder="Search a place, film location…"
                className="pl-9"
              />
              {locSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
              {showResults && locResults.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-auto rounded-md border border-border bg-popover shadow-lg">
                  {locResults.map((r, i) => (
                    <button
                      key={`${r.label}-${i}`}
                      type="button"
                      onClick={() => { setSelectedLoc(r); setShowResults(false); }}
                      className="w-full text-left px-3 py-2 hover:bg-accent flex items-start gap-2"
                    >
                      <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm truncate">{r.label}</div>
                        {r.title && (
                          <div className="text-xs text-muted-foreground truncate">{r.title}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {showResults && !locSearching && locQuery.trim().length >= 3 && locResults.length === 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 rounded-md border border-border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-lg">
                  No matches
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handlePost} disabled={saving || !content.trim()}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
