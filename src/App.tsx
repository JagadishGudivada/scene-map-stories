import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useParams } from "react-router-dom";
import { Suspense, lazy } from "react";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";

// Route-level code splitting: only the landing page ships in the main bundle.
const Profile = lazy(() => import("./pages/Profile"));
const Explore = lazy(() => import("./pages/Explore"));
const TitleDetail = lazy(() => import("./pages/TitleDetail"));
const MapPage = lazy(() => import("./pages/MapPage"));
const AddTitle = lazy(() => import("./pages/AddTitle"));
const SceneMode = lazy(() => import("./pages/SceneMode"));
const LocationDetail = lazy(() => import("./pages/LocationDetail"));
const FilmingSpots = lazy(() => import("./pages/FilmingSpots"));
const FilmingSpotDetail = lazy(() => import("./pages/FilmingSpotDetail"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const SitePageRoute = lazy(() => import("./pages/SitePageRoute"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PublicPassport = lazy(() => import("./pages/PublicPassport"));
const TrailDetail = lazy(() => import("./pages/TrailDetail"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Forces a full remount of TitleDetail whenever the slug changes so state
// never bleeds from one title into the next during client-side navigation.
function TitleDetailRoute() {
  const { slug } = useParams<{ slug: string }>();
  return <TitleDetail key={slug} />;
}

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  const hideNav = ["/auth", "/reset-password"].includes(location.pathname);

  return (
    <>
      {!hideNav && <Navigation />}
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/title/:slug" element={<TitleDetailRoute />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/add" element={<ProtectedRoute><AddTitle /></ProtectedRoute>} />
          <Route path="/scene-mode/:slug" element={<SceneMode />} />
          <Route path="/location/:slug/filming-spots" element={<FilmingSpots />} />
          <Route path="/location/:slug" element={<LocationDetail />} />
          <Route path="/spot/:slug" element={<FilmingSpotDetail />} />
          <Route path="/u/:username" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/passport/:username" element={<PublicPassport />} />
          <Route path="/trails/:id" element={<TrailDetail />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          {/* Footer / company pages */}
          <Route path="/about" element={<SitePageRoute />} />
          <Route path="/our-story" element={<SitePageRoute />} />
          <Route path="/careers" element={<SitePageRoute />} />
          <Route path="/press" element={<SitePageRoute />} />
          <Route path="/contact" element={<SitePageRoute />} />
          <Route path="/guides" element={<SitePageRoute />} />
          <Route path="/destinations" element={<SitePageRoute />} />
          <Route path="/community" element={<SitePageRoute />} />
          <Route path="/help" element={<SitePageRoute />} />
          <Route path="/safety" element={<SitePageRoute />} />
          <Route path="/cancellation" element={<SitePageRoute />} />
          <Route path="/report" element={<SitePageRoute />} />
          <Route path="/accessibility" element={<SitePageRoute />} />
          <Route path="/terms" element={<SitePageRoute />} />
          <Route path="/privacy" element={<SitePageRoute />} />
          <Route path="/cookies" element={<SitePageRoute />} />
          <Route path="/affiliate-disclosure" element={<SitePageRoute />} />
          <Route path="/sitemap" element={<SitePageRoute />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
