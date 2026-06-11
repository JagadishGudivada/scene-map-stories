import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useParams, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import Explore from "./pages/Explore";

import TitleDetail from "./pages/TitleDetail";
import MapPage from "./pages/MapPage";
import AddTitle from "./pages/AddTitle";
import SceneMode from "./pages/SceneMode";
import LocationDetail from "./pages/LocationDetail";
import FilmingSpots from "./pages/FilmingSpots";
import FilmingSpotDetail from "./pages/FilmingSpotDetail";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import SitePageRoute from "./pages/SitePageRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Forces a full remount of TitleDetail whenever the slug changes so state
// never bleeds from one title into the next during client-side navigation.
function TitleDetailRoute() {
  const { slug } = useParams<{ slug: string }>();
  return <TitleDetail key={slug} />;
}

function AppRoutes() {
  const location = useLocation();
  const hideNav = ["/auth", "/reset-password"].includes(location.pathname);

  return (
    <>
      {!hideNav && <Navigation />}
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
