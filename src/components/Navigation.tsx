import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Compass, Plus, MapPin, User, X, Bell, Film, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

const navLinks = [
  { label: "Explore", href: "/explore", icon: Compass },
  { label: "Map", href: "/map", icon: MapPin },
];

const mobileLinks = [
  { label: "Home", href: "/", icon: Film },
  { label: "Explore", href: "/explore", icon: Compass },
  { label: "Map", href: "/map", icon: MapPin },
  { label: "Profile", href: "/u/elenarossi", icon: User },
];

export default function Navigation() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* Desktop/Tablet Top Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16">
        <div className="glass border-b border-border/50 h-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-amber flex items-center justify-center">
                <Film className="w-4 h-4 text-charcoal" strokeWidth={2.5} />
              </div>
              <span className="font-serif text-xl text-foreground tracking-tight hidden sm:block">
                Sarevista
              </span>
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
              <AnimatePresence>
                {searchOpen ? (
                  <motion.div
                    initial={{ width: 40, opacity: 0 }}
                    animate={{ width: 260, opacity: 1 }}
                    exit={{ width: 40, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="relative"
                  >
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search titles, locations, users..."
                      className="w-full h-9 pl-9 pr-9 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground border border-border outline-none focus:border-amber/50 transition-colors"
                    />
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <button
                      onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                    </button>
                  </motion.div>
                ) : (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setSearchOpen(true)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                  >
                    <Search className="w-4 h-4" />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Notifications */}
              <button className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all relative">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber border-2 border-background" />
              </button>

              {/* Add button */}
              <Link
                to="/add"
                className="hidden sm:flex h-9 px-3 rounded-lg items-center gap-1.5 bg-gradient-amber text-charcoal text-sm font-semibold hover:opacity-90 transition-opacity shadow-amber"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                Add Title
              </Link>

              {/* Avatar */}
              <Link to="/u/elenarossi" className="shrink-0">
                <div className="w-9 h-9 rounded-full amber-ring overflow-hidden">
                  <img
                    src="https://api.dicebear.com/9.x/avataaars/svg?seed=elena"
                    alt="Profile"
                    className="w-full h-full object-cover bg-muted"
                  />
                </div>
              </Link>
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
