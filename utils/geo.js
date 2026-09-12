// ======================================================
// GEOGRAPHIC UTILITIES
// ======================================================

export function toRad(value) {
  return value * Math.PI / 180;
}


export function haversineMeters(
  lat1,
  lon1,
  lat2,
  lon2
) {
  const R = 6371000;

  const dLat =
    toRad(lat2 - lat1);

  const dLon =
    toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return (
    2 *
    R *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    )
  );
}


export function geographicOffsetMeters(
  origin,
  point
) {
  const meanLatitude =
    toRad(
      (origin.lat + point.lat) / 2
    );

  const dx =
    (point.lon - origin.lon) *
    111320 *
    Math.cos(meanLatitude);

  const dy =
    (point.lat - origin.lat) *
    110540;

  return {
    dx,
    dy
  };
}


export function calculateBearing(
  lat1,
  lon1,
  lat2,
  lon2
) {
  const phi1 =
    toRad(lat1);

  const phi2 =
    toRad(lat2);

  const deltaLambda =
    toRad(
      lon2 - lon1
    );

  const y =
    Math.sin(deltaLambda) *
    Math.cos(phi2);

  const x =
    Math.cos(phi1) *
    Math.sin(phi2)
    -
    Math.sin(phi1) *
    Math.cos(phi2) *
    Math.cos(deltaLambda);

  const bearing =
    Math.atan2(
      y,
      x
    ) *
    180 /
    Math.PI;

  return (
    bearing + 360
  ) % 360;
}


export function clamp(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}


export function mean(values) {
  if (!values.length) {
    return 0;
  }

  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    ) /
    values.length
  );
}