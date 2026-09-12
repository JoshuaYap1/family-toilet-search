// =============================================================
// YOUNG FAMILY URBAN ACCESS
// MAIN APPLICATION CONTROLLER
// =============================================================



// =============================================================
// GLOBAL STATE
// =============================================================

let map = null;

let searchLayer = null;

let mrtMarkerLayer = null;

let mrtExits = [];

let demographics = [];

let modules = {};

let latestJourneys = [];

let searchInProgress = false;



// =============================================================
// DOM
// =============================================================

const locationSelect =
  document.getElementById(
    "locationSelect"
  );


const contextSelect =
  document.getElementById(
    "contextSelect"
  );


const radiusSelect =
  document.getElementById(
    "radiusSelect"
  );


const changingTableCheck =
  document.getElementById(
    "changingTableCheck"
  );


const accessibleCheck =
  document.getElementById(
    "accessibleCheck"
  );


const searchButton =
  document.getElementById(
    "searchButton"
  );


const searchStatus =
  document.getElementById(
    "searchStatus"
  );


const searchProgress =
  document.getElementById(
    "searchProgress"
  );


const populationLayerToggle =
  document.getElementById(
    "populationLayerToggle"
  );


const resultCount =
  document.getElementById(
    "resultCount"
  );


const resultsList =
  document.getElementById(
    "resultsList"
  );



// =============================================================
// START
// =============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    startApplication();

  }
);



async function startApplication() {

  try {

    console.log(
      "Starting Young Family Urban Access..."
    );


    setStatus(
      "Initialising map..."
    );


    initialiseLeafletMap();


    setStatus(
      "Loading MRT exits..."
    );


    await loadMRTExits();


    populateMRTDropdown();


    drawAllMRTExits();


    bindCoreEvents();


    setStatus(
      "Loading analysis modules..."
    );


    await loadOptionalModules();


    await loadOptionalDemographics();


    setStatus(
      `${mrtExits.length} MRT exits loaded. Select an exit and search.`
    );


    console.log(
      "Application ready."
    );


    setTimeout(
      () => {

        map?.invalidateSize();

      },
      200
    );

  }

  catch (error) {

    console.error(
      "STARTUP ERROR:",
      error
    );


    setStatus(
      `Startup error: ${error.message}`
    );


    if (
      searchProgress
    ) {

      searchProgress.textContent =
        "Open DevTools → Console for the full error.";

    }

  }

}



// =============================================================
// STATUS
// =============================================================

function setStatus(
  message
) {

  if (
    searchStatus
  ) {

    searchStatus.textContent =
      message;

  }

}



function setProgress(
  message = ""
) {

  if (
    searchProgress
  ) {

    searchProgress.textContent =
      message;

  }

}



// =============================================================
// LEAFLET
// =============================================================

function initialiseLeafletMap() {

  if (
    typeof L ===
    "undefined"
  ) {

    throw new Error(
      "Leaflet JavaScript did not load."
    );

  }


  const mapElement =
    document.getElementById(
      "map"
    );


  if (
    !mapElement
  ) {

    throw new Error(
      'Could not find HTML element "#map".'
    );

  }


  // Prevent duplicate Leaflet initialisation.

  if (
    mapElement._leaflet_id
  ) {

    mapElement._leaflet_id =
      null;

  }


  map =
    L.map(
      mapElement,
      {

        center:
          [
            1.3521,
            103.8198
          ],

        zoom:
          12,

        zoomControl:
          true

      }
    );


  // -----------------------------------------------------------
  // BASE MAP
  // -----------------------------------------------------------

  const baseTiles =
    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {

        maxZoom:
          19,

        minZoom:
          1,

        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

      }
    );


  baseTiles.on(
    "tileerror",
    event => {

      console.error(
        "OpenStreetMap tile failed:",
        event
      );

    }
  );


  baseTiles.addTo(
    map
  );


  // -----------------------------------------------------------
  // SEARCH LAYER
  // -----------------------------------------------------------

  searchLayer =
    L.layerGroup()
      .addTo(
        map
      );


  // -----------------------------------------------------------
  // MRT LAYER
  // -----------------------------------------------------------

  mrtMarkerLayer =
    L.layerGroup()
      .addTo(
        map
      );


  map.whenReady(
    () => {

      setTimeout(
        () => {

          map.invalidateSize();

        },
        100
      );

    }
  );


  console.log(
    "Leaflet map initialised."
  );

}



// =============================================================
// MRT GEOJSON
// =============================================================

async function loadMRTExits() {

  console.log(
    "Fetching MRT GeoJSON..."
  );


  const url =
    new URL(
      "./mrt_exits.geojson",
      window.location.href
    );


  console.log(
    "MRT GeoJSON URL:",
    url.href
  );


  const response =
    await fetch(
      url.href,
      {

        method:
          "GET",

        cache:
          "no-store"

      }
    );


  console.log(
    "MRT response:",
    response.status,
    response.statusText
  );


  if (
    !response.ok
  ) {

    throw new Error(
      `Could not load mrt_exits.geojson. HTTP ${response.status}.`
    );

  }


  const geoData =
    await response.json();


  if (
    !geoData ||
    !Array.isArray(
      geoData.features
    )
  ) {

    throw new Error(
      "mrt_exits.geojson does not contain a valid features array."
    );

  }


  mrtExits =
    geoData.features
      .map(
        (
          feature,
          index
        ) => {

          if (
            !feature.geometry ||
            feature.geometry.type !==
            "Point"
          ) {

            return null;

          }


          const coordinates =
            feature.geometry.coordinates;


          if (
            !Array.isArray(
              coordinates
            ) ||
            coordinates.length < 2
          ) {

            return null;

          }


          const lon =
            Number(
              coordinates[0]
            );


          const lat =
            Number(
              coordinates[1]
            );


          if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lon)
          ) {

            return null;

          }


          const properties =
            feature.properties ||
            {};


          const rawStation =

            properties.STATION_NA ||

            properties.station_na ||

            properties.STATION_NAME ||

            properties.station_name ||

            properties.NAME ||

            properties.name ||

            `Station ${index + 1}`;


          const rawExit =

            properties.EXIT_CODE ||

            properties.exit_code ||

            properties.EXIT ||

            properties.exit ||

            "";


          return {

            id:
              properties.OBJECTID ||
              properties.objectid ||
              index,

            station:
              cleanStationName(
                rawStation
              ),

            exit:
              cleanExitName(
                rawExit
              ),

            lat,

            lon

          };

        }
      )
      .filter(Boolean);


  if (
    mrtExits.length ===
    0
  ) {

    throw new Error(
      "The MRT GeoJSON loaded, but no valid Point features were found."
    );

  }


  console.log(
    `Loaded ${mrtExits.length} MRT exits.`
  );

}



// =============================================================
// MRT NAMES
// =============================================================

function cleanStationName(
  value
) {

  let name =
    String(
      value ?? ""
    ).trim();


  name =
    name
      .replace(
        /\s+MRT\s+STATION$/i,
        ""
      )
      .replace(
        /\s+LRT\s+STATION$/i,
        ""
      )
      .replace(
        /\s+STATION$/i,
        ""
      )
      .replace(
        /\s+MRT$/i,
        ""
      )
      .replace(
        /\s+LRT$/i,
        ""
      );


  return (
    `${name} MRT`
  );

}



function cleanExitName(
  value
) {

  if (
    !value
  ) {

    return "Exit";

  }


  const text =
    String(value)
      .trim();


  if (
    /^exit/i.test(
      text
    )
  ) {

    return text;

  }


  return (
    `Exit ${text}`
  );

}



// =============================================================
// MRT DROPDOWN
// =============================================================

function populateMRTDropdown() {

  if (
    !locationSelect
  ) {

    return;

  }


  locationSelect.innerHTML =
    "";


  const sorted =
    [
      ...mrtExits
    ];


  sorted.sort(
    (
      a,
      b
    ) => {

      const stationSort =
        a.station.localeCompare(
          b.station
        );


      if (
        stationSort !==
        0
      ) {

        return stationSort;

      }


      return (
        a.exit.localeCompare(
          b.exit
        )
      );

    }
  );


  sorted.forEach(
    item => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        `${item.lat},${item.lon}`;


      option.dataset.station =
        item.station;


      option.dataset.exit =
        item.exit;


      option.textContent =
        `${item.station} — ${item.exit}`;


      locationSelect.appendChild(
        option
      );

    }
  );


  const dhobyIndex =
    sorted.findIndex(
      item =>

        item.station
          .toLowerCase()
          .includes(
            "dhoby ghaut"
          )
    );


  if (
    dhobyIndex >=
    0
  ) {

    locationSelect.selectedIndex =
      dhobyIndex;

  }


  moveToSelectedExit();

}



// =============================================================
// DRAW MRT EXITS
// =============================================================

function drawAllMRTExits() {

  if (
    !map ||
    !mrtMarkerLayer
  ) {

    return;

  }


  mrtMarkerLayer.clearLayers();


  mrtExits.forEach(
    exit => {

      const marker =
        L.circleMarker(
          [
            exit.lat,
            exit.lon
          ],
          {

            radius:
              3,

            color:
              "#123f77",

            weight:
              1,

            fillColor:
              "#ffffff",

            fillOpacity:
              0.65,

            opacity:
              0.55

          }
        );


      marker.bindTooltip(
        `${escapeHtml(exit.station)} — ${escapeHtml(exit.exit)}`
      );


      mrtMarkerLayer.addLayer(
        marker
      );

    }
  );

}



// =============================================================
// EVENTS
// =============================================================

function bindCoreEvents() {

  locationSelect?.addEventListener(
    "change",
    moveToSelectedExit
  );


  searchButton?.addEventListener(
    "click",
    async event => {

      event.preventDefault();


      if (
        searchInProgress
      ) {

        return;

      }


      await runSearch();

    }
  );


  populationLayerToggle?.addEventListener(
    "change",
    handlePopulationLayer
  );

}



// =============================================================
// MOVE MAP TO EXIT
// =============================================================

function moveToSelectedExit() {

  if (
    !locationSelect?.value ||
    !map
  ) {

    return;

  }


  const [
    lat,
    lon
  ] =
    locationSelect.value
      .split(",")
      .map(Number);


  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {

    return;

  }


  map.setView(
    [
      lat,
      lon
    ],
    16,
    {

      animate:
        false

    }
  );


  setTimeout(
    () => {

      map.invalidateSize();

    },
    50
  );

}



// =============================================================
// OPTIONAL MODULES
// =============================================================

async function loadOptionalModules() {

  const moduleDefinitions =
    {

      toilets:
        "./data/toilets.js",

      amenities:
        "./data/amenities.js",

      context:
        "./analysis/context.js",

      scoring:
        "./analysis/scoring.js",

      results:
        "./ui/results.js",

      journeyProfile:
        "./ui/journeyProfile.js",

      networkGraph:
        "./ui/networkGraph.js",

      demographics:
        "./data/demographics.js",

      heatmap:
        "./map/heatmap.js",

      walkingRoute:
        "./data/walkingRoute.js",

      routeUtils:
        "./utils/route.js",

      pythonAnalysis:
        "./data/pythonAnalysis.js",

      journeyStories:
        "./ui/journeyStories.js"

    };


  const entries =
    Object.entries(
      moduleDefinitions
    );


  const loaded =
    await Promise.all(
      entries.map(
        async (
          [
            name,
            path
          ]
        ) => {

          try {

            const module =
              await import(
                path
              );


            console.log(
              `Loaded module: ${name}`
            );


            return [
              name,
              module
            ];

          }

          catch (
            error
          ) {

            console.warn(
              `Optional module failed: ${name}`,
              error
            );


            return [
              name,
              null
            ];

          }

        }
      )
    );


  modules =
    Object.fromEntries(
      loaded
    );

}



// =============================================================
// DEMOGRAPHICS
// =============================================================

async function loadOptionalDemographics() {

  if (
    !modules.demographics ||
    typeof modules.demographics
      .loadDemographics !==
    "function"
  ) {

    demographics =
      [];

    return;

  }


  try {

    demographics =
      await modules.demographics
        .loadDemographics();


    if (
      !Array.isArray(
        demographics
      )
    ) {

      demographics =
        [];

    }

  }

  catch (
    error
  ) {

    console.warn(
      "Demographics unavailable:",
      error
    );


    demographics =
      [];

  }

}



// =============================================================
// MAIN SEARCH
// =============================================================

async function runSearch() {

  if (
    searchInProgress
  ) {

    return;

  }


  if (
    !modules.toilets ||
    typeof modules.toilets
      .searchToilets !==
    "function"
  ) {

    setStatus(
      "Toilet search module unavailable."
    );

    return;

  }


  if (
    !locationSelect?.value
  ) {

    setStatus(
      "Select an MRT exit first."
    );

    return;

  }


  searchInProgress =
    true;


  searchButton.disabled =
    true;


  searchButton.textContent =
    "Searching...";


  try {

    const selectedOption =
      locationSelect.options[
        locationSelect.selectedIndex
      ];


    const [
      lat,
      lon
    ] =
      locationSelect.value
        .split(",")
        .map(Number);


    const origin =
      {

        name:
          selectedOption.dataset.station,

        exit:
          selectedOption.dataset.exit,

        lat,

        lon

      };


    const radius =
      Number(
        radiusSelect?.value ||
        500
      );


    // ---------------------------------------------------------
    // TOILETS + AMENITIES
    // ---------------------------------------------------------

    setStatus(
      "Searching toilets and amenities..."
    );


    setProgress(
      "Finding nearby facilities..."
    );


    const toiletPromise =
      modules.toilets
        .searchToilets(
          origin,
          radius
        );


    const amenityPromise =

      modules.amenities &&
      typeof modules.amenities
        .loadAmenities ===
      "function"

        ?

        modules.amenities
          .loadAmenities(
            origin,
            radius
          )

        :

        Promise.resolve(
          []
        );


    const [
      toiletsRaw,
      amenitiesRaw
    ] =
      await Promise.all(
        [
          toiletPromise,
          amenityPromise
        ]
      );


    const toilets =
      Array.isArray(
        toiletsRaw
      )
        ? toiletsRaw
        : [];


    const amenities =
      Array.isArray(
        amenitiesRaw
      )
        ? amenitiesRaw
        : [];


    // ---------------------------------------------------------
    // SCORE
    // ---------------------------------------------------------

    let results =
      toilets;


    if (
      modules.scoring &&
      typeof modules.scoring
        .scoreToilets ===
      "function"
    ) {

      results =
        modules.scoring
          .scoreToilets(
            toilets,
            origin,
            {

              changing:
                Boolean(
                  changingTableCheck?.checked
                ),

              accessible:
                Boolean(
                  accessibleCheck?.checked
                )

            }
          );

    }


    results =
      results.slice(
        0,
        8
      );


    // ---------------------------------------------------------
    // ROUTES
    // ---------------------------------------------------------

    setStatus(
      "Calculating pedestrian journeys..."
    );


    setProgress(
      "Routing to top toilet options..."
    );


    const routeTargets =
      results.slice(
        0,
        3
      );


    const journeyPromises =
      routeTargets.map(
        (
          toilet,
          index
        ) =>
          buildJourney(
            origin,
            toilet,
            index
          )
      );


    const settledJourneys =
      await Promise.allSettled(
        journeyPromises
      );


    const journeys =
      settledJourneys
        .filter(
          item =>
            item.status ===
            "fulfilled"
        )
        .map(
          item =>
            item.value
        )
        .filter(Boolean);


    settledJourneys
      .filter(
        item =>
          item.status ===
          "rejected"
      )
      .forEach(
        item => {

          console.warn(
            "Journey failed:",
            item.reason
          );

        }
      );


    latestJourneys =
      journeys;


    // ---------------------------------------------------------
    // CONTEXT
    // ---------------------------------------------------------

    let context =
      {

        key:
          "mixed",

        label:
          "Mixed urban area",

        counts:
          {}

      };


    if (
      modules.context &&
      typeof modules.context
        .determineUrbanContext ===
      "function"
    ) {

      context =
        modules.context
          .determineUrbanContext(
            contextSelect?.value ||
            "auto",
            amenities
          );

    }


    // ---------------------------------------------------------
    // DEMOGRAPHIC DEMAND
    // ---------------------------------------------------------

    let demographicDemand =
      null;


    if (
      modules.demographics &&
      typeof modules.demographics
        .getDemographicDemandNear ===
      "function"
    ) {

      demographicDemand =
        modules.demographics
          .getDemographicDemandNear(
            origin.lat,
            origin.lon
          );

    }


    // ---------------------------------------------------------
    // PROFILE
    // ---------------------------------------------------------

    let profile =
      null;


    if (
      modules.scoring &&
      typeof modules.scoring
        .buildJourneyProfile ===
      "function"
    ) {

      profile =
        modules.scoring
          .buildJourneyProfile(
            {

              results,

              amenities,

              context,

              radius,

              demographicDemand,

              journeys

            }
          );

    }


    // ---------------------------------------------------------
    // RENDER MAP
    // ---------------------------------------------------------

    drawJourneysOnMap(
      origin,
      results,
      radius,
      journeys
    );


    // ---------------------------------------------------------
    // RESULTS
    // ---------------------------------------------------------

    if (
      modules.results &&
      typeof modules.results
        .renderResults ===
      "function"
    ) {

      modules.results
        .renderResults(
          results
        );

    }

    else {

      renderBasicResults(
        results
      );

    }


    // ---------------------------------------------------------
    // JOURNEY PROFILE
    // ---------------------------------------------------------

    if (
      profile &&
      modules.journeyProfile &&
      typeof modules.journeyProfile
        .renderJourneyProfile ===
      "function"
    ) {

      modules.journeyProfile
        .renderJourneyProfile(
          profile
        );

    }


    // ---------------------------------------------------------
    // STORIES
    // ---------------------------------------------------------

    if (
      modules.journeyStories &&
      typeof modules.journeyStories
        .renderJourneyStories ===
      "function"
    ) {

      modules.journeyStories
        .renderJourneyStories(
          journeys
        );

    }


    // ---------------------------------------------------------
    // NETWORK
    // ---------------------------------------------------------

    if (
      modules.networkGraph &&
      typeof modules.networkGraph
        .renderNetworkGraph ===
      "function"
    ) {

      modules.networkGraph
        .renderNetworkGraph(
          origin,
          results
        );

    }


    setStatus(
      `${toilets.length} toilets found. ${journeys.length} journeys analysed.`
    );


    setProgress(
      "Search complete."
    );

  }

  catch (
    error
  ) {

    console.error(
      "SEARCH ERROR:",
      error
    );


    setStatus(
      `Search failed: ${error.message}`
    );


    setProgress(
      ""
    );

  }

  finally {

    searchInProgress =
      false;


    searchButton.disabled =
      false;


    searchButton.textContent =
      "Search family journey";

  }

}



// =============================================================
// BUILD JOURNEY
// =============================================================

async function buildJourney(
  origin,
  toilet,
  index
) {

  if (
    !modules.walkingRoute ||
    typeof modules.walkingRoute
      .getWalkingRoute !==
    "function"
  ) {

    throw new Error(
      "Walking route module unavailable."
    );

  }


  // ===========================================================
  // 1. GET WALKING ROUTE
  // ===========================================================

  const route =
    await modules.walkingRoute
      .getWalkingRoute(
        origin,
        toilet
      );


  console.log(
    `Route ${index + 1}:`,
    route
  );


  if (
    !route ||
    !Array.isArray(
      route.points
    ) ||
    route.points.length < 2
  ) {

    throw new Error(
      `Route ${index + 1} returned no usable geometry.`
    );

  }


  // ===========================================================
  // 2. ALWAYS CREATE JS FALLBACK MOMENTS FIRST
  // ===========================================================

  let samples = [];


  if (
    modules.routeUtils &&
    typeof modules.routeUtils
      .sampleRoute ===
    "function"
  ) {

    try {

      samples =
        modules.routeUtils
          .sampleRoute(
            route.points,
            50
          );


      console.log(
        `Route ${index + 1} JS samples:`,
        samples.length
      );

    }

    catch (error) {

      console.warn(
        `JS route sampling failed for Route ${index + 1}:`,
        error
      );

    }

  }


  // ===========================================================
  // 3. PYTHON / MAPILLARY
  // ===========================================================

  let pythonMoments = [];


  if (
    modules.pythonAnalysis &&
    typeof modules.pythonAnalysis
      .analyseRouteWithPython ===
    "function"
  ) {

    try {

      const backendAvailable =
        typeof modules.pythonAnalysis
          .checkPythonBackend ===
        "function"

          ?

          await modules.pythonAnalysis
            .checkPythonBackend()

          :

          true;


      if (!backendAvailable) {

        console.warn(
          "Python backend is offline."
        );

      }

      else {

        const pythonResult =
          await modules.pythonAnalysis
            .analyseRouteWithPython(
              route.points,
              50
            );


        pythonMoments =
          Array.isArray(
            pythonResult?.moments
          )

            ?

            pythonResult.moments

            :

            [];


        console.log(
          `Route ${index + 1} Python moments:`,
          pythonMoments.length
        );


        console.log(
          `Route ${index + 1} Mapillary images:`,
          pythonMoments.filter(
            moment =>
              Boolean(moment.image)
          ).length
        );

      }

    }

    catch (error) {

      console.error(
        `Python analysis failed for Route ${index + 1}:`,
        error
      );

    }

  }


  // ===========================================================
  // 4. CHOOSE MOMENTS
  // ===========================================================

  const displayMoments =
    pythonMoments.length > 0

      ?

      pythonMoments

      :

      samples;


  console.log(
    `Route ${index + 1} final moments:`,
    displayMoments.length
  );


  return {

    rank:
      index + 1,

    toilet,

    route,

    samples,

    pythonMoments,

    streetViewMoments:
      displayMoments

  };

}



// =============================================================
// DRAW SEARCH RESULTS
// =============================================================

function drawJourneysOnMap(
  origin,
  results,
  radius,
  journeys
) {

  if (
    !map ||
    !searchLayer
  ) {

    return;

  }


  searchLayer.clearLayers();


  const bounds =
    [
      [
        origin.lat,
        origin.lon
      ]
    ];


  // -----------------------------------------------------------
  // ORIGIN
  // -----------------------------------------------------------

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
        ${escapeHtml(origin.name)}
      </strong>

      <br>

      ${escapeHtml(origin.exit)}
    `
  );


  searchLayer.addLayer(
    originMarker
  );


  // -----------------------------------------------------------
  // RADIUS
  // -----------------------------------------------------------

  searchLayer.addLayer(
    L.circle(
      [
        origin.lat,
        origin.lon
      ],
      {

        radius,

        color:
          "#9baabb",

        weight:
          1,

        fillOpacity:
          0

      }
    )
  );


  // -----------------------------------------------------------
  // TOILETS
  // -----------------------------------------------------------

  results.forEach(
    (
      result,
      index
    ) => {

      const rank =
        result.rank ||
        index + 1;


      const marker =
        L.circleMarker(
          [
            result.lat,
            result.lon
          ],
          {

            radius:
              rank <= 3
                ? 10
                : 7,

            color:
              getSeverityColor(
                result.severity
              ),

            weight:
              rank <= 3
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
            #${rank}
            ${escapeHtml(result.name || "Toilet")}
          </strong>

          <br><br>

          Distance:
          ${result.distance ?? "—"} m
        `
      );


      searchLayer.addLayer(
        marker
      );


      bounds.push(
        [
          result.lat,
          result.lon
        ]
      );

    }
  );


  const routeStyles =
    [
      {

        color:
          "#123f77",

        weight:
          6,

        opacity:
          0.95

      },

      {

        color:
          "#4f719d",

        weight:
          5,

        opacity:
          0.82

      },

      {

        color:
          "#8aa0bb",

        weight:
          4,

        opacity:
          0.78

      }
    ];


  // -----------------------------------------------------------
  // WALKING ROUTES
  // -----------------------------------------------------------

  journeys.forEach(
    (
      journey,
      journeyIndex
    ) => {

      const points =
        journey.route?.points;


      if (
        !Array.isArray(
          points
        ) ||
        points.length <
        2
      ) {

        return;

      }


      const latLngs =
        points.map(
          point =>

            [
              point.lat,
              point.lon
            ]
        );


      const style =
        routeStyles[
          journeyIndex
        ] ||
        routeStyles[2];


      const line =
        L.polyline(
          latLngs,
          style
        );


      line.bindPopup(
        `
          <strong>
            Route ${journeyIndex + 1}
          </strong>

          <br>

          ${escapeHtml(
            journey.toilet?.name ||
            "Toilet"
          )}

          <br><br>

          ${journey.route.distance ?? "—"} m
        `
      );


      searchLayer.addLayer(
        line
      );


      latLngs.forEach(
        point =>

          bounds.push(
            point
          )
      );


      // -------------------------------------------------------
      // CHECKPOINTS
      // -------------------------------------------------------

      const moments =
        journey.streetViewMoments ||
        [];


      moments.forEach(
        (
          moment,
          momentIndex
        ) => {

          const momentLat =
            Number(
              moment.lat
            );


          const momentLon =
            Number(
              moment.lon
            );


          if (
            !Number.isFinite(
              momentLat
            ) ||
            !Number.isFinite(
              momentLon
            )
          ) {

            return;

          }


          const marker =
            L.circleMarker(
              [
                momentLat,
                momentLon
              ],
              {

                radius:
                  5,

                color:
                  style.color,

                weight:
                  2,

                fillColor:
                  "#ffffff",

                fillOpacity:
                  1

              }
            );


          marker.bindPopup(
            `
              <strong>
                Route ${journeyIndex + 1}
                · Checkpoint ${momentIndex + 1}
              </strong>

              <br><br>

              ${moment.distanceFromStart ?? 0} m along route

              <br>

              ${
                moment.image
                  ? "Mapillary image available"
                  : "No image found"
              }
            `
          );


          searchLayer.addLayer(
            marker
          );

        }
      );

    }
  );


  if (
    bounds.length >
    1
  ) {

    map.fitBounds(
      bounds,
      {

        padding:
          [
            45,
            45
          ]

      }
    );

  }


  setTimeout(
    () => {

      map.invalidateSize();

    },
    100
  );

}



// =============================================================
// FALLBACK RESULTS
// =============================================================

function renderBasicResults(
  results
) {

  if (
    !resultsList ||
    !resultCount
  ) {

    return;

  }


  resultCount.textContent =
    `${results.length} found`;


  resultsList.innerHTML =
    "";


  if (
    results.length ===
    0
  ) {

    resultsList.innerHTML =
      `
        <div class="empty-state">
          No mapped toilets found.
        </div>
      `;


    return;

  }


  results.forEach(
    (
      result,
      index
    ) => {

      const card =
        document.createElement(
          "article"
        );


      card.className =
        "result-card";


      card.innerHTML =
        `
          <strong>
            #${result.rank || index + 1}
            ${escapeHtml(
              result.name ||
              "Toilet"
            )}
          </strong>

          <p>
            ${result.distance ?? "—"} m
          </p>
        `;


      resultsList.appendChild(
        card
      );

    }
  );

}



// =============================================================
// POPULATION HEATMAP
// =============================================================

function handlePopulationLayer() {

  if (
    !populationLayerToggle
  ) {

    return;

  }


  if (
    !modules.heatmap
  ) {

    console.warn(
      "Heatmap module unavailable."
    );

    return;

  }


  if (
    populationLayerToggle.checked
  ) {

    if (
      demographics.length ===
      0
    ) {

      setStatus(
        "Demographic dataset is not connected yet."
      );

      return;

    }


    if (
      typeof modules.heatmap
        .renderPopulationHeatmap ===
      "function"
    ) {

      modules.heatmap
        .renderPopulationHeatmap(
          map,
          demographics
        );

    }

  }

  else {

    if (
      typeof modules.heatmap
        .clearPopulationHeatmap ===
      "function"
    ) {

      modules.heatmap
        .clearPopulationHeatmap(
          map
        );

    }

  }

}



// =============================================================
// HELPERS
// =============================================================

function getSeverityColor(
  severity
) {

  if (
    severity ===
    "high"
  ) {

    return "#c94848";

  }


  if (
    severity ===
    "medium"
  ) {

    return "#d97a1f";

  }


  return "#123f77";

}



function escapeHtml(
  value
) {

  return String(
    value ?? ""
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