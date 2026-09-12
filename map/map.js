// ======================================================
// LEAFLET MAP
// ======================================================

let map = null;

let searchLayer = null;


export function initMap() {
  const mapElement =
    document.getElementById("map");

  if (!mapElement) {
    throw new Error(
      'Map element "#map" was not found.'
    );
  }

  if (typeof L === "undefined") {
    throw new Error(
      "Leaflet has not loaded."
    );
  }

  map =
    L.map("map", {
      zoomControl: true
    });

  map.setView(
    [1.3521, 103.8198],
    12
  );

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,

      attribution:
        "&copy; OpenStreetMap contributors"
    }
  ).addTo(map);

  searchLayer =
    L.layerGroup()
      .addTo(map);

  // Important when the map sits inside complex CSS layouts.
  setTimeout(
    () => {
      map.invalidateSize();
    },
    100
  );

  return map;
}


export function getMap() {
  return map;
}


export function moveMapTo(
  lat,
  lon,
  zoom = 16
) {
  if (!map) {
    return;
  }

  map.setView(
    [lat, lon],
    zoom
  );

  setTimeout(
    () => {
      map.invalidateSize();
    },
    50
  );
}


export function clearMapResults() {
  if (searchLayer) {
    searchLayer.clearLayers();
  }
}


export function drawSearchResults(
  origin,
  results,
  radius
) {
  if (!map || !searchLayer) {
    return;
  }

  clearMapResults();

  const bounds = [
    [origin.lat, origin.lon]
  ];

  const originMarker =
    L.marker(
      [
        origin.lat,
        origin.lon
      ]
    );

  originMarker.bindPopup(
    `
      <strong>
        ${origin.name}
      </strong>

      <br>

      ${origin.exit}
    `
  );

  searchLayer.addLayer(
    originMarker
  );

  results.forEach(result => {
    const marker =
      L.circleMarker(
        [
          result.lat,
          result.lon
        ],
        {
          radius:
            result.rank === 1
              ? 10
              : 7,

          color:
            severityColor(
              result.severity
            ),

          weight:
            result.rank === 1
              ? 4
              : 2,

          fillColor:
            "#ffffff",

          fillOpacity:
            1
        }
      );

    marker.bindPopup(
      `
        <strong>
          #${result.rank}
          ${result.name}
        </strong>

        <br><br>

        Distance:
        ${result.distance} m

        <br>

        Effective access cost:
        ${result.effectiveCost}
      `
    );

    searchLayer.addLayer(
      marker
    );

    const line =
      L.polyline(
        [
          [
            origin.lat,
            origin.lon
          ],
          [
            result.lat,
            result.lon
          ]
        ],
        {
          color:
            "#123f77",

          opacity:
            0.65,

          weight:
            2
        }
      );

    searchLayer.addLayer(
      line
    );

    bounds.push(
      [
        result.lat,
        result.lon
      ]
    );
  });

  const searchRadius =
    L.circle(
      [
        origin.lat,
        origin.lon
      ],
      {
        radius,

        color:
          "#7e9ebf",

        weight: 1,

        fillOpacity: 0
      }
    );

  searchLayer.addLayer(
    searchRadius
  );

  if (bounds.length > 1) {
    map.fitBounds(
      bounds,
      {
        padding:
          [40, 40]
      }
    );
  }

  setTimeout(
    () => {
      map.invalidateSize();
    },
    50
  );
}


function severityColor(
  severity
) {
  if (severity === "high") {
    return "#c94848";
  }

  if (severity === "medium") {
    return "#d97a1f";
  }

  return "#123f77";
}