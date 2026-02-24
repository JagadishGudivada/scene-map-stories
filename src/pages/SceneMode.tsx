import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Camera, Compass, Heart, MapPin,
  Clock, Eye, Upload, ExternalLink, Train, Car, Navigation2,
  Star, Bookmark, CheckCircle, Lock, Film, Clapperboard
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import LeafletMap from "@/components/LeafletMap";
import CinemaCard from "@/components/CinemaCard";
import { mockTitles } from "@/lib/mockData";
import type { MapPin as MapPinType } from "@/components/LeafletMap";
import cinematicImg from "@/assets/scene-colosseum-cinematic.jpg";
import realImg from "@/assets/scene-colosseum-real.jpg";

/* ─── Scene Data ─── */
const sceneData = {
  movie: { title: "Gladiator", year: 2000, type: "Movie" as const, totalScenes: 19 },
  currentScene: {
    number: 1,
    name: "The Colosseum Battle — Arena Entrance",
    timestamp: "00:14:32 → 00:17:08",
    location: {
      name: "The Colosseum",
      address: "Piazza del Colosseo, Rome, Italy",
      coords: { lat: 41.8902, lng: 12.4922 },
      status: "OPEN",
      hours: "09:00 – 19:00 · Last entry 18:00",
      fee: "€16 / £14 / $17",
      warning: "Restoration scaffolding on north face until May 2026",
      communityPhotos: 847,
      direction: "047° NE",
    },
  },
};

const scenes = [
  { num: 1, name: "Arena Entrance", location: "Colosseum, Rome", status: "visited" },
  { num: 2, name: "Maximus's Farm", location: "Bourne Woods, UK", status: "saved" },
  { num: 3, name: "Slave Market", location: "Ouarzazate, Morocco", status: "locked" },
  { num: 4, name: "Gladiator School", location: "Valletta, Malta", status: "locked" },
  { num: 5, name: "Roman Arena Fight", location: "Fort Ricasoli, Malta", status: "locked" },
];

const communityPhotos = [
  { id: 1, user: "marco_travels", match: 94, likes: 234, img: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=500&fit=crop" },
  { id: 2, user: "sarahwanders", match: 87, likes: 189, img: "https://images.unsplash.com/photo-1555992828-ca4dbe41d294?w=400&h=600&fit=crop" },
  { id: 3, user: "filmfanatic", match: 91, likes: 312, img: "https://images.unsplash.com/photo-1529154036614-a60975f5c7f6?w=400&h=450&fit=crop" },
  { id: 4, user: "upload", match: 0, likes: 0, img: "" },
  { id: 5, user: "romelover", match: 82, likes: 156, img: "https://images.unsplash.com/photo-1548585744-e3db5209f3ea?w=400&h=500&fit=crop" },
  { id: 6, user: "cinephile_uk", match: 79, likes: 98, img: "https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=400&h=550&fit=crop" },
];

const crowdData = [
  { day: "Mon", level: 2 }, { day: "Tue", level: 2 }, { day: "Wed", level: 3 },
  { day: "Thu", level: 3 }, { day: "Fri", level: 4 }, { day: "Sat", level: 5 }, { day: "Sun", level: 4 },
];

const moreLocations = [
  { title: "Maximus's Spanish Farm", location: "Bourne Woods, Surrey", scene: "Scene 02" },
  { title: "Zucchabar Slave Market", location: "Ouarzazate, Morocco", scene: "Scene 03" },
  { title: "Proximo's Gladiator School", location: "Valletta, Malta", scene: "Scene 04" },
  { title: "Roman Arena Fight", location: "Fort Ricasoli, Malta", scene: "Scene 05" },
  { title: "Senate Chamber", location: "Royal Palace, Caserta", scene: "Scene 06" },
];

const mapPins: MapPinType[] = [
  { lat: 41.8902, lng: 12.4922, label: "The Colosseum", title: "Gladiator Scene 01", type: "Movie" },
];

/* ─── Component ─── */
export default function SceneMode() {
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [progressValue, setProgressValue] = useState(0);
  const communityRef = useRef<HTMLDivElement>(null);
  const communityInView = useInView(communityRef, { once: true, margin: "-100px" });

  useEffect(() => {
    const t = setTimeout(() => setProgressValue(5.3), 500);
    return () => clearTimeout(t);
  }, []);

  const { movie, currentScene } = sceneData;
  const loc = currentScene.location;

  return (
    <div className="min-h-screen bg-background">
      {/* ═══ SECTION 1: HERO SPLIT SCREEN ═══ */}
      <section className="relative h-screen flex flex-col md:flex-row pt-16">
        {/* Left — Scene Reference */}
        <motion.div
          initial={{ x: -60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative w-full md:w-1/2 h-[50vh] md:h-full overflow-hidden"
        >
          <img src={cinematicImg} alt="Gladiator Colosseum scene" className="absolute inset-0 w-full h-full object-cover" />
          {/* Film grain */}
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E")` }} />
          {/* Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          {/* Amber vignette */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber/10 to-transparent" />

          {/* Badge */}
          <div className="absolute top-4 left-4 z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber text-charcoal text-xs font-semibold">
              <Clapperboard className="w-3 h-3" /> SCENE REFERENCE
            </span>
          </div>

          {/* Bottom metadata */}
          <div className="absolute bottom-6 left-6 right-6 z-10">
            <span className="inline-block px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium mb-3">
              Movie · {movie.year}
            </span>
            <h1 className="font-serif italic text-foreground text-4xl md:text-5xl leading-tight mb-2">
              {movie.title}
            </h1>
            <p className="text-secondary text-sm md:text-base font-medium mb-3">
              {currentScene.name}
            </p>
            <span className="font-mono text-amber text-xs tracking-wider">
              {currentScene.timestamp}
            </span>
          </div>
        </motion.div>

        {/* Center Divider */}
        <motion.div
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6, ease: "easeOut" }}
          className="hidden md:flex absolute left-1/2 top-16 bottom-0 z-20 flex-col items-center justify-center origin-top"
        >
          <div className="w-px flex-1 bg-amber/40" />
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-12 h-12 rounded-full bg-amber flex items-center justify-center shadow-amber my-2"
          >
            <span className="text-charcoal text-lg font-bold">⧉</span>
          </motion.div>
          <span className="text-[10px] font-semibold tracking-[0.2em] text-amber uppercase mb-2">Match</span>
          <div className="w-px flex-1 bg-amber/40" />
        </motion.div>

        {/* Mobile horizontal divider */}
        <div className="md:hidden relative flex items-center justify-center h-10 bg-background z-20">
          <div className="absolute inset-x-0 top-1/2 h-px bg-amber/40" />
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-10 h-10 rounded-full bg-amber flex items-center justify-center shadow-amber z-10"
          >
            <span className="text-charcoal text-base font-bold">⧉</span>
          </motion.div>
        </div>

        {/* Right — Real Location */}
        <motion.div
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative w-full md:w-1/2 h-[50vh] md:h-full overflow-hidden"
        >
          <img src={realImg} alt="Colosseum real location" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E")` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

          <div className="absolute top-4 right-4 z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
              <MapPin className="w-3 h-3" /> REAL LOCATION
            </span>
          </div>

          <div className="absolute bottom-6 left-6 right-6 z-10">
            <h2 className="font-serif italic text-foreground text-2xl md:text-4xl leading-tight mb-2">
              {loc.name}
            </h2>
            <p className="text-muted-foreground text-sm mb-2">{loc.address}</p>
            <span className="font-mono text-amber text-xs tracking-wider">
              {loc.coords.lat}°N · {loc.coords.lng}°E
            </span>
            <div className="mt-3 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-amber" />
              <span className="text-xs text-muted-foreground">{loc.communityPhotos} explorer photos</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══ SECTION 2: SCENE MATCH BAR ═══ */}
      <section className="sticky top-16 z-40 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 h-[72px] flex items-center justify-between gap-4">
          {/* Left */}
          <div className="hidden sm:flex items-center gap-3 min-w-0">
            <div className="w-10 h-[60px] rounded bg-muted overflow-hidden shrink-0 flex items-center justify-center">
              <Film className="w-5 h-5 text-amber" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{movie.title} · Scene 1 of {movie.totalScenes}</p>
              <div className="mt-1 w-32">
                <Progress value={progressValue} className="h-1.5 bg-muted" />
              </div>
            </div>
          </div>

          {/* Center – scene selector */}
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-amber hover:border-amber transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-amber font-medium text-sm whitespace-nowrap">{currentScene.name.split("—")[0].trim()}</span>
            <button className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-amber hover:border-amber transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <button className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-foreground text-xs font-medium hover:border-amber hover:text-amber transition-colors">
              <Camera className="w-3.5 h-3.5" /> My Photo
            </button>
            <button className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-foreground text-xs font-medium hover:border-amber hover:text-amber transition-colors">
              <Compass className="w-3.5 h-3.5" /> Directions
            </button>
            <button className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-foreground text-xs font-medium hover:border-amber hover:text-amber transition-colors">
              <Heart className="w-3.5 h-3.5" /> Save
            </button>
            <motion.button
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-amber text-charcoal text-xs font-bold hover:brightness-110 transition-all relative overflow-hidden"
            >
              <div className="absolute inset-0 shimmer-sweep" />
              <Eye className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10 hidden sm:inline">AR Scene Mode</span>
            </motion.button>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 3: SCENE INTEL GRID ═══ */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <h2 className="font-serif italic text-foreground text-3xl mb-1">Scene Intel</h2>
          <p className="text-muted-foreground text-sm mb-8">Everything you need to stand in the exact frame.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Camera Angle Guide (2 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="md:col-span-2 glass rounded-2xl p-6 border-t-2 border-t-amber"
          >
            <h3 className="text-foreground font-semibold text-lg mb-4">Camera Angle Guide</h3>
            {/* Direction visualization */}
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="relative w-40 h-40 shrink-0 mx-auto sm:mx-0">
                {/* Compass rose */}
                <div className="absolute inset-0 rounded-full border border-border flex items-center justify-center">
                  <div className="absolute top-2 text-[10px] text-muted-foreground font-mono">N</div>
                  <div className="absolute bottom-2 text-[10px] text-muted-foreground font-mono">S</div>
                  <div className="absolute left-2 text-[10px] text-muted-foreground font-mono">W</div>
                  <div className="absolute right-2 text-[10px] text-muted-foreground font-mono">E</div>
                  {/* Needle */}
                  <motion.div
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 47 }}
                    transition={{ duration: 1.2, type: "spring", stiffness: 60, damping: 12 }}
                    className="absolute w-1 h-16 origin-bottom"
                    style={{ bottom: "50%" }}
                  >
                    <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[16px] border-l-transparent border-r-transparent border-b-amber mx-auto" />
                  </motion.div>
                  {/* Center dot */}
                  <div className="w-3 h-3 rounded-full bg-amber z-10" />
                  {/* FOV cone */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.15 }}
                    transition={{ delay: 1 }}
                    className="absolute w-24 h-24"
                    style={{ transform: "rotate(47deg)", transformOrigin: "center center" }}
                  >
                    <div className="w-0 h-0 border-l-[30px] border-r-[30px] border-b-[48px] border-l-transparent border-r-transparent border-b-amber mx-auto opacity-40" />
                  </motion.div>
                </div>
              </div>
              <div className="flex-1">
                <p className="font-mono text-amber text-sm font-medium mb-3">Face North-East ({loc.direction})</p>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  Stand at the south-west entrance archway, face toward the arena floor. The original crane shot was taken from approximately 8 metres above ground level.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["#WideShot", "#MagicHour", "#GoldenHour"].map(tag => (
                    <span key={tag} className="glass rounded-full px-3 py-1 text-xs text-amber font-medium">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Best Time to Visit */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-6 border-t-2 border-t-secondary"
          >
            <h3 className="text-foreground font-semibold text-lg mb-4">Best Time to Visit</h3>
            <p className="font-mono text-2xl text-foreground mb-1">06:30 — 08:00</p>
            <p className="text-secondary text-xs font-medium mb-4">Golden Hour Window</p>
            <div className="flex items-end gap-1.5 mb-3 h-12">
              {crowdData.map(d => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-sm transition-all ${d.level >= 5 ? "bg-destructive" : d.level >= 4 ? "bg-amber" : "bg-secondary"}`}
                    style={{ height: `${d.level * 8}px` }}
                    title={d.level >= 5 ? "Very Busy — avoid" : ""}
                  />
                  <span className="text-[9px] text-muted-foreground">{d.day}</span>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground text-xs italic">Arrive at opening. Midweek mornings mirror the film's lighting.</p>
          </motion.div>

          {/* Card 3: Location Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-6"
          >
            <h3 className="text-foreground font-semibold text-lg mb-4">Location Status</h3>
            <div className="flex items-center gap-2 mb-3">
              <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-3 h-3 rounded-full bg-secondary" />
              <span className="text-secondary font-semibold text-sm uppercase tracking-wider">{loc.status}</span>
            </div>
            <p className="text-muted-foreground text-sm mb-2">{loc.hours}</p>
            <span className="inline-block glass rounded-full px-3 py-1 text-xs font-medium text-foreground mb-3">{loc.fee}</span>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber/10 border border-amber/20 mb-3">
              <span className="text-amber text-sm shrink-0">⚠️</span>
              <p className="text-xs text-amber/90">{loc.warning}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle className="w-3 h-3 text-secondary" />
              Verified by community · 3 days ago
            </div>
          </motion.div>

          {/* Card 4: empty spacer for alignment on md */}
          <div className="hidden md:block" />
          <div className="hidden md:block" />

          {/* Card 5: Scene Sequence (full width) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
            className="md:col-span-3 glass rounded-2xl p-6"
          >
            <h3 className="text-foreground font-semibold text-lg mb-4">Scene Sequence</h3>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {scenes.map((s) => (
                <div
                  key={s.num}
                  className={`shrink-0 w-40 h-56 rounded-xl overflow-hidden relative group cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
                    s.num === 1
                      ? "ring-2 ring-amber shadow-amber"
                      : "glass hover:shadow-amber/20 hover:shadow-lg"
                  }`}
                >
                  <div className={`absolute inset-0 ${
                    s.num === 1 ? "bg-gradient-to-br from-amber/30 to-background" :
                    s.num === 2 ? "bg-gradient-to-br from-secondary/20 to-background" :
                    "bg-gradient-to-br from-muted to-background"
                  }`} />
                  <div className="absolute inset-0 p-3 flex flex-col justify-between z-10">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-amber text-xs">Scene {String(s.num).padStart(2, "0")}</span>
                      {s.status === "visited" && <CheckCircle className="w-4 h-4 text-secondary" />}
                      {s.status === "saved" && <Bookmark className="w-4 h-4 text-amber" />}
                      {s.status === "locked" && <Lock className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="text-foreground text-sm font-medium leading-snug mb-1">{s.name}</p>
                      <p className="text-secondary text-xs">{s.location}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ SECTION 4: COMMUNITY MATCHES ═══ */}
      <section className="max-w-7xl mx-auto px-4 py-16" ref={communityRef}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-serif italic text-foreground text-3xl mb-1">Explorer Photos from This Exact Spot</h2>
          <p className="text-secondary text-sm mb-8">Real travelers. Real frames. Submit yours.</p>
        </motion.div>

        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {communityPhotos.map((photo, i) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, y: 30 }}
              animate={communityInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="break-inside-avoid"
            >
              {photo.user === "upload" ? (
                /* YOUR TURN card */
                <div className="rounded-2xl border-2 border-dashed border-amber/50 p-8 flex flex-col items-center justify-center gap-3 text-center min-h-[250px] hover:border-amber transition-colors cursor-pointer">
                  <div className="w-14 h-14 rounded-full bg-amber/10 flex items-center justify-center">
                    <Camera className="w-7 h-7 text-amber" />
                  </div>
                  <p className="text-foreground font-medium text-sm">Add your Scene Match</p>
                  <p className="text-muted-foreground text-xs">Upload your photo from this spot</p>
                  <button className="px-4 py-2 rounded-full border border-amber text-amber text-xs font-semibold hover:bg-amber hover:text-charcoal transition-all">
                    <Upload className="w-3 h-3 inline mr-1.5" />Upload Photo
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden group relative cursor-pointer">
                  <img src={photo.img} alt={`Photo by ${photo.user}`} className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-muted overflow-hidden">
                        <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${photo.user}`} alt="" className="w-full h-full" />
                      </div>
                      <span className="text-foreground text-xs font-medium">@{photo.user}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-amber text-xs font-semibold">Match: {photo.match}%</span>
                      <span className="text-muted-foreground text-xs flex items-center gap-1">
                        <Heart className="w-3 h-3" /> {photo.likes}
                      </span>
                    </div>
                  </div>
                  {/* Amber border on hover */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-amber/50 transition-colors pointer-events-none" />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button className="text-amber text-sm font-medium hover:underline">
            View all {loc.communityPhotos} explorer photos →
          </button>
        </div>
      </section>

      {/* ═══ SECTION 5: MAP SECTION ═══ */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-serif italic text-foreground text-3xl mb-6">Find Your Frame</h2>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Getting There card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="glass rounded-2xl p-6 lg:w-80 shrink-0 order-2 lg:order-1"
          >
            <h3 className="text-foreground font-semibold text-lg mb-4">Getting There</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Train className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <div>
                  <p className="text-foreground text-sm font-medium">Metro</p>
                  <p className="text-muted-foreground text-xs">Line B → Colosseo station (2 min walk)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Navigation2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <div>
                  <p className="text-foreground text-sm font-medium">Walking from Termini</p>
                  <p className="text-muted-foreground text-xs">22 min</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Car className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-muted-foreground text-sm">Parking not recommended</p>
                </div>
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <a href={`https://maps.google.com/?q=${loc.coords.lat},${loc.coords.lng}`} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-amber text-charcoal text-sm font-bold hover:brightness-110 transition-all">
                <ExternalLink className="w-3.5 h-3.5" /> Open in Google Maps
              </a>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-bold hover:brightness-110 transition-all">
                <MapPin className="w-3.5 h-3.5" /> Add to Itinerary
              </button>
            </div>
          </motion.div>

          {/* Map */}
          <div className="flex-1 h-[480px] rounded-2xl overflow-hidden order-1 lg:order-2">
            <LeafletMap pins={mapPins} zoom={15} center={[loc.coords.lat, loc.coords.lng]} className="h-full w-full rounded-2xl" />
          </div>
        </div>
      </section>

      {/* ═══ SECTION 6: MORE SCENES ═══ */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-serif italic text-foreground text-3xl mb-1">
            {movie.totalScenes} Filming Locations · {movie.title} ({movie.year})
          </h2>
          <p className="text-muted-foreground text-sm mb-4">Complete all scenes to earn the Gladiator Explorer badge 🏆</p>
        </motion.div>

        <div className="flex items-center gap-3 mb-6">
          <Progress value={progressValue} className="h-2 flex-1 bg-muted" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">1 of {movie.totalScenes} discovered</span>
        </div>

        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {moreLocations.map((loc, i) => (
            <motion.div
              key={loc.scene}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="shrink-0 w-52 h-72 glass rounded-2xl overflow-hidden relative group cursor-pointer hover:-translate-y-1 transition-all duration-300 hover:shadow-amber/20 hover:shadow-lg"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber/10 via-background to-muted" />
              <div className="absolute inset-0 p-4 flex flex-col justify-between z-10">
                <span className="font-mono text-amber text-xs">{loc.scene}</span>
                <div>
                  <p className="text-foreground font-medium text-sm leading-snug mb-1">{loc.title}</p>
                  <p className="text-secondary text-xs mb-3">{loc.location}</p>
                  <button className="px-3 py-1.5 rounded-full bg-secondary/20 text-secondary text-xs font-medium hover:bg-secondary hover:text-secondary-foreground transition-all">
                    Explore
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ SECTION 7: RELATED TITLES ═══ */}
      <section className="max-w-7xl mx-auto px-4 py-16 pb-32">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-serif italic text-foreground text-2xl mb-6">Also Filmed in Rome</h2>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockTitles.slice(0, 3).map((t, i) => (
            <CinemaCard key={t.id} title={t} delay={i * 0.1} />
          ))}
        </div>
      </section>

      {/* Mobile sticky AR button */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 p-3 bg-background/80 backdrop-blur-lg border-t border-border/50">
        <button className="w-full py-3 rounded-full bg-gradient-amber text-charcoal font-bold text-sm flex items-center justify-center gap-2 relative overflow-hidden">
          <div className="absolute inset-0 shimmer-sweep" />
          <Eye className="w-4 h-4 relative z-10" />
          <span className="relative z-10">Open AR Scene Mode</span>
        </button>
      </div>
    </div>
  );
}
