// ======================================================
// FAMILY ACCESS NETWORK
// ======================================================

import {
  geographicOffsetMeters
} from "../utils/geo.js";


export function renderNetworkGraph(
  origin,
  results
) {
  const container =
    document.getElementById(
      "graphContainer"
    );

  if (!container) {
    return;
  }

  if (!results.length) {
    container.innerHTML = `
      <div class="empty-state">
        No network to display.
      </div>
    `;

    return;
  }

  const svgNS =
    "http://www.w3.org/2000/svg";

  const width = 1100;
  const height = 650;

  const cx =
    width / 2;

  const cy =
    height / 2;

  const svg =
    document.createElementNS(
      svgNS,
      "svg"
    );

  svg.setAttribute(
    "viewBox",
    `0 0 ${width} ${height}`
  );

  svg.setAttribute(
    "width",
    "100%"
  );

  svg.setAttribute(
    "height",
    "650"
  );


  const maximumDistance =
    Math.max(
      ...results.map(
        result =>
          result.distance
      ),
      1
    );


  const nodes =
    results.map(result => {
      const offset =
        geographicOffsetMeters(
          origin,
          result
        );

      const angle =
        Math.atan2(
          offset.dy,
          offset.dx
        );

      const radius =
        150 +
        (
          result.distance /
          maximumDistance
        ) *
        130;

      return {
        ...result,

        x:
          cx +
          Math.cos(angle) *
          radius,

        y:
          cy -
          Math.sin(angle) *
          radius
      };
    });


  // EDGES
  nodes.forEach(node => {
    const line =
      document.createElementNS(
        svgNS,
        "line"
      );

    line.setAttribute(
      "x1",
      cx
    );

    line.setAttribute(
      "y1",
      cy
    );

    line.setAttribute(
      "x2",
      node.x
    );

    line.setAttribute(
      "y2",
      node.y
    );

    line.setAttribute(
      "stroke",
      "#123f77"
    );

    line.setAttribute(
      "stroke-width",
      "2.5"
    );

    svg.appendChild(line);


    const mx =
      cx +
      (node.x - cx) * 0.55;

    const my =
      cy +
      (node.y - cy) * 0.55;

    addText(
      svg,
      mx,
      my,
      node.effectiveCost,
      severityColor(
        node.severity
      ),
      13,
      true
    );
  });


  // MRT NODE
  addCircle(
    svg,
    cx,
    cy,
    56,
    "#123f77",
    "#123f77",
    2
  );

  addText(
    svg,
    cx,
    cy - 5,
    origin.name,
    "#ffffff",
    14,
    true
  );

  addText(
    svg,
    cx,
    cy + 17,
    origin.exit,
    "#ffffff",
    11,
    false
  );


  // TOILET NODES
  nodes.forEach(node => {
    addCircle(
      svg,
      node.x,
      node.y,
      node.rank === 1
        ? 45
        : 38,
      "#ffffff",
      "#123f77",
      node.rank === 1
        ? 4
        : 2
    );

    addText(
      svg,
      node.x,
      node.y - 7,
      `#${node.rank}`,
      "#123f77",
      14,
      true
    );

    addText(
      svg,
      node.x,
      node.y + 13,
      shorten(node.name),
      "#222222",
      10,
      false
    );
  });


  container.innerHTML = "";

  container.appendChild(svg);
}


function addCircle(
  svg,
  cx,
  cy,
  radius,
  fill,
  stroke,
  strokeWidth
) {
  const circle =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );

  circle.setAttribute("cx", cx);
  circle.setAttribute("cy", cy);
  circle.setAttribute("r", radius);
  circle.setAttribute("fill", fill);
  circle.setAttribute("stroke", stroke);

  circle.setAttribute(
    "stroke-width",
    strokeWidth
  );

  svg.appendChild(circle);
}


function addText(
  svg,
  x,
  y,
  value,
  fill,
  size,
  bold = false
) {
  const text =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );

  text.setAttribute("x", x);
  text.setAttribute("y", y);

  text.setAttribute(
    "text-anchor",
    "middle"
  );

  text.setAttribute(
    "dominant-baseline",
    "middle"
  );

  text.setAttribute(
    "fill",
    fill
  );

  text.setAttribute(
    "font-size",
    size
  );

  text.setAttribute(
    "font-family",
    "Arial, sans-serif"
  );

  if (bold) {
    text.setAttribute(
      "font-weight",
      "700"
    );
  }

  text.textContent =
    value;

  svg.appendChild(text);
}


function severityColor(
  severity
) {
  if (severity === "high") {
    return "#c94848";
  }

  if (severity === "medium") {
    return "#d97a1f";
  }

  return "#222222";
}


function shorten(value) {
  const text =
    String(value);

  if (text.length <= 16) {
    return text;
  }

  return (
    text.slice(0, 14) +
    "…"
  );
}