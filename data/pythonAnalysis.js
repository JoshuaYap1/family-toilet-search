// ============================================================
// YOUNG FAMILY URBAN ACCESS
// PYTHON / JUPYTER BACKEND BRIDGE
// ============================================================
//
// Route intelligence:
// http://127.0.0.1:5000
//
// Image analysis:
// http://127.0.0.1:5001
//
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

const ROUTE_BACKEND_URL =
  "http://127.0.0.1:5000";


const IMAGE_BACKEND_URL =
  "http://127.0.0.1:5001";


const DEFAULT_CHECKPOINT_SPACING_M =
  15;


// Dense route analysis can involve dozens
// of checkpoints per route.
const ROUTE_REQUEST_TIMEOUT_MS =
  20
  *
  60
  *
  1000;


// CPU SegFormer can take a long time.
const IMAGE_REQUEST_TIMEOUT_MS =
  45
  *
  60
  *
  1000;


// ============================================================
// ABORT / TIMEOUT
// ============================================================

function createTimeoutController(
  timeoutMs
) {

  const controller =
    new AbortController();


  const timeoutId =
    setTimeout(

      () =>
        controller.abort(),

      timeoutMs

    );


  return {

    controller,

    timeoutId

  };
}


// ============================================================
// FETCH JSON
// ============================================================

async function fetchJson(
  url,
  options = {},
  timeoutMs = 120000
) {

  const {
    controller,
    timeoutId
  } =
    createTimeoutController(
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
            options.cache
            ||
            "no-store"

        }

      );


    let payload =
      null;


    try {

      payload =
        await response.json();

    }
    catch {

      payload =
        null;

    }


    if (
      !response.ok
    ) {

      throw new Error(

        payload?.error

        ||

        payload?.message

        ||

        `HTTP ${
          response.status
        }`

      );

    }


    return payload;

  }
  catch (
    error
  ) {

    if (
      error?.name ===
      "AbortError"
    ) {

      throw new Error(

        `Backend request exceeded ${
          Math.round(
            timeoutMs
            /
            60000
          )
        } minute(s).`

      );

    }


    throw error;

  }
  finally {

    clearTimeout(
      timeoutId
    );

  }

}


// ============================================================
// HEALTH
// ============================================================

async function endpointIsAlive(
  url,
  timeoutMs = 5000
) {

  try {

    const payload =
      await fetchJson(

        url,

        {

          method:
            "GET",

          cache:
            "no-store"

        },

        timeoutMs

      );


    return Boolean(

      payload

      &&

      (

        payload.ok === true

        ||

        payload.status ===
        "ok"

        ||

        payload.status ===
        "ready"

        ||

        payload.service

      )

    );

  }
  catch {

    return false;

  }

}


// ============================================================
// ROUTE BACKEND
// ============================================================

export async function checkPythonBackend() {

  return endpointIsAlive(
    `${ROUTE_BACKEND_URL}/health`
  );

}


// ============================================================
// IMAGE BACKEND
// ============================================================

export async function checkImageBackend() {

  return endpointIsAlive(
    `${IMAGE_BACKEND_URL}/health`
  );

}


// ============================================================
// CLEAN ROUTE POINTS
// ============================================================

function cleanRoutePoints(
  points
) {

  if (
    !Array.isArray(
      points
    )
  ) {

    return [];

  }


  const cleaned =
    [];


  for (
    const point
    of points
  ) {

    const lat =
      Number(
        point?.lat
      );


    const lon =
      Number(
        point?.lon
      );


    if (

      !Number.isFinite(
        lat
      )

      ||

      !Number.isFinite(
        lon
      )

      ||

      lat < -90

      ||

      lat > 90

      ||

      lon < -180

      ||

      lon > 180

    ) {

      continue;

    }


    const previous =
      cleaned[
        cleaned.length - 1
      ];


    if (

      previous

      &&

      previous.lat ===
      lat

      &&

      previous.lon ===
      lon

    ) {

      continue;

    }


    cleaned.push({

      lat,

      lon

    });

  }


  return cleaned;
}


// ============================================================
// NORMALISE ROUTE PAYLOAD
// ============================================================

function normaliseRoutePayload(
  route,
  index
) {

  const points =
    cleanRoutePoints(
      route?.points
    );


  if (
    points.length < 2
  ) {

    throw new Error(

      `Route ${
        index + 1
      } has fewer than two valid geometry points.`

    );

  }


  return {

    routeId:
      route?.routeId
      ||
      `route-${index + 1}`,


    station:
      route?.station
      ||
      null,


    stationType:
      route?.stationType
      ||
      null,


    toilet:
      route?.toilet
      ||
      null,


    destination:
      route?.destination
      ||
      route?.toilet
      ||
      null,


    points

  };

}


// ============================================================
// BATCH ROUTE ANALYSIS
// ============================================================

export async function analyseRoutesWithPython(
  routePayloads,
  checkpointSpacingM =
    DEFAULT_CHECKPOINT_SPACING_M,
  force =
    false
) {

  if (

    !Array.isArray(
      routePayloads
    )

    ||

    !routePayloads.length

  ) {

    throw new Error(
      "No route payloads were provided."
    );

  }


  const routes =
    routePayloads.map(

      (
        route,
        index
      ) =>
        normaliseRoutePayload(
          route,
          index
        )

    );


  const spacing =
    Math.max(

      8,

      Number(
        checkpointSpacingM
      )

      ||

      DEFAULT_CHECKPOINT_SPACING_M

    );


  console.log(

    `Analysing ${
      routes.length
    } route(s) at ${
      spacing
    } m checkpoint spacing.`

  );


  const payload =
    await fetchJson(

      `${ROUTE_BACKEND_URL}/analyse-routes`,

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

            checkpointSpacingM:
              spacing,

            force:
              Boolean(
                force
              )

          })

      },

      ROUTE_REQUEST_TIMEOUT_MS

    );


  if (

    !payload

    ||

    payload.ok ===
    false

  ) {

    throw new Error(

      payload?.error

      ||

      "Route-intelligence analysis failed."

    );

  }


  return payload;
}


// ============================================================
// SINGLE ROUTE ANALYSIS
// ============================================================

export async function analyseRouteWithPython(
  routePayload,
  checkpointSpacingM =
    DEFAULT_CHECKPOINT_SPACING_M,
  force =
    false
) {

  const route =
    normaliseRoutePayload(

      routePayload,

      0

    );


  const payload =
    await fetchJson(

      `${ROUTE_BACKEND_URL}/analyse-route`,

      {

        method:
          "POST",


        headers: {

          "Content-Type":
            "application/json"

        },


        body:
          JSON.stringify({

            ...route,

            checkpointSpacingM,

            force:
              Boolean(
                force
              )

          })

      },

      ROUTE_REQUEST_TIMEOUT_MS

    );


  if (
    payload?.ok ===
    false
  ) {

    throw new Error(

      payload.error

      ||

      "Route analysis failed."

    );

  }


  return (

    payload?.result

    ||

    payload

  );
}


// ============================================================
// IMAGE COMPILATION
// ============================================================

export async function compileStreetImages(
  options = {}
) {

  const requestBody = {

    maxImages:
      Math.max(

        1,

        Number(
          options.maxImages
        )

        ||

        360

      ),


    clusterCount:
      Math.max(

        2,

        Number(
          options.clusterCount
        )

        ||

        10

      ),


    force:
      Boolean(
        options.force
      )

  };


  console.log(

    "Starting image compiler:",

    requestBody

  );


  const payload =
    await fetchJson(

      `${IMAGE_BACKEND_URL}/compile`,

      {

        method:
          "POST",


        headers: {

          "Content-Type":
            "application/json"

        },


        body:
          JSON.stringify(
            requestBody
          )

      },

      IMAGE_REQUEST_TIMEOUT_MS

    );


  if (

    !payload

    ||

    payload.ok ===
    false

  ) {

    throw new Error(

      payload?.error

      ||

      "Image compilation failed."

    );

  }


  return payload;
}


// ============================================================
// SAVED ROUTE
// ============================================================

export async function getRouteAnalysis(
  routeId
) {

  if (!routeId) {

    throw new Error(
      "routeId is required."
    );

  }


  const payload =
    await fetchJson(

      `${ROUTE_BACKEND_URL}/route/${
        encodeURIComponent(
          routeId
        )
      }`,

      {

        method:
          "GET",

        cache:
          "no-store"

      }

    );


  if (
    payload?.ok ===
    false
  ) {

    throw new Error(

      payload.error

      ||

      "Route analysis unavailable."

    );

  }


  return (

    payload?.result

    ||

    payload

  );
}


// ============================================================
// LATEST ROUTE BATCH
// ============================================================

export async function getLatestRouteBatch() {

  return fetchJson(

    `${ROUTE_BACKEND_URL}/latest-batch`,

    {

      method:
        "GET",

      cache:
        "no-store"

    }

  );

}


// ============================================================
// IMAGE STATUS
// ============================================================

export async function getImageBackendStatus() {

  return fetchJson(

    `${IMAGE_BACKEND_URL}/status`,

    {

      method:
        "GET",

      cache:
        "no-store"

    },

    5000

  );

}


// ============================================================
// CONFIG EXPORT
// ============================================================

export const PYTHON_BACKENDS = {

  route:
    ROUTE_BACKEND_URL,

  image:
    IMAGE_BACKEND_URL,

  checkpointSpacingM:
    DEFAULT_CHECKPOINT_SPACING_M

};