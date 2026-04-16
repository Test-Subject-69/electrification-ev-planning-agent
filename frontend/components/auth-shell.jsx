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
    <main className="grid min-h-screen place-items-center px-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <p className="text-xs font-black uppercase text-emerald-700">Walker-Miller Energy Services</p>
        <h1 className="mt-2 text-2xl font-black text-zinc-950">Checking secure session</h1>
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
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase text-emerald-700">Walker-Miller Energy Services</p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-zinc-950">
          Electrification & EV Planning Agent
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Sign in with the account created in Supabase to view planning locations, ROI, and recommendations.
        </p>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-bold text-zinc-700">
            Email
            <input
              className="rounded-lg border border-zinc-300 px-3 py-3 text-zinc-950 outline-emerald-700"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-zinc-700">
            Password
            <input
              className="rounded-lg border border-zinc-300 px-3 py-3 text-zinc-950 outline-emerald-700"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {message ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-zinc-800">
              {message}
            </div>
          ) : null}

          <button
            className="rounded-lg bg-emerald-700 px-4 py-3 text-sm font-black text-white disabled:bg-zinc-400"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in" : "Sign In"}
          </button>
        </form>

        <p className="mt-5 text-xs leading-5 text-zinc-500">
          No registration is available in this MVP. Accounts are created by the Supabase project admin.
        </p>
      </section>
    </main>
  );
}
