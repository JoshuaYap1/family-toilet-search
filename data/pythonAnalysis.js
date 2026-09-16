// ============================================================
// PYTHON ANALYSIS BRIDGE
// ============================================================

const ROUTE_BACKEND =
    "http://127.0.0.1:5000";


const IMAGE_BACKEND =
    "http://127.0.0.1:5001";



async function jsonRequest(
    url,
    options = {},
    timeoutMs = 10000
) {

    const controller =
        new AbortController();


    const timer =
        setTimeout(
            () =>
                controller.abort(),
            timeoutMs
        );


    try {

        const response =
            await fetch(
                url,
                {
                    ...options,

                    signal:
                        controller.signal,

                    cache:
                        "no-store"
                }
            );


        const payload =
            await response.json();


        if (!response.ok) {

            throw new Error(

                payload?.message

                ||

                `HTTP ${response.status}`

            );
        }


        return payload;

    }

    finally {

        clearTimeout(timer);
    }
}



// ============================================================
// HEALTH
// ============================================================

export async function checkPythonBackend() {

    try {

        await jsonRequest(
            `${ROUTE_BACKEND}/health`,
            {},
            2500
        );

        return true;

    }

    catch {

        return false;
    }
}


export async function checkImageBackend() {

    try {

        await jsonRequest(
            `${IMAGE_BACKEND}/health`,
            {},
            2500
        );

        return true;

    }

    catch {

        return false;
    }
}



// ============================================================
// ROUTE IMAGERY
// ============================================================

export async function analyseRoutesWithPython(
    routes,
    checkpointSpacing = 80
) {

    return jsonRequest(

        `${ROUTE_BACKEND}/analyse-routes`,

        {

            method:
                "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body:
                JSON.stringify({

                    routes,

                    checkpointSpacing,

                    // Do NOT deliberately invalidate cache.
                    forceRefresh:
                        false

                })
        },

        240000

    );
}



// ============================================================
// IMAGE BATCH CACHE
// ============================================================

export async function lookupImageBatch(
    seedStation,
    stations,
    gridSize = 5
) {

    return jsonRequest(

        `${IMAGE_BACKEND}/cache/lookup`,

        {

            method:
                "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body:
                JSON.stringify({

                    seedStation,
                    stations,
                    gridSize

                })
        },

        5000

    );
}



// ============================================================
// START IMAGE JOB
// ============================================================

export async function startImageBatch(
    seedStation,
    stations,
    gridSize = 5
) {

    return jsonRequest(

        `${IMAGE_BACKEND}/compile/start`,

        {

            method:
                "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body:
                JSON.stringify({

                    seedStation,
                    stations,
                    gridSize

                })
        },

        10000

    );
}



// ============================================================
// POLL IMAGE JOB
// ============================================================

export async function getImageBatchStatus(
    jobId
) {

    return jsonRequest(

        `${IMAGE_BACKEND}/compile/status/${encodeURIComponent(jobId)}`,

        {},

        5000

    );
}