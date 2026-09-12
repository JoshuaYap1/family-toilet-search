// ======================================================
// JOURNEY + TOILET SCORING
// ======================================================

import {
  haversineMeters,
  clamp,
  mean
} from "../utils/geo.js";

import {
  countContextTypes
} from "./context.js";


export function scoreToilets(
  toilets,
  origin,
  priorities
) {
  return toilets
    .map(toilet => {
      const distance =
        Math.round(
          haversineMeters(
            origin.lat,
            origin.lon,
            toilet.lat,
            toilet.lon
          )
        );

      const hasChangingTable =
        detectChangingTable(
          toilet.tags
        );

      const hasAccessible =
        detectAccessible(
          toilet.tags
        );

      const changingPenalty =
        hasChangingTable
          ? 0
          : priorities.changing
            ? 220
            : 80;

      const accessiblePenalty =
        hasAccessible
          ? 0
          : priorities.accessible
            ? 180
            : 80;

      const privatePenalty =
        toilet.tags?.access === "private"
          ? 500
          : 0;

      const effectiveCost =
        Math.max(
          0,
          Math.round(
            distance +
            changingPenalty +
            accessiblePenalty +
            privatePenalty
          )
        );

      return {
        ...toilet,

        distance,

        hasChangingTable,

        hasAccessible,

        effectiveCost,

        severity:
          getSeverity(
            effectiveCost
          )
      };
    })
    .sort(
      (a, b) =>
        a.effectiveCost -
        b.effectiveCost
    )
    .map(
      (item, index) => ({
        ...item,
        rank:
          index + 1
      })
    );
}


export function buildJourneyProfile({
  results,
  amenities,
  context,
  radius,
  demographicDemand = null
}) {
  if (!results.length) {
    return {
      context,

      accessibility: 0,
      familySupport: 0,
      journeyComfort: 20,

      amenitySupport:
        calculateAmenitySupport(
          amenities
        ),

      accessGap: 100,

      demographicDemand,

      narrative:
        "No mapped public toilets were found within the selected search radius."
    };
  }

  const best =
    results[0];

  const averageDistance =
    mean(
      results.map(
        item =>
          item.distance
      )
    );

  const changingCount =
    results.filter(
      result =>
        result.hasChangingTable
    ).length;

  const accessibleCount =
    results.filter(
      result =>
        result.hasAccessible
    ).length;

  const accessibility =
    calculateAccessibility(
      best,
      averageDistance,
      radius
    );

  const familySupport =
    calculateFamilySupport(
      results.length,
      changingCount,
      accessibleCount
    );

  const amenitySupport =
    calculateAmenitySupport(
      amenities
    );

  const journeyComfort =
    calculateJourneyComfort(
      context.key,
      amenities,
      best.distance
    );

  const accessGap =
    calculateAccessGap(
      accessibility,
      familySupport,
      amenitySupport
    );

  return {
    context,

    accessibility,
    familySupport,
    journeyComfort,
    amenitySupport,
    accessGap,

    demographicDemand,

    narrative:
      buildNarrative(
        context,
        best,
        results,
        accessGap
      )
  };
}


function detectChangingTable(tags) {
  const text =
    [
      tags?.changing_table,
      tags?.baby_care,
      tags?.family_room,
      tags?.diaper
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

  return /yes|true|available|designated/
    .test(text);
}


function detectAccessible(tags) {
  const text =
    [
      tags?.wheelchair,
      tags?.["toilets:wheelchair"],
      tags?.accessible,
      tags?.stroller,
      tags?.step_free
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

  return /yes|true|accessible|designated|step_free/
    .test(text);
}


function getSeverity(score) {
  if (score >= 650) {
    return "high";
  }

  if (score >= 350) {
    return "medium";
  }

  return "good";
}


function calculateAccessibility(
  best,
  averageDistance,
  radius
) {
  const nearest =
    clamp(
      100 -
      (
        best.distance /
        Math.max(radius, 1)
      ) *
      75,
      0,
      100
    );

  const average =
    clamp(
      100 -
      (
        averageDistance /
        Math.max(radius, 1)
      ) *
      60,
      0,
      100
    );

  return Math.round(
    nearest * 0.7 +
    average * 0.3
  );
}


function calculateFamilySupport(
  count,
  changingCount,
  accessibleCount
) {
  if (!count) {
    return 0;
  }

  const changing =
    changingCount / count;

  const accessible =
    accessibleCount / count;

  const redundancy =
    clamp(
      count / 8 * 100,
      0,
      100
    );

  return Math.round(
    changing * 45 +
    accessible * 35 +
    redundancy * 0.2
  );
}


function calculateAmenitySupport(
  amenities
) {
  const counts =
    countContextTypes(
      amenities
    );

  const raw =
    counts.mall * 1 +
    counts.hawker * 0.8 +
    counts.park * 1.2 +
    counts.hospital * 1.1 +
    counts.school * 0.9 +
    counts.tourist * 0.6;

  return Math.round(
    clamp(
      raw * 2.5,
      0,
      100
    )
  );
}


function calculateJourneyComfort(
  contextKey,
  amenities,
  distance
) {
  const counts =
    countContextTypes(
      amenities
    );

  let score = 45;

  if (contextKey === "mall") {
    score += 25;
  }

  if (contextKey === "park") {
    score += 15;
  }

  if (contextKey === "hospital") {
    score += 10;
  }

  score +=
    Math.min(
      counts.park * 3,
      15
    );

  score -=
    Math.min(
      distance / 25,
      30
    );

  return Math.round(
    clamp(
      score,
      0,
      100
    )
  );
}


function calculateAccessGap(
  accessibility,
  familySupport,
  amenitySupport
) {
  const supply =
    accessibility * 0.4 +
    familySupport * 0.45 +
    amenitySupport * 0.15;

  return Math.round(
    clamp(
      100 - supply,
      0,
      100
    )
  );
}


function buildNarrative(
  context,
  best,
  results,
  gap
) {
  let opening =
    "This journey occurs within a mixed urban environment.";

  if (context.key === "mall") {
    opening =
      "This journey occurs within a retail-oriented environment with strong surrounding amenities.";
  }

  if (context.key === "hawker") {
    opening =
      "This journey occurs within a food-oriented environment where outdoor circulation and family facilities can shape the overall experience.";
  }

  if (context.key === "park") {
    opening =
      "This journey occurs within a recreational environment where walking distance, shade and toilet spacing become especially important.";
  }

  if (context.key === "hdb") {
    opening =
      "This journey occurs within a residential neighbourhood where everyday family-support infrastructure is distributed throughout the precinct.";
  }

  return (
    `${opening} ` +
    `The strongest mapped toilet candidate is approximately ${best.distance} m from the origin. ` +
    `${results.length} mapped toilet candidates were identified. ` +
    `The current access-gap score is ${gap}/100.`
  );
}