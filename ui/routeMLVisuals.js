
const FEATURES = [
  "pedestrian", "greenery", "road",
  "vehicle", "sky", "building"
];

const LABELS = [
  "Pedestrian Space", "Greenery", "Road",
  "Vehicles", "Open Sky", "Buildings"
];

const COLORS = [
  "#7255a4", "#438b62", "#bf684b",
  "#98534d", "#357dbd", "#6c6b67"
];

const CLUSTER_COLORS = [
  "#438b62", "#357dbd", "#bf684b", "#7255a4"
];

const fmt = v => Number(v).toFixed(1);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const sqDist = (a, b) =>
  a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0);

const average = arr =>
  arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);

// ------------------------------------
// 1. READ EXISTING ROUTE DATA
// ------------------------------------

function makeSamples(route) {
  const profile =
    route?.routeSeriesV3 ||
    route?.routeSeries ||
    {};

  const rows = Array.isArray(profile.smoothed)
    ? profile.smoothed
    : [];

  const samples = rows.map(row => {
    const distance = Number(row?.distance_m);
    const values = FEATURES.map(
      key => row?.values?.[key]
    );

    if (!Number.isFinite(distance)) return null;

    if (values.some(
      v => v == null || v === "" ||
      !Number.isFinite(Number(v))
    )) return null;

    return {
      distance,
      values: values.map(Number)
    };
  }).filter(Boolean);

  samples.sort((a, b) => a.distance - b.distance);

  return samples.filter(
    (s, i) => i === 0 ||
    s.distance !== samples[i - 1].distance
  );
}

// ------------------------------------
// 2. K-MEANS CLUSTERING
// ------------------------------------

function kmeans(samples, k = 4) {
  const data = samples.map(s => s.values);

  k = Math.min(k, data.length);

  if (!k) return { labels: [], centers: [] };

  // Deterministic farthest-first initialization
  const centers = [data[0].slice()];

  while (centers.length < k) {
    let best = 0;
    let bestScore = -1;

    data.forEach((point, i) => {
      const score = Math.min(
        ...centers.map(c => sqDist(point, c))
      );

      if (score > bestScore) {
        best = i;
        bestScore = score;
      }
    });

    centers.push(data[best].slice());
  }

  let labels = [];

  for (let iteration = 0; iteration < 50; iteration++) {
    const next = data.map(point => {
      let best = 0;
      let minDist = Infinity;

      centers.forEach((center, j) => {
        const d = sqDist(point, center);
        if (d < minDist) {
          minDist = d;
          best = j;
        }
      });

      return best;
    });

    const sums = Array.from(
      { length: k },
      () => Array(FEATURES.length).fill(0)
    );

    const counts = Array(k).fill(0);

    next.forEach((group, i) => {
      counts[group]++;

      data[i].forEach((value, j) => {
        sums[group][j] += value;
      });
    });

    counts.forEach((count, j) => {
      if (count) {
        centers[j] = sums[j].map(v => v / count);
      }
    });

    const converged =
      next.length === labels.length &&
      next.every((v, i) => v === labels[i]);

    labels = next;

    if (converged) break;
  }

  return { labels, centers };
}

// ------------------------------------
// 3. SELF ORGANISING MAP
// ------------------------------------

function trainSOM(samples, size = 5) {
  const data = samples.map(s => s.values);

  const nodes = Array.from(
    { length: size * size },
    (_, i) => data[
      Math.floor(
        i * (data.length - 1) /
        Math.max(1, size * size - 1)
      )
    ].slice()
  );

  // Deterministic SOM training
  for (let epoch = 0; epoch < 45; epoch++) {
    const progress = epoch / 44;
    const rate = 0.40 * (1 - progress) +
                 0.035 * progress;
    const radius = 2.5 * (1 - progress) +
                   0.55 * progress;

    for (const input of data) {
      let winner = 0;
      let bestDist = Infinity;

      nodes.forEach((node, j) => {
        const d = sqDist(node, input);
        if (d < bestDist) {
          bestDist = d;
          winner = j;
        }
      });

      const wx = winner % size;
      const wy = Math.floor(winner / size);

      nodes.forEach((node, j) => {
        const dx = (j % size) - wx;
        const dy = Math.floor(j / size) - wy;

        const influence = Math.exp(
          -(dx * dx + dy * dy) /
          (2 * radius * radius)
        );

        node.forEach((value, f) => {
          node[f] +=
            rate * influence * (input[f] - value);
        });
      });
    }
  }

  const hits = Array(size * size).fill(0);

  data.forEach(point => {
    let winner = 0;
    let minDist = Infinity;

    nodes.forEach((node, j) => {
      const d = sqDist(node, point);

      if (d < minDist) {
        minDist = d;
        winner = j;
      }
    });

    hits[winner]++;
  });

  // U-matrix: distance to neighbouring nodes
  const distances = nodes.map((node, i) => {
    const x = i % size;
    const y = Math.floor(i / size);

    const neighbours = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1]
    ].filter(([nx, ny]) =>
      nx >= 0 && nx < size &&
      ny >= 0 && ny < size
    );

    return average(
      neighbours.map(([nx, ny]) =>
        Math.sqrt(
          sqDist(node, nodes[ny * size + nx])
        )
      )
    );
  });

  return { nodes, hits, distances, size };
}

// ------------------------------------
// 4. K-MEANS ROUTE RIBBON
// ------------------------------------

function renderClusterRibbon(samples, labels, distance) {
  const width = 900;
  const plotWidth = 855;

  const max = Math.max(
    Number(distance) || 0,
    samples[samples.length - 1].distance,
    1
  );

  const step = Math.max(
    1,
    samples[1]?.distance - samples[0]?.distance || 15
  );

  const rectangles = samples.map((sample, i) => {
    const next = samples[i + 1]?.distance ??
                 Math.min(max, sample.distance + step);

    const x = 25 + sample.distance / max * plotWidth;

    const w = Math.max(
      1,
      (Math.min(max, next) - sample.distance) /
      max * plotWidth
    );

    return `
      <rect
        x="${x}" y="18"
        width="${w}" height="34"
        fill="${CLUSTER_COLORS[labels[i] % 4]}"
      />
    `;
  }).join("");

  return `
    <svg viewBox="0 0 ${width} 100"
         class="ml-route-ribbon"
         role="img"
         aria-label="K-means clusters along route">

      <rect x="25" y="18" width="${plotWidth}"
            height="34" rx="3" fill="#ece9e3"/>

      ${rectangles}

      <text x="25" y="78" font-size="15"
            fill="#666">MRT · 0 m</text>

      <text x="880" y="78" text-anchor="end"
            font-size="15" fill="#666">
        HOME · ${Math.round(max)} m
      </text>
    </svg>
  `;
}

// ------------------------------------
// 5. SOM HEATMAP
// ------------------------------------

function renderSOM(som) {
  const { hits, distances, size } = som;

  const cell = 60;
  const pad = 7;
  const width = size * cell + pad * 2;

  const min = Math.min(...distances);
  const max = Math.max(...distances);
  const range = Math.max(0.0001, max - min);

  const cells = distances.map((d, i) => {
    const strength = (d - min) / range;
    const lightness = Math.round(94 - 54 * strength);

    const x = pad + (i % size) * cell;
    const y = pad + Math.floor(i / size) * cell;

    return `
      <rect x="${x}" y="${y}"
            width="${cell - 3}" height="${cell - 3}"
            rx="7"
            fill="hsl(207,35%,${lightness}%)"/>

      <text x="${x + 28.5}" y="${y + 33}"
            text-anchor="middle"
            font-size="19"
            font-weight="700"
            fill="${strength > 0.58 ? "white" : "#123248"}">
        ${hits[i]}
      </text>
    `;
  }).join("");

  return `
    <svg viewBox="0 0 ${width} ${width}"
         class="ml-som-svg"
         role="img"
         aria-label="SOM U-matrix showing node hits">
      ${cells}
    </svg>
  `;
}

// ------------------------------------
// 6. ENVIRONMENTAL PERCENTAGES
// ------------------------------------

function renderPercentageCards(samples) {
  return `
    <div class="ml-metric-grid">
      ${FEATURES.map((feature, j) => {
        const values = samples.map(s => s.values[j]);
        const mean = average(values);

        return `
          <div class="ml-metric">
            <small>${LABELS[j]}</small>

            <strong>${fmt(mean)}%</strong>

            <div class="ml-meter">
              <i style="
                width:${clamp(mean, 0, 100)}%;
                background:${COLORS[j]};
              "></i>
            </div>

            <small>
              Range: ${fmt(Math.min(...values))}%
              – ${fmt(Math.max(...values))}%
            </small>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

// ------------------------------------
// 7. MAIN RENDER FUNCTION
// ------------------------------------

export function renderRouteMLVisuals(route) {
  const samples = makeSamples(route);

  if (samples.length < 8) {
    return `
      <section class="ml-research">
        <h3>Environmental Machine Learning</h3>
        <p>
          Insufficient complete environmental data.
          ${samples.length} valid profile observations found;
          at least 8 are required.
        </p>
      </section>
    `;
  }

  const profile =
    route?.routeSeriesV3 ||
    route?.routeSeries ||
    {};

  const routeDistance =
    Number(profile.routeDistance_m) ||
    samples[samples.length - 1].distance;

  const km = kmeans(samples, 4);
  const som = trainSOM(samples, 5);

  const clusters = km.centers.map((center, i) => {
    const count = km.labels.filter(g => g === i).length;

    const prominent = center
      .map((value, j) => ({ value, j }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 2);

    return `
      <div class="ml-cluster">
        <span class="ml-dot"
              style="background:${CLUSTER_COLORS[i]}">
        </span>

        <div>
          <strong>Cluster ${i + 1}</strong>
          <small>
            ${count} samples
            (${fmt(count / samples.length * 100)}%)
          </small>
          <small>
            ${prominent.map(item =>
              `${LABELS[item.j]} ${fmt(item.value)}%`
            ).join(" · ")}
          </small>
        </div>
      </div>
    `;
  }).join("");

  return `
    <section class="ml-research">

      <div class="ml-kicker">
        COMPUTATIONAL ENVIRONMENTAL READINGS
      </div>

      <h3>K-means · SOM · Environmental Percentages</h3>

      <p>
        ${samples.length} valid environmental observations
        along the selected MRT-to-home journey.
      </p>

      <h4>01 / K-means Environmental Clustering</h4>

      ${renderClusterRibbon(
        samples,
        km.labels,
        routeDistance
      )}

      <div class="ml-cluster-grid">
        ${clusters}
      </div>

      <h4>02 / Self-Organising Map</h4>

      <div class="ml-som-layout">
        ${renderSOM(som)}

        <div>
          <strong>Reading the SOM</strong>

          <p>
            Every grid cell represents a learned
            environmental pattern.
          </p>

          <p>
            Numbers indicate how many sampled
            locations belong to that SOM node.
            Darker cells indicate greater differences
            from neighbouring nodes.
          </p>

          <p>
            ${som.hits.filter(Boolean).length}
            of ${som.size * som.size} nodes occupied.
          </p>
        </div>
      </div>

      <h4>03 / Environmental Composition</h4>

      ${renderPercentageCards(samples)}

      <p class="ml-footnote">
        Environmental percentages are averages of
        semantic-segmentation profile observations,
        not physical measurements of shelter,
        comfort, or accessibility.
        The models are fitted to the selected route.
      </p>

    </section>
  `;
}
