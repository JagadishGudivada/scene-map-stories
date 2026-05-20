import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export type ProfileRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  location: string | null;
  website: string | null;
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  profile: ProfileRow | null;
  onSaved: (p: ProfileRow) => void;
}

export default function EditProfileDialog({ open, onOpenChange, profile, onSaved }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && profile) {
      setDisplayName(profile.display_name ?? "");
      setUsername(profile.username ?? "");
      setBio(profile.bio ?? "");
      setLocation(profile.location ?? "");
      setWebsite(profile.website ?? "");
      setAvatarUrl(profile.avatar_url);
      setCoverUrl(profile.cover_url);
    }
  }, [open, profile]);

  const upload = async (bucket: "avatars" | "covers", file: File) => {
    if (!user) return null;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return null;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const url = await upload("avatars", file);
    if (url) setAvatarUrl(url);
    setUploadingAvatar(false);
  };

  const handleCoverPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    const url = await upload("covers", file);
    if (url) setCoverUrl(url);
    setUploadingCover(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      display_name: displayName.trim() || null,
      username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "") || null,
      bio: bio.trim() || null,
      location: location.trim() || null,
      website: website.trim() || null,
      avatar_url: avatarUrl,
      cover_url: coverUrl,
    };
    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Profile updated" });
    onSaved(data as ProfileRow);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Edit profile</DialogTitle>
        </DialogHeader>

        {/* Cover */}
        <div className="relative h-32 rounded-xl overflow-hidden bg-gradient-to-br from-amber/20 to-teal/20 border border-border">
          {coverUrl && <img src={coverUrl} alt="" className="w-full h-full object-cover" />}
          <button
            type="button"
            onClick={() => coverInput.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity text-white text-sm"
          >
            {uploadingCover ? <Loader2 className="w-5 h-5 animate-spin" /> : (<><Camera className="w-4 h-4 mr-2" /> Change cover</>)}
          </button>
          <input ref={coverInput} type="file" accept="image/*" className="hidden" onChange={handleCoverPick} />
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-4 -mt-2">
          <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-background bg-muted flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Upload className="w-5 h-5 text-muted-foreground" />
            )}
            <button
              type="button"
              onClick={() => avatarInput.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity text-white"
            >
              {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
          </div>
          <p className="text-xs text-muted-foreground">Click avatar or cover to upload a new image (JPG/PNG).</p>
        </div>

        <div className="grid gap-3">
          <div>
            <Label htmlFor="dn">Display name</Label>
            <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <Label htmlFor="un">Username</Label>
            <Input id="un" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell people about your taste in scenes…" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="loc">Location</Label>
              <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" />
            </div>
            <div>
              <Label htmlFor="web">Website</Label>
              <Input id="web" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
