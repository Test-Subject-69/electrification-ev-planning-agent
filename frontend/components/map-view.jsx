"use client";

import { useEffect, useRef, useState } from "react";
import { formatPercent } from "../lib/format.js";

const DEFAULT_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_ATTRIBUTION = "&copy; OpenStreetMap contributors";

export function MapView({ locations, selectedId, onSelect }) {
  const [leaflet, setLeaflet] = useState(null);
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markerRefs = useRef([]);
  const tileUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL || DEFAULT_TILE_URL;
  const attribution = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || DEFAULT_ATTRIBUTION;

  useEffect(() => {
    let isMounted = true;

    import("leaflet").then((module) => {
      if (isMounted) {
        setLeaflet(module.default);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!leaflet || !containerRef.current || mapRef.current) {
      return;
    }

    const map = leaflet.map(containerRef.current, {
      center: getCenter(locations),
      zoom: 9,
      scrollWheelZoom: false
    });

    tileLayerRef.current = leaflet.tileLayer(tileUrl, {
      attribution,
      maxZoom: 19
    }).addTo(map);

    mapRef.current = map;

    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      mapRef.current?.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
    };
  }, [attribution, leaflet, tileUrl]);

  useEffect(() => {
    if (!leaflet || !mapRef.current) {
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

      const popup = leaflet.popup({ offset: [0, -14] }).setContent(
        `<strong>${escapeHtml(location.name)}</strong><br>Score ${location.score}<br>ROI ${formatPercent(location.roi_estimate)}`
      );

      return leaflet.marker([location.latitude, location.longitude], {
        icon: leaflet.divIcon({
          className: "",
          html: markerElement,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          popupAnchor: [0, -16]
        })
      })
        .bindPopup(popup)
        .addTo(mapRef.current);
    });

    if (locations.length > 0) {
      mapRef.current.setView(getCenter(locations), 9);
    }
  }, [leaflet, locations, selectedId, onSelect]);

  return <div ref={containerRef} className="min-h-[520px] overflow-hidden rounded-lg border border-zinc-200" />;
}

function getCenter(locations) {
  if (!locations.length) {
    return [42.3314, -83.0458];
  }

  const totals = locations.reduce(
    (sum, location) => ({
      latitude: sum.latitude + Number(location.latitude),
      longitude: sum.longitude + Number(location.longitude)
    }),
    { latitude: 0, longitude: 0 }
  );

  return [totals.latitude / locations.length, totals.longitude / locations.length];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}
