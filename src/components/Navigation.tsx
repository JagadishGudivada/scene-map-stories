import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Compass, Plus, MapPin, User, X, Film, Tv, BookOpen, Sun, Moon, LogOut, Sparkles, Loader2 } from "lucide-react";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import Logo from "@/components/Logo";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/useAuth";
import { useAITitleSearch, slugifyTitle } from "@/hooks/useAITitleSearch";
import { supabase } from "@/integrations/supabase/client";

const typeIcons = { Movie: Film, Series: Tv, Book: BookOpen } as const;

const navLinks = [
/*   { label: "Explore", href: "/explore", icon: Compass }, */
  { label: "Map", href: "/map", icon: MapPin },
];

export default function Navigation() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { results: aiResults, isSearching, error: aiError, search: searchTitles, clear: clearResults } = useAITitleSearch();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Resolve the logged-in user's profile slug for the profile link
  useEffect(() => {
    let active = true;
    if (!user) { setProfileUsername(null); return; }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      const fallback = (user.user_metadata as any)?.user_name
        || (user.user_metadata as any)?.preferred_username
        || user.email?.split("@")[0]
        || "me";
      setProfileUsername(data?.username || fallback);
    })();
    return () => { active = false; };
  }, [user]);

  const profileHref = profileUsername ? `/u/${profileUsername}` : "/auth";
  const mobileLinks = [
    { label: "Home", href: "/", icon: Film },
    /* { label: "Explore", href: "/explore", icon: Compass }, */
    { label: "Map", href: "/map", icon: MapPin },
    { label: "Profile", href: profileHref, icon: User },
  ];

  // Trigger AI title search as user types
  useEffect(() => {
    if (searchOpen) searchTitles(searchQuery);
  }, [searchQuery, searchOpen, searchTitles]);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    clearResults();
  };

  const handleTitleClick = (title: string, year: number, type?: string, creator?: string) => {
    closeSearch();
    navigate(`/title/${slugifyTitle(title, year)}`, { state: { title, year, type, creator } });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // If we have results, jump to the top one; else just close.
    if (aiResults.length > 0) {
      const top = aiResults[0];
      handleTitleClick(top.title, top.year);
    }
  };

  // Close on outside click
  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        closeSearch();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchOpen]);

  return (
    <>
      {/* Desktop/Tablet Top Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16">
        <div className="glass border-b border-border/50 h-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center shrink-0 text-foreground">
              <Logo size="md" variant="full" showBeta={true} responsive />
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    location.pathname === link.href
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Search */}
              <div ref={searchContainerRef} className="relative">
                <AnimatePresence>
                  {searchOpen ? (
                    <motion.form
                      key="search-form"
                      onSubmit={handleSubmit}
                      initial={{ width: 40, opacity: 0 }}
                      animate={{ width: 280, opacity: 1 }}
                      exit={{ width: 40, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="relative"
                    >
                      <input
                        autoFocus
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search a movie, series, or book..."
                        className="w-full h-9 pl-9 pr-9 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground border border-border outline-none focus:border-amber/50 transition-colors"
                      />
                      {isSearching ? (
                        <Loader2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber animate-spin" />
                      ) : (
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      )}
                      <button
                        type="button"
                        onClick={closeSearch}
                        aria-label="Close search"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2"
                      >
                        <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                      </button>
                    </motion.form>
                  ) : (
                    <motion.button
                      key="search-btn"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => setSearchOpen(true)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                    >
                      <Search className="w-4 h-4" />
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* AI search dropdown */}
                <AnimatePresence>
                  {searchOpen && searchQuery.trim().length >= 2 && (aiResults.length > 0 || isSearching || aiError) && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-11 right-0 w-[320px] glass rounded-xl border border-border shadow-card overflow-hidden z-50"
                    >
                      <div className="px-3 py-2 border-b border-border/50 flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber" />
                        <span className="text-[11px] font-medium text-amber">
                          {isSearching ? "Searching with AI..." : `${aiResults.length} AI-powered result${aiResults.length === 1 ? "" : "s"}`}
                        </span>
                      </div>
                      {aiError && (
                        <div className="px-3 py-2 text-xs text-destructive">{aiError}</div>
                      )}
                      <div className="max-h-80 overflow-y-auto">
                        {aiResults.map((t, i) => {
                          const Icon = typeIcons[t.type] ?? Film;
                          return (
                            <button
                              key={`${t.title}-${t.year}-${i}`}
                              type="button"
                              onClick={() => handleTitleClick(t.title, t.year, t.type, t.creator)}
                              className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-b-0"
                            >
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-amber/10 text-amber border border-amber/20">
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {t.year}{t.creator ? ` · ${t.creator}` : ""}
                                </p>
                              </div>
                              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider shrink-0 mt-1">
                                {t.type}
                              </span>
                            </button>
                          );
                        })}
                        {!isSearching && aiResults.length === 0 && searchQuery.trim().length >= 2 && !aiError && (
                          <div className="px-3 py-4 text-xs text-muted-foreground text-center">No titles found</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <NotificationsDropdown />

              {/* Add button */}
{/*               {user && (
                <Link
                  to="/add"
                  className="hidden sm:flex h-9 px-3 rounded-lg items-center gap-1.5 bg-gradient-amber text-charcoal text-sm font-semibold hover:opacity-90 transition-opacity shadow-amber"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                  Add Title
                </Link>
              )} */}

              {/* Auth-dependent UI */}
              {user ? (
                <div className="flex items-center gap-2">
                  <Link to={profileHref} className="shrink-0">
                    <div className="w-9 h-9 rounded-full amber-ring overflow-hidden">
                      <img
                        src={user.user_metadata?.avatar_url || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.email}`}
                        alt="Profile"
                        className="w-full h-full object-cover bg-muted"
                      />
                    </div>
                  </Link>
                  <button
                    onClick={async () => { await signOut(); navigate("/"); }}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="h-9 px-4 rounded-lg flex items-center gap-1.5 bg-gradient-amber text-charcoal text-sm font-semibold hover:opacity-90 transition-opacity shadow-amber"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50 pb-safe">
        <div className="h-16 flex items-center justify-around px-2">
          {mobileLinks.map((link) => {
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all ${
                  isActive ? "text-amber" : "text-muted-foreground"
                }`}
              >
                <link.icon className={`w-5 h-5 transition-all ${isActive ? "scale-110" : ""}`} />
                <span className="text-[10px] font-medium">{link.label}</span>
              </Link>
            );
          })}
          {/* Center Add Button */}
          <Link
            to="/add"
            className="flex flex-col items-center gap-1 -mt-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-amber flex items-center justify-center shadow-amber animate-pulse-amber">
              <Plus className="w-6 h-6 text-charcoal" strokeWidth={2.5} />
            </div>
          </Link>
        </div>
      </nav>
    </>
  );
}
