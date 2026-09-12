// ======================================================
// DEMOGRAPHIC DATA
// Placeholder until Singapore population data is added.
// ======================================================

let demographicData = [];


export async function loadDemographics() {
  // IMPORTANT:
  // This intentionally returns an empty array for now.
  // We will replace it with real Singapore data next.

  demographicData = [];

  return demographicData;
}


export function getDemographicDemandNear(
  lat,
  lon
) {
  if (!demographicData.length) {
    return null;
  }

  // Spatial subzone lookup will be added later.
  return null;
}


export function getDemographicData() {
  return demographicData;
}