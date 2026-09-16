// ============================================================
// FAMILY JOURNEY SEARCH
//
// FINAL STATIC FRONTEND
//
// NO OVERPASS
// NO WALKING-ROUTE API
// NO MAPILLARY API
// NO SEGFORMER
// NO FLASK
// NO PORT 5000 / 5001
//
// Browser only reads precomputed files.
// ============================================================



// ============================================================
// IMPORTS
// ============================================================

import {

    loadMRTContexts,

    loadRouteLibrary,

    loadImageQueryIndex,

    indexRoutesByStation,

    normalizeMRTName,

    findMRTContext,

    findImageQuery,

    getQueryContexts

} from "./data/analysis.js";


import {

    renderAnalysisPanel

} from "./ui/journeyAnalysisPanel.js";



// ============================================================
// STATE
// ============================================================

let map;


let mrtContexts =
    [];


let routeLibrary =
    [];


let routesByStation =
    new Map();


let imageQueryIndex =
    null;


let comparableContexts =
    [];


let journeys =
    [];


let selectedJourney =
    null;


let currentImageAnalysis =
    null;


let currentAnalysisTab =
    "overview";


let contextLayer;

let journeyLayer;

let destinationLayer;



// ============================================================
// DOM
// ============================================================

const $ =
    id =>
        document.getElementById(
            id
        );


const els = {

    location:
        $("locationSelect"),

    contextCount:
        $("contextCountSelect"),


    match:
        $("matchContextsButton"),

    find:
        $("findJourneysButton"),

    som:
        $("showSomButton"),

    images:
        $("showImageAnalysisButton"),


    seedPreview:
        $("seedContextPreview"),

    comparablePreview:
        $("comparableContextPreview"),


    status:
        $("searchStatus"),

    progress:
        $("searchProgress"),

    globalStatus:
        $("globalSystemStatus"),


    imageProgress:
        $("imageAnalysisProgress"),

    imageProgressBar:
        $("imageProgressBar"),

    imageProgressPercent:
        $("imageProgressPercent"),

    imageProgressTitle:
        $("imageProgressTitle"),

    imageProgressMessage:
        $("imageProgressMessage"),


    mapSummary:
        $("mapSearchSummary"),


    preSearch:
        $("preSearchState"),

    resultsSection:
        $("searchResultsSection"),

    results:
        $("journeyResults"),

    resultCount:
        $("resultCount"),


    analysisWorkspace:
        $("analysisWorkspace"),

    analysisPanel:
        $("analysisPanel"),

    analysisTitle:
        $("selectedJourneyTitle"),

    closeAnalysis:
        $("closeAnalysisButton")

};



// ============================================================
// INITIALISE
// ============================================================

document.addEventListener(

    "DOMContentLoaded",

    initialise

);


async function initialise() {

    initialiseMap();


    installReloadProtection();


    setStatus(
        "Loading static project libraries…"
    );


    try {

        // ====================================================
        // LOAD CONTEXTS + ROUTES
        // ====================================================

        const [

            contexts,

            routes

        ] =
            await Promise.all([

                loadMRTContexts(),

                loadRouteLibrary()

            ]);


        mrtContexts =
            contexts;


        routeLibrary =
            routes;


        routesByStation =
            indexRoutesByStation(
                routeLibrary
            );


        // ====================================================
        // IMAGE LIBRARY
        //
        // If image_analysis has not finished yet,
        // everything else still works.
        // ====================================================

        try {

            imageQueryIndex =
                await loadImageQueryIndex();

        }

        catch (error) {

            console.warn(
                "Image query index unavailable:",
                error
            );


            imageQueryIndex =
                null;
        }


        populateMRTDropdown();


        bindEvents();


        bindLayerToggles();


        resetWorkflow();


        const imageStatus =

            imageQueryIndex

                ?

                `${imageQueryIndex.queryCount || 0} image queries ready`

                :

                "image library not built yet";


        els.globalStatus.textContent =

            `Static analysis ready · ${routeLibrary.length} routes · ${imageStatus}`;


        setStatus(
            "Match MRT contexts to begin."
        );

    }

    catch (error) {

        console.error(
            error
        );


        setStatus(

            `Startup failed: ${error.message}`

        );


        els.globalStatus.textContent =
            "Static library load failed";

    }
}



// ============================================================
// RELOAD PROTECTION
// ============================================================

function installReloadProtection() {

    document
    .querySelectorAll(
        "button"
    )
    .forEach(
        button => {

            button.type =
                "button";

        }
    );


    // There should be no forms in index.html,
    // but keep this safeguard.

    document
    .addEventListener(

        "submit",

        event => {

            event.preventDefault();

            event.stopPropagation();

        }

    );
}



// ============================================================
// MAP
// ============================================================

function initialiseMap() {

    map =
        L.map(

            "map",

            {

                center: [
                    1.3521,
                    103.8198
                ],

                zoom:
                    11

            }

        );


    L.tileLayer(

        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

        {

            maxZoom:
                19,

            attribution:
                "&copy; OpenStreetMap contributors"

        }

    )
    .addTo(
        map
    );


    contextLayer =
        L.layerGroup()
        .addTo(
            map
        );


    journeyLayer =
        L.layerGroup()
        .addTo(
            map
        );


    destinationLayer =
        L.layerGroup()
        .addTo(
            map
        );


    requestAnimationFrame(
        () =>
            map.invalidateSize()
    );
}



// ============================================================
// MRT DROPDOWN
// ============================================================

function populateMRTDropdown() {

    const stations = [

        ...new Set(

            mrtContexts

            .map(
                context =>
                    normalizeMRTName(
                        context.station
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


    els.location.innerHTML =
        stations

        .map(
            station => `

                <option
                    value="${escapeHTML(station)}"
                >

                    ${escapeHTML(station)}

                </option>

            `
        )

        .join("");


    const clementiIndex =
        stations.indexOf(
            "CLEMENTI MRT"
        );


    if (
        clementiIndex >= 0
    ) {

        els.location.selectedIndex =
            clementiIndex;
    }
}



// ============================================================
// EVENTS
// ============================================================

function bindEvents() {

    els.location
    .addEventListener(

        "change",

        resetWorkflow

    );


    els.contextCount
    .addEventListener(

        "change",

        resetWorkflow

    );


    els.match
    .addEventListener(

        "click",

        event => {

            event.preventDefault();

            event.stopPropagation();

            matchContexts();

        }

    );


    els.find
    .addEventListener(

        "click",

        event => {

            event.preventDefault();

            event.stopPropagation();

            loadPrecomputedJourneys();

        }

    );


    els.som
    .addEventListener(

        "click",

        event => {

            event.preventDefault();

            event.stopPropagation();

            showDemographicSOM();

        }

    );


    els.images
    .addEventListener(

        "click",

        event => {

            event.preventDefault();

            event.stopPropagation();

            showStoredImageAnalysis();

        }

    );


    els.closeAnalysis
    .addEventListener(

        "click",

        event => {

            event.preventDefault();


            els.analysisWorkspace
            .classList
            .add(
                "is-hidden"
            );

        }

    );


    // ========================================================
    // ANALYSIS TABS
    // ========================================================

    document
    .querySelector(
        ".analysis-tabs"
    )
    ?.addEventListener(

        "click",

        event => {

            const button =
                event.target
                .closest(
                    "[data-analysis-tab]"
                );


            if (!button) {

                return;
            }


            event.preventDefault();


            currentAnalysisTab =
                button.dataset
                .analysisTab;


            updateAnalysisTabs();


            renderCurrentAnalysis();

        }

    );


    // ========================================================
    // JOURNEY ROWS
    // ========================================================

    els.results
    .addEventListener(

        "click",

        event => {

            const row =
                event.target
                .closest(
                    "[data-journey-index]"
                );


            if (!row) {

                return;
            }


            event.preventDefault();


            const index =
                Number(
                    row.dataset
                    .journeyIndex
                );


            if (
                !Number.isInteger(
                    index
                )
                ||
                !journeys[
                    index
                ]
            ) {

                return;
            }


            selectedJourney =
                journeys[
                    index
                ];


            currentAnalysisTab =
                "overview";


            renderJourneyTable();


            updateAnalysisTabs();


            showSelectedJourney();

        }

    );
}



// ============================================================
// RESET
// ============================================================

function resetWorkflow() {

    comparableContexts =
        [];


    journeys =
        [];


    selectedJourney =
        null;


    currentImageAnalysis =
        null;


    contextLayer
    ?.clearLayers();


    journeyLayer
    ?.clearLayers();


    destinationLayer
    ?.clearLayers();


    els.find.disabled =
        true;


    els.som.disabled =
        true;


    els.images.disabled =
        true;


    els.seedPreview.innerHTML = `

        Click
        <b>Match MRT contexts</b>
        to begin.

    `;


    els.comparablePreview.textContent =
        "No contexts matched yet.";


    els.mapSummary.textContent =
        "Select a seed MRT";


    els.results.innerHTML =
        "";


    els.resultCount.textContent =
        "0 journeys";


    els.resultsSection
    .classList
    .add(
        "is-hidden"
    );


    els.analysisWorkspace
    .classList
    .add(
        "is-hidden"
    );


    els.preSearch
    .classList
    .remove(
        "is-hidden"
    );


    hideImageProgress();


    setStatus(
        "Match MRT contexts to begin."
    );


    setProgress(
        ""
    );
}



// ============================================================
// STAGE 1
// MATCH MRT CONTEXTS
//
// IMPORTANT:
//
// image_query_index.json is authoritative.
//
// The frontend therefore uses EXACTLY the same MRT ordering
// that generated the image grids.
// ============================================================

function matchContexts() {

    const seedStation =
        normalizeMRTName(
            els.location.value
        );


    const similarCount =
        Number(
            els.contextCount.value
            ||
            3
        );


    const seed =
        findMRTContext(

            mrtContexts,

            seedStation

        );


    if (!seed) {

        setStatus(
            "Seed demographic context was not found."
        );

        return;
    }


    comparableContexts =
        getQueryContexts(

            mrtContexts,

            imageQueryIndex,

            seedStation,

            similarCount

        );


    currentImageAnalysis =
        null;


    selectedJourney =
        null;


    journeys =
        [];


    // ========================================================
    // SEED PREVIEW
    // ========================================================

    els.seedPreview.innerHTML = `

        <span class="seed-context-kicker">
            DEMOGRAPHIC SOM
        </span>


        <strong>

            ${
                escapeHTML(
                    seed.contextDescriptor
                    ||
                    "mixed-context"
                )
            }

        </strong>


        <span>

            SOM cell

            ${
                escapeHTML(
                    seed.somCell
                    ??
                    "—"
                )
            }

        </span>

    `;


    // ========================================================
    // MATCHED CONTEXTS
    // ========================================================

    els.comparablePreview.innerHTML =
        comparableContexts

        .map(
            context => `

                <div
                    class="
                        context-chip
                        ${
                            context.isSeed
                                ?
                                "is-seed"
                                :
                                ""
                        }
                    "
                >

                    <strong>

                        ${
                            escapeHTML(
                                context.station
                            )
                        }

                    </strong>


                    <span>

                        ${
                            context.isSeed

                                ?

                                "seed"

                                :

                                `${
                                    Math.round(
                                        (
                                            context.similarity
                                            ||
                                            0
                                        )
                                        *
                                        100
                                    )
                                }% similar`
                        }

                    </span>

                </div>

            `
        )

        .join("");


    drawComparableContexts();


    els.find.disabled =
        false;


    els.som.disabled =
        false;


    // Image grids are available immediately after Stage 1
    // because they are already precomputed.

    els.images.disabled =
        !findImageQuery(

            imageQueryIndex,

            seedStation,

            similarCount

        );


    els.mapSummary.textContent =

        `${similarCount} similar MRTs + seed`;


    setStatus(

        `${
            comparableContexts.length
        } MRT contexts loaded from the static search library.`

    );


    setProgress(
        "No backend computation required."
    );
}



// ============================================================
// STAGE 2
// LOAD PRECOMPUTED ROUTES
// ============================================================

function loadPrecomputedJourneys() {

    if (
        comparableContexts.length ===
        0
    ) {

        return;
    }


    journeys =
        comparableContexts

        .map(
            context => {

                const station =
                    normalizeMRTName(
                        context.station
                    );


                const route =
                    routesByStation.get(
                        station
                    );


                if (
                    !route
                    ||
                    route.routeStatus
                    !==
                    "complete"
                ) {

                    return null;
                }


                const origin =
                    route.origin
                    ||
                    {};


                const toilet =
                    route.toilet
                    ||
                    {};


                const points =
                    normalizeRoutePoints(

                        route.points
                        ||
                        []

                    );


                return {

                    id:
                        route.routeId
                        ||
                        `${slugify(station)}-route`,

                    origin: {

                        station,

                        lat:
                            Number(
                                origin.lat
                            ),

                        lon:
                            Number(
                                origin.lon
                            ),

                        contextDescriptor:
                            context.contextDescriptor,

                        somCell:
                            context.somCell

                    },

                    toilet: {

                        ...toilet,

                        name:
                            toilet.name
                            ||
                            "Public toilet",

                        lat:
                            Number(
                                toilet.lat
                            ),

                        lon:
                            Number(
                                toilet.lon
                            )

                    },

                    route: {

                        points,

                        distance:
                            Number(
                                route.distance
                                ||
                                0
                            ),

                        duration:
                            Number(
                                route.duration
                                ||
                                0
                            ),

                        isApproximate:

                            route.routingMode
                            !==
                            "walking"

                    },

                    imageryMode:
                        route.imageryMode,

                    mapillaryImageCount:
                        Number(
                            route.uniqueMapillaryImageCount
                            ||
                            0
                        ),

                    raw:
                        route

                };

            }
        )

        .filter(
            Boolean
        );


    selectedJourney =
        journeys[0]
        ||
        null;


    renderJourneyTable();


    drawJourneys();


    els.resultsSection
    .classList
    .remove(
        "is-hidden"
    );


    els.preSearch
    .classList
    .add(
        "is-hidden"
    );


    els.resultCount.textContent =

        `${journeys.length} ${
            journeys.length === 1
                ?
                "journey"
                :
                "journeys"
        }`;


    setStatus(

        `${journeys.length} precomputed family-access journeys loaded.`

    );


    setProgress(

        "Routes were calculated during offline preprocessing."

    );
}



// ============================================================
// STATIC IMAGE ANALYSIS
//
// No Python.
// No HTTP API.
// No model.
//
// Just:
// query lookup → two local files → display.
// ============================================================

async function showStoredImageAnalysis() {

    const seedStation =
        normalizeMRTName(
            els.location.value
        );


    const similarCount =
        Number(
            els.contextCount.value
            ||
            3
        );


    const query =
        findImageQuery(

            imageQueryIndex,

            seedStation,

            similarCount

        );


    if (!query) {

        setStatus(

            `No stored image query exists for ${seedStation}|${similarCount}.`

        );


        return;
    }


    els.images.disabled =
        true;


    showImageProgress(

        10,

        "Reading stored query record…"

    );


    try {

        const version =

            imageQueryIndex
            ?.generatedAt

            ||

            1;


        updateImageProgress(

            25,

            "Loading original street-view grid…"

        );


        await preloadImage(

            addVersion(

                query.originalGrid,

                version

            )

        );


        updateImageProgress(

            60,

            "Loading SegFormer segmentation grid…"

        );


        await preloadImage(

            addVersion(

                query.segmentationGrid,

                version

            )

        );


        updateImageProgress(

            90,

            "Preparing analysis workspace…"

        );


        currentImageAnalysis = {

            ...query,

            generatedAt:
                version

        };


        showImageAnalysis();


        updateImageProgress(

            100,

            "Stored image evidence ready."

        );


        setStatus(

            `${query.imageCount || 0} stored street images loaded for ${seedStation} + ${similarCount} similar MRTs.`

        );


        setProgress(

            "Static lookup only — no Mapillary or SegFormer computation."

        );


        await wait(
            450
        );


        hideImageProgress();

    }

    catch (error) {

        console.error(
            error
        );


        updateImageProgress(

            100,

            `Image file unavailable: ${error.message}`

        );


        setStatus(

            "The query exists but one of its stored preview files could not be loaded."

        );


        await wait(
            1500
        );


        hideImageProgress();

    }

    finally {

        els.images.disabled =
            false;
    }
}



// ============================================================
// PRELOAD STATIC IMAGE
// ============================================================

function preloadImage(
    src
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const image =
                new Image();


            image.onload =
                () =>
                    resolve(
                        image
                    );


            image.onerror =
                () =>
                    reject(
                        new Error(
                            src
                        )
                    );


            image.src =
                src;

        }
    );
}



// ============================================================
// IMAGE VERSIONING
//
// Prevents old generated grids from browser cache.
// ============================================================

function addVersion(
    path,
    version
) {

    if (!path) {

        return path;
    }


    const separator =
        path.includes(
            "?"
        )

            ?

            "&"

            :

            "?";


    return (

        path

        +

        separator

        +

        "v="

        +

        encodeURIComponent(
            version
        )

    );
}



// ============================================================
// SHOW IMAGE WORKSPACE
// ============================================================

function showImageAnalysis() {

    currentAnalysisTab =
        "images";


    selectedJourney =
        selectedJourney
        ||
        journeys[0]
        ||
        null;


    els.analysisTitle.textContent =
        "Street-view image analysis";


    updateAnalysisTabs();


    renderCurrentAnalysis();


    showAnalysisWorkspace();
}



// ============================================================
// SOM
// ============================================================

function showDemographicSOM() {

    currentAnalysisTab =
        "context";


    const seed =
        normalizeMRTName(
            els.location.value
        );


    els.analysisTitle.textContent =

        `${seed} demographic context`;


    updateAnalysisTabs();


    renderCurrentAnalysis();


    showAnalysisWorkspace();
}



// ============================================================
// SELECTED JOURNEY
// ============================================================

function showSelectedJourney() {

    if (!selectedJourney) {

        return;
    }


    els.analysisTitle.textContent =

        `${selectedJourney.origin.station} → ${selectedJourney.toilet.name}`;


    renderCurrentAnalysis();


    showAnalysisWorkspace();
}



// ============================================================
// RENDER ANALYSIS
// ============================================================

function renderCurrentAnalysis() {

    const station =

        selectedJourney
        ?.origin
        ?.station

        ||

        els.location.value;


    const context =
        findMRTContext(

            mrtContexts,

            station

        );


    renderAnalysisPanel(

        els.analysisPanel,

        {

            journey:
                selectedJourney,

            demographicContext:
                makeContextRecord(
                    context
                ),

            imageAnalysis:
                currentImageAnalysis

        },

        currentAnalysisTab

    );
}



// ============================================================
// CONTEXT FORMAT
// ============================================================

function makeContextRecord(
    context
) {

    if (!context) {

        return {};
    }


    return {

        station:
            context.station,

        somCell:
            context.somCell,

        descriptor:
            context.contextDescriptor,

        populationDensity:
            context.population_density,

        childrenPercent:
            context.children_percent,

        averageHouseholdSize:
            context.avg_household_size,

        hdbPercent:
            context.hdb_percent,

        privateHousingPercent:
            context.private_housing_percent,

        elderlyPercent:
            context.elderly_percent,

        commercialIntensity:
            context.commercial_intensity

    };
}



// ============================================================
// ANALYSIS WORKSPACE
// ============================================================

function showAnalysisWorkspace() {

    els.resultsSection
    .classList
    .remove(
        "is-hidden"
    );


    els.preSearch
    .classList
    .add(
        "is-hidden"
    );


    els.analysisWorkspace
    .classList
    .remove(
        "is-hidden"
    );


    requestAnimationFrame(
        () => {

            els.analysisWorkspace
            .scrollIntoView({

                behavior:
                    "smooth",

                block:
                    "start"

            });

        }
    );
}



// ============================================================
// TAB STATE
// ============================================================

function updateAnalysisTabs() {

    document
    .querySelectorAll(
        ".analysis-tab"
    )
    .forEach(
        button => {

            button.classList.toggle(

                "is-active",

                button.dataset
                    .analysisTab
                ===
                currentAnalysisTab

            );

        }
    );
}



// ============================================================
// JOURNEY TABLE
// ============================================================

function renderJourneyTable() {

    if (
        journeys.length === 0
    ) {

        els.results.innerHTML = `

            <div class="empty-result">

                <h3>
                    No stored route found.
                </h3>

                <p>
                    This MRT does not currently have a
                    precomputed route record.
                </p>

            </div>

        `;


        return;
    }


    els.results.innerHTML = `

        <div class="journey-table">


            <div class="journey-table-head">

                <span>
                    MRT context
                </span>

                <span>
                    Demographic profile
                </span>

                <span>
                    Destination
                </span>

                <span>
                    Distance
                </span>

                <span>
                    Images
                </span>

            </div>


            ${
                journeys

                .map(
                    (
                        journey,
                        index
                    ) => `

                        <button

                            type="button"

                            class="
                                journey-row

                                ${
                                    selectedJourney
                                    ?.id
                                    ===
                                    journey.id

                                        ?

                                        "is-selected"

                                        :

                                        ""
                                }
                            "

                            data-journey-index="${index}"
                        >

                            <span>

                                <strong>

                                    ${
                                        escapeHTML(
                                            journey.origin
                                                .station
                                        )
                                    }

                                </strong>

                                <small>

                                    SOM
                                    ${
                                        escapeHTML(
                                            journey.origin
                                                .somCell
                                            ??
                                            "—"
                                        )
                                    }

                                </small>

                            </span>


                            <span>

                                ${
                                    escapeHTML(
                                        journey.origin
                                            .contextDescriptor
                                        ||
                                        "mixed-context"
                                    )
                                }

                            </span>


                            <span>

                                ${
                                    escapeHTML(
                                        journey.toilet
                                            .name
                                    )
                                }

                            </span>


                            <span>

                                ${
                                    Math.round(
                                        journey.route
                                            .distance
                                        ||
                                        0
                                    )
                                } m

                            </span>


                            <span>

                                ${
                                    journey.mapillaryImageCount
                                    ||
                                    0
                                }

                                images

                            </span>

                        </button>

                    `
                )

                .join("")
            }


        </div>

    `;
}



// ============================================================
// MAP — CONTEXTS
// ============================================================

function drawComparableContexts() {

    contextLayer
    .clearLayers();


    const bounds =
        [];


    for (
        const context
        of comparableContexts
    ) {

        const lat =
            Number(
                context.lat
            );


        const lon =
            Number(
                context.lon
            );


        if (
            !Number.isFinite(
                lat
            )
            ||
            !Number.isFinite(
                lon
            )
        ) {

            continue;
        }


        L.circleMarker(

            [
                lat,
                lon
            ],

            {

                radius:
                    context.isSeed
                        ?
                        9
                        :
                        6,

                weight:
                    2,

                fillOpacity:
                    0.9

            }

        )

        .bindTooltip(
            context.station
        )

        .addTo(
            contextLayer
        );


        bounds.push(
            [
                lat,
                lon
            ]
        );
    }


    if (
        bounds.length > 1
    ) {

        map.fitBounds(

            bounds,

            {

                padding: [
                    40,
                    40
                ]

            }

        );
    }
}



// ============================================================
// MAP — PRECOMPUTED JOURNEYS
// ============================================================

function drawJourneys() {

    journeyLayer
    .clearLayers();


    destinationLayer
    .clearLayers();


    const bounds =
        [];


    for (
        const journey
        of journeys
    ) {

        const coordinates =
            journey.route
            .points

            .map(
                point => [

                    Number(
                        point.lat
                    ),

                    Number(
                        point.lon
                    )

                ]
            )

            .filter(
                (
                    [
                        lat,
                        lon
                    ]
                ) =>

                    Number.isFinite(
                        lat
                    )

                    &&

                    Number.isFinite(
                        lon
                    )
            );


        if (
            coordinates.length > 1
        ) {

            L.polyline(

                coordinates,

                {

                    weight:
                        4,

                    opacity:
                        0.82,

                    dashArray:

                        journey.route
                            .isApproximate

                            ?

                            "7 7"

                            :

                            null

                }

            )

            .addTo(
                journeyLayer
            );


            bounds.push(
                ...coordinates
            );
        }


        const toiletLat =
            Number(
                journey.toilet
                    .lat
            );


        const toiletLon =
            Number(
                journey.toilet
                    .lon
            );


        if (
            Number.isFinite(
                toiletLat
            )
            &&
            Number.isFinite(
                toiletLon
            )
        ) {

            L.circleMarker(

                [
                    toiletLat,
                    toiletLon
                ],

                {

                    radius:
                        6,

                    weight:
                        2,

                    fillOpacity:
                        1

                }

            )

            .bindTooltip(
                journey.toilet
                    .name
            )

            .addTo(
                destinationLayer
            );
        }
    }


    if (
        bounds.length > 1
    ) {

        map.fitBounds(

            bounds,

            {

                padding: [
                    40,
                    40
                ]

            }

        );
    }
}



// ============================================================
// ROUTE POINT NORMALISATION
// ============================================================

function normalizeRoutePoints(
    points
) {

    if (
        !Array.isArray(
            points
        )
    ) {

        return [];
    }


    return points

    .map(
        point => {

            if (
                Array.isArray(
                    point
                )
                &&
                point.length >= 2
            ) {

                return {

                    lat:
                        Number(
                            point[1]
                        ),

                    lon:
                        Number(
                            point[0]
                        )

                };
            }


            if (
                point
                &&
                typeof point ===
                "object"
            ) {

                return {

                    lat:
                        Number(

                            point.lat

                            ??

                            point.latitude

                        ),

                    lon:
                        Number(

                            point.lon

                            ??

                            point.lng

                            ??

                            point.longitude

                        )

                };
            }


            return null;

        }
    )

    .filter(
        point =>

            point

            &&

            Number.isFinite(
                point.lat
            )

            &&

            Number.isFinite(
                point.lon
            )
    );
}



// ============================================================
// MAP LAYER TOGGLES
// ============================================================

function bindLayerToggles() {

    bindLayerToggle(

        "contextLayerToggle",

        contextLayer

    );


    bindLayerToggle(

        "journeyLayerToggle",

        journeyLayer

    );


    bindLayerToggle(

        "destinationLayerToggle",

        destinationLayer

    );
}


function bindLayerToggle(
    id,
    layer
) {

    const checkbox =
        $(
            id
        );


    if (!checkbox) {

        return;
    }


    checkbox
    .addEventListener(

        "change",

        event => {

            if (
                event.target
                    .checked
            ) {

                if (
                    !map.hasLayer(
                        layer
                    )
                ) {

                    layer.addTo(
                        map
                    );
                }

            }

            else {

                if (
                    map.hasLayer(
                        layer
                    )
                ) {

                    map.removeLayer(
                        layer
                    );
                }
            }

        }

    );
}



// ============================================================
// IMAGE PROGRESS
// ============================================================

function showImageProgress(
    percentage,
    message
) {

    els.imageProgress
    .classList
    .remove(
        "is-hidden"
    );


    updateImageProgress(

        percentage,

        message

    );
}


function updateImageProgress(
    percentage,
    message
) {

    const value =
        Math.max(

            0,

            Math.min(

                100,

                Number(
                    percentage
                )
                ||
                0

            )

        );


    els.imageProgressBar
    .style
    .width =
        `${value}%`;


    els.imageProgressPercent
    .textContent =
        `${Math.round(value)}%`;


    els.imageProgressMessage
    .textContent =
        message
        ||
        "Loading…";


    els.imageProgressTitle
    .textContent =

        value >= 100

            ?

            "Stored image analysis ready"

            :

            "Loading stored image analysis";
}


function hideImageProgress() {

    els.imageProgress
    .classList
    .add(
        "is-hidden"
    );


    els.imageProgressBar
    .style
    .width =
        "0%";


    els.imageProgressPercent
    .textContent =
        "0%";
}



// ============================================================
// STATUS
// ============================================================

function setStatus(
    text
) {

    els.status.textContent =
        text;
}


function setProgress(
    text
) {

    els.progress.textContent =
        text;
}



// ============================================================
// HELPERS
// ============================================================

function slugify(
    value
) {

    return String(
        value
        ||
        ""
    )

    .toLowerCase()

    .trim()

    .replace(
        /[^a-z0-9]+/g,
        "-"
    )

    .replace(
        /^-+|-+$/g,
        ""
    );
}


function escapeHTML(
    value
) {

    return String(
        value
        ??
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
    );
}


function wait(
    milliseconds
) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                milliseconds
            )
    );
}