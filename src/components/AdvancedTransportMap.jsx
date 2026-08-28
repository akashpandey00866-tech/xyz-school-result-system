import { useEffect, useRef } from "react";

const MILKIPUR_CENTER = [26.59, 81.84];

function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) return resolve(window.L);

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    css.dataset.transportLeaflet = "true";

    if (
      !document.querySelector(
        'link[data-transport-leaflet="true"]'
      )
    ) {
      css.dataset.transportLeaflet = "true";
      document.head.appendChild(css);
    }

    const existing = document.querySelector(
      'script[data-transport-leaflet="true"]'
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(window.L));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.dataset.transportLeaflet = "true";

    script.onload = () => {
      if (window.L) resolve(window.L);
      else reject(new Error("Leaflet unavailable"));
    };

    script.onerror = () =>
      reject(new Error("Map library could not be loaded"));

    document.body.appendChild(script);
  });
}

function icon(L, color, text) {
  return L.divIcon({
    className: "milkpur-transport-marker",
    html: `
      <div style="
        width:36px;
        height:36px;
        border-radius:50%;
        background:${color};
        border:3px solid #fff;
        box-shadow:0 5px 16px rgba(0,0,0,.3);
        display:flex;
        align-items:center;
        justify-content:center;
        color:#fff;
        font-weight:900;
        font-size:15px;
      ">${text}</div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -34],
  });
}

export default function AdvancedTransportMap({
  schoolLocation = MILKIPUR_CENTER,
  stops = [],
  onMapClick,
  onStopRemove,
  height = 560,
  className = "",
}) {
  const mapNode = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef([]);

  useEffect(() => {
    let destroyed = false;

    loadLeaflet()
      .then((L) => {
        if (destroyed || !mapNode.current) return;

        const map = L.map(mapNode.current, {
          center: MILKIPUR_CENTER,
          zoom: 12,
          minZoom: 9,
          maxZoom: 18,
          scrollWheelZoom: true,
          zoomControl: true,
        });

        L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom: 19,
            attribution:
              "&copy; OpenStreetMap contributors",
          }
        ).addTo(map);

        L.marker(schoolLocation, {
          icon: icon(L, "#dc2626", "🏫"),
        })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:200px">
              <strong>🏫 XYZ PUBLIC SCHOOL</strong>
              <div style="margin-top:5px;color:#64748b;font-size:12px">
                School transport destination
              </div>
            </div>
          `);

        map.on("click", (e) => {
          onMapClick?.({
            latitude: e.latlng.lat,
            longitude: e.latlng.lng,
          });
        });

        mapRef.current = map;

        setTimeout(() => {
          map.invalidateSize();
          map.setView(MILKIPUR_CENTER, 12);
        }, 100);
      })
      .catch((error) => {
        console.error("Milkipur map:", error);
      });

    return () => {
      destroyed = true;
      layersRef.current.forEach((layer) => {
        try {
          layer.remove();
        } catch {}
      });
      layersRef.current = [];

      try {
        mapRef.current?.remove();
      } catch {}

      mapRef.current = null;
    };
  }, [schoolLocation, onMapClick]);

  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;

    if (!map || !L) return;

    layersRef.current.forEach((layer) => {
      try {
        layer.remove();
      } catch {}
    });
    layersRef.current = [];

    const validStops = (stops || [])
      .filter(
        (stop) =>
          Number.isFinite(Number(stop.latitude)) &&
          Number.isFinite(Number(stop.longitude))
      )
      .sort(
        (a, b) =>
          Number(a.order || 0) -
          Number(b.order || 0)
      );

    validStops.forEach((stop, index) => {
      const marker = L.marker(
        [
          Number(stop.latitude),
          Number(stop.longitude),
        ],
        {
          icon: icon(
            L,
            "#7c3aed",
            String(
              Number(stop.order) || index + 1
            )
          ),
        }
      ).addTo(map);

      marker.bindPopup(`
        <div style="min-width:210px">
          <strong>🚌 Stop ${
            Number(stop.order) || index + 1
          }</strong>
          <div style="margin-top:6px;font-weight:800">
            ${
              stop.name ||
              stop.villageName ||
              stop.locality ||
              "Pickup Stop"
            }
          </div>
          <div style="margin-top:4px;color:#64748b;font-size:11px">
            ${Number(stop.latitude).toFixed(6)},
            ${Number(stop.longitude).toFixed(6)}
          </div>
          ${
            onStopRemove
              ? `<button data-remove-stop="1"
                   style="
                     margin-top:10px;
                     padding:7px 10px;
                     border-radius:8px;
                     border:1px solid #fecaca;
                     background:#fef2f2;
                     color:#dc2626;
                     font-weight:800;
                     cursor:pointer;
                   ">
                   Remove Stop
                 </button>`
              : ""
          }
        </div>
      `);

      marker.on("popupopen", () => {
        const button =
          marker
            .getPopup()
            ?.getElement()
            ?.querySelector(
              '[data-remove-stop="1"]'
            );

        if (button) {
          button.onclick = () => {
            onStopRemove?.(stop, index);
            marker.closePopup();
          };
        }
      });

      layersRef.current.push(marker);
    });

    if (validStops.length) {
      const routePoints = [
        schoolLocation,
        ...validStops.map((stop) => [
          Number(stop.latitude),
          Number(stop.longitude),
        ]),
      ];

      const route = L.polyline(
        routePoints,
        {
          color: "#2563eb",
          weight: 5,
          opacity: 0.85,
          dashArray: "10 8",
          lineJoin: "round",
        }
      ).addTo(map);

      layersRef.current.push(route);
    }
  }, [
    stops,
    schoolLocation,
    onStopRemove,
  ]);

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg ${className}`}
      style={{ height }}
    >
      <div className="absolute left-4 top-4 z-[999] max-w-[280px] rounded-2xl border border-white/70 bg-white/95 px-4 py-3 shadow-xl backdrop-blur">
        <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">
          AYODHYA • MILKIPUR REGION
        </p>

        <p className="mt-1 text-sm font-black text-slate-900">
          🗺️ Full Milkipur Transport Area
        </p>

        <p className="mt-1 text-[10px] leading-4 text-slate-500">
          Zoom out to explore the complete Milkipur area.
          Zoom in for villages and pickup locations.
        </p>

        <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-black">
          <span className="rounded-full bg-red-50 px-2 py-1 text-red-600">
            🏫 School
          </span>
          <span className="rounded-full bg-violet-50 px-2 py-1 text-violet-600">
            🚌 Stops
          </span>
          <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-600">
            Route
          </span>
        </div>
      </div>

      <div
        ref={mapNode}
        className="h-full w-full"
      />
    </div>
  );
}
