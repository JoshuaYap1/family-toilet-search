// ======================================================
// SEARCH RESULTS UI
// ======================================================

export function renderResults(
  results
) {
  const list =
    document.getElementById(
      "resultsList"
    );

  const count =
    document.getElementById(
      "resultCount"
    );

  if (!list || !count) {
    return;
  }

  list.innerHTML = "";

  count.textContent =
    `${results.length} found`;

  if (!results.length) {
    list.innerHTML = `
      <div class="empty-state">
        No mapped toilets found.
      </div>
    `;

    return;
  }

  results.forEach(result => {
    const card =
      document.createElement(
        "article"
      );

    card.className =
      "result-card";

    card.innerHTML = `
      <div class="result-rank">
        #${result.rank}
      </div>

      <div class="result-name">
        ${escapeHtml(result.name)}
      </div>

      <div class="
        result-score
        score-${result.severity}
      ">
        ${result.effectiveCost}
      </div>

      <div class="result-meta">
        Physical distance:
        ${result.distance} m

        <br>

        Changing table:
        ${
          result.hasChangingTable
            ? "yes"
            : "not mapped"
        }

        <br>

        Accessible / stroller-friendly:
        ${
          result.hasAccessible
            ? "yes"
            : "not mapped"
        }
      </div>
    `;

    list.appendChild(card);
  });
}


function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}