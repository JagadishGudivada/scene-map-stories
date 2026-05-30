import { useState } from "react";
import { Plus, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  location_name: z.string().trim().min(2, "Add a place name").max(120),
  description: z.string().trim().max(500).optional(),
});

interface Props {
  titleSlug: string;
  titleName: string;
  iconOnly?: boolean;
}

export default function AddLocationDialog({ titleSlug, titleName, iconOnly }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [errors, setErrors] = useState<{ name?: string; desc?: string }>({});

  const handleClick = () => {
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setOpen(true);
  };

  const reset = () => {
    setName(""); setDesc(""); setErrors({}); setSubmitted(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ location_name: name, description: desc });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ name: f.location_name?.[0], desc: f.description?.[0] });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("location_suggestions")
        .insert({
          user_id: user!.id,
          title_slug: titleSlug,
          title_name: titleName,
          location_name: parsed.data.location_name,
          description: parsed.data.description || null,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Fire-and-forget AI verification
      supabase.functions.invoke("verify-location-suggestion", {
        body: { suggestionId: data.id },
      }).catch((err) => console.warn("Verification kicked off failed:", err));

      setSubmitted(true);
      toast({ title: "Thanks for the tip!", description: "We'll verify and add it shortly." });
    } catch (err: any) {
      toast({ title: "Couldn't submit", description: err?.message || "Try again", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        aria-label="Add location"
        className={
          iconOnly
            ? "h-11 w-11 rounded-full glass border border-border text-foreground hover:bg-muted/50 hover:text-amber transition-all flex items-center justify-center"
            : "h-10 sm:h-11 px-4 sm:px-6 rounded-xl glass border border-border text-foreground font-medium text-xs sm:text-sm hover:bg-muted/50 transition-all flex items-center gap-1.5 sm:gap-2"
        }
      >
        <Plus className="w-4 h-4" />
        {!iconOnly && <span>Add Location</span>}
      </button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="sm:max-w-md">
          {submitted ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber/10 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-amber" />
              </div>
              <h3 className="font-serif text-xl text-foreground mb-2">Got it — thanks!</h3>
              <p className="text-sm text-muted-foreground mb-5">
                We'll verify the details and add it to the locations page shortly.
              </p>
              <Button onClick={() => setOpen(false)} className="w-full">Close</Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber" /> Add a missing location
                </DialogTitle>
                <DialogDescription>
                  Help others by suggesting a real-world spot from <span className="text-foreground">{titleName}</span>. Our AI will verify it before publishing.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Location name *</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Durdle Door, Dorset, UK"
                    maxLength={120}
                  />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Notes (optional)</label>
                  <Textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Which scene? Any details that help us verify…"
                    rows={3}
                    maxLength={500}
                  />
                  {errors.desc && <p className="text-xs text-destructive mt-1">{errors.desc}</p>}
                </div>
                <Button type="submit" disabled={submitting} className="w-full bg-gradient-amber text-charcoal hover:opacity-90">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Submit for verification"}
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
