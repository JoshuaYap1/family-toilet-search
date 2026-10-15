// ============================================================
// Young Family Urban Access — V4 Journey Analysis Panel
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


// ============================================================
// PUBLIC RENDERER
// ============================================================

export function renderJourneyAnalysis({
  container,
  compiler,
  route,
  routeImages
}) {
  if (!container || !route) {
    return;
  }

  const series =
    route.routeSeriesV3 ||
    route.routeSeries ||
    {};

  const smoothed =
    Array.isArray(series.smoothed)
      ? series.smoothed
      : [];

  const raw =
    Array.isArray(series.raw)
      ? series.raw
      : [];

  const summaries =
    series.featureSummaries ||
    {};

  const distance =
    Number(
      series.routeDistance_m ||
      0
    );

  const images =
    Array.isArray(routeImages)
      ? routeImages
      : [];

  if (!smoothed.length) {
    container.innerHTML = `
      <div class="analysis-placeholder">
        <span>ROUTE EVIDENCE</span>

        <h3>
          No usable environmental profile.
        </h3>

        <p>
          V4 does not contain enough segmented evidence for this exact route.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = [
    renderOverviewSection(
      route,
      images,
      smoothed,
      distance
    ),

    renderConditionsSection(
      route,
      images,
      smoothed,
      raw,
      summaries,
      distance
    ),

    renderVisualEvidenceMatrix(
      images
    ),

    renderDesignTranslation(
      route
    ),

    renderMachineLearningSection(
      compiler,
      route
    )
  ].join("");

  bindVisualEvidenceMatrixControls(
    container,
    images
  );
}


// ============================================================
// OVERVIEW
// ============================================================

function renderOverviewSection(
  route,
  routeImages,
  smoothed,
  distance
) {
  const series =
    route.routeSeriesV3 ||
    route.routeSeries ||
    {};

  return `
    <section class="research-section">

      <header class="research-section-header">

        <div>
          <span class="panel-kicker">
            ROUTE ENVIRONMENT
          </span>

          <h3>
            Conditions along this journey
          </h3>

          <p>
            SegFormer-derived environmental proportions are spatially
            smoothed onto a ${Number(series.step_m || 15)} m route grid.
            Only observations from this selected MRT-to-home journey
            contribute to the profile.
          </p>
        </div>

        <div class="section-badge">
          MRT 0 m → HOME
          ${escapeHTML(
            formatDistance(
              distance
            )
          )}
        </div>

      </header>


      <div class="analysis-metrics-grid">

        ${metric(
          "Route distance",
          formatDistance(distance),
          "actual selected journey"
        )}

        ${metric(
          "Segmented images",
          routeImages.length,
          "exact route imagery"
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
        ${buildCombinedChart(
          smoothed,
          distance
        )}
      </div>


      <div class="overall-evidence">

        <div class="evidence-heading">

          <strong>
            Overall semantic evidence
          </strong>

          <span>
            Representative observations across the selected route
          </span>

        </div>

        ${buildEvidenceStrip(
          routeImages,
          "overall",
          6
        )}

      </div>

    </section>
  `;
}


// ============================================================
// INDIVIDUAL CONDITIONS
// ============================================================

function renderConditionsSection(
  route,
  routeImages,
  smoothed,
  raw,
  summaries,
  distance
) {
  const cards =
    Object.entries(CONDITIONS)
      .map(([key, config]) => {
        return renderFeatureCard(
          key,
          config,
          route,
          routeImages,
          smoothed,
          raw,
          summaries[key],
          distance
        );
      })
      .join("");

  return `
    <section class="research-section">

      <header class="research-section-header">

        <div>
          <span class="panel-kicker">
            CONDITION-SPECIFIC READING
          </span>

          <h3>
            Where does the route need attention?
          </h3>

          <p>
            Each variable is separated into its own environmental
            profile and matching diagnostic segmentation so the
            visual evidence can translate into a design response.
          </p>
        </div>

        <div class="section-badge">
          6 environmental lenses
        </div>

      </header>

      <div class="feature-grid">
        ${cards}
      </div>

    </section>
  `;
}


// ============================================================
// CONDITION CARD
// ============================================================

function renderFeatureCard(
  key,
  config,
  route,
  routeImages,
  smoothed,
  raw,
  summary,
  distance
) {
  const featureAnalysis =
    route.featureAnalysis ||
    {};

  const analysis =
    featureAnalysis[key] ||
    {};

  const average =
    analysis.averagePercent ??
    summary?.averagePercent ??
    null;

  const minimum =
    analysis.minimumPercent ??
    summary?.minimumPercent ??
    null;

  const maximum =
    analysis.maximumPercent ??
    summary?.maximumPercent ??
    null;

  const problemSegments =
    Array.isArray(
      analysis.problemSegments
    )
      ? analysis.problemSegments
      : [];

  const recommendation =
    analysis.recommendation ||
    defaultRecommendation(
      key
    );

  const relevantImages =
    chooseDiagnosticImages(
      routeImages,
      problemSegments,
      4
    );

  const rangeText =
    minimum == null ||
    maximum == null
      ? "average"
      : `${Number(minimum).toFixed(1)}–${Number(maximum).toFixed(1)}%`;

  return `
    <article
      class="feature-card${config.primary ? " is-primary" : ""}"
    >

      <header class="feature-card-header">

        <div class="feature-card-heading">

          <span>
            ${escapeHTML(
              config.kicker
            )}
          </span>

          <h4>
            ${escapeHTML(
              config.label
            )}
          </h4>

        </div>


        <div class="feature-card-stats">

          <strong>
            ${
              average == null
                ? "—"
                : `${Number(average).toFixed(1)}%`
            }
          </strong>

          <span>
            ${escapeHTML(
              rangeText
            )}
          </span>

        </div>

      </header>


      ${buildSingleFeatureChart(
        key,
        config.colour,
        smoothed,
        raw,
        distance
      )}


      ${renderProblemSegments(
        problemSegments,
        config
      )}


      <div class="feature-reading">

        <span>
          DESIGN READING
        </span>

        <p>
          ${escapeHTML(
            recommendation
          )}
        </p>

      </div>


      ${buildDiagnosticStrip(
        relevantImages,
        key
      )}

    </article>
  `;
}


// ============================================================
// PROBLEM SEGMENTS
// ============================================================

function renderProblemSegments(
  problemSegments,
  config
) {
  if (!problemSegments.length) {
    return `
      <div class="problem-zone-row">

        <span class="problem-zone-pill">
          No persistent route-relative zone identified
        </span>

      </div>
    `;
  }

  const pills =
    problemSegments
      .slice(0, 6)
      .map((segment) => {
        let label =
          "context shift";

        if (
          config.lowIsProblem === true
        ) {
          label =
            "relative low";
        }

        if (
          config.lowIsProblem === false
        ) {
          label =
            "relative high";
        }

        return `
          <span
            class="problem-zone-pill${config.primary ? " primary" : ""}"
          >
            ${label}
            ·
            ${formatDistance(segment.start_m)}
            –
            ${formatDistance(segment.end_m)}
          </span>
        `;
      })
      .join("");

  return `
    <div class="problem-zone-row">
      ${pills}
    </div>
  `;
}


// ============================================================
// VISUAL EVIDENCE MATRIX
// ============================================================

function renderVisualEvidenceMatrix(
  routeImages
) {
  const count =
    Array.isArray(routeImages)
      ? routeImages.length
      : 0;

  return `
    <section class="research-section visual-matrix-section">

      <header class="research-section-header">

        <div>
          <span class="panel-kicker">
            VISUAL EVIDENCE MATRIX
          </span>

          <h3>
            What did the computer actually see?
          </h3>

          <p>
            The same ordered image set is shown as original street
            imagery, complete semantic segmentation and isolated
            environmental conditions. Images progress from MRT toward home.
          </p>
        </div>

        <div class="section-badge">
          ${count}
          route image${count === 1 ? "" : "s"}
        </div>

      </header>


      ${renderMatrixBlock(
        "A",
        "SOURCE EVIDENCE",
        "Original street imagery",
        "Ordered spatially from MRT toward home.",
        routeImages,
        "original"
      )}


      ${renderMatrixBlock(
        "B",
        "SEMANTIC SEGMENTATION",
        "Complete environmental reading",
        "Full SegFormer classification of the same route observations.",
        routeImages,
        "overall"
      )}


      <div class="matrix-evidence-block isolated-matrix-block">

        <div class="matrix-evidence-heading">

          <div>

            <span class="matrix-index">
              C
            </span>

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
            Walking-surface pixels isolated from the wider street scene.
          </p>

        </div>


        <div
          class="matrix-condition-selector"
          role="tablist"
          aria-label="Environmental condition"
        >

          ${diagnosticMatrixButton(
            "pedestrian",
            "Pedestrian",
            true
          )}

          ${diagnosticMatrixButton(
            "greenery",
            "Greenery"
          )}

          ${diagnosticMatrixButton(
            "road",
            "Road"
          )}

          ${diagnosticMatrixButton(
            "vehicle",
            "Vehicle"
          )}

          ${diagnosticMatrixButton(
            "sky",
            "Sky"
          )}

          ${diagnosticMatrixButton(
            "building",
            "Built frontage"
          )}

        </div>


        <div
          id="diagnosticImageMatrix"
          class="route-image-matrix"
        >
          ${buildRouteImageMatrix(
            routeImages,
            "pedestrian"
          )}
        </div>

      </div>

    </section>
  `;
}


// ============================================================
// MATRIX BLOCK
// ============================================================

function renderMatrixBlock(
  index,
  kicker,
  title,
  description,
  routeImages,
  mode
) {
  return `
    <div class="matrix-evidence-block">

      <div class="matrix-evidence-heading">

        <div>

          <span class="matrix-index">
            ${escapeHTML(
              index
            )}
          </span>

          <div>

            <span class="matrix-kicker">
              ${escapeHTML(
                kicker
              )}
            </span>

            <h4>
              ${escapeHTML(
                title
              )}
            </h4>

          </div>

        </div>

        <p>
          ${escapeHTML(
            description
          )}
        </p>

      </div>


      <div class="route-image-matrix">
        ${buildRouteImageMatrix(
          routeImages,
          mode
        )}
      </div>

    </div>
  `;
}


// ============================================================
// MATRIX BUTTON
// ============================================================

function diagnosticMatrixButton(
  key,
  label,
  active = false
) {
  return `
    <button
      class="matrix-condition-button${active ? " is-active" : ""}"
      type="button"
      role="tab"
      aria-selected="${active ? "true" : "false"}"
      data-diagnostic-condition="${escapeHTML(key)}"
    >
      ${escapeHTML(
        label
      )}
    </button>
  `;
}


// ============================================================
// 10 × 10 GRID
// ============================================================

function buildRouteImageMatrix(
  routeImages,
  mode
) {
  const CELL_COUNT =
    100;

  const sourceImages =
    Array.isArray(routeImages)
      ? routeImages
      : [];

  const images =
    sourceImages.length >
    CELL_COUNT
      ? sampleEvenly(
          sourceImages,
          CELL_COUNT
        )
      : [
          ...sourceImages
        ];

  const cells =
    [];

  for (
    let slot = 0;
    slot < CELL_COUNT;
    slot += 1
  ) {
    const image =
      images[slot];

    if (!image) {
      cells.push(
        '<div class="route-matrix-cell route-matrix-cell-empty" aria-hidden="true"></div>'
      );

      continue;
    }

    const source =
      matrixImageSource(
        image,
        mode
      );

    if (!source) {
      cells.push(
        '<div class="route-matrix-cell route-matrix-cell-empty"></div>'
      );

      continue;
    }

    const distance =
      Number(
        image.distanceFromMrt_m ||
        0
      );

    const order =
      Number(
        image.imageOrder ||
        slot + 1
      );

    cells.push(`
      <figure
        class="route-matrix-cell"
        title="Image ${order} · ${escapeHTML(formatDistance(distance))} from MRT"
      >

        <img
          src="${escapeHTML(source)}"
          alt="Route image ${order} at ${escapeHTML(formatDistance(distance))}"
          loading="lazy"
          decoding="async"
        />

        <figcaption>

          <span>
            ${String(order).padStart(2, "0")}
          </span>

          <strong>
            ${escapeHTML(
              compactDistance(
                distance
              )
            )}
          </strong>

        </figcaption>

      </figure>
    `);
  }

  return cells.join("");
}


// ============================================================
// MATRIX IMAGE SOURCE
// ============================================================

function matrixImageSource(
  image,
  mode
) {
  if (!image) {
    return null;
  }

  if (
    mode ===
    "original"
  ) {
    return (
      image.originalImage ||
      null
    );
  }

  if (
    mode ===
    "overall"
  ) {
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


// ============================================================
// MATRIX INTERACTION
// ============================================================

function bindVisualEvidenceMatrixControls(
  container,
  routeImages
) {
  const matrix =
    container.querySelector(
      "#diagnosticImageMatrix"
    );

  const title =
    container.querySelector(
      "#diagnosticMatrixTitle"
    );

  const description =
    container.querySelector(
      "#diagnosticMatrixDescription"
    );

  const buttons =
    [
      ...container.querySelectorAll(
        "[data-diagnostic-condition]"
      )
    ];

  if (
    !matrix ||
    !buttons.length
  ) {
    return;
  }

  const content = {
    pedestrian: {
      title:
        "Pedestrian space",
      description:
        "Walking-surface pixels isolated from the wider street scene."
    },

    greenery: {
      title:
        "Greenery",
      description:
        "Trees, planting and visible vegetation isolated along the route."
    },

    road: {
      title:
        "Road exposure",
      description:
        "Road surfaces isolated to reveal the visual dominance of vehicular infrastructure."
    },

    vehicle: {
      title:
        "Vehicle presence",
      description:
        "Detected vehicles isolated from the surrounding street environment."
    },

    sky: {
      title:
        "Open-sky exposure",
      description:
        "Visible sky isolated as a visual proxy for environmental exposure."
    },

    building: {
      title:
        "Built frontage",
      description:
        "Building surfaces isolated to reveal enclosure and built-edge conditions."
    }
  };

  buttons.forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          const condition =
            button.dataset.diagnosticCondition;

          if (!condition) {
            return;
          }

          buttons.forEach(
            (item) => {
              const active =
                item ===
                button;

              item.classList.toggle(
                "is-active",
                active
              );

              item.setAttribute(
                "aria-selected",
                String(active)
              );
            }
          );

          matrix.innerHTML =
            buildRouteImageMatrix(
              routeImages,
              condition
            );

          const copy =
            content[condition];

          if (
            copy &&
            title
          ) {
            title.textContent =
              copy.title;
          }

          if (
            copy &&
            description
          ) {
            description.textContent =
              copy.description;
          }
        }
      );
    }
  );
}


// ============================================================
// DESIGN TRANSLATION
// ============================================================

function renderDesignTranslation(
  route
) {
  const primary =
    route.primaryProblem ||
    {};

  const secondary =
    route.mostProminentSupportingCondition ||
    null;

  return `
    <section class="research-section">

      <header class="research-section-header">

        <div>

          <span class="panel-kicker">
            DESIGN TRANSLATION
          </span>

          <h3>
            From visual evidence to intervention
          </h3>

          <p>
            These are prompts for closer spatial inspection rather
            than automatic design prescriptions.
          </p>

        </div>

      </header>


      <div class="design-translation">

        <article class="design-card primary">

          <span>
            PRIMARY DESIGN LENS
          </span>

          <h4>
            ${escapeHTML(
              primary.label ||
              "Pedestrian space / walking continuity"
            )}
          </h4>

          <p>
            ${escapeHTML(
              primary.reason ||
              "Walking continuity is prioritised because it most directly affects pedestrian and stroller movement between MRT and home."
            )}
          </p>

          ${
            primary.recommendation
              ? `
                <p>
                  <strong>
                    Intervention direction:
                  </strong>

                  ${escapeHTML(
                    primary.recommendation
                  )}
                </p>
              `
              : ""
          }

        </article>


        <article class="design-card">

          <span>
            STRONGEST SUPPORTING CONDITION
          </span>

          <h4>
            ${
              secondary
                ? escapeHTML(
                    secondary.label ||
                    secondary.condition
                  )
                : "No persistent secondary condition"
            }
          </h4>

          <p>
            ${
              secondary?.recommendation
                ? escapeHTML(
                    secondary.recommendation
                  )
                : "Use the individual environmental profiles above to inspect supporting conditions in relation to the pedestrian journey."
            }
          </p>

        </article>

      </div>

    </section>
  `;
}


// ============================================================
// MACHINE LEARNING
// ============================================================

function renderMachineLearningSection(
  compiler,
  route
) {
  const clusters =
    Array.isArray(
      compiler?.clusters
    )
      ? compiler.clusters
      : [];

  const maximum =
    Math.max(
      1,
      ...clusters.map(
        (cluster) =>
          Number(
            cluster.count ||
            0
          )
      )
    );

  const rows =
    clusters
      .map(
        (
          cluster,
          index
        ) => {
          const id =
            Number(
              cluster.cluster ??
              index
            );

          const count =
            Number(
              cluster.count ||
              0
            );

          const name =
            cluster.semanticLabel ||
            `Visual type ${id}`;

          const description =
            cluster.semanticDescription ||
            "";

          const width =
            Math.max(
              0,
              Math.min(
                100,
                (
                  count /
                  maximum
                ) *
                100
              )
            );

          return `
            <div class="cluster-row">

              <div class="cluster-index">
                ${String(id).padStart(2, "0")}
              </div>

              <div class="cluster-copy">

                <strong>
                  ${escapeHTML(
                    name
                  )}
                </strong>

                <span>
                  ${escapeHTML(
                    description
                  )}
                </span>

              </div>

              <div class="cluster-bar">
                <span
                  style="width:${width}%;"
                ></span>
              </div>

              <div class="cluster-count">
                ${count}
              </div>

            </div>
          `;
        }
      )
      .join("");

  return `
    <section class="research-section">

      <header class="research-section-header">

        <div>

          <span class="panel-kicker">
            MACHINE LEARNING
          </span>

          <h3>
            Recurring visual environments
          </h3>

          <p>
            K-means groups recurring combinations of semantic environmental
            features. Cluster IDs remain for reproducibility while descriptive
            labels interpret their centroids.
          </p>

        </div>

        <div class="section-badge">
          Selected route:
          ${escapeHTML(
            route.dominantVisualClusterLabel ||
            "mixed environment"
          )}
        </div>

      </header>

      <div class="cluster-list">
        ${rows}
      </div>

    </section>
  `;
}


// ============================================================
// COMBINED ROUTE GRAPH
// ============================================================

function buildCombinedChart(
  smoothed,
  routeDistance
) {
  const features = [
    {
      key:
        "sky",
      label:
        "Sky",
      colour:
        CONDITIONS.sky.colour
    },

    {
      key:
        "greenery",
      label:
        "Greenery",
      colour:
        CONDITIONS.greenery.colour
    },

    {
      key:
        "road",
      label:
        "Road",
      colour:
        CONDITIONS.road.colour
    },

    {
      key:
        "pedestrian",
      label:
        "Pedestrian",
      colour:
        CONDITIONS.pedestrian.colour
    }
  ];

  const width =
    1400;

  const height =
    440;

  const margin = {
    left:
      70,
    right:
      32,
    top:
      35,
    bottom:
      78
  };

  const plotWidth =
    width -
    margin.left -
    margin.right;

  const plotHeight =
    height -
    margin.top -
    margin.bottom;

  const maximumDistance =
    Math.max(
      1,
      Number(
        routeDistance
      ) ||
      1
    );

  const x =
    (value) =>
      margin.left +
      (
        Number(
          value
        ) /
        maximumDistance
      ) *
      plotWidth;

  const y =
    (value) =>
      margin.top +
      (
        1 -
        Number(
          value
        ) /
        100
      ) *
      plotHeight;

  const grid =
    [
      0,
      25,
      50,
      75,
      100
    ]
      .map(
        (value) => `
          <line
            x1="${margin.left}"
            y1="${y(value)}"
            x2="${width - margin.right}"
            y2="${y(value)}"
            stroke="currentColor"
            opacity=".07"
          />

          <text
            x="${margin.left - 12}"
            y="${y(value) + 4}"
            text-anchor="end"
            font-size="11"
            fill="currentColor"
            opacity=".46"
          >
            ${value}%
          </text>
        `
      )
      .join("");

  const paths =
    features
      .map(
        (feature) => {
          const path =
            segmentedPath(
              smoothed,
              feature.key,
              x,
              y
            );

          if (!path) {
            return "";
          }

          return `
            <path
              d="${path}"
              fill="none"
              stroke="${feature.colour}"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          `;
        }
      )
      .join("");

  const legend =
    features
      .map(
        (
          feature,
          index
        ) => `
          <g
            transform="translate(
              ${margin.left + index * 155},
              ${height - 22}
            )"
          >
            <line
              x1="0"
              y1="0"
              x2="28"
              y2="0"
              stroke="${feature.colour}"
              stroke-width="4"
            />

            <text
              x="36"
              y="4"
              font-size="11"
            >
              ${feature.label}
            </text>
          </g>
        `
      )
      .join("");

  return `
    <div class="route-chart-shell">

      <svg
        viewBox="0 0 ${width} ${height}"
        aria-label="Combined environmental profile from MRT to home"
      >

        ${grid}

        ${paths}

        <line
          x1="${margin.left}"
          y1="${height - margin.bottom}"
          x2="${width - margin.right}"
          y2="${height - margin.bottom}"
          stroke="currentColor"
          opacity=".18"
        />

        <circle
          cx="${x(0)}"
          cy="${height - margin.bottom}"
          r="6"
          fill="#0d4d73"
        />

        <circle
          cx="${x(maximumDistance)}"
          cy="${height - margin.bottom}"
          r="6"
          fill="#171717"
        />

        <text
          x="${x(0)}"
          y="${height - margin.bottom + 34}"
          text-anchor="start"
          font-size="10"
          font-weight="700"
          fill="#0d4d73"
        >
          MRT · 0 m
        </text>

        <text
          x="${x(maximumDistance)}"
          y="${height - margin.bottom + 34}"
          text-anchor="end"
          font-size="10"
          font-weight="700"
        >
          HOME ·
          ${escapeHTML(
            formatDistance(
              maximumDistance
            )
          )}
        </text>

        ${legend}

      </svg>

    </div>
  `;
}


// ============================================================
// SINGLE FEATURE GRAPH
// ============================================================

function buildSingleFeatureChart(
  key,
  colour,
  smoothed,
  raw,
  routeDistance
) {
  const width =
    720;

  const height =
    265;

  const margin = {
    left:
      48,
    right:
      20,
    top:
      18,
    bottom:
      48
  };

  const plotWidth =
    width -
    margin.left -
    margin.right;

  const plotHeight =
    height -
    margin.top -
    margin.bottom;

  const maximumDistance =
    Math.max(
      1,
      Number(
        routeDistance
      ) ||
      1
    );

  const x =
    (distance) =>
      margin.left +
      (
        Number(
          distance
        ) /
        maximumDistance
      ) *
      plotWidth;

  const y =
    (value) =>
      margin.top +
      (
        1 -
        Number(
          value
        ) /
        100
      ) *
      plotHeight;

  const path =
    segmentedPath(
      smoothed,
      key,
      x,
      y
    );

  const rawDots =
    raw
      .filter(
        (point) =>
          point?.values?.[key] != null
      )
      .map(
        (point) => `
          <circle
            cx="${x(
              point.distance_m
            )}"
            cy="${y(
              point.values[key]
            )}"
            r="2.3"
            fill="${colour}"
            opacity=".22"
          />
        `
      )
      .join("");

  const grid =
    [
      0,
      25,
      50,
      75,
      100
    ]
      .map(
        (value) => `
          <line
            x1="${margin.left}"
            y1="${y(value)}"
            x2="${width - margin.right}"
            y2="${y(value)}"
            stroke="currentColor"
            opacity=".055"
          />

          <text
            x="${margin.left - 7}"
            y="${y(value) + 3}"
            text-anchor="end"
            font-size="8"
            opacity=".43"
          >
            ${value}%
          </text>
        `
      )
      .join("");

  return `
    <div class="single-feature-chart">

      <svg
        viewBox="0 0 ${width} ${height}"
      >

        ${grid}

        ${rawDots}

        ${
          path
            ? `
              <path
                d="${path}"
                fill="none"
                stroke="${colour}"
                stroke-width="3.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            `
            : ""
        }

        <line
          x1="${margin.left}"
          y1="${height - margin.bottom}"
          x2="${width - margin.right}"
          y2="${height - margin.bottom}"
          stroke="currentColor"
          opacity=".13"
        />

        <circle
          cx="${x(0)}"
          cy="${height - margin.bottom}"
          r="4"
          fill="#0d4d73"
        />

        <circle
          cx="${x(maximumDistance)}"
          cy="${height - margin.bottom}"
          r="4"
          fill="#181818"
        />

        <text
          x="${x(0)}"
          y="${height - 14}"
          text-anchor="start"
          font-size="8"
          font-weight="700"
          fill="#0d4d73"
        >
          MRT · 0 m
        </text>

        <text
          x="${x(maximumDistance)}"
          y="${height - 14}"
          text-anchor="end"
          font-size="8"
          font-weight="700"
        >
          HOME ·
          ${escapeHTML(
            formatDistance(
              maximumDistance
            )
          )}
        </text>

      </svg>

    </div>
  `;
}


// ============================================================
// GRAPH PATH BUILDER
// ============================================================

function segmentedPath(
  points,
  key,
  x,
  y
) {
  let output =
    "";

  let drawing =
    false;

  for (
    const point
    of points
  ) {
    const value =
      point?.values?.[key];

    if (
      value == null ||
      !Number.isFinite(
        Number(
          value
        )
      )
    ) {
      drawing =
        false;

      continue;
    }

    const px =
      x(
        point.distance_m
      );

    const py =
      y(
        value
      );

    if (!drawing) {
      output +=
        ` M ${px} ${py}`;

      drawing =
        true;
    }
    else {
      output +=
        ` L ${px} ${py}`;
    }
  }

  return output.trim();
}


// ============================================================
// SMALL OVERALL EVIDENCE
// ============================================================

function buildEvidenceStrip(
  routeImages,
  mode,
  count
) {
  const images =
    sampleEvenly(
      routeImages,
      count
    );

  if (!images.length) {
    return `
      <div class="analysis-placeholder">
        No visual evidence available.
      </div>
    `;
  }

  return `
    <div class="evidence-strip">

      ${
        images
          .map(
            (image) => {
              const source =
                mode ===
                "original"
                  ? image.originalImage
                  : (
                      image.diagnosticSegmentations?.[mode] ||
                      image.segmentationImage ||
                      image.originalImage
                    );

              return `
                <figure class="evidence-tile">

                  <img
                    src="${escapeHTML(source || "")}"
                    alt="Route visual evidence"
                    loading="lazy"
                    decoding="async"
                  />

                  <figcaption class="evidence-tile-caption">
                    ${escapeHTML(
                      formatDistance(
                        image.distanceFromMrt_m ||
                        0
                      )
                    )}
                  </figcaption>

                </figure>
              `;
            }
          )
          .join("")
      }

    </div>
  `;
}


// ============================================================
// SMALL CONDITION EVIDENCE
// ============================================================

function buildDiagnosticStrip(
  routeImages,
  condition
) {
  if (!routeImages.length) {
    return "";
  }

  return `
    <div class="diagnostic-strip">

      ${
        routeImages
          .map(
            (image) => {
              const source =
                image.diagnosticSegmentations?.[condition];

              if (!source) {
                return "";
              }

              return `
                <figure class="diagnostic-tile">

                  <img
                    src="${escapeHTML(source)}"
                    alt="${escapeHTML(condition)} segmentation"
                    loading="lazy"
                    decoding="async"
                  />

                  <span>
                    ${escapeHTML(
                      formatDistance(
                        image.distanceFromMrt_m ||
                        0
                      )
                    )}
                  </span>

                </figure>
              `;
            }
          )
          .join("")
      }

    </div>
  `;
}


// ============================================================
// CHOOSE CONDITION IMAGES
// ============================================================

function chooseDiagnosticImages(
  routeImages,
  problemSegments,
  count
) {
  if (!routeImages.length) {
    return [];
  }

  const problemImages =
    routeImages.filter(
      (image) => {
        const distance =
          Number(
            image.distanceFromMrt_m ||
            0
          );

        return problemSegments.some(
          (segment) =>
            distance >=
            Number(
              segment.start_m
            )
            &&
            distance <=
            Number(
              segment.end_m
            )
        );
      }
    );

  const chosen =
    sampleEvenly(
      problemImages,
      count
    );

  if (
    chosen.length >=
    count
  ) {
    return chosen;
  }

  const fallback =
    sampleEvenly(
      routeImages,
      count
    );

  const unique =
    new Map();

  [
    ...chosen,
    ...fallback
  ]
    .forEach(
      (image) => {
        unique.set(
          String(
            image.imageId
          ),
          image
        );
      }
    );

  return [
    ...unique.values()
  ]
    .slice(
      0,
      count
    );
}


// ============================================================
// EVEN SAMPLING
// ============================================================

function sampleEvenly(
  values,
  count
) {
  if (
    !Array.isArray(
      values
    )
    ||
    !values.length
    ||
    count <= 0
  ) {
    return [];
  }

  if (
    values.length <=
    count
  ) {
    return [
      ...values
    ];
  }

  const output =
    [];

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    const position =
      Math.round(
        (
          index *
          (
            values.length -
            1
          )
        )
        /
        (
          count -
          1
        )
      );

    output.push(
      values[
        position
      ]
    );
  }

  return output;
}


// ============================================================
// DEFAULT RECOMMENDATIONS
// ============================================================

function defaultRecommendation(
  key
) {
  const recommendations = {
    pedestrian:
      "Inspect continuous footpath width, stroller clearance, obstructions, level changes and pedestrian-priority space.",

    greenery:
      "Investigate additional street trees, planting buffers and landscape shade where vegetation is relatively limited.",

    road:
      "Review pedestrian separation, traffic buffers, crossing distance, refuge opportunities and traffic-calming measures.",

    vehicle:
      "Inspect locations with persistent vehicle presence for traffic conflict, drop-off activity and pedestrian protection.",

    sky:
      "Investigate shade trees, covered walkways or weather-protection structures where visual exposure is relatively high.",

    building:
      "Use frontage changes to inspect enclosure, inactive edges, wayfinding and spatial legibility."
  };

  return (
    recommendations[key] ||
    ""
  );
}


// ============================================================
// METRIC
// ============================================================

function metric(
  name,
  value,
  note = ""
) {
  return `
    <div class="analysis-metric">

      <span>
        ${escapeHTML(
          name
        )}
      </span>

      <strong>
        ${escapeHTML(
          value
        )}
      </strong>

      ${
        note
          ? `
            <small>
              ${escapeHTML(
                note
              )}
            </small>
          `
          : ""
      }

    </div>
  `;
}


// ============================================================
// FORMAT DISTANCE
// ============================================================

function formatDistance(
  metres
) {
  const value =
    Number(
      metres
    );

  if (
    !Number.isFinite(
      value
    )
  ) {
    return "—";
  }

  if (
    value >=
    1000
  ) {
    return `${
      (
        value /
        1000
      )
        .toFixed(
          2
        )
        .replace(
          /\.00$/,
          ""
        )
    } km`;
  }

  return `${
    Math.round(
      value
    )
  } m`;
}


// ============================================================
// COMPACT MATRIX DISTANCE
// ============================================================

function compactDistance(
  metres
) {
  const value =
    Number(
      metres
    );

  if (
    !Number.isFinite(
      value
    )
  ) {
    return "—";
  }

  if (
    value >=
    1000
  ) {
    return `${
      (
        value /
        1000
      ).toFixed(
        1
      )
    }k`;
  }

  return `${
    Math.round(
      value
    )
  }m`;
}


// ============================================================
// HTML ESCAPING
// ============================================================

function escapeHTML(
  value
) {
  return String(
    value ??
    ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}