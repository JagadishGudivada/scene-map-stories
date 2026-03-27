import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import Explore from "./pages/Explore";
import TitleDetail from "./pages/TitleDetail";
import MapPage from "./pages/MapPage";
import AddTitle from "./pages/AddTitle";
import SceneMode from "./pages/SceneMode";
import LocationDetail from "./pages/LocationDetail";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const location = useLocation();
  const hideNav = ["/auth", "/reset-password"].includes(location.pathname);

  return (
    <>
      {!hideNav && <Navigation />}
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/title/:slug" element={<TitleDetail />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/add" element={<AddTitle />} />
        <Route path="/scene-mode/:slug" element={<SceneMode />} />
        <Route path="/location/:slug" element={<LocationDetail />} />
        <Route path="/u/:username" element={<Profile />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
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
