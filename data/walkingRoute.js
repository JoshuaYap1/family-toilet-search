// ======================================================
// WALKING ROUTE
// OpenStreetMap pedestrian routing
// ======================================================

const FOOT_ROUTER =
  "https://routing.openstreetmap.de/routed-foot/route/v1/driving";


export async function getWalkingRoute(
  origin,
  destination
) {
  if (
    !origin ||
    !destination
  ) {
    throw new Error(
      "Origin or destination is missing."
    );
  }

  const coordinates =
    `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;

  const url =
    `${FOOT_ROUTER}/${coordinates}` +
    "?overview=full" +
    "&geometries=geojson" +
    "&steps=true";

  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Walking route request failed (${response.status}).`
    );
  }

  const data =
    await response.json();

  if (
    data.code !== "Ok" ||
    !data.routes ||
    !data.routes.length
  ) {
    throw new Error(
      "No pedestrian route was found."
    );
  }

  const route =
    data.routes[0];

  const geometry =
    route.geometry;

  if (
    !geometry ||
    !Array.isArray(
      geometry.coordinates
    )
  ) {
    throw new Error(
      "Walking route contains no geometry."
    );
  }

  const points =
    geometry.coordinates.map(
      coordinate => ({
        lon:
          coordinate[0],

        lat:
          coordinate[1]
      })
    );

  return {
    distance:
      Math.round(
        route.distance || 0
      ),

    duration:
      Math.round(
        route.duration || 0
      ),

    points,

    steps:
      extractSteps(
        route
      )
  };
}


function extractSteps(route) {
  const steps = [];

  (
    route.legs || []
  ).forEach(
    leg => {
      (
        leg.steps || []
      ).forEach(
        step => {
          steps.push({
            distance:
              Math.round(
                step.distance || 0
              ),

            duration:
              Math.round(
                step.duration || 0
              ),

            name:
              step.name || "",

            maneuver:
              step.maneuver || null
          });
        }
      );
    }
  );

  return steps;
}