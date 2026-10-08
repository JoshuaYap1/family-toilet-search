// ============================================================
// FAMILY JOURNEY SUPPORT SEARCH
// MRT-FIRST FRONTEND
// ============================================================


const ROUTE_LIBRARY_URL =
    "./data/generated/residential_route_library.json";

const ML_ANALYSIS_URL =
    "./data/generated/family_route_analysis.json";


let routeLibrary = null;

let routes = [];

let routeById = {};

let routesByMrt = {};

let mlAnalysis = null;

let mlRoutes = {};


let selectedRouteId = null;


let map;

let activeLayers = [];



// ============================================================
// ELEMENTS
// ============================================================

const mrtSelect =
    document.getElementById(
        "mrtSelect"
    );

const routeSelect =
    document.getElementById(
        "routeSelect"
    );

const mrtInfo =
    document.getElementById(
        "mrtInfo"
    );

const routeInfo =
    document.getElementById(
        "routeInfo"
    );



// ============================================================
// START
// ============================================================

window.addEventListener(
    "DOMContentLoaded",
    startApp
);


async function startApp() {

    try {

        initialiseMap();

        initialiseTabs();

        await loadLibraries();

        buildRouteIndexes();

        populateMrtDropdown();

        setStatus(
            "Route library ready",
            true
        );

    }
    catch (error) {

        console.error(
            error
        );


        setStatus(
            "Route library failed to load",
            false
        );


        mrtInfo.innerHTML = `
            <strong>
                Data loading error
            </strong>

            <br>

            ${escapeHTML(
                error.message
            )}
        `;

    }

}



// ============================================================
// LOAD JSON
// ============================================================

async function fetchJson(
    url,
    optional = false
) {

    try {

        const response =
            await fetch(
                url,
                {
                    cache:
                        "no-store"
                }
            );


        if (!response.ok) {

            if (optional) {

                return null;

            }


            throw new Error(
                `${url} returned ${response.status}`
            );

        }


        return await response.json();

    }
    catch (error) {

        if (optional) {

            console.warn(
                "Optional data unavailable:",
                url
            );


            return null;

        }


        throw error;

    }

}


async function loadLibraries() {

    setStatus(
        "Loading route library…",
        false
    );


    routeLibrary =
        await fetchJson(
            ROUTE_LIBRARY_URL
        );


    routes =
        routeLibrary.routes
        ||
        Object.values(
            routeLibrary.routesById
            ||
            {}
        );


    if (
        routes.length
        ===
        0
    ) {

        throw new Error(
            "No routes found in residential_route_library.json"
        );

    }


    mlAnalysis =
        await fetchJson(
            ML_ANALYSIS_URL,
            true
        );


    if (mlAnalysis) {

        mlRoutes =
            mlAnalysis.routesById
            ||
            {};


        loadGraphAssets();

    }


    console.log(
        `Loaded ${routes.length} routes`
    );

}



// ============================================================
// INDEX ROUTES
// ============================================================

function buildRouteIndexes() {

    routeById = {};

    routesByMrt = {};


    for (
        const route
        of routes
    ) {

        const routeId =
            getRouteId(
                route
            );


        if (!routeId) {

            continue;

        }


        routeById[
            routeId
        ] =
            route;


        const destination =
            route.destination
            ||
            {};


        const mrtId =
            destination.id
            ||
            slugify(
                destination.name
                ||
                "unknown-mrt"
            );


        const mrtName =
            destination.name
            ||
            mrtId;


        if (
            !routesByMrt[
                mrtId
            ]
        ) {

            routesByMrt[
                mrtId
            ] = {

                id:
                    mrtId,

                name:
                    mrtName,

                routes:
                    []

            };

        }


        routesByMrt[
            mrtId
        ].routes.push(
            route
        );

    }


    // Sort routes within MRT

    for (
        const group
        of Object.values(
            routesByMrt
        )
    ) {

        group.routes.sort(
            (
                a,
                b
            ) => {

                const aDistance =
                    Number(
                        a.distance_m
                        ??
                        999999
                    );


                const bDistance =
                    Number(
                        b.distance_m
                        ??
                        999999
                    );


                return (
                    aDistance
                    -
                    bDistance
                );

            }
        );

    }

}



// ============================================================
// MRT DROPDOWN
// ============================================================

function populateMrtDropdown() {

    const mrtGroups =
        Object.values(
            routesByMrt
        )
        .sort(
            (
                a,
                b
            ) =>
                a.name.localeCompare(
                    b.name
                )
        );


    mrtSelect.innerHTML =
        `<option value="">
            Select MRT station
        </option>`;


    for (
        const group
        of mrtGroups
    ) {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            group.id;


        option.textContent =
            group.name;


        mrtSelect.appendChild(
            option
        );

    }


    mrtSelect.addEventListener(
        "change",
        () => {

            handleMrtChange(
                mrtSelect.value
            );

        }
    );

}



// ============================================================
// MRT CHANGE
// ============================================================

function handleMrtChange(
    mrtId
) {

    clearSelectedRoute();


    const group =
        routesByMrt[
            mrtId
        ];


    if (!group) {

        routeSelect.disabled =
            true;


        routeSelect.innerHTML =
            `<option>
                Select MRT first
            </option>`;


        mrtInfo.textContent =
            "Select an MRT to reveal linked home journeys.";


        return;

    }


    mrtInfo.innerHTML = `
        <strong>
            ${escapeHTML(
                group.name
            )}
        </strong>

        <br>

        ${group.routes.length}
        residential journey
        ${group.routes.length === 1 ? "" : "s"}
        connected to this MRT.
    `;


    routeSelect.disabled =
        false;


    routeSelect.innerHTML =
        `<option value="">
            Select journey home
        </option>`;


    group.routes.forEach(
        (
            route,
            index
        ) => {

            const routeId =
                getRouteId(
                    route
                );


            const letter =
                clusterLetter(
                    index
                );


            const distance =
                Number(
                    route.distance_m
                    ??
                    0
                );


            const option =
                document.createElement(
                    "option"
                );


            option.value =
                routeId;


            option.textContent =
                `Home Cluster ${letter}`
                +
                (
                    distance
                    ?
                    ` · ${Math.round(distance)} m`
                    :
                    ""
                );


            routeSelect.appendChild(
                option
            );

        }
    );


    routeSelect.onchange =
        () => {

            if (
                routeSelect.value
            ) {

                selectRoute(
                    routeSelect.value
                );

            }

        };


    if (
        group.routes.length
        >
        0
    ) {

        const firstRoute =
            group.routes[
                0
            ];


        const firstRouteId =
            getRouteId(
                firstRoute
            );


        routeSelect.value =
            firstRouteId;


        selectRoute(
            firstRouteId
        );

    }

}



// ============================================================
// SELECT ROUTE
// ============================================================

function selectRoute(
    routeId
) {

    selectedRouteId =
        routeId;


    const baseRoute =
        routeById[
            routeId
        ];


    if (!baseRoute) {

        return;

    }


    const analysedRoute =
        mlRoutes[
            routeId
        ]
        ||
        null;


    const route =
        analysedRoute
        ||
        baseRoute;


    renderRouteInfo(
        route
    );


    renderMap(
        route
    );


    renderMetrics(
        route
    );


    renderOverview(
        route
    );


    renderImages(
        route
    );


    renderMl(
        route
    );


    renderSupport(
        route
    );

}



// ============================================================
// ROUTE INFO
// ============================================================

function renderRouteInfo(
    route
) {

    const distance =
        Number(
            route.distance_m
            ??
            0
        );


    const checkpointCount =
        (
            route.checkpoints
            ||
            []
        ).length;


    routeInfo.innerHTML = `
        <strong>
            ${escapeHTML(
                route.destination?.name
                ||
                "MRT"
            )}
            → Home
        </strong>

        <br>

        ${
            distance
            ?
            `${Math.round(
                distance
            )} m`
            :
            "Distance unavailable"
        }

        ·

        ${checkpointCount}
        checkpoints
    `;


    document.getElementById(
        "journeyBadge"
    ).textContent =
        distance
        ?
        `${Math.round(
            distance
        )} m journey`
        :
        "Journey selected";

}



// ============================================================
// MAP
// ============================================================

function initialiseMap() {

    map =
        L.map(
            "map"
        )
        .setView(
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
    )
    .addTo(
        map
    );

}


function clearMap() {

    for (
        const layer
        of activeLayers
    ) {

        map.removeLayer(
            layer
        );

    }


    activeLayers = [];

}


function addLayer(
    layer
) {

    layer.addTo(
        map
    );


    activeLayers.push(
        layer
    );


    return layer;

}


function renderMap(
    route
) {

    clearMap();


    const points =
        normaliseRoutePoints(
            route.points
            ||
            []
        );


    const bounds =
        [];


    if (
        points.length
        >
        1
    ) {

        const latlngs =
            points.map(
                point => [
                    point.lat,
                    point.lon
                ]
            );


        addLayer(

            L.polyline(
                latlngs,
                {
                    color:
                        "#2b82bb",

                    weight:
                        5
                }
            )

        );


        bounds.push(
            ...latlngs
        );

    }


    const mrt =
        route.destination
        ||
        {};


    if (
        validPoint(
            mrt
        )
    ) {

        addLayer(

            L.circleMarker(
                [
                    mrt.lat,
                    mrt.lon
                ],
                {
                    radius:
                        8,

                    color:
                        "#07558f",

                    weight:
                        3,

                    fillColor:
                        "#ffffff",

                    fillOpacity:
                        1
                }
            )
            .bindPopup(
                `<strong>${escapeHTML(
                    mrt.name
                    ||
                    "MRT"
                )}</strong>`
            )

        );


        bounds.push(
            [
                mrt.lat,
                mrt.lon
            ]
        );

    }


    const home =
        route.origin
        ||
        {};


    if (
        validPoint(
            home
        )
    ) {

        addLayer(

            L.circleMarker(
                [
                    home.lat,
                    home.lon
                ],
                {
                    radius:
                        8,

                    color:
                        "#07558f",

                    fillColor:
                        "#07558f",

                    fillOpacity:
                        1
                }
            )
            .bindPopup(
                "Residential destination"
            )

        );


        bounds.push(
            [
                home.lat,
                home.lon
            ]
        );

    }


    for (
        const support
        of
        (
            route.recordedSupport
            ||
            []
        )
    ) {

        if (
            !validPoint(
                support
            )
        ) {

            continue;

        }


        addLayer(

            L.circleMarker(
                [
                    support.lat,
                    support.lon
                ],
                {
                    radius:
                        5,

                    color:
                        "#4a8e66",

                    fillColor:
                        "#4a8e66",

                    fillOpacity:
                        0.9
                }
            )

        );

    }


    for (
        const checkpoint
        of
        (
            route.checkpoints
            ||
            []
        )
    ) {

        if (
            !validPoint(
                checkpoint
            )
        ) {

            continue;

        }


        addLayer(

            L.circleMarker(
                [
                    checkpoint.lat,
                    checkpoint.lon
                ],
                {
                    radius:
                        2.5,

                    color:
                        "#b85c83",

                    fillColor:
                        "#b85c83",

                    fillOpacity:
                        0.7,

                    weight:
                        1
                }
            )

        );

    }


    if (
        bounds.length
        >
        1
    ) {

        map.fitBounds(
            bounds,
            {
                padding:
                    [
                        25,
                        25
                    ]
            }
        );

    }


    setTimeout(
        () =>
            map.invalidateSize(),
        100
    );

}



// ============================================================
// METRICS
// ============================================================

function renderMetrics(
    route
) {

    const distance =
        Number(
            route.distance_m
            ??
            0
        );


    document.getElementById(
        "metricDistance"
    ).textContent =
        distance
        ?
        `${Math.round(
            distance
        )} m`
        :
        "—";


    document.getElementById(
        "metricSupport"
    ).textContent =
        (
            route.recordedSupportIds
            ||
            []
        ).length;


    document.getElementById(
        "metricImages"
    ).textContent =
        (
            route.checkpoints
            ||
            []
        )
        .filter(
            cp =>
                getOriginalImage(
                    cp
                )
        )
        .length;


    const cluster =
        dominantCluster(
            route
        );


    document.getElementById(
        "metricCluster"
    ).textContent =
        cluster === null
        ?
        "Pending"
        :
        `Cluster ${cluster}`;

}



// ============================================================
// OVERVIEW
// ============================================================

const FEATURE_DEFINITIONS = [

    [
        "sky_exposure",
        "Sky exposure"
    ],

    [
        "greenery",
        "Greenery"
    ],

    [
        "road_exposure",
        "Road exposure"
    ],

    [
        "pedestrian_space",
        "Pedestrian space"
    ],

    [
        "built_frontage",
        "Built frontage"
    ],

    [
        "vehicle_presence",
        "Vehicle presence"
    ]

];


function renderOverview(
    route
) {

    const features =
        meanFeatures(
            route
        );


    const featureBars =
        document.getElementById(
            "featureBars"
        );


    if (!features) {

        featureBars.innerHTML = `
            <div class="placeholder">
                SegFormer analysis is still processing
                or has not yet been exported.
            </div>
        `;

    }
    else {

        featureBars.innerHTML =
            FEATURE_DEFINITIONS
            .map(
                (
                    [
                        key,
                        label
                    ]
                ) => {

                    const value =
                        Number(
                            features[
                                key
                            ]
                            ||
                            0
                        );


                    return `
                        <div class="feature-row">

                            <div class="feature-row-head">

                                <span>
                                    ${label}
                                </span>

                                <strong>
                                    ${Math.round(
                                        value
                                        *
                                        100
                                    )}%
                                </strong>

                            </div>

                            <div class="feature-track">

                                <div
                                    style="
                                        width:
                                        ${Math.min(
                                            100,
                                            value
                                            *
                                            100
                                        )}%;
                                    "
                                ></div>

                            </div>

                        </div>
                    `;

                }
            )
            .join("");

    }


    const cluster =
        dominantCluster(
            route
        );


    const typology =
        dominantTypology(
            route
        );


    document.getElementById(
        "journeyInterpretation"
    ).innerHTML = `

        <div class="interpret-row">

            <span>
                Dominant ML cluster
            </span>

            <strong>
                ${
                    cluster === null
                    ?
                    "Pending"
                    :
                    `Cluster ${cluster}`
                }
            </strong>

        </div>


        <div class="interpret-row">

            <span>
                Environmental typology
            </span>

            <strong>
                ${
                    escapeHTML(
                        typology
                        ||
                        "Pending analysis"
                    )
                }
            </strong>

        </div>


        <div class="interpret-row">

            <span>
                Recorded support
            </span>

            <strong>
                ${
                    (
                        route.recordedSupportIds
                        ||
                        []
                    ).length
                }
            </strong>

        </div>

    `;

}



// ============================================================
// IMAGE GRID
// ============================================================

function renderImages(
    route
) {

    const observations =
        (
            route.checkpoints
            ||
            []
        )
        .map(
            checkpoint => ({

                checkpoint,

                original:
                    getOriginalImage(
                        checkpoint
                    ),

                segmentation:
                    checkpoint.segmentationImage
                    ||
                    null

            })
        )
        .filter(
            item =>
                item.original
                ||
                item.segmentation
        );


    const sampled =
        evenlySample(
            observations,
            36
        );


    renderImageGrid(
        document.getElementById(
            "streetImageGrid"
        ),
        sampled,
        "original"
    );


    renderImageGrid(
        document.getElementById(
            "segmentationGrid"
        ),
        sampled,
        "segmentation"
    );

}


function renderImageGrid(
    container,
    items,
    field
) {

    if (
        items.length
        ===
        0
    ) {

        container.innerHTML = `

            <div
                class="placeholder"
                style="
                    grid-column:
                    1 / -1;
                "
            >
                No imagery available yet.
            </div>
        `;


        return;

    }


    container.innerHTML =
        items.map(
            item => {

                const src =
                    item[
                        field
                    ];


                if (!src) {

                    return `
                        <div class="image-cell empty">
                            Pending
                        </div>
                    `;

                }


                return `
                    <div class="image-cell">

                        <img
                            loading="lazy"
                            src="${escapeHTML(
                                normalisePath(
                                    src
                                )
                            )}"
                            alt=""
                        >

                    </div>
                `;

            }
        )
        .join("");

}



// ============================================================
// ML
// ============================================================

function renderMl(
    route
) {

    const container =
        document.getElementById(
            "mlStats"
        );


    if (!mlAnalysis) {

        container.innerHTML = `

            <div
                class="placeholder"
                style="
                    grid-column:
                    1 / -1;
                "
            >
                image_analysis.ipynb is still processing.
                ML graphs will appear after
                family_route_analysis.json is generated.
            </div>
        `;


        return;

    }


    const selectedK =
        mlAnalysis
        .kMeans
        ?.selectedK;


    const ari =
        mlAnalysis
        .hierarchicalClustering
        ?.adjustedRandIndexAgainstKMeans;


    const accuracy =
        mlAnalysis
        .decisionTree
        ?.surrogateAccuracy;


    const cluster =
        dominantCluster(
            route
        );


    container.innerHTML = `

        ${mlStat(
            "Selected K",
            selectedK
            ??
            "—"
        )}

        ${mlStat(
            "Dominant cluster",
            cluster === null
            ?
            "—"
            :
            `Cluster ${cluster}`
        )}

        ${mlStat(
            "K-means / hierarchy ARI",
            ari === undefined
            ?
            "—"
            :
            Number(
                ari
            ).toFixed(
                2
            )
        )}

        ${mlStat(
            "Decision-tree accuracy",
            accuracy === undefined
            ?
            "—"
            :
            `${Math.round(
                accuracy
                *
                100
            )}%`
        )}

    `;

}


function mlStat(
    label,
    value
) {

    return `
        <div class="ml-stat">

            <span>
                ${label}
            </span>

            <strong>
                ${value}
            </strong>

        </div>
    `;

}


function loadGraphAssets() {

    const assets =
        mlAnalysis.visualAssets
        ||
        {};


    setGraph(
        "graphPca",
        assets.pcaSpectrum
    );


    setGraph(
        "graphHeatmap",
        assets.clusterHeatmap
    );


    setGraph(
        "graphDendrogram",
        assets.dendrogram
    );


    setGraph(
        "graphImportance",
        assets.featureImportance
    );

}


function setGraph(
    id,
    path
) {

    if (!path) {

        return;

    }


    const image =
        document.getElementById(
            id
        );


    image.src =
        normalisePath(
            path
        );


    image.style.display =
        "block";

}



// ============================================================
// SUPPORT
// ============================================================

function renderSupport(
    route
) {

    const supportCount =
        (
            route.recordedSupportIds
            ||
            []
        ).length;


    const checkpoints =
        route.checkpoints
        ||
        [];


    const distances =
        checkpoints
        .map(
            cp =>
                Number(
                    cp.distanceToNearestRecordedSupportM
                )
        )
        .filter(
            Number.isFinite
        );


    const percentiles =
        checkpoints
        .map(
            cp =>
                Number(
                    cp.supportGapPercentile
                )
        )
        .filter(
            Number.isFinite
        );


    const largestDistance =
        distances.length
        ?
        Math.max(
            ...distances
        )
        :
        null;


    const largestPercentile =
        percentiles.length
        ?
        Math.max(
            ...percentiles
        )
        :
        null;


    document.getElementById(
        "supportPanel"
    ).innerHTML = `

        <div class="support-grid">

            <article>

                <span>
                    Recorded opportunities
                </span>

                <strong>
                    ${supportCount}
                </strong>

            </article>


            <article>

                <span>
                    Largest mapped support distance
                </span>

                <strong>
                    ${
                        largestDistance === null
                        ?
                        "Pending"
                        :
                        `${Math.round(
                            largestDistance
                        )} m`
                    }
                </strong>

            </article>


            <article>

                <span>
                    Largest relative support gap
                </span>

                <strong>
                    ${
                        largestPercentile === null
                        ?
                        "Pending"
                        :
                        `${Math.round(
                            largestPercentile
                            *
                            100
                        )}th`
                    }
                </strong>

            </article>

        </div>


        <div class="support-note">

            These values describe the available support
            recorded in the local family-support library.
            Zero recorded opportunities does not prove
            that no physical resting place exists.

        </div>

    `;

}



// ============================================================
// TABS
// ============================================================

function initialiseTabs() {

    document
    .querySelectorAll(
        ".tab"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    document
                    .querySelectorAll(
                        ".tab"
                    )
                    .forEach(
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );


                    document
                    .querySelectorAll(
                        ".tab-panel"
                    )
                    .forEach(
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );


                    button.classList.add(
                        "active"
                    );


                    document
                    .getElementById(
                        `panel-${button.dataset.tab}`
                    )
                    .classList.add(
                        "active"
                    );


                    setTimeout(
                        () =>
                            map.invalidateSize(),
                        50
                    );

                }
            );

        }
    );

}



// ============================================================
// HELPERS
// ============================================================

function getRouteId(
    route
) {

    return (
        route.id
        ||
        route.route_id
        ||
        route.routeId
        ||
        null
    );

}


function getOriginalImage(
    checkpoint
) {

    if (
        checkpoint.originalImage
    ) {

        return checkpoint.originalImage;

    }


    const first =
        (
            checkpoint.imageCandidates
            ||
            []
        )[0];


    return (
        first?.url
        ||
        first?.imageUrl
        ||
        first?.thumb_1024_url
        ||
        null
    );

}


function meanFeatures(
    route
) {

    const valid =
        (
            route.checkpoints
            ||
            []
        )
        .filter(
            cp =>
                cp.environmentalFeatures
        );


    if (
        valid.length
        ===
        0
    ) {

        return null;

    }


    const result = {};


    for (
        const [
            key
        ]
        of FEATURE_DEFINITIONS
    ) {

        const values =
            valid
            .map(
                cp =>
                    Number(
                        cp.environmentalFeatures[
                            key
                        ]
                    )
            )
            .filter(
                Number.isFinite
            );


        result[
            key
        ] =
            values.length
            ?
            values.reduce(
                (
                    a,
                    b
                ) =>
                    a + b,
                0
            )
            /
            values.length
            :
            0;

    }


    return result;

}


function dominantCluster(
    route
) {

    const counter = {};


    for (
        const cp
        of
        (
            route.checkpoints
            ||
            []
        )
    ) {

        const cluster =
            cp.environmentCluster;


        if (
            cluster === null
            ||
            cluster === undefined
        ) {

            continue;

        }


        counter[
            cluster
        ] =
            (
                counter[
                    cluster
                ]
                ||
                0
            )
            +
            1;

    }


    const entries =
        Object.entries(
            counter
        );


    if (
        entries.length
        ===
        0
    ) {

        return null;

    }


    entries.sort(
        (
            a,
            b
        ) =>
            b[
                1
            ]
            -
            a[
                1
            ]
    );


    return entries[
        0
    ][0];

}


function dominantTypology(
    route
) {

    const counter = {};


    for (
        const cp
        of
        (
            route.checkpoints
            ||
            []
        )
    ) {

        const value =
            cp.environmentTypology;


        if (!value) {

            continue;

        }


        counter[
            value
        ] =
            (
                counter[
                    value
                ]
                ||
                0
            )
            +
            1;

    }


    const entries =
        Object.entries(
            counter
        );


    if (
        entries.length
        ===
        0
    ) {

        return null;

    }


    entries.sort(
        (
            a,
            b
        ) =>
            b[
                1
            ]
            -
            a[
                1
            ]
    );


    return entries[
        0
    ][0];

}


function normaliseRoutePoints(
    points
) {

    return points
        .map(
            point => {

                if (
                    Array.isArray(
                        point
                    )
                ) {

                    return {

                        lat:
                            Number(
                                point[
                                    0
                                ]
                            ),

                        lon:
                            Number(
                                point[
                                    1
                                ]
                            )

                    };

                }


                return {

                    lat:
                        Number(
                            point.lat
                        ),

                    lon:
                        Number(
                            point.lon
                            ??
                            point.lng
                        )

                };

            }
        )
        .filter(
            validPoint
        );

}


function validPoint(
    point
) {

    return (
        point
        &&
        Number.isFinite(
            Number(
                point.lat
            )
        )
        &&
        Number.isFinite(
            Number(
                point.lon
                ??
                point.lng
            )
        )
    );

}


function evenlySample(
    array,
    maxCount
) {

    if (
        array.length
        <=
        maxCount
    ) {

        return array;

    }


    const result = [];


    const step =
        (
            array.length
            -
            1
        )
        /
        (
            maxCount
            -
            1
        );


    for (
        let i = 0;
        i < maxCount;
        i++
    ) {

        result.push(
            array[
                Math.round(
                    i
                    *
                    step
                )
            ]
        );

    }


    return result;

}


function clusterLetter(
    index
) {

    if (
        index
        <
        26
    ) {

        return String.fromCharCode(
            65
            +
            index
        );

    }


    return `A${index - 25}`;

}


function normalisePath(
    path
) {

    if (!path) {

        return "";

    }


    if (
        path.startsWith(
            "http://"
        )
        ||
        path.startsWith(
            "https://"
        )
    ) {

        return path;

    }


    return (
        path.startsWith(
            "./"
        )
        ?
        path
        :
        `./${path}`
    );

}


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
        /^-|-$/g,
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
    )
    .replaceAll(
        "'",
        "&#039;"
    );

}


function setStatus(
    message,
    ready
) {

    document.getElementById(
        "systemStatus"
    ).textContent =
        message;


    document.getElementById(
        "statusDot"
    ).classList.toggle(
        "ready",
        ready
    );

}


function clearSelectedRoute() {

    selectedRouteId =
        null;


    routeInfo.textContent =
        "Route information will appear here.";


    clearMap();


    document.getElementById(
        "metricDistance"
    ).textContent =
        "—";


    document.getElementById(
        "metricSupport"
    ).textContent =
        "—";


    document.getElementById(
        "metricImages"
    ).textContent =
        "—";


    document.getElementById(
        "metricCluster"
    ).textContent =
        "—";

}