"use client";

import { useEffect, useRef, useState } from "react";
import { formatPercent } from "../lib/format.js";

const DEFAULT_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_ATTRIBUTION = "&copy; OpenStreetMap contributors";
const DEFAULT_ZOOM = 9;
const SELECTED_LOCATION_ZOOM = 14;

export function MapView({ locations, selectedId, onSelect }) {
  const [leaflet, setLeaflet] = useState(null);
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markerRefs = useRef([]);
  const locationKeyRef = useRef("");
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
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: true
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
      const latLng = [location.latitude, location.longitude];
      const markerElement = document.createElement("button");
      markerElement.type = "button";
      markerElement.className = `map-marker ${location.priority?.toLowerCase() || "watch"}`;
      markerElement.textContent = Math.round(location.score || 0).toString();
      markerElement.setAttribute("aria-label", `${location.name} score ${location.score}`);
      markerElement.dataset.selected = location.id === selectedId ? "true" : "false";

      const popup = leaflet.popup({ offset: [0, -14] }).setContent(
        `<strong>${escapeHtml(location.name)}</strong><br>Score ${location.score}<br>ROI ${formatPercent(location.roi_estimate)}`
      );

      const marker = leaflet.marker(latLng, {
        icon: leaflet.divIcon({
          className: "",
          html: markerElement,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          popupAnchor: [0, -16]
        })
      }).bindPopup(popup);

      marker.on("click", () => {
        onSelect(location.id);
        mapRef.current?.flyTo(latLng, SELECTED_LOCATION_ZOOM, { duration: 0.75 });
        marker.openPopup();
      });

      return marker.addTo(mapRef.current);
    });

    const locationKey = getLocationKey(locations);
    if (locations.length > 0 && locationKeyRef.current !== locationKey) {
      locationKeyRef.current = locationKey;
      mapRef.current.setView(getCenter(locations), DEFAULT_ZOOM);
    }
  }, [leaflet, locations, selectedId, onSelect]);

  return <div ref={containerRef} className="map-canvas" />;
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

function getLocationKey(locations) {
  return locations
    .map((location) => `${location.id}:${location.latitude}:${location.longitude}`)
    .join("|");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}
