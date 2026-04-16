"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from "../lib/supabase-client.js";
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
        <p className="brand-line">Walker-Miller Energy Services</p>
        <h1>Checking secure session</h1>
      </div>
    </main>
  );
}

function LoginPage({ supabase }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <main className="auth-page">
      <section className="auth-layout" aria-labelledby="login-title">
        <div className="auth-intro">
          <p className="brand-line">Walker-Miller Energy Services</p>
          <h1 id="login-title">Electrification & EV Planning Agent</h1>
          <p>
            Sign in to review candidate sites, update planning data, and refresh recommendation summaries.
          </p>
        </div>

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
            <input
              className="text-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {message ? <div className="notice notice-warning">{message}</div> : null}

          <button className="button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in" : "Sign in"}
          </button>

          <p className="form-note">Accounts are created by the Supabase project admin.</p>
        </form>
      </section>
    </main>
  );
}
