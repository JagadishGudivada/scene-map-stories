import { Link } from "react-router-dom";
import { Instagram, Twitter, Youtube, Mail } from "lucide-react";
import Logo from "@/components/Logo";

const sections = [
  {
    title: "Company",
    links: [
      { label: "About Us", to: "/about" },
      { label: "Our Story", to: "/our-story" },
      { label: "Careers", to: "/careers" },
      { label: "Press", to: "/press" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Discovery Map", to: "/map" },
      { label: "Filming Spots", to: "/" },
      { label: "Travel Guides", to: "/guides" },
      { label: "Destinations", to: "/destinations" },
      { label: "Community", to: "/community" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", to: "/help" },
      { label: "Safety", to: "/safety" },
      { label: "Cancellation Options", to: "/cancellation" },
      { label: "Report a Concern", to: "/report" },
      { label: "Accessibility", to: "/accessibility" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", to: "/terms" },
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Cookie Policy", to: "/cookies" },
      { label: "Affiliate Disclosure", to: "/affiliate-disclosure" },
      { label: "Sitemap", to: "/sitemap" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-border/50 bg-muted/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          <div className="col-span-2 md:col-span-2">
            <Logo size="md" variant="full" />
            <p className="mt-4 text-sm text-muted-foreground max-w-xs leading-relaxed">
              Not a list. Your memory map. Discover the real places behind your favorite films, series, and books.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"
                 className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-amber hover:bg-muted transition-all">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter"
                 className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-amber hover:bg-muted transition-all">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube"
                 className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-amber hover:bg-muted transition-all">
                <Youtube className="w-4 h-4" />
              </a>
              <a href="mailto:hello@sarevista.com" aria-label="Email"
                 className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-amber hover:bg-muted transition-all">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {sections.map((s) => (
            <div key={s.title}>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">
                {s.title}
              </h4>
              <ul className="space-y-2.5">
                {s.links.map((l) => (
                  <li key={l.to + l.label}>
                    <Link to={l.to} className="text-sm text-muted-foreground hover:text-amber transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-border/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Sarevista. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Made with <span className="text-amber">★</span> for storytellers and travelers.
          </p>
        </div>
      </div>
    </footer>
  );
}
