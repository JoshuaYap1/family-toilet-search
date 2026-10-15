// ============================================================
// YOUNG FAMILY URBAN ACCESS — V4 FRONTEND CONTROLLER
//
// IMPORTANT:
//
// - compiler = lightweight route / ML metadata
// - fullAnalysis = COMPLETE V4 image dataset
//
// The analysis panel ALWAYS receives images from fullAnalysis.
//
// This prevents the 10 × 10 grids from receiving only one
// representative compiler image.
// ============================================================


import {
  renderJourneyAnalysis
} from "./ui/journeyAnalysisPanel.js";


// ============================================================
// DATA PATHS
// ============================================================

const COMPILER_URL =
  "./data/generated/image_compiler_route_v4.json";


const FULL_ANALYSIS_URL =
  "./data/generated/image_analysis_route_v4.json";


const ROUTE_GEOMETRY_URL =
  "./data/generated/route_intelligence/latest_batch.json";


// ============================================================
// APPLICATION STATE
// ============================================================

let compiler =
  null;


let fullAnalysis =
  null;


let map =
  null;


let routeLayer =
  null;


let markerLayer =
  null;


let checkpointLayer =
  null;


let selectedMrt =
  null;


let selectedRoute =
  null;


let stationRoutes =
  [];


const routeGeometryIndex =
  new Map();


// ============================================================
// DOM
// ============================================================

const mapHero =
  document.getElementById(
    "mapHero"
  );


const mapShade =
  document.getElementById(
    "mapShade"
  );


const mrtSelect =
  document.getElementById(
    "mrtSelect"
  );


const journeyList =
  document.getElementById(
    "journeyList"
  );


const routeCountLabel =
  document.getElementById(
    "routeCountLabel"
  );


const mrtContextCard =
  document.getElementById(
    "mrtContextCard"
  );


const routeSelectionStatus =
  document.getElementById(
    "routeSelectionStatus"
  );


const analyseJourneyButton =
  document.getElementById(
    "analyseJourneyButton"
  );


const scrollToAnalysisButton =
  document.getElementById(
    "scrollToAnalysisButton"
  );


const analysis =
  document.getElementById(
    "analysis"
  );


const analysisJourneyTitle =
  document.getElementById(
    "analysisJourneyTitle"
  );


const analysisJourneySubtitle =
  document.getElementById(
    "analysisJourneySubtitle"
  );


const analysisHeadlineMetrics =
  document.getElementById(
    "analysisHeadlineMetrics"
  );


const journeyAnalysisRoot =
  document.getElementById(
    "journeyAnalysisRoot"
  );


const heroImageCount =
  document.getElementById(
    "heroImageCount"
  );


const heroClusterCount =
  document.getElementById(
    "heroClusterCount"
  );


const heroRouteCount =
  document.getElementById(
    "heroRouteCount"
  );


const heroJourneyCount =
  document.getElementById(
    "heroJourneyCount"
  );


const datasetPill =
  document.getElementById(
    "datasetPill"
  );


// ============================================================
// START
// ============================================================

startApplication();


async function startApplication() {

  try {

    initialiseMap();


    [
      compiler,
      fullAnalysis
    ] = await Promise.all(
      [
        loadJSON(
          COMPILER_URL
        ),

        loadJSON(
          FULL_ANALYSIS_URL
        )
      ]
    );


    await loadRouteGeometry();


    console.log(
      "V4 datasets loaded",
      {
        compilerImages:
          Array.isArray(
            compiler?.allImages
          )
            ?
            compiler.allImages.length
            :
            0,

        fullImages:
          Array.isArray(
            fullAnalysis?.images
          )
            ?
            fullAnalysis.images.length
            :
            0,

        routes:
          Array.isArray(
            compiler?.routes
          )
            ?
            compiler.routes.length
            :
            0
      }
    );


    populateDatasetStats();

    populateMrtSelect();

    bindEvents();

    selectInitialMrt();

  }
  catch (
    error
  ) {

    console.error(
      "Application startup failed:",
      error
    );


    if (
      journeyAnalysisRoot
    ) {

      journeyAnalysisRoot.innerHTML = `

        <div class="analysis-placeholder">

          <span>
            DATA ERROR
          </span>

          <h3>
            V4 analysis could not be loaded.
          </h3>

          <p>
            ${escapeHTML(
              error.message
            )}
          </p>

        </div>

      `;

    }

  }

}


// ============================================================
// JSON
// ============================================================

async function loadJSON(
  url
) {

  const response =
    await fetch(
      `${url}?t=${Date.now()}`,
      {
        cache:
          "no-store"
      }
    );


  if (
    !response.ok
  ) {

    throw new Error(
      `Could not load ${url} (${response.status})`
    );

  }


  return response.json();

}


// ============================================================
// ROUTE GEOMETRY
// ============================================================

async function loadRouteGeometry() {

  try {

    const payload =
      await loadJSON(
        ROUTE_GEOMETRY_URL
      );


    const routes =
      extractRouteArray(
        payload
      );


    routes.forEach(
      route => {

        if (
          route?.routeId
        ) {

          routeGeometryIndex.set(
            String(
              route.routeId
            ),
            route
          );

        }

      }
    );


    console.log(
      "Precise route geometries:",
      routeGeometryIndex.size
    );

  }
  catch (
    error
  ) {

    console.warn(
      "Precise route geometry unavailable. " +
      "V4 image coordinates will be used instead.",
      error
    );

  }

}


function extractRouteArray(
  payload
) {

  if (
    Array.isArray(
      payload
    )
  ) {

    return payload;

  }


  if (
    !payload ||
    typeof payload !==
    "object"
  ) {

    return [];

  }


  const possibleKeys =
    [
      "results",
      "routes",
      "data",
      "items"
    ];


  for (
    const key
    of possibleKeys
  ) {

    if (
      Array.isArray(
        payload[
          key
        ]
      )
    ) {

      return payload[
        key
      ];

    }

  }


  if (
    payload.routeId
  ) {

    return [
      payload
    ];

  }


  return [];

}


// ============================================================
// MAP
// ============================================================

function initialiseMap() {

  if (
    typeof L ===
    "undefined"
  ) {

    throw new Error(
      "Leaflet did not load."
    );

  }


  map =
    L.map(
      "map",
      {
        zoomControl:
          true,

        attributionControl:
          true,

        preferCanvas:
          true
      }
    );


  map.setView(
    [
      1.3521,
      103.8198
    ],
    11
  );


  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom:
        19,

      attribution:
        "&copy; OpenStreetMap contributors"
    }
  ).addTo(
    map
  );


  routeLayer =
    L.layerGroup()
      .addTo(
        map
      );


  markerLayer =
    L.layerGroup()
      .addTo(
        map
      );


  checkpointLayer =
    L.layerGroup()
      .addTo(
        map
      );


  setTimeout(
    () => {
      map.invalidateSize();
    },
    180
  );

}


// ============================================================
// DATASET STATS
// ============================================================

function populateDatasetStats() {

  const fullImageCount =
    Array.isArray(
      fullAnalysis?.images
    )
      ?
      fullAnalysis.images.length
      :
      Number(
        compiler?.imageCount ||
        0
      );


  const clusterCount =
    Array.isArray(
      compiler?.clusters
    )
      ?
      compiler.clusters.length
      :
      Number(
        compiler?.clusterCount ||
        0
      );


  const routeCount =
    Array.isArray(
      compiler?.routes
    )
      ?
      compiler.routes.length
      :
      0;


  heroImageCount.textContent =
    formatInteger(
      fullImageCount
    );


  heroClusterCount.textContent =
    formatInteger(
      clusterCount
    );


  heroRouteCount.textContent =
    formatInteger(
      routeCount
    );


  datasetPill.textContent =
    `${formatInteger(fullImageCount)} images · ` +
    `${formatInteger(clusterCount)} visual types`;

}


// ============================================================
// ROUTE HELPERS
// ============================================================

function getRoutes() {

  return (
    Array.isArray(
      compiler?.routes
    )
      ?
      compiler.routes
      :
      []
  );

}


function normalizeMrtName(
  value
) {

  const text =
    String(
      value ||
      ""
    )
      .trim()
      .toUpperCase();


  if (
    !text
  ) {

    return "";

  }


  if (
    text.endsWith(
      " MRT"
    )
  ) {

    return text;

  }


  return `${text} MRT`;

}


function routeMrtName(
  route
) {

  return normalizeMrtName(
    route?.mrtName ||
    route?.station ||
    ""
  );

}


function routeHomeName(
  route
) {

  return (
    route?.homeName ||
    route?.destination ||
    "Residential destination"
  );

}


function routeDistance(
  route
) {

  const series =
    route?.routeSeriesV3 ||
    route?.routeSeries ||
    {};


  return Number(
    series.routeDistance_m ??
    route?.routeDistance_m ??
    route?.distance_m ??
    0
  );

}


// ============================================================
// IMPORTANT
// COMPLETE V4 IMAGE RECORDS FOR EXACT ROUTE
// ============================================================

function fullImagesForRoute(
  route
) {

  if (
    !route
  ) {

    return [];

  }


  const routeId =
    String(
      route.routeId ||
      ""
    );


  if (
    !routeId
  ) {

    return [];

  }


  const allImages =
    Array.isArray(
      fullAnalysis?.images
    )
      ?
      fullAnalysis.images
      :
      [];


  const matched =
    allImages

      .filter(
        image => {

          const imageRouteId =
            String(
              image?.routeId ||
              ""
            );


          return (
            imageRouteId ===
            routeId
          );

        }
      )

      .sort(
        (
          a,
          b
        ) => {

          const distanceA =
            Number(
              a?.distanceFromMrt_m ??
              0
            );


          const distanceB =
            Number(
              b?.distanceFromMrt_m ??
              0
            );


          if (
            distanceA !==
            distanceB
          ) {

            return (
              distanceA -
              distanceB
            );

          }


          const orderA =
            Number(
              a?.imageOrder ??
              0
            );


          const orderB =
            Number(
              b?.imageOrder ??
              0
            );


          return (
            orderA -
            orderB
          );

        }
      );


  console.log(
    `[V4 full images] ${routeId}: ${matched.length}`
  );


  return matched;

}


// ============================================================
// FALLBACK COMPILER IMAGES
//
// These are deliberately NOT used for the big visual matrix.
//
// They are only here for diagnostics/fallback.
// ============================================================

function compilerImagesForRoute(
  route
) {

  if (
    !route
  ) {

    return [];

  }


  const routeId =
    String(
      route.routeId ||
      ""
    );


  const allImages =
    Array.isArray(
      compiler?.allImages
    )
      ?
      compiler.allImages
      :
      [];


  return allImages

    .filter(
      image =>
        String(
          image?.routeId ||
          ""
        )
        ===
        routeId
    )

    .sort(
      (
        a,
        b
      ) =>
        Number(
          a?.distanceFromMrt_m ||
          0
        )
        -
        Number(
          b?.distanceFromMrt_m ||
          0
        )
    );

}


// ============================================================
// ROUTE IMAGE COUNT
//
// For the UI we count FULL V4 route images.
// ============================================================

function routeImageCount(
  route
) {

  return fullImagesForRoute(
    route
  ).length;

}


// ============================================================
// MRT SELECT
// ============================================================

function populateMrtSelect() {

  const stations =
    [
      ...new Set(
        getRoutes()
          .map(
            route =>
              routeMrtName(
                route
              )
          )
          .filter(
            Boolean
          )
      )
    ];


  stations.sort(
    (
      a,
      b
    ) =>
      a.localeCompare(
        b
      )
  );


  mrtSelect.innerHTML =
    stations
      .map(
        station => `
          <option value="${escapeHTML(station)}">
            ${escapeHTML(station)}
          </option>
        `
      )
      .join("");

}


// ============================================================
// INITIAL MRT
// ============================================================

function selectInitialMrt() {

  const preferred =
    [
      "JURONG EAST MRT",
      "BISHAN MRT",
      "ADMIRALTY MRT"
    ];


  const options =
    [
      ...mrtSelect.options
    ];


  const preferredOption =
    options.find(
      option =>
        preferred.includes(
          option.value
        )
    );


  if (
    preferredOption
  ) {

    mrtSelect.value =
      preferredOption.value;

  }


  selectMrt(
    mrtSelect.value
  );

}


// ============================================================
// EVENTS
// ============================================================

function bindEvents() {

  mrtSelect.addEventListener(
    "change",
    () => {

      selectMrt(
        mrtSelect.value
      );

    }
  );


  analyseJourneyButton.addEventListener(
    "click",
    () => {

      scrollToAnalysis();

    }
  );


  scrollToAnalysisButton.addEventListener(
    "click",
    () => {

      scrollToAnalysis();

    }
  );


  window.addEventListener(
    "scroll",
    handleHeroFade,
    {
      passive:
        true
    }
  );

}


// ============================================================
// SELECT MRT
// ============================================================

function selectMrt(
  name
) {

  selectedMrt =
    normalizeMrtName(
      name
    );


  selectedRoute =
    null;


  stationRoutes =
    getRoutes()

      .filter(
        route =>
          routeMrtName(
            route
          )
          ===
          selectedMrt
      )

      .sort(
        (
          a,
          b
        ) =>
          routeDistance(
            a
          )
          -
          routeDistance(
            b
          )
      );


  updateMrtContextCard();

  renderJourneyList();

  drawStationRoutes();


  routeCountLabel.textContent =
    `${stationRoutes.length} route${
      stationRoutes.length === 1
        ?
        ""
        :
        "s"
    }`;


  heroJourneyCount.textContent =
    `${stationRoutes.length} residential journey${
      stationRoutes.length === 1
        ?
        ""
        :
        "s"
    } connected to ${selectedMrt}`;


  routeSelectionStatus.textContent =
    stationRoutes.length
      ?
      "Select one residential journey."
      :
      "No residential journeys found.";


  analyseJourneyButton.disabled =
    true;


  analysisJourneyTitle.textContent =
    `${selectedMrt} → residential journeys`;


  analysisJourneySubtitle.textContent =
    "Choose one route from the map panel. " +
    "All environmental evidence will then be restricted " +
    "to that exact MRT-to-home journey.";


  analysisHeadlineMetrics.innerHTML =
    "";


  journeyAnalysisRoot.innerHTML = `

    <div class="analysis-placeholder">

      <span>
        ROUTE EVIDENCE
      </span>

      <h3>
        ${stationRoutes.length}
        residential journey${
          stationRoutes.length === 1
            ?
            ""
            :
            "s"
        } found.
      </h3>

      <p>
        Select one route to inspect its environmental profile,
        semantic segmentation and visual evidence matrix.
      </p>

    </div>

  `;

}


// ============================================================
// MRT CONTEXT
// ============================================================

function updateMrtContextCard() {

  const firstRoute =
    stationRoutes[
      0
    ];


  const somCell =
    firstRoute?.somCell ??
    "—";


  const descriptor =
    firstRoute?.contextDescriptor ||
    firstRoute?.descriptor ||
    "Residential accessibility context";


  mrtContextCard.innerHTML = `

    <strong>
      ${escapeHTML(
        descriptor
      )}
    </strong>

    <span>

      ${
        somCell !==
        "—"
          ?
          `Demographic SOM cell ${escapeHTML(somCell)} · `
          :
          ""
      }

      ${stationRoutes.length}
      residential route${
        stationRoutes.length === 1
          ?
          ""
          :
          "s"
      }.

    </span>

  `;

}


// ============================================================
// JOURNEY LIST
// ============================================================

function renderJourneyList() {

  if (
    !stationRoutes.length
  ) {

    journeyList.innerHTML = `

      <div class="hero-empty">
        No V4 route profiles are available for this MRT.
      </div>

    `;

    return;

  }


  journeyList.innerHTML =
    stationRoutes

      .map(
        route => {

          const routeId =
            String(
              route.routeId ||
              ""
            );


          const isSelected =
            selectedRoute &&
            String(
              selectedRoute.routeId
            )
            ===
            routeId;


          const imageCount =
            routeImageCount(
              route
            );


          const visualType =
            route.dominantVisualClusterLabel ||
            "Visual profile";


          return `

            <button
              class="
                hero-journey-button
                ${
                  isSelected
                    ?
                    "is-selected"
                    :
                    ""
                }
              "
              type="button"
              data-route-id="${escapeHTML(routeId)}"
            >

              <div class="hero-journey-main">

                <strong>
                  ${escapeHTML(
                    routeHomeName(
                      route
                    )
                  )}
                </strong>

                <span>
                  ${escapeHTML(
                    visualType
                  )}
                </span>

              </div>


              <div class="hero-journey-distance">

                <strong>
                  ${formatDistance(
                    routeDistance(
                      route
                    )
                  )}
                </strong>

                <span>

                  ${imageCount}

                  image${
                    imageCount === 1
                      ?
                      ""
                      :
                      "s"
                  }

                </span>

              </div>

            </button>

          `;

        }
      )

      .join("");


  journeyList
    .querySelectorAll(
      "[data-route-id]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            selectRouteById(
              button.dataset.routeId
            );

          }
        );

      }
    );

}


// ============================================================
// SELECT ROUTE
// ============================================================

function selectRouteById(
  routeId
) {

  const route =
    stationRoutes.find(
      item =>
        String(
          item.routeId
        )
        ===
        String(
          routeId
        )
    );


  if (
    !route
  ) {

    console.warn(
      "Exact route not found:",
      routeId
    );

    return;

  }


  selectedRoute =
    route;


  renderJourneyList();

  drawStationRoutes();

  updateSelectedRouteStatus();

  renderSelectedRouteAnalysis();


  analyseJourneyButton.disabled =
    false;

}


// ============================================================
// STATUS
// ============================================================

function updateSelectedRouteStatus() {

  if (
    !selectedRoute
  ) {

    return;

  }


  const imageCount =
    routeImageCount(
      selectedRoute
    );


  routeSelectionStatus.textContent =
    `${routeHomeName(selectedRoute)} · ` +
    `${formatDistance(routeDistance(selectedRoute))} · ` +
    `${imageCount} analysed image${
      imageCount === 1
        ?
        ""
        :
        "s"
    }`;

}


// ============================================================
// MAP LAYERS
// ============================================================

function clearMapLayers() {

  routeLayer.clearLayers();

  markerLayer.clearLayers();

  checkpointLayer.clearLayers();

}


// ============================================================
// DRAW ALL ROUTES FOR SELECTED MRT
// ============================================================

function drawStationRoutes() {

  clearMapLayers();


  if (
    !stationRoutes.length
  ) {

    map.setView(
      [
        1.3521,
        103.8198
      ],
      11
    );

    return;

  }


  const bounds =
    [];


  stationRoutes.forEach(
    route => {

      const routeId =
        String(
          route.routeId
        );


      const isSelected =
        selectedRoute &&
        String(
          selectedRoute.routeId
        )
        ===
        routeId;


      const points =
        geometryPointsForRoute(
          route
        );


      if (
        points.length >=
        2
      ) {

        points.forEach(
          point => {
            bounds.push(
              point
            );
          }
        );


        L.polyline(
          points,
          {
            weight:
              isSelected
                ?
                6
                :
                3,

            opacity:
              isSelected
                ?
                0.96
                :
                0.42,

            color:
              isSelected
                ?
                "#0d4d73"
                :
                "#4f91b5",

            lineCap:
              "round",

            lineJoin:
              "round"
          }
        )
          .addTo(
            routeLayer
          );

      }


      const start =
        points[
          0
        ];


      const end =
        points[
          points.length - 1
        ];


      if (
        start
      ) {

        addMrtMarker(
          start
        );

      }


      if (
        end
      ) {

        addHomeMarker(
          end,
          route,
          isSelected
        );

      }


      if (
        isSelected
      ) {

        drawImageCheckpoints(
          route
        );

      }

    }
  );


  if (
    bounds.length
  ) {

    map.fitBounds(
      bounds,
      {
        padding:
          [
            85,
            85
          ],

        maxZoom:
          15
      }
    );

  }

}


// ============================================================
// ROUTE GEOMETRY
// ============================================================

function geometryPointsForRoute(
  route
) {

  const routeId =
    String(
      route?.routeId ||
      ""
    );


  const precise =
    routeGeometryIndex.get(
      routeId
    );


  if (
    precise &&
    Array.isArray(
      precise.checkpoints
    )
  ) {

    const points =
      precise.checkpoints

        .map(
          checkpoint => {

            const lat =
              Number(
                checkpoint.lat
              );


            const lon =
              Number(
                checkpoint.lon
              );


            if (
              !Number.isFinite(
                lat
              ) ||
              !Number.isFinite(
                lon
              )
            ) {

              return null;

            }


            return [
              lat,
              lon
            ];

          }
        )

        .filter(
          Boolean
        );


    // --------------------------------------------------------
    // Earlier residential routes were stored HOME -> MRT.
    // Research convention is MRT -> HOME.
    // --------------------------------------------------------

    if (
      routeId
        .toLowerCase()
        .startsWith(
          "residential"
        )
    ) {

      points.reverse();

    }


    if (
      points.length
    ) {

      return points;

    }

  }


  // ----------------------------------------------------------
  // Fallback to COMPLETE V4 image coordinates.
  // ----------------------------------------------------------

  return fullImagesForRoute(
    route
  )

    .map(
      image => {

        const lat =
          Number(
            image.checkpointLat ??
            image.imageLat
          );


        const lon =
          Number(
            image.checkpointLon ??
            image.imageLon
          );


        if (
          !Number.isFinite(
            lat
          ) ||
          !Number.isFinite(
            lon
          )
        ) {

          return null;

        }


        return [
          lat,
          lon
        ];

      }
    )

    .filter(
      Boolean
    );

}


// ============================================================
// MARKER ICON
// ============================================================

function markerIcon(
  type,
  selected = false
) {

  return L.divIcon(
    {
      className:
        "",

      html: `
        <div
          class="
            map-marker
            map-marker-${type}
            ${
              selected
                ?
                "is-selected"
                :
                ""
            }
          "
        ></div>
      `,

      iconSize:
        [
          20,
          20
        ],

      iconAnchor:
        [
          10,
          10
        ]
    }
  );

}


// ============================================================
// MRT MARKER
// ============================================================

function addMrtMarker(
  point
) {

  const alreadyExists =
    markerLayer
      .getLayers()
      .some(
        layer =>
          layer
            ?.options
            ?.yfMarkerType
          ===
          "mrt"
      );


  if (
    alreadyExists
  ) {

    return;

  }


  const marker =
    L.marker(
      point,
      {
        icon:
          markerIcon(
            "mrt"
          ),

        yfMarkerType:
          "mrt"
      }
    );


  marker.bindTooltip(
    selectedMrt,
    {
      direction:
        "top"
    }
  );


  marker.addTo(
    markerLayer
  );

}


// ============================================================
// HOME MARKER
// ============================================================

function addHomeMarker(
  point,
  route,
  isSelected
) {

  L.marker(
    point,
    {
      icon:
        markerIcon(
          "home",
          isSelected
        )
    }
  )

    .bindTooltip(
      `${routeHomeName(route)} · ${formatDistance(routeDistance(route))}`,
      {
        direction:
          "top"
      }
    )

    .on(
      "click",
      () => {

        selectRouteById(
          route.routeId
        );

      }
    )

    .addTo(
      markerLayer
    );

}


// ============================================================
// IMAGE CHECKPOINTS
// ============================================================

function drawImageCheckpoints(
  route
) {

  const images =
    fullImagesForRoute(
      route
    );


  images.forEach(
    image => {

      const lat =
        Number(
          image.checkpointLat ??
          image.imageLat
        );


      const lon =
        Number(
          image.checkpointLon ??
          image.imageLon
        );


      if (
        !Number.isFinite(
          lat
        ) ||
        !Number.isFinite(
          lon
        )
      ) {

        return;

      }


      L.circleMarker(
        [
          lat,
          lon
        ],
        {
          radius:
            3,

          weight:
            1,

          color:
            "#ffffff",

          fillColor:
            "#b4527e",

          fillOpacity:
            0.95
        }
      )

        .bindTooltip(
          `${formatDistance(
            Number(
              image.distanceFromMrt_m ||
              0
            )
          )} from MRT`,
          {
            direction:
              "top"
          }
        )

        .addTo(
          checkpointLayer
        );

    }
  );

}


// ============================================================
// RENDER SELECTED ROUTE
//
// CRITICAL FIX:
// Uses FULL V4 images instead of compiler representatives.
// ============================================================

function renderSelectedRouteAnalysis() {

  if (
    !selectedRoute
  ) {

    return;

  }


  const images =
    fullImagesForRoute(
      selectedRoute
    );


  const compilerImages =
    compilerImagesForRoute(
      selectedRoute
    );


  const distance =
    routeDistance(
      selectedRoute
    );


  const series =
    selectedRoute.routeSeriesV3 ||
    selectedRoute.routeSeries ||
    {};


  console.log(
    "Rendering route analysis:",
    {
      routeId:
        selectedRoute.routeId,

      mrt:
        selectedMrt,

      home:
        routeHomeName(
          selectedRoute
        ),

      routeDistance:
        distance,

      fullV4Images:
        images.length,

      compilerImages:
        compilerImages.length,

      firstFullImage:
        images[
          0
        ] || null,

      lastFullImage:
        images[
          images.length -
          1
        ] || null
    }
  );


  analysisJourneyTitle.textContent =
    `${selectedMrt} → ${routeHomeName(selectedRoute)}`;


  analysisJourneySubtitle.textContent =
    `One exact residential journey, analysed from MRT = 0 m ` +
    `to HOME = ${formatDistance(distance)}. ` +
    `The graphs and image matrices use only full V4 imagery ` +
    `belonging to this exact route.`;


  analysisHeadlineMetrics.innerHTML =
    [
      headlineMetric(
        "Route distance",
        formatDistance(
          distance
        )
      ),

      headlineMetric(
        "Route images",
        images.length
      ),

      headlineMetric(
        "Profile interval",
        `${Number(series.step_m || 15)} m`
      ),

      headlineMetric(
        "Visual type",
        selectedRoute.dominantVisualClusterLabel ||
        "—"
      )
    ].join("");


  renderJourneyAnalysis(
    {
      container:
        journeyAnalysisRoot,

      compiler,

      route:
        selectedRoute,

      // ======================================================
      // THIS IS THE IMPORTANT PART
      // ======================================================

      routeImages:
        images
    }
  );

}


// ============================================================
// SCROLL
// ============================================================

function scrollToAnalysis() {

  analysis.scrollIntoView(
    {
      behavior:
        "smooth",

      block:
        "start"
    }
  );

}


// ============================================================
// HERO FADE
// ============================================================

function handleHeroFade() {

  const viewportHeight =
    Math.max(
      1,
      window.innerHeight
    );


  const progress =
    Math.min(
      1,
      Math.max(
        0,
        window.scrollY /
        viewportHeight
      )
    );


  mapHero.style.opacity =
    String(
      Math.max(
        0.28,
        1 -
        progress *
        0.72
      )
    );


  mapShade.style.opacity =
    String(
      Math.max(
        0.25,
        1 -
        progress *
        0.45
      )
    );

}


// ============================================================
// HEADLINE METRIC
// ============================================================

function headlineMetric(
  name,
  value
) {

  return `

    <div class="headline-metric">

      <span>
        ${escapeHTML(
          name
        )}
      </span>

      <strong>
        ${escapeHTML(
          value
        )}
      </strong>

    </div>

  `;

}


// ============================================================
// FORMAT DISTANCE
// ============================================================

function formatDistance(
  metres
) {

  const value =
    Number(
      metres
    );


  if (
    !Number.isFinite(
      value
    )
  ) {

    return "—";

  }


  if (
    value >=
    1000
  ) {

    return `${
      (
        value /
        1000
      )
        .toFixed(
          2
        )
        .replace(
          /\.00$/,
          ""
        )
    } km`;

  }


  return `${
    Math.round(
      value
    )
  } m`;

}


// ============================================================
// INTEGER FORMAT
// ============================================================

function formatInteger(
  value
) {

  return Number(
    value ||
    0
  ).toLocaleString();

}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHTML(
  value
) {

  return String(
    value ??
    ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}