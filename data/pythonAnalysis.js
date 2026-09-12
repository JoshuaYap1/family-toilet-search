// =============================================================
// PYTHON ROUTE ANALYSIS
// =============================================================

const PYTHON_BACKEND =
  "http://127.0.0.1:5000";


// =============================================================
// CHECK BACKEND
// =============================================================

export async function checkPythonBackend() {

  try {

    const response =
      await fetch(
        `${PYTHON_BACKEND}/health`,
        {
          method: "GET",
          cache: "no-store"
        }
      );


    if (!response.ok) {
      return false;
    }


    const data =
      await response.json();


    console.log(
      "Python backend health:",
      data
    );


    return (
      data.status === "ok"
    );

  }

  catch (error) {

    console.warn(
      "Python backend unavailable:",
      error
    );


    return false;

  }

}



// =============================================================
// ANALYSE WALKING ROUTE
// =============================================================

export async function analyseRouteWithPython(
  routePoints,
  spacing = 50
) {

  if (
    !Array.isArray(routePoints) ||
    routePoints.length < 2
  ) {

    throw new Error(
      "Python analysis requires at least two route points."
    );

  }


  const cleanRoute =
    routePoints

      .map(
        point => ({
          lat:
            Number(point.lat),

          lon:
            Number(point.lon)
        })
      )

      .filter(
        point =>
          Number.isFinite(point.lat) &&
          Number.isFinite(point.lon)
      );


  if (
    cleanRoute.length < 2
  ) {

    throw new Error(
      "Route does not contain enough valid coordinates."
    );

  }


  console.log(
    "Sending route to Python:",
    cleanRoute.length,
    "points"
  );


  const controller =
    new AbortController();


  const timeout =
    setTimeout(
      () => {

        controller.abort();

      },
      30000
    );


  try {

    const response =
      await fetch(
        `${PYTHON_BACKEND}/analyse-route`,
        {

          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              route:
                cleanRoute,

              spacing:
                Number(spacing)
            }),

          signal:
            controller.signal

        }
      );


    const text =
      await response.text();


    if (!response.ok) {

      console.error(
        "Python backend response:",
        text
      );


      throw new Error(
        `Python backend returned ${response.status}`
      );

    }


    let data;


    try {

      data =
        JSON.parse(text);

    }

    catch {

      throw new Error(
        "Python backend returned invalid JSON."
      );

    }


    console.log(
      "Python route result:",
      data
    );


    if (
      !Array.isArray(
        data.moments
      )
    ) {

      console.warn(
        "Python returned no moments array:",
        data
      );


      return {
        ...data,
        moments: []
      };

    }


    return data;

  }

  catch (error) {

    if (
      error.name ===
      "AbortError"
    ) {

      throw new Error(
        "Python route analysis timed out."
      );

    }


    throw error;

  }

  finally {

    clearTimeout(
      timeout
    );

  }

}