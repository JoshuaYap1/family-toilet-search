// ======================================================
// JOURNEY PROFILE UI
// ======================================================

export function renderJourneyProfile(
  profile
) {
  if (!profile) {
    return;
  }

  setText(
    "journeyContext",
    profile.context?.label || "—"
  );

  setText(
    "journeyNarrative",
    profile.narrative || "—"
  );

  renderMetric(
    "accessibilityScore",
    profile.accessibility
  );

  renderMetric(
    "familySupportScore",
    profile.familySupport
  );

  renderMetric(
    "journeyComfortScore",
    profile.journeyComfort
  );

  renderMetric(
    "amenitySupportScore",
    profile.amenitySupport
  );

  renderMetric(
    "accessGapScore",
    profile.accessGap
  );
}


function renderMetric(
  id,
  value
) {
  const element =
    document.getElementById(id);

  if (!element) {
    return;
  }

  const safeValue =
    Number.isFinite(value)
      ? value
      : 0;

  element.innerHTML = `
    <div class="score-display">
      <span class="score-number">
        ${safeValue}
      </span>

      <span class="score-denominator">
        /100
      </span>
    </div>

    <div class="score-track">
      <div
        class="score-fill"
        style="width:${safeValue}%"
      ></div>
    </div>
  `;
}


function setText(
  id,
  value
) {
  const element =
    document.getElementById(id);

  if (element) {
    element.textContent =
      value;
  }
}