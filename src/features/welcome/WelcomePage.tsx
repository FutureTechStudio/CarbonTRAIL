import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Leaf, Route, Sparkles, User } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { isBaselineComplete, useGuest } from "@/app/providers";
import { loadState } from "@/storage/guestStore";
import { WelcomeLandscape } from "@/features/welcome/WelcomeLandscape";
import { CarbonTrailLogo } from "@/components/brand/CarbonTrailLogo";
import { P } from "@/theme/palette";

const DISPLAY_FONT = "Plus Jakarta Sans, sans-serif";

const WELCOME_STATS = [
  { value: "2.4M", label: "Trails tracked", Icon: Route },
  { value: "84%", label: "Found new insights", Icon: Sparkles },
  { value: "12 kg", label: "Avg. weekly saved", Icon: Leaf },
] as const;

const FLOATING_QUOTES = [
  {
    text: "Every choice leaves a mark on the Earth.",
    className: "left-[3%] top-[4%] sm:left-[5%] sm:top-[9%]",
    drift: "welcome-cloud-drift-a",
    rotate: "-rotate-1",
  },
  {
    text: "What we protect today can bloom tomorrow.",
    className: "right-[4%] top-[6%] sm:right-[6%] sm:top-[14%]",
    drift: "welcome-cloud-drift-b",
    rotate: "rotate-1",
  },
  {
    text: "Cleaner habits create clearer horizons.",
    className:
      "max-sm:hidden bottom-[28%] left-[4%] sm:bottom-[20%] sm:left-auto sm:right-[5%]",
    drift: "welcome-cloud-drift-a",
    rotate: "-rotate-2 sm:rotate-1",
  },
] as const;

function QuoteCloud({ text }: { text: string }) {
  return (
    <figure className="relative inline-flex shrink-0 items-center justify-center">
      <svg
        className="pointer-events-none absolute -inset-x-4 -inset-y-2 h-[calc(100%+16px)] w-[calc(100%+32px)]"
        viewBox="0 0 320 56"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <ellipse cx={52} cy={42} rx={38} ry={15} fill="rgba(245,250,252,0.6)" />
        <ellipse cx={268} cy={40} rx={34} ry={13} fill="rgba(240,248,250,0.55)" />
        <ellipse cx={160} cy={18} rx={120} ry={17} fill="rgba(253,250,244,0.9)" />
        <ellipse cx={160} cy={38} rx={132} ry={15} fill="rgba(248,252,250,0.88)" />
      </svg>
      <figcaption
        className="relative max-w-[min(88vw,240px)] px-4 py-2 text-center text-[11px] italic leading-snug sm:max-w-none sm:whitespace-nowrap sm:px-5 sm:py-2.5 sm:text-xs sm:leading-none"
        style={{ color: P.mutedText, fontFamily: "DM Sans, sans-serif" }}
      >
        {text}
      </figcaption>
    </figure>
  );
}

function FloatingQuoteClouds() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-label="Environmental quotes">
      {FLOATING_QUOTES.map((quote) => (
        <div
          key={quote.text}
          className={`absolute max-w-[min(92vw,280px)] ${quote.drift} ${quote.rotate} ${quote.className}`}
        >
          <QuoteCloud text={quote.text} />
        </div>
      ))}
    </div>
  );
}

type WelcomeView = "landing" | "auth";
type AuthMode = "signin" | "signup";

function WelcomeStatsGrid() {
  return (
    <div className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      {WELCOME_STATS.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center justify-center gap-3 rounded-2xl border px-4 py-3 backdrop-blur-sm sm:flex-col sm:gap-2 sm:py-4"
          style={{
            background: "rgba(253, 250, 244, 0.78)",
            borderColor: P.border,
            boxShadow: "0 8px 24px rgba(42, 54, 40, 0.06)",
          }}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: `${P.green}16`, color: P.green }}
          >
            <stat.Icon size={16} aria-hidden="true" />
          </div>
          <div className="text-left sm:text-center">
            <p className="text-base font-bold leading-none sm:text-lg" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
              {stat.value}
            </p>
            <p className="mt-1 text-[11px] leading-snug sm:text-xs" style={{ color: P.faintText }}>
              {stat.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WelcomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { startGuest, signIn, signUp } = useGuest();
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const [view, setView] = useState<WelcomeView>(initialMode === "signup" ? "auth" : "landing");
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (searchParams.get("mode") !== "signup") return;
    setMode("signup");
    setView("auth");
    setError(null);
  }, [searchParams]);

  const handleGetStarted = useCallback(() => {
    startGuest();
    navigate("/baseline");
  }, [navigate, startGuest]);

  const openSignIn = useCallback(() => {
    setMode("signin");
    setError(null);
    setView("auth");
  }, []);

  const backToLanding = useCallback(() => {
    setView("landing");
    setError(null);
    setBusy(false);
  }, []);

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      setError(null);
      setBusy(true);

      const result =
        mode === "signup"
          ? signUp({ username, email, password })
          : signIn({ email, password });

      setBusy(false);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (mode === "signup") {
        navigate("/baseline");
        return;
      }

      const userState = loadState(result.userId);
      navigate(isBaselineComplete(userState.profile) ? "/today" : "/baseline");
    },
    [email, mode, navigate, password, signIn, signUp, username],
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: P.cream }}>
      <WelcomeLandscape />
      <FloatingQuoteClouds />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-12">
        <main
          className="w-full max-w-lg rounded-[2rem] border px-6 py-8 text-center shadow-2xl sm:px-10 sm:py-10"
          style={{
            background: "rgba(253, 250, 244, 0.82)",
            borderColor: "rgba(255,255,255,0.65)",
            boxShadow: "0 28px 80px rgba(42, 54, 40, 0.14)",
            backdropFilter: "blur(14px)",
          }}
        >
          {view === "landing" ? (
            <>
              <div className="mb-6 flex flex-col items-center gap-2.5">
                <CarbonTrailLogo size="lg" />
                <p className="text-lg font-bold tracking-tight" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
                  CarbonTrail AI
                </p>
              </div>

              <h1
                className="mb-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl"
                style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}
              >
                See the invisible impact of your daily life
              </h1>

              <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed sm:text-base" style={{ color: P.mutedText }}>
                Track your carbon footprint and see how your lifestyle impacts the world.
              </p>

              <div className="mx-auto flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={handleGetStarted}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto"
                  style={{ background: P.green, fontFamily: DISPLAY_FONT, outlineColor: P.green }}
                >
                  Start as Guest
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={openSignIn}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border px-6 py-3.5 text-sm font-semibold transition-all hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto"
                  style={{ color: P.charcoal, borderColor: "#D4C8B8", outlineColor: P.green }}
                >
                  <User size={17} aria-hidden="true" />
                  Sign In
                </button>
              </div>

              <p className="mt-4 text-xs font-medium" style={{ color: P.faintText }}>
                Guest mode • Local data • No signup required
              </p>
            </>
          ) : (
            <>
              <div className="mb-6 flex flex-col items-center gap-2.5 text-center">
                <CarbonTrailLogo size="lg" />
                <p className="text-lg font-bold tracking-tight" style={{ color: P.charcoal, fontFamily: DISPLAY_FONT }}>
                  CarbonTrail AI
                </p>
                <p className="text-sm" style={{ color: P.mutedText }}>
                  {mode === "signin" ? "Welcome back" : "Create your account"}
                </p>
              </div>

              <form className="space-y-4 text-left" onSubmit={handleSubmit}>
                {mode === "signup" ? (
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold" style={{ color: P.charcoal }}>
                      User name
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      autoComplete="name"
                      className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                      style={{ borderColor: P.border, background: "rgba(255,255,255,0.85)", color: P.charcoal }}
                      placeholder="Your name"
                    />
                  </label>
                ) : null}

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold" style={{ color: P.charcoal }}>
                    Email
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                    className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: P.border, background: "rgba(255,255,255,0.85)", color: P.charcoal }}
                    placeholder="you@example.com"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold" style={{ color: P.charcoal }}>
                    Password
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    required
                    minLength={6}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: P.border, background: "rgba(255,255,255,0.85)", color: P.charcoal }}
                    placeholder="At least 6 characters"
                  />
                </label>

                {error ? (
                  <p
                    className="rounded-xl border px-3 py-2 text-xs"
                    style={{ borderColor: "#efc4aa", color: "#9a3412", background: "#fff0e8" }}
                  >
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-2xl px-6 py-3.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: P.green, fontFamily: DISPLAY_FONT }}
                >
                  {busy ? "Please wait..." : mode === "signin" ? "Sign In" : "Sign Up"}
                </button>
              </form>

              <div className="mt-4 text-center text-xs" style={{ color: P.mutedText }}>
                {mode === "signin" ? (
                  <>
                    New here?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signup");
                        setError(null);
                      }}
                      className="font-semibold underline-offset-2 hover:underline"
                      style={{ color: P.green }}
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signin");
                        setError(null);
                      }}
                      className="font-semibold underline-offset-2 hover:underline"
                      style={{ color: P.green }}
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={backToLanding}
                className="mt-5 text-xs font-semibold underline-offset-2 hover:underline"
                style={{ color: P.mutedText }}
              >
                Back to welcome
              </button>

              <p className="mt-4 text-center text-[11px]" style={{ color: P.faintText }}>
                Accounts and trail data are saved on this device.
              </p>
            </>
          )}
        </main>

        <WelcomeStatsGrid />
      </div>
    </div>
  );
}
