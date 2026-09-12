// ======================================================
// ROUTE UTILITIES
// ======================================================

import {
  haversineMeters
} from "./geo.js";


// ======================================================
// SAMPLE ROUTE
// ======================================================
//
// spacing = approximate metres between Street View moments.
//
// Keeps:
// - origin
// - intermediate samples
// - destination
//
// Each sample also remembers where it sits on the route.
// ======================================================

export function sampleRoute(
  routePoints,
  spacing = 100
) {

  if (
    !Array.isArray(routePoints) ||
    routePoints.length < 2
  ) {
    return [];
  }


  const samples = [];


  // Always include origin.
  samples.push({
    lat:
      routePoints[0].lat,

    lon:
      routePoints[0].lon,

    routeIndex:
      0,

    distanceFromStart:
      0
  });


  let totalTravelled =
    0;


  let nextSampleDistance =
    spacing;


  for (
    let i = 1;
    i < routePoints.length;
    i++
  ) {

    const segmentStart =
      routePoints[i - 1];


    const segmentEnd =
      routePoints[i];


    const segmentLength =
      haversineMeters(
        segmentStart.lat,
        segmentStart.lon,
        segmentEnd.lat,
        segmentEnd.lon
      );


    if (
      segmentLength <= 0
    ) {
      continue;
    }


    const previousTravelled =
      totalTravelled;


    totalTravelled +=
      segmentLength;


    // There may be multiple sample distances
    // inside one long route segment.
    while (
      nextSampleDistance <=
      totalTravelled
    ) {

      const distanceIntoSegment =
        nextSampleDistance -
        previousTravelled;


      const fraction =
        Math.max(
          0,
          Math.min(
            1,
            distanceIntoSegment /
            segmentLength
          )
        );


      const interpolated =
        interpolatePoint(
          segmentStart,
          segmentEnd,
          fraction
        );


      samples.push({
        ...interpolated,

        routeIndex:
          i,

        distanceFromStart:
          Math.round(
            nextSampleDistance
          )
      });


      nextSampleDistance +=
        spacing;
    }

  }


  // Always include destination.
  const finalPoint =
    routePoints[
      routePoints.length - 1
    ];


  const finalSample =
    samples[
      samples.length - 1
    ];


  const distanceToFinal =
    haversineMeters(
      finalSample.lat,
      finalSample.lon,
      finalPoint.lat,
      finalPoint.lon
    );


  // Avoid creating two markers almost on top of one another.
  if (
    distanceToFinal > 15
  ) {

    samples.push({
      lat:
        finalPoint.lat,

      lon:
        finalPoint.lon,

      routeIndex:
        routePoints.length - 1,

      distanceFromStart:
        Math.round(
          totalTravelled
        )
    });

  }


  return samples;
}



// ======================================================
// INTERPOLATE POINT
// ======================================================

function interpolatePoint(
  start,
  end,
  fraction
) {

  return {
    lat:
      start.lat +
      (
        end.lat -
        start.lat
      ) *
      fraction,

    lon:
      start.lon +
      (
        end.lon -
        start.lon
      ) *
      fraction
  };
}



// ======================================================
// FORMAT WALKING TIME
// ======================================================

export function formatWalkingTime(
  seconds
) {

  const minutes =
    Math.max(
      1,
      Math.round(
        seconds / 60
      )
    );


  return `${minutes} min`;
}