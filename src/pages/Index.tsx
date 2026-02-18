import { motion } from "framer-motion";
import HeroBanner from "@/components/HeroBanner";
import CinemaCard from "@/components/CinemaCard";
import TrendingRow from "@/components/TrendingRow";
import PostCard from "@/components/PostCard";
import PopularLocations from "@/components/PopularLocations";
import { mockTitles, mockPosts } from "@/lib/mockData";
import { Sparkles, TrendingUp, Globe } from "lucide-react";

export default function Index() {
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24">
        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 mb-6"
        >
          <div className="flex items-center gap-1.5 glass rounded-full px-3 py-1.5 border border-amber/20">
            <Sparkles className="w-3.5 h-3.5 text-amber" />
            <span className="text-xs font-medium text-amber">Not a list. Your memory map.</span>
          </div>
        </motion.div>

        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-12"
        >
          <HeroBanner />
        </motion.div>

        {/* Trending Now */}
        <div className="mb-14">
          <TrendingRow titles={mockTitles} />
        </div>

        {/* Recently Added Bento Grid */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-5">
            <TrendingUp className="w-5 h-5 text-amber" />
            <h2 className="font-serif text-2xl text-foreground">Recently Added</h2>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-auto">
            {/* Large card - spans 2 cols and 2 rows */}
            <div className="col-span-2 row-span-2">
              <CinemaCard title={mockTitles[0]} size="lg" delay={0} />
            </div>
            {/* Medium cards */}
            <div className="col-span-1">
              <CinemaCard title={mockTitles[1]} size="md" delay={0.1} />
            </div>
            <div className="col-span-1">
              <CinemaCard title={mockTitles[2]} size="md" delay={0.15} />
            </div>
            {/* Fill second row */}
            <div className="col-span-1">
              <CinemaCard title={mockTitles[3]} size="md" delay={0.2} />
            </div>
            <div className="col-span-1">
              <CinemaCard title={mockTitles[4]} size="md" delay={0.25} />
            </div>
            {/* Wide card */}
            <div className="col-span-2 md:col-span-2">
              <CinemaCard title={mockTitles[5]} size="md" delay={0.3} />
            </div>
          </div>
        </section>

        {/* Popular Locations */}
        <div className="mb-14">
          <PopularLocations />
        </div>

        {/* Community Posts */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-5">
            <Globe className="w-5 h-5 text-teal" />
            <h2 className="font-serif text-2xl text-foreground">From the Community</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {mockPosts.map((post, i) => (
              <PostCard key={post.id} post={post} delay={i * 0.1} />
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-10 rounded-2xl overflow-hidden relative"
        >
          <div className="glass border border-amber/20 p-10 text-center relative z-10">
            <div className="inline-flex items-center gap-2 mb-4 glass rounded-full px-4 py-2 border border-amber/20">
              <Sparkles className="w-4 h-4 text-amber" />
              <span className="text-sm font-medium text-amber">Join 40,000+ film explorers</span>
            </div>
            <h2 className="font-serif text-4xl text-foreground mb-4">
              Start mapping your<br />
              <span className="text-amber-gradient italic">cinema memories</span>
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Discover filming locations from your favourite titles and map the places that made those scenes unforgettable.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button className="px-8 py-3 rounded-xl bg-gradient-amber text-charcoal font-bold hover:opacity-90 transition-opacity shadow-amber">
                Create Free Account
              </button>
              <button className="px-8 py-3 rounded-xl glass border border-white/10 text-foreground font-medium hover:glass-hover transition-all">
                Explore First
              </button>
            </div>
          </div>
          {/* Ambient glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber/5 via-transparent to-teal/5 pointer-events-none" />
        </motion.section>
      </div>
    </div>
  );
}
