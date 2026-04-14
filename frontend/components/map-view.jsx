"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { formatPercent } from "../lib/format.js";

export function MapView({ locations, selectedId, onSelect }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markerRefs = useRef([]);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = token;
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: getCenter(locations),
      zoom: 9.4,
      cooperativeGestures: true
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = locations.map((location) => {
      const markerElement = document.createElement("button");
      markerElement.type = "button";
      markerElement.className = `map-marker ${location.priority?.toLowerCase() || "watch"}`;
      markerElement.textContent = Math.round(location.score || 0).toString();
      markerElement.setAttribute("aria-label", `${location.name} score ${location.score}`);
      markerElement.dataset.selected = location.id === selectedId ? "true" : "false";
      markerElement.addEventListener("click", () => onSelect(location.id));

      const popup = new mapboxgl.Popup({ offset: 22 }).setHTML(
        `<strong>${escapeHtml(location.name)}</strong><br>Score ${location.score}<br>ROI ${formatPercent(location.roi_estimate)}`
      );

      return new mapboxgl.Marker(markerElement)
        .setLngLat([location.longitude, location.latitude])
        .setPopup(popup)
        .addTo(mapRef.current);
    });

    if (locations.length > 0) {
      mapRef.current.flyTo({ center: getCenter(locations), zoom: 9.4, essential: false });
    }
  }, [locations, selectedId, onSelect]);

  if (!token) {
    return (
      <div className="grid min-h-[440px] place-items-center rounded-lg border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="max-w-md">
          <p className="text-sm font-bold uppercase text-emerald-700">Mapbox token required</p>
          <h2 className="mt-2 text-2xl font-black text-zinc-950">Set NEXT_PUBLIC_MAPBOX_TOKEN</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            The location portfolio is ready. Add a Mapbox public token to render the interactive deployment map.
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="min-h-[520px] overflow-hidden rounded-lg border border-zinc-200" />;
}

function getCenter(locations) {
  if (!locations.length) {
    return [-83.0458, 42.3314];
  }

  const totals = locations.reduce(
    (sum, location) => ({
      latitude: sum.latitude + Number(location.latitude),
      longitude: sum.longitude + Number(location.longitude)
    }),
    { latitude: 0, longitude: 0 }
  );

  return [totals.longitude / locations.length, totals.latitude / locations.length];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}
