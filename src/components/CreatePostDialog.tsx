import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPosted: () => void;
}

export default function CreatePostDialog({ open, onOpenChange, onPosted }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [titleSlug, setTitleSlug] = useState("");
  const [spotSlug, setSpotSlug] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

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

  const handlePost = async () => {
    if (!user || !content.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: content.trim(),
      image_url: imageUrl,
      title_slug: titleSlug.trim() || null,
      spot_slug: spotSlug.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Post failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Posted" });
    setContent(""); setTitleSlug(""); setSpotSlug(""); setImageUrl(null);
    onPosted();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="ts" className="text-xs">Tag title (slug)</Label>
            <Input id="ts" value={titleSlug} onChange={(e) => setTitleSlug(e.target.value)} placeholder="dune-2021" />
          </div>
          <div>
            <Label htmlFor="ss" className="text-xs">Tag spot (slug)</Label>
            <Input id="ss" value={spotSlug} onChange={(e) => setSpotSlug(e.target.value)} placeholder="durdle-door" />
          </div>
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
