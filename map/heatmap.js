// ======================================================
// DEMOGRAPHIC MAP LAYER
// ======================================================

let populationLayer = null;


export function renderPopulationHeatmap(
  map,
  data
) {
  clearPopulationHeatmap(map);

  if (
    !map ||
    !Array.isArray(data) ||
    !data.length
  ) {
    return;
  }

  populationLayer =
    L.layerGroup();

  const maximum =
    Math.max(
      ...data.map(
        item =>
          item.youngPopulation || 0
      ),
      1
    );

  data.forEach(item => {
    if (
      !Number.isFinite(item.lat) ||
      !Number.isFinite(item.lon)
    ) {
      return;
    }

    const value =
      item.youngPopulation || 0;

    const ratio =
      value / maximum;

    const marker =
      L.circleMarker(
        [
          item.lat,
          item.lon
        ],
        {
          radius:
            8 + ratio * 28,

          weight: 1,

          fillOpacity:
            0.15 +
            ratio * 0.5
        }
      );

    marker.bindPopup(
      `
        <strong>
          ${item.name || "Area"}
        </strong>

        <br>

        Population aged 0–9:
        ${value}
      `
    );

    populationLayer.addLayer(
      marker
    );
  });

  populationLayer.addTo(map);
}


export function clearPopulationHeatmap(
  map
) {
  if (
    populationLayer &&
    map
  ) {
    map.removeLayer(
      populationLayer
    );

    populationLayer = null;
  }
}