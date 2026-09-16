// ============================================================
// WALKING ROUTE
// ============================================================

const ROUTE_CACHE =
    new Map();


const ROUTE_TIMEOUT_MS =
    6000;


const OSRM_BASE =
    "https://router.project-osrm.org";


// ============================================================
// PUBLIC
// ============================================================

export async function getWalkingRoute(
    origin,
    destination
) {

    const cacheKey =
        makeRouteKey(
            origin,
            destination
        );


    if (
        ROUTE_CACHE.has(
            cacheKey
        )
    ) {

        return ROUTE_CACHE.get(
            cacheKey
        );
    }


    const stored =
        readStoredRoute(
            cacheKey
        );


    if (stored) {

        ROUTE_CACHE.set(
            cacheKey,
            stored
        );


        return stored;
    }


    const route =
        await fetchWalkingRoute(
            origin,
            destination
        );


    ROUTE_CACHE.set(
        cacheKey,
        route
    );


    writeStoredRoute(
        cacheKey,
        route
    );


    return route;
}


// ============================================================
// FETCH ROUTE
// ============================================================

async function fetchWalkingRoute(
    origin,
    destination
) {

    const startLat =
        Number(origin.lat);

    const startLon =
        Number(origin.lon);

    const endLat =
        Number(destination.lat);

    const endLon =
        Number(destination.lon);


    const url =
        `${OSRM_BASE}`
        +
        `/route/v1/foot/`
        +
        `${startLon},${startLat};`
        +
        `${endLon},${endLat}`
        +
        `?overview=full`
        +
        `&geometries=geojson`
        +
        `&steps=false`;


    const controller =
        new AbortController();


    const timeout =
        setTimeout(
            () => controller.abort(),
            ROUTE_TIMEOUT_MS
        );


    try {

        const response =
            await fetch(
                url,
                {
                    signal:
                        controller.signal
                }
            );


        if (!response.ok) {

            throw new Error(
                `Routing HTTP ${response.status}`
            );
        }


        const data =
            await response.json();


        const route =
            data.routes?.[0];


        if (!route) {

            throw new Error(
                "No walking route returned."
            );
        }


        const points =
            (
                route.geometry
                ?.coordinates
                ||
                []
            )
            .map(
                coordinate => ({

                    lon:
                        Number(
                            coordinate[0]
                        ),

                    lat:
                        Number(
                            coordinate[1]
                        )

                })
            );


        return {

            distance:
                Number(
                    route.distance
                ),

            duration:
                Number(
                    route.duration
                ),

            points,

            isApproximate:
                false

        };

    } catch (error) {

        console.warn(
            "Precise routing unavailable:",
            error
        );


        return {

            distance:
                haversineMeters(
                    startLat,
                    startLon,
                    endLat,
                    endLon
                ),

            duration:
                null,

            points: [
                {
                    lat:
                        startLat,

                    lon:
                        startLon
                },

                {
                    lat:
                        endLat,

                    lon:
                        endLon
                }
            ],

            isApproximate:
                true

        };

    } finally {

        clearTimeout(
            timeout
        );
    }
}


// ============================================================
// CACHE
// ============================================================

function makeRouteKey(
    origin,
    destination
) {

    return [

        Number(origin.lat)
            .toFixed(5),

        Number(origin.lon)
            .toFixed(5),

        Number(destination.lat)
            .toFixed(5),

        Number(destination.lon)
            .toFixed(5)

    ]
    .join(":");
}


function readStoredRoute(
    key
) {

    try {

        const raw =
            sessionStorage.getItem(
                `route:${key}`
            );


        return raw
            ?
            JSON.parse(raw)
            :
            null;

    } catch {

        return null;
    }
}


function writeStoredRoute(
    key,
    route
) {

    try {

        sessionStorage.setItem(
            `route:${key}`,
            JSON.stringify(
                route
            )
        );

    } catch {

        // Ignore.
    }
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