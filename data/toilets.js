// ============================================================
// FAST MULTI-MRT TOILET SEARCH
// ============================================================

const OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
];

const REQUEST_TIMEOUT_MS = 6500;

const CACHE_TTL_MS =
    1000 * 60 * 60 * 24;

const memoryCache =
    new Map();


// ============================================================
// MULTI-ORIGIN SEARCH
// ============================================================

export async function searchToiletsForOrigins(
    origins,
    radius = 500
) {

    const validOrigins =
        (
            Array.isArray(origins)
                ? origins
                : []
        )
        .filter(
            origin =>
                Number.isFinite(
                    Number(origin?.lat)
                )
                &&
                Number.isFinite(
                    Number(origin?.lon)
                )
        );


    if (!validOrigins.length) {

        return new Map();
    }


    const cacheKey =
        makeCacheKey(
            validOrigins,
            radius
        );


    // --------------------------------------------------------
    // MEMORY CACHE
    // --------------------------------------------------------

    if (
        memoryCache.has(
            cacheKey
        )
    ) {

        return groupByOrigin(
            validOrigins,
            memoryCache.get(cacheKey),
            radius
        );
    }


    // --------------------------------------------------------
    // LOCAL STORAGE CACHE
    // --------------------------------------------------------

    const stored =
        readCache(
            cacheKey
        );


    if (stored) {

        memoryCache.set(
            cacheKey,
            stored
        );


        return groupByOrigin(
            validOrigins,
            stored,
            radius
        );
    }


    // --------------------------------------------------------
    // ONE OVERPASS REQUEST
    // --------------------------------------------------------

    const query =
        buildCombinedQuery(
            validOrigins,
            radius
        );


    let elements =
        null;


    for (
        const endpoint
        of OVERPASS_ENDPOINTS
    ) {

        try {

            elements =
                await requestOverpass(
                    endpoint,
                    query
                );


            if (
                Array.isArray(elements)
            ) {

                break;
            }

        } catch (error) {

            console.warn(
                "Overpass failed:",
                endpoint,
                error
            );
        }
    }


    if (
        !Array.isArray(elements)
    ) {

        return new Map(
            validOrigins.map(
                origin => [
                    origin.station,
                    []
                ]
            )
        );
    }


    const toilets =
        parseToilets(
            elements
        );


    memoryCache.set(
        cacheKey,
        toilets
    );


    writeCache(
        cacheKey,
        toilets
    );


    return groupByOrigin(
        validOrigins,
        toilets,
        radius
    );
}


// ============================================================
// BACKWARDS-COMPATIBLE SINGLE MRT SEARCH
// ============================================================

export async function searchToilets(
    origin,
    radius = 500
) {

    const grouped =
        await searchToiletsForOrigins(
            [origin],
            radius
        );


    return (
        grouped.get(
            origin.station
        )
        ||
        []
    );
}


// ============================================================
// QUERY
// ============================================================

function buildCombinedQuery(
    origins,
    radius
) {

    const clauses =
        origins
        .map(
            origin => {

                const lat =
                    Number(origin.lat);

                const lon =
                    Number(origin.lon);


                return `
                    node["amenity"="toilets"]
                    (around:${radius},${lat},${lon});

                    way["amenity"="toilets"]
                    (around:${radius},${lat},${lon});

                    relation["amenity"="toilets"]
                    (around:${radius},${lat},${lon});
                `;
            }
        )
        .join("\n");


    return `
        [out:json][timeout:6];

        (
            ${clauses}
        );

        out center tags;
    `;
}


// ============================================================
// REQUEST
// ============================================================

async function requestOverpass(
    endpoint,
    query
) {

    const controller =
        new AbortController();


    const timeout =
        setTimeout(
            () => controller.abort(),
            REQUEST_TIMEOUT_MS
        );


    try {

        const response =
            await fetch(
                endpoint,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/x-www-form-urlencoded;charset=UTF-8"
                    },

                    body:
                        new URLSearchParams({
                            data: query
                        }),

                    signal:
                        controller.signal
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }


        const data =
            await response.json();


        return (
            data.elements
            ||
            []
        );

    } finally {

        clearTimeout(
            timeout
        );
    }
}


// ============================================================
// PARSE OSM TOILETS
// ============================================================

function parseToilets(
    elements
) {

    const toilets =
        [];

    const seen =
        new Set();


    for (
        const element
        of elements
    ) {

        const lat =
            Number(
                element.lat
                ??
                element.center?.lat
            );


        const lon =
            Number(
                element.lon
                ??
                element.center?.lon
            );


        if (
            !Number.isFinite(lat)
            ||
            !Number.isFinite(lon)
        ) {

            continue;
        }


        const id =
            `${element.type}-${element.id}`;


        if (
            seen.has(id)
        ) {

            continue;
        }


        seen.add(id);


        const tags =
            element.tags
            ||
            {};


        toilets.push({

            id,

            lat,

            lon,

            name:
                tags.name
                ||
                tags["name:en"]
                ||
                "Public toilet",

            wheelchair:
                tags.wheelchair
                ||
                null,

            changingTable:
                tags.changing_table
                ||
                tags["changing_table:adult"]
                ||
                null,

            access:
                tags.access
                ||
                null,

            fee:
                tags.fee
                ||
                null,

            tags

        });
    }


    return toilets;
}


// ============================================================
// ASSIGN TO EACH MRT LOCALLY
// ============================================================

function groupByOrigin(
    origins,
    toilets,
    radius
) {

    const grouped =
        new Map();


    for (
        const origin
        of origins
    ) {

        const matches =
            toilets

            .map(
                toilet => ({

                    ...toilet,

                    distanceFromOrigin:
                        haversineMeters(
                            origin.lat,
                            origin.lon,
                            toilet.lat,
                            toilet.lon
                        )

                })
            )

            .filter(
                toilet =>
                    toilet.distanceFromOrigin
                    <=
                    radius * 1.15
            )

            .sort(
                (a, b) =>
                    a.distanceFromOrigin
                    -
                    b.distanceFromOrigin
            );


        grouped.set(
            origin.station,
            matches
        );
    }


    return grouped;
}


// ============================================================
// DISTANCE
// ============================================================

function haversineMeters(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const R =
        6371000;


    const p1 =
        Number(lat1)
        *
        Math.PI / 180;


    const p2 =
        Number(lat2)
        *
        Math.PI / 180;


    const dp =
        (
            Number(lat2)
            -
            Number(lat1)
        )
        *
        Math.PI / 180;


    const dl =
        (
            Number(lon2)
            -
            Number(lon1)
        )
        *
        Math.PI / 180;


    const a =
        Math.sin(dp / 2) ** 2
        +
        Math.cos(p1)
        *
        Math.cos(p2)
        *
        Math.sin(dl / 2) ** 2;


    return (
        R
        *
        2
        *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        )
    );
}


// ============================================================
// CACHE
// ============================================================

function makeCacheKey(
    origins,
    radius
) {

    const points =
        origins

        .map(
            origin =>
                `${
                    Number(origin.lat)
                    .toFixed(3)
                },${
                    Number(origin.lon)
                    .toFixed(3)
                }`
        )

        .sort()

        .join("|");


    return (
        `family-toilets:${radius}:${points}`
    );
}


function readCache(
    key
) {

    try {

        const raw =
            localStorage.getItem(
                key
            );


        if (!raw) {

            return null;
        }


        const cached =
            JSON.parse(raw);


        if (
            Date.now()
            -
            cached.timestamp
            >
            CACHE_TTL_MS
        ) {

            localStorage.removeItem(
                key
            );


            return null;
        }


        return cached.data;

    } catch {

        return null;
    }
}


function writeCache(
    key,
    data
) {

    try {

        localStorage.setItem(
            key,
            JSON.stringify({
                timestamp:
                    Date.now(),

                data
            })
        );

    } catch {

        // Ignore cache failure.
    }
}