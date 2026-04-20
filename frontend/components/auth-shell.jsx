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

const CAPABILITIES = [
  {
    title: "Utility program implementation",
    text: "Field execution, customer engagement, reporting, and delivery support for complex energy programs."
  },
  {
    title: "Electrification planning",
    text: "EV charging, building electrification, and readiness insights shaped by geography, demand, and grid signals."
  },
  {
    title: "Workforce development",
    text: "Training pathways and community-centered participation that expand access to clean energy careers."
  },
  {
    title: "Data and performance operations",
    text: "Dashboards, scoring models, and executive-ready summaries that make program decisions easier to trust."
  }
];

const IMPACT_METRICS = [
  { value: "25+", label: "years supporting utility and public-sector programs" },
  { value: "4", label: "planning signals connected across sites, communities, and infrastructure" },
  { value: "1", label: "clear operating view for strategy, program, and leadership teams" }
];

const PROCESS_STEPS = [
  {
    title: "Map the opportunity",
    text: "Collect site, community, demand, and readiness data into one planning view."
  },
  {
    title: "Score the portfolio",
    text: "Rank candidate locations with clear weights, risk flags, and comparison logic."
  },
  {
    title: "Prepare the decision",
    text: "Turn verified metrics into recommendations, next steps, and partner-ready narratives."
  }
];

const PROGRAMS = [
  {
    title: "EV infrastructure planning",
    text: "Identify charging candidates with score, ROI, risk, readiness, and AI-supported explanation.",
    image: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Community-centered implementation",
    text: "Coordinate field work, participation, and reporting in ways that keep residents and partners informed.",
    image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Utility-grade program operations",
    text: "Support planning cycles with structured data, consistent governance, and executive-ready summaries.",
    image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=900&q=80"
  }
];

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
    <main className="brand-home">
      <nav className="site-nav" aria-label="Walker-Miller website navigation">
        <a className="site-logo-link" href="#top" aria-label="Walker-Miller Energy Services home">
          <BrandLogo />
        </a>
        <div className="site-nav-links">
          <a href="#capabilities">Capabilities</a>
          <a href="#impact">Impact</a>
          <a href="#process">Process</a>
          <a href="#programs">Programs</a>
        </div>
        <a className="button-primary nav-cta" href="#access">Sign in</a>
      </nav>

      <section id="top" className="brand-hero" aria-labelledby="homepage-title">
        <img
          className="hero-image"
          src="https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1800&q=80"
          alt="Utility infrastructure supporting clean energy programs"
        />
        <div className="hero-content">
          <h1 id="homepage-title">Clean energy programs built for communities and utility-scale execution.</h1>
          <p>
            Walker-Miller Energy Services helps teams plan, implement, and explain electrification work with clear data,
            operational discipline, and a focus on people.
          </p>
          <div className="hero-actions">
            <a className="button-primary" href="#access">Open planning agent</a>
            <a className="button-secondary" href="#capabilities">View capabilities</a>
          </div>
        </div>
      </section>

      <section id="capabilities" className="home-section">
        <div className="section-copy">
          <h2>Programs that connect infrastructure, customers, and outcomes.</h2>
          <p>
            The work spans field delivery, electrification, workforce participation, and the reporting discipline needed
            by utilities and funding partners.
          </p>
        </div>
        <div className="capability-grid">
          {CAPABILITIES.map((item) => (
            <article className="home-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="impact" className="home-section impact-section">
        <div className="section-copy">
          <h2>Simple decisions from complex operating signals.</h2>
          <p>
            Leadership teams need a clear view of where investment, readiness, demand, and community value come together.
          </p>
        </div>
        <div className="impact-grid">
          {IMPACT_METRICS.map((metric) => (
            <div className="impact-item" key={metric.value}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="process" className="home-section process-section">
        <div className="section-copy">
          <h2>A planning flow that stays explainable.</h2>
          <p>
            The EV Planning Agent keeps scoring deterministic, then uses AI to summarize the verified data for faster
            executive review.
          </p>
        </div>
        <div className="process-flow">
          {PROCESS_STEPS.map((step, index) => (
            <article className="process-step" key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="programs" className="home-section">
        <div className="section-copy">
          <h2>Program views for partners, utilities, and funding conversations.</h2>
          <p>
            The homepage language stays clear for external audiences while the planning tool supports operational detail.
          </p>
        </div>
        <div className="program-grid">
          {PROGRAMS.map((program) => (
            <article className="program-card" key={program.title}>
              <img src={program.image} alt="" />
              <div>
                <h3>{program.title}</h3>
                <p>{program.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="access" className="home-section access-section" aria-labelledby="login-title">
        <div className="access-copy">
          <h2 id="login-title">Electrification & EV Planning Agent</h2>
          <p>
            Sign in to review candidate sites, compare investment options, and prepare recommendation summaries.
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
