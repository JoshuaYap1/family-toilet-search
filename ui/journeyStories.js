// ======================================================
// JOURNEY STORIES UI
// Renders Python / Mapillary imagery
// ======================================================

export function renderJourneyStories(
  journeys
) {

  const container =
    document.getElementById(
      "journeyStories"
    );


  if (!container) {
    return;
  }


  if (
    !Array.isArray(journeys) ||
    !journeys.length
  ) {

    container.innerHTML = `
      <div class="empty-state">
        No journey stories available.
      </div>
    `;

    return;
  }


  container.innerHTML = "";


  journeys.forEach(
    (
      journey,
      journeyIndex
    ) => {

      const wrapper =
        document.createElement(
          "article"
        );


      wrapper.className =
        "journey-story";


      const toilet =
        journey.toilet;


      const route =
        journey.route;


      const moments =
        journey.pythonMoments ||
        journey.streetViewMoments ||
        journey.samples ||
        [];


      wrapper.innerHTML = `
        <details
          class="journey-story-details"
          ${journeyIndex === 0 ? "open" : ""}
        >

          <summary class="journey-story-summary">

            <div>

              <span class="journey-story-rank">
                Route ${journeyIndex + 1}
              </span>

              <strong>
                ${escapeHtml(
                  toilet?.name ||
                  `Toilet ${journeyIndex + 1}`
                )}
              </strong>

            </div>


            <div class="journey-story-meta">

              ${route?.distance ?? "—"} m

              ·

              ${
                route
                  ? Math.max(
                      1,
                      Math.round(
                        route.duration / 60
                      )
                    )
                  : "—"
              } min

            </div>

          </summary>


          <div class="journey-story-body">

            ${buildOverview(
              route,
              moments
            )}


            <div class="journey-story-timeline">

              ${moments
                .map(
                  (
                    moment,
                    index
                  ) =>
                    buildMomentCard(
                      moment,
                      index,
                      moments.length
                    )
                )
                .join("")
              }

            </div>

          </div>

        </details>
      `;


      container.appendChild(
        wrapper
      );

    }
  );
}



// ======================================================
// OVERVIEW
// ======================================================

function buildOverview(
  route,
  moments
) {

  const imagesFound =
    moments.filter(
      moment =>
        Boolean(
          moment.image
        )
    ).length;


  return `
    <div class="journey-story-overview">

      <div>

        <span class="journey-story-stat-label">
          Walking distance
        </span>

        <strong>
          ${route?.distance ?? "—"} m
        </strong>

      </div>


      <div>

        <span class="journey-story-stat-label">
          Estimated time
        </span>

        <strong>
          ${
            route
              ? Math.max(
                  1,
                  Math.round(
                    route.duration / 60
                  )
                )
              : "—"
          } min
        </strong>

      </div>


      <div>

        <span class="journey-story-stat-label">
          Street images
        </span>

        <strong>
          ${imagesFound}/${moments.length}
        </strong>

      </div>

    </div>
  `;
}



// ======================================================
// MOMENT CARD
// ======================================================

function buildMomentCard(
  moment,
  index,
  total
) {

  const isFirst =
    index === 0;


  const isLast =
    index === total - 1;


  let title =
    `Journey moment ${index + 1}`;


  let description =
    "A sampled street-level moment along the pedestrian journey.";


  if (isFirst) {

    title =
      "Departure";

    description =
      "The journey begins from the selected MRT exit.";

  }


  else if (isLast) {

    title =
      "Destination approach";

    description =
      "The route approaches the selected toilet destination.";

  }


  else if (
    index === 1
  ) {

    title =
      "Early transition";

    description =
      "The route begins transitioning through the surrounding urban environment.";

  }


  else {

    title =
      "Mid-journey";

    description =
      "A street-level moment sampled along the pedestrian route.";

  }


  return `
    <article class="journey-moment-card">

      <div class="journey-moment-number">
        ${index + 1}
      </div>


      ${buildImageBlock(
        moment,
        title
      )}


      <div class="journey-moment-content">

        <h4>
          ${title}
        </h4>


        <p class="journey-moment-description">
          ${description}
        </p>


        <div class="journey-moment-meta">

          <span>
            ${moment.distanceFromStart ?? 0} m
          </span>

          <span>
            ${
              moment.imageDistance != null
                ? `image ${moment.imageDistance} m away`
                : ""
            }
          </span>

        </div>


        ${
          moment.imageProvider
            ? `
              <div class="journey-image-source">
                Source:
                ${escapeHtml(
                  moment.imageProvider
                )}
              </div>
            `
            : ""
        }

      </div>

    </article>
  `;
}



// ======================================================
// IMAGE BLOCK
// ======================================================

function buildImageBlock(
  moment,
  title
) {

  if (
    moment.image
  ) {

    return `
      <div class="journey-image-frame">

        <img
          class="journey-streetview-image"
          src="${escapeAttribute(
            moment.image
          )}"
          alt="${escapeHtml(title)}"
          loading="lazy"
        />

        <div class="streetview-badge">
          Mapillary
        </div>

      </div>
    `;

  }


  return `
    <div class="journey-image-placeholder">

      <div class="journey-placeholder-icon">
        ◉
      </div>

      <strong>
        No image found
      </strong>

      <span>
        No nearby Mapillary image was returned
        for this sampled point.
      </span>

    </div>
  `;
}



// ======================================================
// HTML HELPERS
// ======================================================

function escapeHtml(
  value
) {

  return String(
    value ?? ""
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


function escapeAttribute(
  value
) {

  return escapeHtml(
    value
  );

}