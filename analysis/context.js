// ======================================================
// URBAN CONTEXT ANALYSIS
// ======================================================

export const CONTEXT_LABELS = {
  mall:
    "Shopping mall / retail",

  hawker:
    "Hawker / food",

  hdb:
    "Residential / HDB",

  park:
    "Park / recreation",

  tourist:
    "Tourist / attraction",

  hospital:
    "Healthcare",

  school:
    "School / childcare",

  mixed:
    "Mixed urban area"
};


export function countContextTypes(
  amenities
) {
  const counts = {
    mall: 0,
    hawker: 0,
    hdb: 0,
    park: 0,
    tourist: 0,
    hospital: 0,
    school: 0
  };

  amenities.forEach(item => {
    const tags =
      item.tags || {};

    if (
      tags.shop ||
      tags.building === "retail" ||
      tags.building === "commercial"
    ) {
      counts.mall++;
    }

    if (
      [
        "restaurant",
        "cafe",
        "fast_food",
        "food_court",
        "marketplace"
      ].includes(tags.amenity)
    ) {
      counts.hawker++;
    }

    if (
      tags.building === "apartments" ||
      tags.landuse === "residential"
    ) {
      counts.hdb++;
    }

    if (
      tags.leisure === "park" ||
      tags.leisure === "playground"
    ) {
      counts.park++;
    }

    if (tags.tourism) {
      counts.tourist++;
    }

    if (
      [
        "hospital",
        "clinic"
      ].includes(tags.amenity)
    ) {
      counts.hospital++;
    }

    if (
      [
        "school",
        "kindergarten",
        "childcare"
      ].includes(tags.amenity)
    ) {
      counts.school++;
    }
  });

  return counts;
}


export function determineUrbanContext(
  selectedContext,
  amenities
) {
  const counts =
    countContextTypes(amenities);

  if (
    selectedContext &&
    selectedContext !== "auto"
  ) {
    return {
      key:
        selectedContext,

      label:
        CONTEXT_LABELS[
          selectedContext
        ] ||
        selectedContext,

      counts
    };
  }

  const ranking =
    Object.entries(counts)
      .map(
        ([key, value]) => ({
          key,
          value
        })
      )
      .sort(
        (a, b) =>
          b.value - a.value
      );

  if (
    !ranking.length ||
    ranking[0].value === 0
  ) {
    return {
      key: "mixed",
      label:
        CONTEXT_LABELS.mixed,
      counts
    };
  }

  const first =
    ranking[0];

  const second =
    ranking[1];

  if (
    second &&
    second.value >=
      first.value * 0.75
  ) {
    return {
      key: "mixed",
      label:
        CONTEXT_LABELS.mixed,
      counts
    };
  }

  return {
    key:
      first.key,

    label:
      CONTEXT_LABELS[
        first.key
      ],

    counts
  };
}