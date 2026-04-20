"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from "../lib/supabase-client.js";
import { BrandLogo } from "./brand-logo.jsx";
import { PlanningDashboard } from "./planning-dashboard.jsx";

export function AuthShell() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsCheckingSession(false);
      return undefined;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session || null);
        setIsCheckingSession(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsCheckingSession(false);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSignOut() {
    if (!supabase) {
      setSession(null);
      return;
    }

    await supabase.auth.signOut();
    setSession(null);
  }

  if (isCheckingSession) {
    return <SessionLoading />;
  }

  if (!session) {
    return <LoginPage supabase={supabase} />;
  }

  return (
    <PlanningDashboard
      accessToken={session.access_token}
      currentUserEmail={session.user?.email || ""}
      onSignOut={handleSignOut}
    />
  );
}

function SessionLoading() {
  return (
    <main className="auth-page">
      <div className="auth-status" aria-live="polite">
        <BrandLogo className="auth-logo" />
        <h1>Checking secure session</h1>
      </div>
    </main>
  );
}

function LoginPage({ supabase }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (!isSupabaseAuthConfigured() || !supabase) {
      setMessage("Supabase login is not configured. Add the public Supabase URL and publishable key.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setMessage(error.message || "Login failed.");
    }

    setIsSubmitting(false);
  }

  return (
    <main className="auth-split">
      <aside className="auth-split-visual" aria-hidden="true">
        <div className="auth-split-glow" />
        <div className="auth-split-visual-content">
          <BrandLogo className="auth-split-logo" />
          <h1 className="auth-split-title">
            Electrification &amp;<br />
            <strong>EV Planning Agent</strong>
          </h1>
          <p className="auth-split-tagline">
            Scored sites, comparison-ready metrics, and executive-ready explanations for EV infrastructure decisions.
          </p>
        </div>
      </aside>

      <section className="auth-split-form-panel" aria-labelledby="login-title">
        <div className="auth-split-form-inner">
          <header className="auth-split-form-header">
            <h2 id="login-title">Sign in to your account</h2>
            <p>Enter your credentials to continue</p>
          </header>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span>Email</span>
              <input
                className="text-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="form-field">
              <span>Password</span>
              <div className="password-wrapper">
                <input
                  className="text-input"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            {message ? <div className="notice notice-warning">{message}</div> : null}

            <button className="button-primary auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in" : "Sign in"}
            </button>

            <p className="form-note">Accounts are created by the Supabase project admin.</p>
          </form>
        </div>
      </section>
    </main>
  );
}
