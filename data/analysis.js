// ============================================================
// STATIC ANALYSIS DATA
//
// The website now performs ZERO Python computation.
//
// Everything comes from:
//
// mrt_context_som.json
// mrt_route_library.json
// image_query_index.json
//
// ============================================================


const CONTEXT_URL =
    "./data/generated/mrt_context_som.json";


const ROUTE_LIBRARY_URL =
    "./data/generated/mrt_route_library.json";


const IMAGE_QUERY_URL =
    "./data/generated/image_query_index.json";



// ============================================================
// FEATURE ORDER
//
// Must match image_analysis.ipynb exactly.
// ============================================================

const FEATURE_KEYS = [

    "population_density",

    "children_percent",

    "avg_household_size",

    "hdb_percent",

    "private_housing_percent",

    "elderly_percent",

    "commercial_intensity"

];



// ============================================================
// PROMISE CACHE
//
// Each JSON file is downloaded only once per page load.
// ============================================================

let contextPromise =
    null;


let routePromise =
    null;


let imageQueryPromise =
    null;



// ============================================================
// GENERIC JSON LOADER
// ============================================================

async function loadJSON(
    url
) {

    const response =
        await fetch(
            url,
            {
                cache:
                    "no-store"
            }
        );


    if (!response.ok) {

        throw new Error(
            `Could not load ${url}`
        );
    }


    return response.json();
}



// ============================================================
// MRT NAME NORMALISATION
// ============================================================

export function normalizeMRTName(
    value
) {

    if (!value) {

        return null;
    }


    let text =
        String(
            value
        )
        .trim()
        .toUpperCase();


    text =
        text

        .replace(
            /\s+MRT\s+STATION$/i,
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

        .trim();


    return text

        ?

        `${text} MRT`

        :

        null;
}



// ============================================================
// UNWRAP CONTEXT FILE
// ============================================================

function unwrapContextRecords(
    raw
) {

    if (
        Array.isArray(
            raw
        )
    ) {

        return raw;
    }


    if (
        raw
        &&
        typeof raw ===
        "object"
    ) {

        return (

            raw.records

            ||

            raw.contexts

            ||

            raw.stations

            ||

            raw.data

            ||

            []

        );
    }


    return [];
}



// ============================================================
// LOAD MRT DEMOGRAPHIC CONTEXTS
// ============================================================

export async function loadMRTContexts() {

    if (!contextPromise) {

        contextPromise =
            loadJSON(
                CONTEXT_URL
            )
            .then(
                raw => {

                    return unwrapContextRecords(
                        raw
                    )

                    .map(
                        record => {

                            const station =
                                normalizeMRTName(

                                    record.station

                                    ||

                                    record.name

                                );


                            return {

                                ...record,

                                station,

                                lat:
                                    Number(
                                        record.lat
                                        ??
                                        record.latitude
                                    ),

                                lon:
                                    Number(
                                        record.lon
                                        ??
                                        record.lng
                                        ??
                                        record.longitude
                                    ),

                                somCell:

                                    record.somCell

                                    ??

                                    record.som_cell

                                    ??

                                    (
                                        record.somX !== undefined
                                        &&
                                        record.somY !== undefined

                                            ?

                                            `${record.somX}-${record.somY}`

                                            :

                                            null
                                    ),

                                contextDescriptor:

                                    record.contextDescriptor

                                    ??

                                    record.context_descriptor

                                    ??

                                    record.descriptor

                                    ??

                                    "mixed-context"

                            };

                        }
                    )

                    .filter(
                        record =>
                            record.station
                    );

                }
            );
    }


    return contextPromise;
}



// ============================================================
// FIND ONE CONTEXT
// ============================================================

export function findMRTContext(
    contexts,
    station
) {

    const normalized =
        normalizeMRTName(
            station
        );


    return (

        contexts.find(
            context =>
                normalizeMRTName(
                    context.station
                )
                ===
                normalized
        )

        ||

        null

    );
}



// ============================================================
// SIMILARITY
//
// Same basic standardized Euclidean search used in the
// preprocessing notebook.
//
// This is mainly for displaying similarity values.
// The authoritative MRT ordering comes from
// image_query_index.json.
// ============================================================

function computeStandardizedVectors(
    contexts
) {

    const matrix =
        contexts.map(
            record =>
                FEATURE_KEYS.map(
                    key => {

                        const value =
                            Number(
                                record[
                                    key
                                ]
                            );


                        return Number.isFinite(
                            value
                        )

                            ?

                            value

                            :

                            0;

                    }
                )
        );


    const means =
        FEATURE_KEYS.map(
            (
                _,
                column
            ) => {

                return (

                    matrix.reduce(
                        (
                            sum,
                            row
                        ) =>
                            sum
                            +
                            row[
                                column
                            ],
                        0
                    )

                    /

                    Math.max(
                        matrix.length,
                        1
                    )

                );

            }
        );


    const stds =
        FEATURE_KEYS.map(
            (
                _,
                column
            ) => {

                const mean =
                    means[
                        column
                    ];


                const variance =

                    matrix.reduce(
                        (
                            sum,
                            row
                        ) => {

                            const difference =

                                row[
                                    column
                                ]

                                -

                                mean;


                            return (

                                sum

                                +

                                difference
                                *
                                difference

                            );

                        },
                        0
                    )

                    /

                    Math.max(
                        matrix.length,
                        1
                    );


                return (

                    Math.sqrt(
                        variance
                    )

                    ||

                    1

                );

            }
        );


    const vectors =
        new Map();


    contexts.forEach(
        (
            context,
            index
        ) => {

            vectors.set(

                normalizeMRTName(
                    context.station
                ),

                matrix[
                    index
                ].map(
                    (
                        value,
                        column
                    ) => {

                        return (

                            value
                            -
                            means[
                                column
                            ]

                        )

                        /

                        stds[
                            column
                        ];

                    }
                )

            );

        }
    );


    return vectors;
}



// ============================================================
// GET SIMILARITY BETWEEN TWO MRTS
// ============================================================

export function getContextSimilarity(
    contexts,
    stationA,
    stationB
) {

    const vectors =
        computeStandardizedVectors(
            contexts
        );


    const a =
        vectors.get(
            normalizeMRTName(
                stationA
            )
        );


    const b =
        vectors.get(
            normalizeMRTName(
                stationB
            )
        );


    if (
        !a
        ||
        !b
    ) {

        return 0;
    }


    let distanceSquared =
        0;


    for (
        let index = 0;
        index < a.length;
        index += 1
    ) {

        const difference =
            a[
                index
            ]
            -
            b[
                index
            ];


        distanceSquared +=
            difference
            *
            difference;
    }


    const distance =
        Math.sqrt(
            distanceSquared
        );


    return Math.exp(
        -distance
    );
}



// ============================================================
// FALLBACK COMPARABLE SEARCH
//
// Only used if image_query_index.json is unavailable.
// ============================================================

export function getComparableMRTs(
    contexts,
    seedStation,
    totalCount = 4,
    includeSeed = true
) {

    const seed =
        findMRTContext(
            contexts,
            seedStation
        );


    if (!seed) {

        return [];
    }


    const scored =
        contexts

        .map(
            context => {

                const isSeed =

                    normalizeMRTName(
                        context.station
                    )

                    ===

                    normalizeMRTName(
                        seed.station
                    );


                return {

                    ...context,

                    isSeed,

                    similarity:

                        isSeed

                            ?

                            1

                            :

                            getContextSimilarity(

                                contexts,

                                seed.station,

                                context.station

                            )

                };

            }
        )

        .filter(
            context =>

                includeSeed

                ||

                !context.isSeed
        )

        .sort(
            (
                a,
                b
            ) => {

                if (
                    a.isSeed
                    &&
                    !b.isSeed
                ) {

                    return -1;
                }


                if (
                    b.isSeed
                    &&
                    !a.isSeed
                ) {

                    return 1;
                }


                return (

                    b.similarity

                    -

                    a.similarity

                );

            }
        );


    return scored.slice(
        0,
        totalCount
    );
}



// ============================================================
// LOAD MASTER ROUTE LIBRARY
// ============================================================

export async function loadRouteLibrary() {

    if (!routePromise) {

        routePromise =
            loadJSON(
                ROUTE_LIBRARY_URL
            )
            .then(
                raw => {

                    const routes =

                        Array.isArray(
                            raw
                        )

                            ?

                            raw

                            :

                            raw.routes
                            ||
                            raw.data
                            ||
                            [];


                    return routes

                    .map(
                        route => {

                            const station =
                                normalizeMRTName(
                                    route.station
                                );


                            return {

                                ...route,

                                station

                            };

                        }
                    )

                    .filter(
                        route =>
                            route.station
                    );

                }
            );
    }


    return routePromise;
}



// ============================================================
// ROUTE INDEX
//
// O(1) lookup by station after construction.
// ============================================================

export function indexRoutesByStation(
    routes
) {

    const index =
        new Map();


    for (
        const route
        of routes
    ) {

        index.set(

            normalizeMRTName(
                route.station
            ),

            route

        );
    }


    return index;
}



// ============================================================
// LOAD STATIC IMAGE QUERY INDEX
// ============================================================

export async function loadImageQueryIndex() {

    if (!imageQueryPromise) {

        imageQueryPromise =
            loadJSON(
                IMAGE_QUERY_URL
            );
    }


    return imageQueryPromise;
}



// ============================================================
// FIND ONE PRECOMPUTED IMAGE QUERY
//
// Example:
// CLEMENTI MRT|5
// ============================================================

export function findImageQuery(
    imageQueryIndex,
    seedStation,
    similarCount
) {

    if (!imageQueryIndex) {

        return null;
    }


    const seed =
        normalizeMRTName(
            seedStation
        );


    const count =
        Number(
            similarCount
        );


    const key =
        `${seed}|${count}`;


    return (

        imageQueryIndex.lookup
        ?.[
            key
        ]

        ||

        imageQueryIndex.bySeed
        ?.[
            seed
        ]
        ?.[
            String(
                count
            )
        ]

        ||

        null

    );
}



// ============================================================
// GET CONTEXTS IN THE EXACT SAME ORDER AS IMAGE BACKEND
// ============================================================

export function getQueryContexts(
    contexts,
    imageQueryIndex,
    seedStation,
    similarCount
) {

    const query =
        findImageQuery(

            imageQueryIndex,

            seedStation,

            similarCount

        );


    if (!query) {

        // similarCount means N SIMILAR MRTs,
        // therefore total = seed + N.

        return getComparableMRTs(

            contexts,

            seedStation,

            Number(
                similarCount
            )
            +
            1,

            true

        );
    }


    const seed =
        normalizeMRTName(
            seedStation
        );


    return query.stations

    .map(
        station => {

            const context =
                findMRTContext(

                    contexts,

                    station

                );


            if (!context) {

                return null;
            }


            const isSeed =

                normalizeMRTName(
                    station
                )
                ===
                seed;


            return {

                ...context,

                isSeed,

                similarity:

                    isSeed

                        ?

                        1

                        :

                        getContextSimilarity(

                            contexts,

                            seed,

                            station

                        )

            };

        }
    )

    .filter(
        Boolean
    );
}