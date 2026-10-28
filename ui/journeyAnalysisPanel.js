// Young Family Urban Access — V4 Journey Analysis Panel
// Includes graph-to-image inspection and coordinate export.
// No separate helper file is required.

// ============================================================
// ENVIRONMENTAL CONDITIONS
// ============================================================

const CONDITIONS = {
  pedestrian: {
    label: "Pedestrian space",
    kicker: "PRIMARY DESIGN LENS",
    colour: "#7255a4",
    lowIsProblem: true
  },
  greenery: {
    label: "Greenery",
    kicker: "LANDSCAPE CONDITION",
    colour: "#438b62",
    lowIsProblem: true
  },
  road: {
    label: "Road exposure",
    kicker: "TRAFFIC CONDITION",
    colour: "#bf684b",
    lowIsProblem: false
  },
  vehicle: {
    label: "Vehicle presence",
    kicker: "TRAFFIC CONDITION",
    colour: "#98534d",
    lowIsProblem: false
  },
  sky: {
    label: "Open-sky exposure",
    kicker: "CLIMATE PROXY",
    colour: "#357dbd",
    lowIsProblem: false
  },
  building: {
    label: "Built frontage",
    kicker: "URBAN EDGE",
    colour: "#6c6b67",
    lowIsProblem: null
  }
};

const FEATURES = {
  greenery: ["Greenery", "vegetation"],
  pedestrian: ["Pedestrian space", "pedestrian_surface"],
  building: ["Built frontage", "building"],
  sky: ["Sky", "sky"],
  road: ["Road", "road"],
  vehicle: ["Vehicles", "vehicle"]
};

// ============================================================
// GENERAL HELPERS
// ============================================================

const escape = value =>
  String(value ?? "").replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]
  );

function number(value) {
  if (
    value == null ||
    value === "" ||
    typeof value === "boolean"
  ) {
    return null;
  }

  const result = Number(value);

  return Number.isFinite(result)
    ? result
    : null;
}

function coordinate(lat, lon) {
  lat = number(lat);
  lon = number(lon);

  if (
    lat === null ||
    lon === null ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  ) {
    return null;
  }

  return { lat, lon };
}

function coordinateText(point) {
  return point
    ? `${point.lat.toFixed(6)}, ${point.lon.toFixed(6)}`
    : "Not recorded";
}

function percent(value) {
  return value === null
    ? "Unknown"
    : `${value.toFixed(1)}%`;
}

function metres(value) {
  return `${Math.round(value)} m`;
}

function distanceLabel(value) {
  const distance = number(value);

  if (distance === null) return "—";

  if (distance >= 1000) {
    return `${(distance / 1000)
      .toFixed(2)
      .replace(/\.00$/, "")} km`;
  }

  return `${Math.round(distance)} m`;
}

function evenly(items, count) {
  if (!items.length || count <= 0) return [];

  if (items.length <= count) {
    return [...items];
  }

  if (count === 1) {
    return [items[0]];
  }

  return Array.from(
    { length: count },
    (_, index) => items[
      Math.round(
        index * (items.length - 1) / (count - 1)
      )
    ]
  );
}

// ============================================================
// PUBLIC RENDERER
// ============================================================

export function renderJourneyAnalysis({
  container,
  compiler,
  route,
  routeImages
}) {
  if (!container || !route) return;

  const series =
    route.routeSeriesV3 ||
    route.routeSeries ||
    {};

  const smoothed = Array.isArray(series.smoothed)
    ? series.smoothed
    : [];

  const raw = Array.isArray(series.raw)
    ? series.raw
    : [];

  const length = Number(
    series.routeDistance_m || 0
  );

  // Keep only images belonging to this exact route.
  const images = (
    Array.isArray(routeImages)
      ? routeImages
      : []
  )
    .filter(
      image =>
        String(image.routeId) === String(route.routeId)
    )
    .sort(
      (a, b) =>
        (number(a.distanceFromMrt_m) ?? Infinity) -
        (number(b.distanceFromMrt_m) ?? Infinity)
    );

  if (!smoothed.length) {
    container.innerHTML = `
      <div class="analysis-placeholder">
        <span>ROUTE EVIDENCE</span>
        <h3>No usable environmental profile.</h3>
        <p>
          No smoothed profile is available for this exact route.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = `
    <section class="research-section">

      ${sectionHeading(
        "ROUTE ENVIRONMENT",
        "Conditions along this journey",
        `Visible environmental proportions are smoothed onto a ${
          Number(series.step_m || 15)
        } m route grid. Click the combined graph to inspect the actual source observations.`,
        `MRT 0 m → HOME ${distanceLabel(length)}`
      )}

      <div class="analysis-metrics-grid">
        ${metric(
          "Route distance",
          distanceLabel(length),
          "selected journey"
        )}

        ${metric(
          "Segmented images",
          images.length,
          "exact-route imagery"
        )}

        ${metric(
          "Profile interval",
          `${Number(series.step_m || 15)} m`,
          "spatial reporting grid"
        )}

        ${metric(
          "Dominant type",
          route.dominantVisualClusterLabel || "—",
          "recurring visual environment"
        )}
      </div>

      <div class="combined-chart-wrap">
        ${routeChart(smoothed, raw, length)}
      </div>

      <div class="overall-evidence">
        <div class="evidence-heading">
          <strong>Overall semantic evidence</strong>
          <span>Observations across the selected route</span>
        </div>

        ${evidenceStrip(images, "overall", 6)}
      </div>
    </section>

    <section class="research-section">

      ${sectionHeading(
        "CONDITION-SPECIFIC READING",
        "Where does the route need attention?",
        "Compare individual profiles with their diagnostic images. Pixel shares describe visible conditions; verify physical access, shade and usable space on site.",
        "6 environmental lenses"
      )}

      <div class="feature-grid">
        ${Object.entries(CONDITIONS)
          .map(([key, config]) =>
            featureCard(
              key,
              config,
              route,
              images,
              smoothed,
              raw,
              series.featureSummaries?.[key],
              length
            )
          )
          .join("")}
      </div>
    </section>

    ${visualMatrix(images)}

    ${designTranslation(route)}

    ${machineLearning(compiler, route)}
  `;

  bindMatrix(container, images);

  attachRouteEvidenceInspector({
    container,
    route,
    routeImages: images
  });
}

// ============================================================
// SECTION HEADINGS AND METRICS
// ============================================================

function sectionHeading(
  kicker,
  title,
  description,
  badge = ""
) {
  return `
    <header class="research-section-header">
      <div>
        <span class="panel-kicker">
          ${escape(kicker)}
        </span>

        <h3>${escape(title)}</h3>

        <p>${escape(description)}</p>
      </div>

      ${
        badge
          ? `
            <div class="section-badge">
              ${escape(badge)}
            </div>
          `
          : ""
      }
    </header>
  `;
}

function metric(name, value, note = "") {
  return `
    <div class="analysis-metric">
      <span>${escape(name)}</span>
      <strong>${escape(value)}</strong>

      ${
        note
          ? `<small>${escape(note)}</small>`
          : ""
      }
    </div>
  `;
}

// ============================================================
// IMAGE SOURCES AND EVIDENCE STRIPS
// ============================================================

function imageSource(image, mode) {
  if (mode === "original") {
    return image.originalImage || null;
  }

  if (mode === "overall") {
    return (
      image.diagnosticSegmentations?.overall ||
      image.segmentationImage ||
      null
    );
  }

  return (
    image.diagnosticSegmentations?.[mode] ||
    null
  );
}

function evidenceStrip(images, mode, count) {
  const selected = evenly(images, count);

  if (!selected.length) {
    return `
      <div class="analysis-placeholder">
        No visual evidence available.
      </div>
    `;
  }

  return `
    <div class="evidence-strip">
      ${selected
        .map(image => {
          const source = imageSource(image, mode);

          if (!source) return "";

          return `
            <figure class="evidence-tile">
              <img
                src="${escape(source)}"
                alt="Route visual evidence"
                loading="lazy"
                decoding="async"
              >

              <figcaption class="evidence-tile-caption">
                ${escape(
                  distanceLabel(image.distanceFromMrt_m)
                )}
              </figcaption>
            </figure>
          `;
        })
        .join("")}
    </div>
  `;
}

// ============================================================
// INDIVIDUAL CONDITION CARDS
// ============================================================

function featureCard(
  key,
  config,
  route,
  images,
  smoothed,
  raw,
  summary,
  length
) {
  const analysis =
    route.featureAnalysis?.[key] ||
    {};

  const average = number(
    analysis.averagePercent ??
    summary?.averagePercent
  );

  const minimum = number(
    analysis.minimumPercent ??
    summary?.minimumPercent
  );

  const maximum = number(
    analysis.maximumPercent ??
    summary?.maximumPercent
  );

  const segments = Array.isArray(
    analysis.problemSegments
  )
    ? analysis.problemSegments
    : [];

  const problemImages = images.filter(image =>
    segments.some(segment =>
      image.distanceFromMrt_m >= segment.start_m &&
      image.distanceFromMrt_m <= segment.end_m
    )
  );

  const unique = new Map(
    [
      ...evenly(problemImages, 4),
      ...evenly(images, 4)
    ].map(image => [
      String(image.imageId),
      image
    ])
  );

  const diagnostic = [...unique.values()]
    .slice(0, 4)
    .map(image => {
      const source = imageSource(image, key);

      if (!source) return "";

      return `
        <figure class="diagnostic-tile">
          <img
            src="${escape(source)}"
            alt="${escape(config.label)} segmentation"
            loading="lazy"
            decoding="async"
          >

          <span>
            ${escape(
              distanceLabel(image.distanceFromMrt_m)
            )}
          </span>
        </figure>
      `;
    })
    .join("");

  const label = config.lowIsProblem === true
    ? "relative low"
    : config.lowIsProblem === false
      ? "relative high"
      : "context shift";

  const rangeText =
    minimum === null || maximum === null
      ? "average"
      : `${minimum.toFixed(1)}–${maximum.toFixed(1)}%`;

  return `
    <article class="feature-card">
      <header class="feature-card-header">
        <div class="feature-card-heading">
          <span>${escape(config.kicker)}</span>
          <h4>${escape(config.label)}</h4>
        </div>

        <div class="feature-card-stats">
          <strong>
            ${average === null ? "—" : percent(average)}
          </strong>

          <span>${rangeText}</span>
        </div>
      </header>

      ${routeChart(
        smoothed,
        raw,
        length,
        key
      )}

      <div class="problem-zone-row">
        ${
          segments.length
            ? segments
                .slice(0, 6)
                .map(segment => `
                  <span class="problem-zone-pill">
                    ${label} ·
                    ${distanceLabel(segment.start_m)}
                    –
                    ${distanceLabel(segment.end_m)}
                  </span>
                `)
                .join("")
            : `
              <span class="problem-zone-pill">
                No persistent route-relative zone identified
              </span>
            `
        }
      </div>

      <div class="feature-reading">
        <span>DESIGN READING</span>

        <p>
          ${escape(
            analysis.recommendation ||
            recommendation(key)
          )}
        </p>
      </div>

      <div class="diagnostic-strip">
        ${diagnostic}
      </div>
    </article>
  `;
}

function recommendation(key) {
  return {
    pedestrian:
      "Check actual path width, stroller clearance, obstructions and whether the family can stop beside through movement.",

    greenery:
      "Inspect the planted edge for accessible stopping space, caregiver–child visibility and actual shade. Vegetation share alone does not establish shade.",

    road:
      "Inspect pedestrian separation, traffic buffers, crossing positions and places to step aside.",

    vehicle:
      "Inspect possible traffic conflicts, drop-off activity and separation from the care area.",

    sky:
      "Check sun and rain exposure on site before determining the extent of shelter.",

    building:
      "Inspect accessible frontage recesses, entrances, existing shelter and circulation. Building share alone does not establish a usable edge."
  }[key] || "";
}

// ============================================================
// VISUAL EVIDENCE MATRIX
// ============================================================

function visualMatrix(images) {
  const block = (
    index,
    kicker,
    title,
    description,
    mode
  ) => `
    <div class="matrix-evidence-block">
      <div class="matrix-evidence-heading">
        <div>
          <span class="matrix-index">
            ${index}
          </span>

          <div>
            <span class="matrix-kicker">
              ${kicker}
            </span>

            <h4>${title}</h4>
          </div>
        </div>

        <p>${description}</p>
      </div>

      <div class="route-image-matrix">
        ${matrixCells(images, mode)}
      </div>
    </div>
  `;

  return `
    <section class="research-section visual-matrix-section">

      ${sectionHeading(
        "VISUAL EVIDENCE MATRIX",
        "What did the computer actually see?",
        "The same observations are shown as original imagery, segmentation and isolated conditions, ordered from MRT towards home.",
        `${images.length} route images`
      )}

      ${block(
        "A",
        "SOURCE EVIDENCE",
        "Original street imagery",
        "Ordered from MRT towards home.",
        "original"
      )}

      ${block(
        "B",
        "SEMANTIC SEGMENTATION",
        "Complete environmental reading",
        "Saved segmentation of the same route observations.",
        "overall"
      )}

      <div class="matrix-evidence-block isolated-matrix-block">
        <div class="matrix-evidence-heading">
          <div>
            <span class="matrix-index">C</span>

            <div>
              <span class="matrix-kicker">
                ISOLATED CONDITION
              </span>

              <h4 id="diagnosticMatrixTitle">
                Pedestrian space
              </h4>
            </div>
          </div>

          <p id="diagnosticMatrixDescription">
            Walking-surface pixels isolated from the wider scene.
          </p>
        </div>

        <div
          class="matrix-condition-selector"
          role="tablist"
          aria-label="Environmental condition"
        >
          ${Object.entries(CONDITIONS)
            .map(([key, config]) => `
              <button
                class="matrix-condition-button${
                  key === "pedestrian"
                    ? " is-active"
                    : ""
                }"
                type="button"
                role="tab"
                aria-selected="${key === "pedestrian"}"
                data-diagnostic-condition="${key}"
              >
                ${escape(config.label)}
              </button>
            `)
            .join("")}
        </div>

        <div
          id="diagnosticImageMatrix"
          class="route-image-matrix"
        >
          ${matrixCells(images, "pedestrian")}
        </div>
      </div>
    </section>
  `;
}

function matrixCells(images, mode) {
  const selected = evenly(images, 100);

  return Array.from(
    { length: 100 },
    (_, slot) => {
      const image = selected[slot];
      const source = image
        ? imageSource(image, mode)
        : null;

      if (!source) {
        return `
          <div
            class="route-matrix-cell route-matrix-cell-empty"
            aria-hidden="true"
          ></div>
        `;
      }

      const order =
        image.imageOrder ||
        slot + 1;

      const distance = number(
        image.distanceFromMrt_m
      );

      const compact = distance === null
        ? "—"
        : distance >= 1000
          ? `${(distance / 1000).toFixed(1)}k`
          : `${Math.round(distance)}m`;

      return `
        <figure
          class="route-matrix-cell"
          title="Image ${escape(order)} · ${
            escape(distanceLabel(distance))
          } from MRT"
        >
          <img
            src="${escape(source)}"
            alt="Route image ${escape(order)} at ${
              escape(distanceLabel(distance))
            }"
            loading="lazy"
            decoding="async"
          >

          <figcaption>
            <span>
              ${escape(
                String(order).padStart(2, "0")
              )}
            </span>

            <strong>${compact}</strong>
          </figcaption>
        </figure>
      `;
    }
  ).join("");
}

function bindMatrix(container, images) {
  const matrix = container.querySelector(
    "#diagnosticImageMatrix"
  );

  const title = container.querySelector(
    "#diagnosticMatrixTitle"
  );

  const description = container.querySelector(
    "#diagnosticMatrixDescription"
  );

  const buttons = [
    ...container.querySelectorAll(
      "[data-diagnostic-condition]"
    )
  ];

  if (!matrix) return;

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      const key =
        button.dataset.diagnosticCondition;

      if (!CONDITIONS[key]) return;

      buttons.forEach(item => {
        const active = item === button;

        item.classList.toggle(
          "is-active",
          active
        );

        item.setAttribute(
          "aria-selected",
          String(active)
        );
      });

      matrix.innerHTML = matrixCells(
        images,
        key
      );

      if (title) {
        title.textContent =
          CONDITIONS[key].label;
      }

      if (description) {
        description.textContent =
          `Isolated ${
            CONDITIONS[key].label.toLowerCase()
          } pixels from the same route observations.`;
      }
    });
  });
}

// ============================================================
// DESIGN TRANSLATION
// ============================================================

function designTranslation(route) {
  const primary =
    route.primaryProblem ||
    {};

  const secondary =
    route.mostProminentSupportingCondition;

  return `
    <section class="research-section">

      ${sectionHeading(
        "DESIGN TRANSLATION",
        "From visual evidence to intervention",
        "These are prompts for spatial inspection rather than automatic design prescriptions."
      )}

      <div class="design-translation">
        <article class="design-card primary">
          <span>PRIMARY DESIGN LENS</span>

          <h4>
            ${escape(
              primary.label ||
              "Pedestrian space / walking continuity"
            )}
          </h4>

          <p>
            ${escape(
              primary.reason ||
              "Test how arrival, attending, settling and leaving can happen while maintaining stroller access and caregiver–child visibility."
            )}
          </p>

          ${
            primary.recommendation
              ? `
                <p>
                  <strong>Intervention direction:</strong>
                  ${escape(primary.recommendation)}
                </p>
              `
              : ""
          }
        </article>

        <article class="design-card">
          <span>STRONGEST SUPPORTING CONDITION</span>

          <h4>
            ${escape(
              secondary?.label ||
              secondary?.condition ||
              "No persistent secondary condition"
            )}
          </h4>

          <p>
            ${escape(
              secondary?.recommendation ||
              "Compare the source images around a graph transition and verify available space on site."
            )}
          </p>
        </article>
      </div>
    </section>
  `;
}

// ============================================================
// MACHINE LEARNING SUMMARY
// ============================================================

function machineLearning(compiler, route) {
  const clusters = Array.isArray(
    compiler?.clusters
  )
    ? compiler.clusters
    : [];

  const maximum = Math.max(
    1,
    ...clusters.map(
      cluster => Number(cluster.count || 0)
    )
  );

  return `
    <section class="research-section">

      ${sectionHeading(
        "MACHINE LEARNING",
        "Recurring visual environments",
        "K-means groups recurring combinations of visible environmental features. Descriptive labels interpret cluster centroids.",
        `Selected route: ${
          route.dominantVisualClusterLabel ||
          "mixed environment"
        }`
      )}

      <div class="cluster-list">
        ${clusters
          .map((cluster, index) => {
            const id =
              cluster.cluster ??
              index;

            const count = Number(
              cluster.count || 0
            );

            const width = Math.max(
              0,
              Math.min(
                100,
                count / maximum * 100
              )
            );

            return `
              <div class="cluster-row">
                <div class="cluster-index">
                  ${escape(
                    String(id).padStart(2, "0")
                  )}
                </div>

                <div class="cluster-copy">
                  <strong>
                    ${escape(
                      cluster.semanticLabel ||
                      `Visual type ${id}`
                    )}
                  </strong>

                  <span>
                    ${escape(
                      cluster.semanticDescription ||
                      ""
                    )}
                  </span>
                </div>

                <div class="cluster-bar">
                  <span style="width:${width}%;"></span>
                </div>

                <div class="cluster-count">
                  ${count}
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

// ============================================================
// ROUTE CHARTS
// ============================================================

function routeChart(
  points,
  raw,
  routeLength,
  only = null
) {
  const combined = only === null;

  const width = combined ? 1400 : 720;
  const height = combined ? 440 : 265;

  const margin = combined
    ? {
        left: 70,
        right: 32,
        top: 35,
        bottom: 78
      }
    : {
        left: 48,
        right: 20,
        top: 18,
        bottom: 48
      };

  const length = Math.max(
    1,
    number(routeLength) ?? 1
  );

  const plotWidth =
    width -
    margin.left -
    margin.right;

  const plotHeight =
    height -
    margin.top -
    margin.bottom;

  const x = distance =>
    margin.left +
    Number(distance) / length * plotWidth;

  const y = value =>
    margin.top +
    (1 - Number(value) / 100) * plotHeight;

  const keys = combined
    ? [
        "sky",
        "greenery",
        "road",
        "pedestrian",
        "building"
      ]
    : [only];

  const paths = keys
    .map(key => {
      let path = "";
      let drawing = false;

      for (const point of points) {
        const value = number(
          point?.values?.[key]
        );

        const distance = number(
          point?.distance_m
        );

        if (
          value === null ||
          distance === null
        ) {
          drawing = false;
          continue;
        }

        path +=
          ` ${drawing ? "L" : "M"} ` +
          `${x(distance)} ${y(value)}`;

        drawing = true;
      }

      if (!path) return "";

      return `
        <path
          d="${path.trim()}"
          fill="none"
          stroke="${CONDITIONS[key].colour}"
          stroke-width="${combined ? 4 : 3.5}"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      `;
    })
    .join("");

  const grid = [0, 25, 50, 75, 100]
    .map(value => `
      <line
        x1="${margin.left}"
        y1="${y(value)}"
        x2="${width - margin.right}"
        y2="${y(value)}"
        stroke="currentColor"
        opacity=".07"
      />

      <text
        x="${margin.left - 10}"
        y="${y(value) + 4}"
        text-anchor="end"
        font-size="${combined ? 11 : 8}"
        fill="currentColor"
        opacity=".46"
      >
        ${value}%
      </text>
    `)
    .join("");

  const dots = combined
    ? ""
    : raw
        .filter(point =>
          number(point?.values?.[only]) !== null &&
          number(point?.distance_m) !== null
        )
        .map(point => `
          <circle
            cx="${x(point.distance_m)}"
            cy="${y(point.values[only])}"
            r="2.3"
            fill="${CONDITIONS[only].colour}"
            opacity=".3"
          />
        `)
        .join("");

  const labels = {
    sky: "Sky",
    greenery: "Greenery",
    road: "Road",
    pedestrian: "Pedestrian",
    building: "Built frontage"
  };

  const legend = combined
    ? keys
        .map((key, index) => `
          <g transform="translate(
            ${margin.left + index * 155},
            ${height - 22}
          )">
            <line
              x1="0"
              y1="0"
              x2="28"
              y2="0"
              stroke="${CONDITIONS[key].colour}"
              stroke-width="4"
            />

            <text
              x="36"
              y="4"
              font-size="11"
            >
              ${labels[key]}
            </text>
          </g>
        `)
        .join("")
    : "";

  const baseline =
    height -
    margin.bottom;

  const ariaLabel = combined
    ? "Combined environmental profile from MRT to home"
    : `${CONDITIONS[only].label} profile`;

  return `
    <div class="${
      combined
        ? "route-chart-shell"
        : "single-feature-chart"
    }">
      <svg
        viewBox="0 0 ${width} ${height}"
        aria-label="${escape(ariaLabel)}"
      >
        ${grid}
        ${dots}
        ${paths}

        <line
          x1="${margin.left}"
          y1="${baseline}"
          x2="${width - margin.right}"
          y2="${baseline}"
          stroke="currentColor"
          opacity=".18"
        />

        <circle
          cx="${x(0)}"
          cy="${baseline}"
          r="${combined ? 6 : 4}"
          fill="#0d4d73"
        />

        <circle
          cx="${x(length)}"
          cy="${baseline}"
          r="${combined ? 6 : 4}"
          fill="#171717"
        />

        <text
          x="${x(0)}"
          y="${combined ? baseline + 34 : height - 14}"
          text-anchor="start"
          font-size="${combined ? 10 : 8}"
          font-weight="700"
          fill="#0d4d73"
        >
          MRT · 0 m
        </text>

        <text
          x="${x(length)}"
          y="${combined ? baseline + 34 : height - 14}"
          text-anchor="end"
          font-size="${combined ? 10 : 8}"
          font-weight="700"
        >
          HOME · ${escape(distanceLabel(length))}
        </text>

        ${legend}
      </svg>
    </div>
  `;
}

// ============================================================
// SOURCE IMAGE MATCHING
// ============================================================

function sourceValue(source, key) {
  // Prefer the raw value that contributed to the graph.
  if (
    Object.hasOwn(
      source.raw?.values || {},
      key
    )
  ) {
    return number(source.raw.values[key]);
  }

  const shares =
    source.image.groupShares;

  if (!shares || !FEATURES[key]) {
    return null;
  }

  const className =
    FEATURES[key][1];

  // Missing classes in a valid segmentation occupy zero pixels.
  return (
    number(shares[className]) ??
    0
  ) * 100;
}

function collectSources(route, images) {
  const series =
    route.routeSeriesV3 ||
    route.routeSeries ||
    {};

  const length = number(
    series.routeDistance_m
  );

  const imageById = new Map(
    (images || [])
      .filter(image =>
        String(image.routeId) ===
        String(route.routeId)
      )
      .map(image => [
        String(image.imageId),
        image
      ])
  );

  const sources = new Map();

  for (const raw of series.raw || []) {
    const image = imageById.get(
      String(raw.imageId)
    );

    const distance = number(
      raw.distance_m
    );

    if (
      !image ||
      distance === null ||
      distance < 0 ||
      (
        length !== null &&
        distance > length
      )
    ) {
      continue;
    }

    const imageDistance = number(
      image.distanceFromMrt_m
    );

    const distanceMismatch =
      imageDistance !== null &&
      Math.abs(
        imageDistance - distance
      ) > 30;

    sources.set(
      String(image.imageId),
      {
        image,
        raw,
        distance,
        distanceMismatch,

        // Do not present a stale checkpoint as an exact location.
        checkpoint: distanceMismatch
          ? null
          : coordinate(
              image.checkpointLat,
              image.checkpointLon
            ),

        camera: coordinate(
          image.imageLat,
          image.imageLon
        )
      }
    );
  }

  return [...sources.values()].sort(
    (a, b) => a.distance - b.distance
  );
}

function selectEvidence(
  sources,
  distance
) {
  if (!sources.length) {
    return null;
  }

  let index = 0;

  sources.forEach(
    (source, candidateIndex) => {
      const difference = Math.abs(
        source.distance - distance
      );

      const currentDifference = Math.abs(
        sources[index].distance - distance
      );

      if (
        difference <
        currentDifference
      ) {
        index = candidateIndex;
      }
    }
  );

  return {
    nearest: sources[index],

    context: sources.slice(
      Math.max(0, index - 1),
      Math.min(
        sources.length,
        index + 2
      )
    ),

    gap: Math.abs(
      sources[index].distance -
      distance
    )
  };
}

// ============================================================
// CANDIDATE LOCATION EXPORT
// ============================================================

function candidateRecord(
  route,
  source,
  requestedDistance,
  feature
) {
  const center =
    source.checkpoint ||
    source.camera;

  // Suggested 300 × 300 m map-selection window.
  // This is not a surveyed boundary or intervention footprint.
  const halfSize = 150;

  const latitudeOffset =
    halfSize / 111320;

  const longitudeOffset = center
    ? halfSize / (
        111320 *
        Math.cos(
          center.lat *
          Math.PI / 180
        )
      )
    : 0;

  return {
    routeId: route.routeId,

    station:
      route.mrtName ||
      route.station,

    destination:
      route.homeName ||
      route.destination,

    feature,

    requestedGraphDistance_m:
      requestedDistance,

    observationDistance_m:
      source.distance,

    graphToObservationGap_m: Math.abs(
      requestedDistance -
      source.distance
    ),

    imageId:
      String(source.image.imageId),

    observedPercent:
      sourceValue(source, feature),

    routeCheckpoint:
      source.checkpoint,

    cameraPosition:
      source.camera,

    distanceMetadataMismatch:
      source.distanceMismatch,

    coordinateReferenceSystem:
      "WGS84 / EPSG:4326; latitude, longitude",

    mapCenter:
      center,

    centerType: source.checkpoint
      ? "route checkpoint"
      : center
        ? "camera position only"
        : null,

    suggestedSelectionBounds: center
      ? {
          south:
            center.lat -
            latitudeOffset,

          west:
            center.lon -
            longitudeOffset,

          north:
            center.lat +
            latitudeOffset,

          east:
            center.lon +
            longitudeOffset
        }
      : null,

    note:
      "Source observation near a smoothed profile change. " +
      "Candidate for site inspection, not a confirmed intervention footprint."
  };
}

// ============================================================
// IMAGE FALLBACK PATHS
// ============================================================

function imageCandidates(
  source,
  mode
) {
  const image =
    source.image;

  const paths = mode === "original"
    ? [
        image.originalImage,

        "./data/generated/street_images/" +
        `${encodeURIComponent(image.imageId)}.jpg`
      ]
    : [
        image.diagnosticSegmentations?.overall,
        image.segmentationImage
      ];

  return [
    ...new Set(
      paths.filter(path =>
        typeof path === "string" &&
        path &&
        !/^(?:javascript:|data:|file:|[A-Za-z]:)/i.test(
          path
        )
      )
    )
  ];
}

// ============================================================
// GRAPH-TO-IMAGE INSPECTOR
// ============================================================

function attachRouteEvidenceInspector({
  container,
  route,
  routeImages
}) {
  const svg = container.querySelector(
    'svg[aria-label="Combined environmental profile from MRT to home"]'
  );

  if (!svg) return;

  const sources = collectSources(
    route,
    routeImages
  );

  const series =
    route.routeSeriesV3 ||
    route.routeSeries ||
    {};

  const length = number(
    series.routeDistance_m
  );

  installInspectorStyles();

  const panel = document.createElement(
    "section"
  );

  panel.className =
    "route-source-inspector";

  svg
    .closest(".combined-chart-wrap")
    .after(panel);

  if (
    !sources.length ||
    !length
  ) {
    panel.textContent =
      "No exact-route source-image matches are available for this graph. " +
      "Check the raw image IDs and full V4 image records.";

    return;
  }

  // Matches the combined chart's 1400 × 440 SVG geometry.
  const graph = {
    left: 70,
    right: 1368,
    top: 35,
    bottom: 362,
    width: 1298
  };

  const namespace =
    "http://www.w3.org/2000/svg";

  const marker =
    document.createElementNS(
      namespace,
      "line"
    );

  marker.setAttribute(
    "y1",
    graph.top
  );

  marker.setAttribute(
    "y2",
    graph.bottom
  );

  marker.setAttribute(
    "stroke",
    "#c94436"
  );

  marker.setAttribute(
    "stroke-width",
    "2"
  );

  marker.setAttribute(
    "pointer-events",
    "none"
  );

  svg.append(marker);

  svg.style.cursor =
    "crosshair";

  let distance =
    sources[0].distance;

  let feature =
    "greenery";

  let activeId =
    String(
      sources[0].image.imageId
    );

  panel.innerHTML = `
    <h3>
      Inspect the images behind a route change
    </h3>

    <p>
      Click the graph or enter a distance from MRT.
      Blue dots on the baseline mark actual image observations.
      Compare the observations around the selected position;
      the smoothed line is not one photograph.
    </p>

    <div class="rsi-controls">
      <label>
        Feature

        <select data-rsi-feature>
          ${Object.entries(FEATURES)
            .map(([key, [label]]) => `
              <option value="${key}">
                ${label}
              </option>
            `)
            .join("")}
        </select>
      </label>

      <label>
        Distance from MRT (m)

        <input
          data-rsi-distance
          type="number"
          min="0"
          max="${length}"
          step="1"
        >
      </label>

      <input
        data-rsi-slider
        type="range"
        min="0"
        max="${length}"
        step="1"
        aria-label="Inspect distance from MRT"
      >
    </div>

    <div
      data-rsi-result
      aria-live="polite"
    ></div>
  `;

  const result = panel.querySelector(
    "[data-rsi-result]"
  );

  const input = panel.querySelector(
    "[data-rsi-distance]"
  );

  const slider = panel.querySelector(
    "[data-rsi-slider]"
  );

  // ----------------------------------------------------------
  // RENDER SELECTED EVIDENCE
  // ----------------------------------------------------------

  function render() {
    const evidence = selectEvidence(
      sources,
      distance
    );

    const active =
      evidence.context.find(
        source =>
          String(source.image.imageId) ===
          activeId
      ) ||
      evidence.nearest;

    activeId =
      String(active.image.imageId);

    const record = candidateRecord(
      route,
      active,
      distance,
      feature
    );

    const profile = (
      series.smoothed || []
    ).reduce(
      (best, point) => {
        const pointDistance = number(
          point.distance_m
        );

        if (
          pointDistance === null
        ) {
          return best;
        }

        if (
          !best ||
          Math.abs(
            pointDistance -
            distance
          ) <
          Math.abs(
            best.distance_m -
            distance
          )
        ) {
          return point;
        }

        return best;
      },
      null
    );

    const supportRadius = (
      number(
        series.maximumInterpolationGap_m
      ) ??
      180
    ) / 2;

    const markerX =
      graph.left +
      distance / length *
      graph.width;

    marker.setAttribute(
      "x1",
      markerX
    );

    marker.setAttribute(
      "x2",
      markerX
    );

    input.value =
      String(
        Math.round(distance)
      );

    slider.value =
      String(
        Math.round(distance)
      );

    const cards =
      evidence.context
        .map(source => {
          const id =
            String(
              source.image.imageId
            );

          const relation =
            source === evidence.nearest
              ? "NEAREST OBSERVATION"
              : source.distance <
                evidence.nearest.distance
                ? "BEFORE"
                : "AFTER";

          const previous =
            sources[
              sources.indexOf(source) -
              1
            ];

          const value = sourceValue(
            source,
            feature
          );

          const prior = previous
            ? sourceValue(
                previous,
                feature
              )
            : null;

          let change =
            "No preceding comparable value";

          if (
            value !== null &&
            prior !== null
          ) {
            const difference =
              value - prior;

            change =
              `${difference >= 0 ? "+" : ""}` +
              `${difference.toFixed(1)} percentage points ` +
              `over ${
                metres(
                  source.distance -
                  previous.distance
                )
              }`;
          }

          return `
            <article class="rsi-card ${
              id === activeId
                ? "is-active"
                : ""
            }">
              <strong>
                ${relation}
                ·
                ${metres(source.distance)}
              </strong>

              <div
                data-rsi-image="${escape(id)}"
                data-mode="original"
              ></div>

              <div
                data-rsi-image="${escape(id)}"
                data-mode="segmentation"
              ></div>

              <p>
                ${FEATURES[feature][0]}:
                <b>${percent(value)}</b><br>
                ${change}
              </p>

              <small>
                Image ${escape(id)}
              </small>

              <button
                type="button"
                data-rsi-select="${escape(id)}"
              >
                Use this observation’s location
              </button>
            </article>
          `;
        })
        .join("");

    const bounds =
      record.suggestedSelectionBounds;

    const profileReading = profile
      ? `
        Nearest smoothed grid value
        (${metres(profile.distance_m)}):
        ${
          percent(
            number(
              profile.values?.[feature]
            )
          )
        }.
      `
      : "";

    const sparseWarning =
      evidence.gap >
      supportRadius
        ? `
          <p class="rsi-warning">
            Sparse evidence here:
            the nearest source is beyond
            the assumed support radius.
            Its location is not the clicked graph position.
          </p>
        `
        : "";

    const mismatchWarning =
      active.distanceMismatch
        ? `
          <p class="rsi-warning">
            Image and graph distance metadata disagree
            by more than 30 m.
            The route checkpoint is withheld.
            Inspect the camera position and route geometry.
          </p>
        `
        : "";

    const mapLink =
      record.mapCenter
        ? `
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.openstreetmap.org/?mlat=${
              record.mapCenter.lat
            }&mlon=${
              record.mapCenter.lon
            }#map=19/${
              record.mapCenter.lat
            }/${
              record.mapCenter.lon
            }"
          >
            Locate ${record.centerType} on map
          </a>

          <button
            type="button"
            data-rsi-copy
          >
            Copy ${record.centerType} coordinates
          </button>
        `
        : `
          <p>No usable coordinates recorded.</p>
        `;

    result.innerHTML = `
      <p>
        <b>
          Graph position:
          ${metres(distance)}
        </b>

        · nearest source:
        ${metres(evidence.nearest.distance)}
        (${metres(evidence.gap)} away).

        ${profileReading}
      </p>

      ${sparseWarning}

      <div class="rsi-cards">
        ${cards}
      </div>

      <div class="rsi-location">
        <h4>
          Selected source location
          ·
          ${metres(active.distance)}
        </h4>

        <p>
          Route checkpoint:
          <b>
            ${coordinateText(active.checkpoint)}
          </b><br>

          Camera position:
          <b>
            ${coordinateText(active.camera)}
          </b>
        </p>

        ${mismatchWarning}

        <p>
          Coordinates are latitude, longitude (WGS84).
          The checkpoint is on the sampled route;
          the camera can be offset from it.
        </p>

        ${mapLink}

        <button
          type="button"
          data-rsi-export
        >
          Export candidate JSON
        </button>

        ${
          bounds
            ? `
              <p>
                Suggested 300 × 300 m selection window
                for locating the area in Cadmapper:<br>

                South ${bounds.south.toFixed(6)}
                ·
                West ${bounds.west.toFixed(6)}
                ·
                North ${bounds.north.toFixed(6)}
                ·
                East ${bounds.east.toFixed(6)}.<br>

                This is a map-selection guide,
                not a Cadmapper import
                or proposed footprint.
              </p>
            `
            : ""
        }

        <p
          data-rsi-status
          role="status"
        ></p>
      </div>
    `;

    loadInspectorImages();

    result
      .querySelectorAll(
        "[data-rsi-select]"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            activeId =
              button.dataset.rsiSelect;

            render();
          }
        );
      });

    result
      .querySelector(
        "[data-rsi-copy]"
      )
      ?.addEventListener(
        "click",
        async () => {
          const status =
            result.querySelector(
              "[data-rsi-status]"
            );

          try {
            await navigator.clipboard.writeText(
              coordinateText(
                record.mapCenter
              )
            );

            status.textContent =
              "Coordinates copied.";
          } catch {
            status.textContent =
              "Copy manually: " +
              coordinateText(
                record.mapCenter
              );
          }
        }
      );

    result
      .querySelector(
        "[data-rsi-export]"
      )
      .addEventListener(
        "click",
        () => {
          const blob = new Blob(
            [
              JSON.stringify(
                record,
                null,
                2
              )
            ],
            {
              type:
                "application/json"
            }
          );

          const url =
            URL.createObjectURL(
              blob
            );

          const link =
            document.createElement(
              "a"
            );

          link.href =
            url;

          link.download =
            `candidate-${record.imageId}.json`;

          link.click();

          setTimeout(
            () =>
              URL.revokeObjectURL(
                url
              ),
            1000
          );
        }
      );
  }

  // ----------------------------------------------------------
  // LOAD ORIGINALS AND SEGMENTATION WITH FALLBACK PATHS
  // ----------------------------------------------------------

  function loadInspectorImages() {
    result
      .querySelectorAll(
        "[data-rsi-image]"
      )
      .forEach(slot => {
        const source =
          sources.find(
            item =>
              String(
                item.image.imageId
              ) ===
              slot.dataset.rsiImage
          );

        const candidates =
          imageCandidates(
            source,
            slot.dataset.mode
          );

        const label =
          document.createElement(
            "small"
          );

        label.textContent =
          slot.dataset.mode ===
          "original"
            ? "Original photograph"
            : "Saved segmentation";

        slot.append(label);

        if (
          !candidates.length
        ) {
          slot.append(
            " — unavailable"
          );

          return;
        }

        const image =
          document.createElement(
            "img"
          );

        image.alt =
          `${label.textContent} at ${
            metres(source.distance)
          }`;

        image.loading =
          "lazy";

        let attempt = 0;

        image.onerror = () => {
          attempt += 1;

          if (
            attempt <
            candidates.length
          ) {
            image.src =
              candidates[attempt];
          } else {
            image.remove();

            slot.append(
              " — file unavailable in this checkout"
            );
          }
        };

        image.src =
          candidates[0];

        slot.append(image);
      });
  }

  // ----------------------------------------------------------
  // DISTANCE SELECTION
  // ----------------------------------------------------------

  function choose(value) {
    const selected =
      number(value);

    if (
      selected === null
    ) {
      return;
    }

    distance = Math.max(
      0,
      Math.min(
        length,
        selected
      )
    );

    activeId = "";

    render();
  }

  input.addEventListener(
    "change",
    () =>
      choose(
        input.value
      )
  );

  slider.addEventListener(
    "change",
    () =>
      choose(
        slider.value
      )
  );

  panel
    .querySelector(
      "[data-rsi-feature]"
    )
    .addEventListener(
      "change",
      event => {
        feature =
          event.target.value;

        render();
      }
    );

  // ----------------------------------------------------------
  // CLICK THE GRAPH
  // ----------------------------------------------------------

  svg.addEventListener(
    "click",
    event => {
      const matrix =
        svg.getScreenCTM();

      if (!matrix) return;

      const point =
        svg.createSVGPoint();

      point.x =
        event.clientX;

      point.y =
        event.clientY;

      const local =
        point.matrixTransform(
          matrix.inverse()
        );

      if (
        local.x < graph.left ||
        local.x > graph.right ||
        local.y < graph.top ||
        local.y > graph.bottom
      ) {
        return;
      }

      choose(
        (
          local.x -
          graph.left
        ) /
        graph.width *
        length
      );
    }
  );

  // ----------------------------------------------------------
  // MARK ACTUAL IMAGE OBSERVATIONS ON THE BASELINE
  // ----------------------------------------------------------

  const ticks =
    document.createElementNS(
      namespace,
      "g"
    );

  for (
    const source
    of sources
  ) {
    const dot =
      document.createElementNS(
        namespace,
        "circle"
      );

    dot.setAttribute(
      "cx",
      graph.left +
      source.distance /
      length *
      graph.width
    );

    dot.setAttribute(
      "cy",
      graph.bottom
    );

    dot.setAttribute(
      "r",
      "4"
    );

    dot.setAttribute(
      "fill",
      "#0d4d73"
    );

    dot.setAttribute(
      "tabindex",
      "0"
    );

    dot.setAttribute(
      "role",
      "button"
    );

    dot.setAttribute(
      "aria-label",
      `Inspect source image at ${
        metres(source.distance)
      }`
    );

    dot.addEventListener(
      "click",
      event => {
        event.stopPropagation();

        choose(
          source.distance
        );
      }
    );

    dot.addEventListener(
      "keydown",
      event => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();

          choose(
            source.distance
          );
        }
      }
    );

    ticks.append(dot);
  }

  svg.append(ticks);

  render();
}

// ============================================================
// INSPECTOR STYLES
// ============================================================

function installInspectorStyles() {
  if (
    document.getElementById(
      "route-source-inspector-styles"
    )
  ) {
    return;
  }

  const style =
    document.createElement(
      "style"
    );

  style.id =
    "route-source-inspector-styles";

  style.textContent = `
    .route-source-inspector {
      margin: 24px 0;
      padding: 24px;
      border: 1px solid #d7dfda;
      border-radius: 16px;
      background: #f7faf6;
      color: #23342c;
    }

    .route-source-inspector p {
      font-size: 14px;
      line-height: 1.6;
      margin: 12px 0;
    }

    .rsi-controls {
      display: flex;
      gap: 18px;
      align-items: center;
      flex-wrap: wrap;
      margin: 20px 0;
    }

    .rsi-controls label {
      display: grid;
      gap: 6px;
      font-size: 13px;
    }

    .rsi-controls input[type="range"] {
      flex: 1;
      min-width: 180px;
    }

    .route-source-inspector input,
    .route-source-inspector select,
    .route-source-inspector button {
      font: inherit;
      padding: 8px;
      border: 1px solid #becdc3;
      border-radius: 6px;
      background: white;
      color: #23342c;
    }

    .route-source-inspector button {
      cursor: pointer;
      margin: 8px 8px 0 0;
    }

    .route-source-inspector a {
      color: #0d4d73;
    }

    .rsi-cards {
      display: grid;
      grid-template-columns: repeat(
        3,
        minmax(0, 1fr)
      );
      gap: 14px;
    }

    .rsi-card {
      padding: 12px;
      border: 2px solid transparent;
      border-radius: 10px;
      background: white;
      overflow: hidden;
    }

    .rsi-card.is-active {
      border-color: #c94436;
    }

    .rsi-card strong {
      font-size: 12px;
    }

    .rsi-card img {
      display: block;
      width: 100%;
      height: 170px;
      object-fit: contain;
      background: #edf0ec;
      margin: 6px 0;
    }

    .rsi-card small {
      display: block;
      overflow-wrap: anywhere;
      margin-top: 10px;
    }

    .rsi-card p {
      font-size: 13px;
    }

    .rsi-location {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid #d7dfda;
    }

    .rsi-warning {
      color: #8d3d22;
      font-weight: 600;
    }

    @media (max-width: 750px) {
      .rsi-cards {
        grid-template-columns: 1fr;
      }

      .route-source-inspector {
        padding: 14px;
      }
    }
  `;

  document.head.append(style);
}