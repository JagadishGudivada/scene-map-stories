import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Share2, Sparkles, Lock, Globe, ArrowRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { usePassportBadges, type PassportBadge } from "@/hooks/usePassportBadges";
import PassportStampBadge from "@/components/PassportStampBadge";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import type { VisitedSpotRow } from "@/hooks/useSaved";
import TierBadge from "@/components/profile/TierBadge";

type PublicProfile = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  location: string | null;
  is_public_passport: boolean;
};

export default function PublicPassport() {
  const { username } = useParams<{ username: string }>();
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [visited, setVisited] = useState<VisitedSpotRow[]>([]);
  const [showCta, setShowCta] = useState(false);
  const [ctaDismissed, setCtaDismissed] = useState(false);

  // Soft signup CTA for anonymous viewers — fires after 7s on the page.
  useEffect(() => {
    if (authUser) return;
    if (ctaDismissed) return;
    const t = setTimeout(() => setShowCta(true), 7000);
    return () => clearTimeout(t);
  }, [authUser, ctaDismissed]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!username) return;
      setLoading(true);
      setNotFound(false);
      const { data: prof } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, bio, avatar_url, cover_url, location, is_public_passport")
        .eq("username", username.toLowerCase())
        .maybeSingle();

      if (cancelled) return;
      if (!prof) {
        setProfile(null);
        setNotFound(true);
        setLoading(false);
        return;
      }
      setProfile(prof as PublicProfile);

      if (prof.is_public_passport || authUser?.id === prof.user_id) {
        const { data: spots } = await supabase
          .from("visited_spots")
          .select("spot_slug, spot_name, lat, lng, city, country, type, created_at")
          .eq("user_id", prof.user_id)
          .order("created_at", { ascending: false });
        if (!cancelled) setVisited((spots ?? []) as VisitedSpotRow[]);
      } else {
        setVisited([]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [username, authUser?.id]);

  const isOwner = !!authUser && profile?.user_id === authUser.id;
  const { badges } = usePassportBadges(visited, profile?.user_id);

  const countriesCount = useMemo(() => new Set(visited.map((s) => s.country).filter(Boolean)).size, [visited]);
  const citiesCount = useMemo(() => new Set(visited.map((s) => `${s.city}|${s.country}`).filter((k) => k !== "|")).size, [visited]);
  const recent = visited.slice(0, 9);

  const displayName = profile?.display_name || profile?.username || "Traveler";
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${displayName}'s Cinematic Passport`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied", description: "Passport URL copied to clipboard." });
      }
    } catch {
      /* cancelled */
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="font-mono text-xs text-muted-foreground tracking-widest">LOADING PASSPORT…</div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <Lock className="w-10 h-10 text-muted-foreground mb-4" />
        <h1 className="font-serif text-3xl text-foreground mb-2">Passport not found</h1>
        <p className="text-muted-foreground text-sm mb-6">No traveler with this handle yet.</p>
        <Link to="/auth" className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-gradient-amber text-amber font-semibold shadow-amber">
          Claim your handle <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const isPrivate = !profile.is_public_passport && !isOwner;

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-16">
      <Seo
        title={`${displayName}'s Cinematic Passport — Sarevista`}
        description={`${displayName} has visited ${visited.length} filming spots across ${countriesCount} ${countriesCount === 1 ? "country" : "countries"}. View their cinematic memory map.`}
      />

      {/* Cover */}
      <div className="relative h-44 sm:h-64 overflow-hidden">
        {profile.cover_url ? (
          <img src={profile.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber/20 via-background to-teal/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/40 to-background" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-20 sm:-mt-24 relative">
        {/* Header */}
        <header className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-amber/25 rounded-full blur-2xl" aria-hidden />
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-amber/40 p-1 bg-background shadow-float">
              <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-muted to-card flex items-center justify-center">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-serif italic text-4xl text-amber">{initials || "?"}</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-1.5">
            <h1 className="font-serif text-4xl sm:text-5xl text-foreground tracking-tight leading-none">{displayName}</h1>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <p className="font-mono text-xs text-muted-foreground tracking-wider">@{profile.username}</p>
              <TierBadge count={visited.length} />
            </div>
          </div>

          {profile.bio && (
            <p className="mt-5 max-w-xl text-sm sm:text-[15px] text-foreground/85 leading-relaxed">{profile.bio}</p>
          )}

          {profile.location && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-amber" />
              {profile.location}
            </p>
          )}

          <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={handleShare}
              className="h-10 px-5 rounded-full bg-card border border-border text-sm font-medium text-foreground hover:border-amber/40 transition-colors flex items-center gap-2"
            >
              <Share2 className="w-4 h-4 text-amber" /> Share passport
            </button>
            {isOwner ? (
              <Link
                to={`/u/${profile.username}`}
                className="h-10 px-5 rounded-full bg-gradient-amber text-amber font-semibold flex items-center gap-2 shadow-amber"
              >
                Open dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : !authUser ? (
              <Link
                to="/auth"
                className="h-10 px-5 rounded-full bg-gradient-amber text-amber font-semibold flex items-center gap-2 shadow-amber shimmer-sweep"
              >
                <Sparkles className="w-4 h-4" /> Start your passport
              </Link>
            ) : null}
          </div>
        </header>

        {isPrivate ? (
          <section className="mt-16 flex flex-col items-center text-center">
            <Lock className="w-8 h-8 text-muted-foreground mb-3" />
            <h2 className="font-serif text-2xl text-foreground mb-1">This passport is private</h2>
            <p className="text-sm text-muted-foreground">{displayName} hasn't made their journeys public.</p>
          </section>
        ) : (
          <>
            {/* Stats */}
            <div className="mt-10 grid grid-cols-3 gap-3 sm:gap-4">
              <Stat label="Spots" value={visited.length} accent="text-amber" />
              <Stat label="Countries" value={countriesCount} accent="text-teal" />
              <Stat label="Stamps" value={badges.length} accent="text-foreground" />
            </div>

            {/* Passport stamps */}
            <section className="mt-12">
              <div className="flex items-end justify-between mb-5">
                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl text-foreground leading-tight">Passport Stamps</h2>
                  <p className="text-xs text-muted-foreground mt-1">Earned by visiting filming spots around the world</p>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {badges.length} earned
                </span>
              </div>

              {badges.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 px-6 py-10 text-center">
                  <Globe className="w-7 h-7 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No stamps yet — the journey is just beginning.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-5">
                  {badges.map((badge: PassportBadge) => (
                    <div key={badge.id} className="flex flex-col items-center text-center gap-1.5">
                      <PassportStampBadge badge={badge} country={badge.country} size="sm" generateOnMiss={isOwner} />
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground truncate w-full">
                        {badge.country}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Recent visits */}
            {recent.length > 0 && (
              <section className="mt-14">
                <h2 className="font-serif text-2xl sm:text-3xl text-foreground leading-tight mb-5">Recently visited</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {recent.map((spot) => (
                    <Link
                      key={spot.spot_slug}
                      to={`/spot/${spot.spot_slug}`}
                      className="group rounded-2xl border border-border/60 bg-card/40 p-4 hover:border-amber/40 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber/10 text-amber flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate group-hover:text-amber transition-colors">
                            {spot.spot_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[spot.city, spot.country].filter(Boolean).join(", ")}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Closing nudge */}
            {!authUser && (
              <section className="mt-16 rounded-3xl border border-border/60 bg-card/40 p-8 sm:p-10 text-center overflow-hidden relative">
                <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber/15 blur-3xl rounded-full" aria-hidden />
                <h3 className="font-serif text-2xl sm:text-3xl text-foreground mb-2">Start your own cinematic passport</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
                  Track every filming spot you've stood at. Earn country stamps. Share a passport like {displayName}'s.
                </p>
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-gradient-amber text-amber font-semibold shadow-amber shimmer-sweep"
                >
                  <Sparkles className="w-4 h-4" /> Claim your handle
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </section>
            )}
          </>
        )}
      </div>

      {/* Soft signup CTA — floating */}
      <AnimatePresence>
        {showCta && !authUser && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-50"
          >
            <div className="rounded-2xl glass border border-amber/30 shadow-float p-4 flex items-start gap-3 backdrop-blur-xl bg-background/85">
              <div className="w-9 h-9 rounded-xl bg-amber/15 text-amber flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground leading-snug">Start your own passport</p>
                <p className="text-xs text-muted-foreground mt-0.5">Stamp every film spot you've stood at — free.</p>
                <Link
                  to="/auth"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber hover:underline"
                >
                  Sign up free <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <button
                onClick={() => {
                  setShowCta(false);
                  setCtaDismissed(true);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-card/40 border border-border/60 px-4 py-5 rounded-2xl flex flex-col items-center justify-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <span className={`font-serif text-3xl sm:text-4xl leading-none ${accent}`}>{value}</span>
    </div>
  );
}
