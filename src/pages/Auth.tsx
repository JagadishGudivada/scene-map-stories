import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Film, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, XIcon, Sparkles, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const emailSchema = z.string().email("Enter a valid email");
const passwordSchema = z.string().min(6, "Min 6 characters");

type Method = "password" | "magic";

function SocialIcon({
  id,
  label,
  loading,
  onClick,
  children,
}: {
  id: string;
  label: string;
  loading: string | null;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!!loading}
      aria-label={label}
      title={label}
      className="h-11 sm:h-12 flex-1 rounded-xl glass border border-border/50 flex items-center justify-center gap-2 text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
    >
      {loading === id ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
      <span className="hidden sm:inline text-sm font-medium">{label}</span>
    </button>
  );
}

export default function Auth() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [method, setMethod] = useState<Method>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawRedirect = searchParams.get("redirect") || "/";
  // Only allow same-origin paths: block absolute and protocol-relative URLs so the
  // param can't steer OAuth/magic-link redirects to another host.
  const redirectTo = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/";
  const { toast } = useToast();

  const validateEmail = () => {
    const r = emailSchema.safeParse(email);
    if (!r.success) {
      setErrors({ email: r.error.errors[0].message });
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail()) return;

    if (method === "magic") {
      setLoading("magic");
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}${redirectTo}` },
      });
      setLoading(null);
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
      toast({ title: "Check your inbox ✨", description: "We sent you a magic link to sign in." });
      return;
    }

    const pr = passwordSchema.safeParse(password);
    if (!pr.success) {
      setErrors({ password: pr.error.errors[0].message });
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords don't match" });
      return;
    }
    setErrors({});
    setLoading("password");
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Welcome back!" });
        navigate(redirectTo);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}${redirectTo}` },
        });
        if (error) throw error;
        toast({ title: "Account created!", description: "Check your email to confirm." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setLoading(provider);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}${redirectTo}`,
    });
    setLoading(null);
    if (result.error) {
      toast({ title: "Error", description: (result.error as Error).message, variant: "destructive" });
    }
  };

  const handleSSO = async () => {
    const domain = window.prompt("Enter your work email domain (e.g. company.com)");
    if (!domain) return;
    setLoading("sso");
    const { data, error } = await supabase.auth.signInWithSSO({
      domain,
      options: { redirectTo: `${window.location.origin}${redirectTo}` },
    });
    setLoading(null);
    if (error) return toast({ title: "SSO error", description: error.message, variant: "destructive" });
    if (data?.url) window.location.href = data.url;
  };

  const handleForgotPassword = async () => {
    if (!validateEmail()) return;
    setLoading("reset");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(null);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Email sent", description: "Check your inbox for the reset link." });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Hero (desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-end p-12">
        <img
          src="https://images.pexels.com/photos/1519088/pexels-photo-1519088.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&dpr=1"
          alt="Cinema"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="grain absolute inset-0" />
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-amber flex items-center justify-center">
              <Film className="w-5 h-5 text-charcoal" strokeWidth={2.5} />
            </div>
            <span className="font-share text-2xl text-foreground tracking-tight">SAREVISTA</span>
          </div>
          <h2 className="font-serif text-4xl text-foreground leading-tight mb-4">
            Not a list.<br />Your memory map.
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Discover filming locations from your favorite movies, series, and books — then visit them in real life.
          </p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-12 bg-background relative">
        <div className="grain absolute inset-0 pointer-events-none" />

        {/* Top bar */}
        <div className="absolute top-5 left-5 right-5 sm:top-6 sm:left-6 sm:right-6 flex items-center justify-between z-20">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-amber flex items-center justify-center">
              <Film className="w-4 h-4 text-charcoal" strokeWidth={2.5} />
            </div>
            <span className="font-share text-xl text-foreground tracking-tight">SAREVISTA</span>
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-9 h-9 rounded-xl glass border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md relative z-10 mt-14 sm:mt-0"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: mode === "signin" ? -12 : 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === "signin" ? 12 : -12 }}
              transition={{ duration: 0.25 }}
            >
              <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-1.5">
                {mode === "signin" ? "Welcome back" : "Create account"}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base mb-6">
                {mode === "signin" ? "Sign in to continue your cinematic journey" : "Join the movie-travel community"}
              </p>

              {/* Social row — icons on mobile, icon+label on desktop */}
              <div className="flex items-center gap-2 mb-5">
                <SocialIcon id="google" label="Google" loading={loading} onClick={() => handleOAuth("google")}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </SocialIcon>
                <SocialIcon id="apple" label="Apple" loading={loading} onClick={() => handleOAuth("apple")}>
                  <svg className="w-5 h-5 fill-foreground" viewBox="0 0 24 24">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                </SocialIcon>
                <SocialIcon id="sso" label="SSO" loading={loading} onClick={handleSSO}>
                  <Building2 className="w-5 h-5" />
                </SocialIcon>
              </div>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">or with email</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              {/* Method switcher */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-muted/40 border border-border/50 mb-4 text-xs">
                {(["password", "magic"] as Method[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`h-9 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                      method === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    {m === "password" ? <Lock className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {m === "password" ? "Password" : "Magic link"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full h-12 pl-10 pr-4 rounded-xl bg-muted/50 border border-border/50 text-foreground placeholder:text-muted-foreground outline-none focus:border-amber/50 transition-colors"
                    />
                  </div>
                  {errors.email && <p className="text-destructive text-xs mt-1.5 ml-1">{errors.email}</p>}
                </div>

                {method === "password" && (
                  <>
                    <div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password"
                          className="w-full h-12 pl-10 pr-11 rounded-xl bg-muted/50 border border-border/50 text-foreground placeholder:text-muted-foreground outline-none focus:border-amber/50 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.password && <p className="text-destructive text-xs mt-1.5 ml-1">{errors.password}</p>}
                    </div>

                    {mode === "signup" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm password"
                            className="w-full h-12 pl-10 pr-4 rounded-xl bg-muted/50 border border-border/50 text-foreground placeholder:text-muted-foreground outline-none focus:border-amber/50 transition-colors"
                          />
                        </div>
                        {errors.confirmPassword && (
                          <p className="text-destructive text-xs mt-1.5 ml-1">{errors.confirmPassword}</p>
                        )}
                      </motion.div>
                    )}

                    {mode === "signin" && (
                      <div className="flex justify-end -mt-1">
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-xs text-amber hover:text-amber/80 transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}
                  </>
                )}

                <button
                  type="submit"
                  disabled={!!loading}
                  className="w-full h-12 rounded-xl bg-gradient-amber font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-amber shimmer-sweep disabled:opacity-50 text-amber"
                >
                  {loading === "password" || loading === "magic" ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {method === "magic"
                        ? "Email me a magic link"
                        : mode === "signin"
                          ? "Sign in"
                          : "Create account"}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-5">
                {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin");
                    setErrors({});
                  }}
                  className="text-amber hover:text-amber/80 font-medium transition-colors"
                >
                  {mode === "signin" ? "Create one" : "Sign in"}
                </button>
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
