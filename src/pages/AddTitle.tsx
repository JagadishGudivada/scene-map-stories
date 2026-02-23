import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Film, Tv, BookOpen, MapPin, Plus, X, Image, Sparkles, ArrowLeft, Check,
} from "lucide-react";
import type { MediaType } from "@/lib/mockData";

const typeOptions: { type: MediaType; icon: typeof Film; label: string }[] = [
  { type: "Movie", icon: Film, label: "Movie" },
  { type: "Series", icon: Tv, label: "Series" },
  { type: "Book", icon: BookOpen, label: "Book" },
];

const genreOptions = ["Drama", "Romance", "Crime", "Mystery", "Musical", "Fantasy", "Comedy", "Thriller", "Sci-Fi", "Horror", "Documentary", "Self-help"];

export default function AddTitle() {
  const [selectedType, setSelectedType] = useState<MediaType | null>(null);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([""]);
  const [submitted, setSubmitted] = useState(false);

  const toggleGenre = (g: string) =>
    setSelectedGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const addLocation = () => setLocations((prev) => [...prev, ""]);
  const updateLocation = (i: number, val: string) =>
    setLocations((prev) => prev.map((l, idx) => (idx === i ? val : l)));
  const removeLocation = (i: number) =>
    setLocations((prev) => prev.filter((_, idx) => idx !== i));

  const canSubmit = selectedType && title.trim() && year.trim() && locations.some((l) => l.trim());

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background pb-24 md:pb-8 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber/15 border border-amber/30 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-amber" />
          </div>
          <h1 className="font-serif text-3xl text-foreground mb-3">Title Submitted!</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Thank you for contributing. Your title will be reviewed and added to the map soon.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setSubmitted(false);
                setSelectedType(null);
                setTitle("");
                setYear("");
                setSelectedGenres([]);
                setLocations([""]);
              }}
              className="px-6 py-3 rounded-xl bg-gradient-amber text-charcoal font-bold text-sm hover:opacity-90 transition-opacity shadow-amber"
            >
              Add Another
            </button>
            <Link
              to="/explore"
              className="px-6 py-3 rounded-xl glass border border-border text-foreground font-medium text-sm hover:bg-muted/50 transition-all"
            >
              Explore Titles
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-24">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-amber flex items-center justify-center">
              <Plus className="w-5 h-5 text-charcoal" strokeWidth={2.5} />
            </div>
            <h1 className="font-serif text-4xl text-foreground">Add a Title</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Contribute a movie, series, or book and map its filming locations.
          </p>
        </motion.div>

        {/* Form */}
        <div className="space-y-8">
          {/* Type Selection */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3 block">
              Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {typeOptions.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => setSelectedType(opt.type)}
                  className={`flex flex-col items-center gap-2 p-5 rounded-2xl border transition-all ${
                    selectedType === opt.type
                      ? `badge-${opt.type.toLowerCase()} border-transparent`
                      : "glass border-border hover:border-amber/20 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <opt.icon className="w-6 h-6" />
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </motion.section>

          {/* Title & Year */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2 block">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Lost in Translation"
                  className="w-full h-12 px-4 rounded-xl bg-card text-foreground text-sm border border-border outline-none placeholder:text-muted-foreground focus:border-amber/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2 block">
                  Year
                </label>
                <input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2003"
                  type="number"
                  className="w-full h-12 px-4 rounded-xl bg-card text-foreground text-sm border border-border outline-none placeholder:text-muted-foreground focus:border-amber/50 transition-colors"
                />
              </div>
            </div>
          </motion.section>

          {/* Cover Image */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3 block">
              Cover Image
            </label>
            <div className="glass rounded-2xl border border-dashed border-border p-10 text-center cursor-pointer hover:border-amber/30 transition-colors">
              <Image className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Drop an image here or <span className="text-amber">browse</span>
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG up to 5MB</p>
            </div>
          </motion.section>

          {/* Genres */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3 block">
              Genres
            </label>
            <div className="flex flex-wrap gap-2">
              {genreOptions.map((g) => (
                <button
                  key={g}
                  onClick={() => toggleGenre(g)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedGenres.includes(g)
                      ? "bg-amber/15 text-amber border border-amber/30"
                      : "bg-muted/50 text-muted-foreground border border-border hover:text-foreground"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </motion.section>

          {/* Locations */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Filming Locations
              </label>
              <button
                onClick={addLocation}
                className="flex items-center gap-1 text-xs text-amber hover:underline"
              >
                <Plus className="w-3 h-3" /> Add location
              </button>
            </div>
            <div className="space-y-3">
              {locations.map((loc, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <input
                    value={loc}
                    onChange={(e) => updateLocation(i, e.target.value)}
                    placeholder={`Location ${i + 1}, e.g. Shinjuku, Tokyo`}
                    className="flex-1 h-11 px-4 rounded-xl bg-card text-foreground text-sm border border-border outline-none placeholder:text-muted-foreground focus:border-amber/50 transition-colors"
                  />
                  {locations.length > 1 && (
                    <button
                      onClick={() => removeLocation(i)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.section>

          {/* Submit */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <div className="flex items-center gap-3 pt-2 pb-4">
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`flex-1 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  canSubmit
                    ? "bg-gradient-amber text-charcoal hover:opacity-90 shadow-amber"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Submit Title
              </button>
              <Link
                to="/"
                className="h-12 px-6 rounded-xl glass border border-border text-foreground font-medium text-sm hover:bg-muted/50 transition-all flex items-center"
              >
                Cancel
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
