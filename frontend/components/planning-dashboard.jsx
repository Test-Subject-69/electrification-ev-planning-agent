"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchLocations,
  regenerateRecommendations,
  seedLocations,
  uploadLocationsCsv
} from "../lib/api.js";
import { formatNumber, formatPercent } from "../lib/format.js";
import { MapView } from "./map-view.jsx";

export function PlanningDashboard() {
  const [locations, setLocations] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  const selectedLocation = useMemo(() => {
    return locations.find((location) => location.id === selectedId) || locations[0];
  }, [locations, selectedId]);

  const loadLocations = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const payload = await fetchLocations();
      setLocations(payload.locations || []);
      setSelectedId((current) => current || payload.locations?.[0]?.id || "");
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  async function handleSeed() {
    await runAction(async () => {
      const payload = await seedLocations();
      setLocations(payload.locations || []);
      setSelectedId(payload.locations?.[0]?.id || "");
      setMessage("Seed locations scored and saved.");
    });
  }

  async function handleUpload(event) {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }

    await runAction(async () => {
      const csv = await file.text();
      const payload = await uploadLocationsCsv(csv);
      setLocations(payload.locations || []);
      setSelectedId(payload.locations?.[0]?.id || "");
      setMessage("Uploaded locations scored and saved.");
    });
  }

  async function handleRegenerate() {
    await runAction(async () => {
      const payload = await regenerateRecommendations();
      setLocations(payload.locations || []);
      setMessage("Recommendation summaries refreshed.");
    });
  }

  async function runAction(action) {
    setIsLoading(true);
    setMessage("");

    try {
      await action();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase text-emerald-700">Walker-Miller Energy Services</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-black leading-tight text-zinc-950 sm:text-4xl">
            Electrification & EV Planning Agent
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-lg bg-emerald-700 px-4 py-3 text-sm font-black text-white" onClick={handleSeed}>
            Seed Locations
          </button>
          <label className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-black text-zinc-950">
            Upload CSV
            <input className="sr-only" type="file" accept=".csv" onChange={handleUpload} />
          </label>
          <button
            className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-black text-zinc-950"
            onClick={handleRegenerate}
          >
            Refresh AI Summaries
          </button>
        </div>
      </header>

      {message ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-zinc-800">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="Locations" value={locations.length} />
        <Metric label="Average Score" value={formatNumber(average(locations.map((location) => location.score)))} />
        <Metric label="High Priority" value={locations.filter((location) => location.priority === "High").length} />
        <Metric label="Average ROI" value={formatPercent(average(locations.map((location) => location.roi_estimate)))} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.45fr_0.55fr]">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase text-emerald-700">Deployment Geography</p>
              <h2 className="text-xl font-black text-zinc-950">Scored Location Map</h2>
            </div>
            {isLoading ? <span className="text-sm font-bold text-zinc-500">Loading</span> : null}
          </div>
          <MapView locations={locations} selectedId={selectedLocation?.id} onSelect={setSelectedId} />
        </div>

        <aside className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          {selectedLocation ? <LocationDetail location={selectedLocation} /> : <EmptyState />}
        </aside>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.58fr_0.42fr]">
        <LocationTable locations={locations} selectedId={selectedLocation?.id} onSelect={setSelectedId} />
        <Recommendations locations={locations} />
      </section>
    </main>
  );
}

function Metric({ label, value }) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-zinc-500">{label}</p>
      <strong className="mt-2 block text-3xl font-black text-zinc-950">{value}</strong>
    </article>
  );
}

function LocationDetail({ location }) {
  return (
    <div>
      <p className="text-xs font-black uppercase text-emerald-700">Selected Location</p>
      <h2 className="mt-2 text-2xl font-black text-zinc-950">{location.name}</h2>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Detail label="Score" value={formatNumber(location.score)} />
        <Detail label="Priority" value={location.priority} />
        <Detail label="ROI" value={formatPercent(location.roi_estimate)} />
        <Detail label="Grid" value={formatPercent(location.grid_readiness)} />
        <Detail label="Demand" value={formatNumber(location.energy_demand)} />
        <Detail label="Traffic" value={formatNumber(location.traffic_score)} />
      </div>
      <p className="mt-5 text-sm leading-6 text-zinc-600">{location.recommendation_summary}</p>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-lg bg-emerald-50 p-3">
      <dt className="text-xs font-bold uppercase text-emerald-700">{label}</dt>
      <dd className="mt-1 text-lg font-black text-zinc-950">{value}</dd>
    </div>
  );
}

function LocationTable({ locations, selectedId, onSelect }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-black uppercase text-emerald-700">Ranked Pipeline</p>
        <h2 className="text-xl font-black text-zinc-950">Candidate Locations</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-zinc-200 text-xs font-black uppercase text-zinc-500">
              <th className="py-3 pr-4">Rank</th>
              <th className="py-3 pr-4">Location</th>
              <th className="py-3 pr-4">Score</th>
              <th className="py-3 pr-4">Priority</th>
              <th className="py-3 pr-4">ROI</th>
              <th className="py-3 pr-4">Grid</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((location, index) => (
              <tr key={location.id} className={location.id === selectedId ? "bg-emerald-50" : ""}>
                <td className="border-b border-zinc-100 py-3 pr-4 font-black">{index + 1}</td>
                <td className="border-b border-zinc-100 py-3 pr-4">
                  <button className="text-left font-black text-zinc-950" onClick={() => onSelect(location.id)}>
                    {location.name}
                  </button>
                </td>
                <td className="border-b border-zinc-100 py-3 pr-4">{formatNumber(location.score)}</td>
                <td className="border-b border-zinc-100 py-3 pr-4">{location.priority}</td>
                <td className="border-b border-zinc-100 py-3 pr-4">{formatPercent(location.roi_estimate)}</td>
                <td className="border-b border-zinc-100 py-3 pr-4">{formatPercent(location.grid_readiness)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Recommendations({ locations }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-black uppercase text-emerald-700">AI Planning Notes</p>
        <h2 className="text-xl font-black text-zinc-950">Recommendations</h2>
      </div>
      <div className="grid gap-3">
        {locations.slice(0, 4).map((location) => (
          <article key={location.id} className="rounded-lg border border-zinc-200 p-4">
            <h3 className="font-black text-zinc-950">{location.name}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{location.recommendation_summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="grid min-h-[240px] place-items-center text-center">
      <div>
        <p className="text-sm font-black uppercase text-emerald-700">No locations loaded</p>
        <p className="mt-2 text-sm text-zinc-600">Seed or upload location data to start planning.</p>
      </div>
    </div>
  );
}

function average(values) {
  const validValues = values.map(Number).filter(Number.isFinite);
  if (!validValues.length) {
    return 0;
  }

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Unable to complete the request.";
}
