import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type EntityType = "title" | "location" | "spot";

interface ReportInfoDialogProps {
  entityType: EntityType;
  slug: string;
  defaultField?: string;
  fields?: string[];
}

const DEFAULT_FIELDS: Record<EntityType, string[]> = {
  title: ["coverImage", "backdropImage", "synopsis", "year", "genres", "rating"],
  location: ["coverImage", "country", "lat", "lng", "tagline", "spots"],
  spot: ["image", "name", "address", "lat", "lng", "description", "funFacts", "visitTips"],
};

const TABLE: Record<EntityType, "titles" | "locations" | "spots"> = {
  title: "titles",
  location: "locations",
  spot: "spots",
};

export default function ReportInfoDialog({ entityType, slug, defaultField, fields }: ReportInfoDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [field, setField] = useState(defaultField || (fields || DEFAULT_FIELDS[entityType])[0]);
  const [suggested, setSuggested] = useState("");
  const [reason, setReason] = useState("");

  const options = fields || DEFAULT_FIELDS[entityType];

  const submit = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to report incorrect info.", variant: "destructive" });
      return;
    }
    if (!suggested.trim() && !reason.trim()) {
      toast({ title: "Add details", description: "Suggest a value or explain the issue.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: entity, error: lookupErr } = await supabase
        .from(TABLE[entityType])
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (lookupErr || !entity) throw new Error("Could not locate this record yet — try again in a moment.");

      const { error } = await supabase.from("data_reports").insert({
        user_id: user.id,
        entity_type: entityType,
        entity_id: entity.id,
        field,
        suggested_value: suggested.trim() || null,
        reason: reason.trim() || null,
      });
      if (error) throw error;
      toast({ title: "Report submitted", description: "Thanks — our team will review it." });
      setOpen(false);
      setSuggested("");
      setReason("");
    } catch (e) {
      toast({ title: "Could not submit", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Flag className="h-3.5 w-3.5" />
          Report incorrect info
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report incorrect info</DialogTitle>
          <DialogDescription>Help us keep this {entityType} accurate.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Field</Label>
            <Select value={field} onValueChange={setField}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {options.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Suggested value (optional)</Label>
            <Input value={suggested} onChange={(e) => setSuggested(e.target.value)} placeholder="What should it be?" />
          </div>
          <div className="space-y-1.5">
            <Label>Reason / source</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is the current value wrong? Link a source if possible." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
