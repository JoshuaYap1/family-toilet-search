// ======================================================
// ACCESS NETWORK GRAPH
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

  if (
    !results.length
  ) {
    container.innerHTML =
      `
        <div class="graph-placeholder">
          No network to display.
        </div>
      `;

    return;
  }

  const width =
    1000;

  const height =
    620;

  const centerX =
    width / 2;

  const centerY =
    height / 2;

  const svgNS =
    "http://www.w3.org/2000/svg";

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


  // --------------------------------
  // Create toilet nodes
  // --------------------------------

  const maxDistance =
    Math.max(
      ...results.map(
        item =>
          item.distance
      ),
      1
    );

  const nodes =
    results.map(
      result => {
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
            maxDistance
          ) *
          120;

        return {
          ...result,

          x:
            centerX +
            Math.cos(angle) *
            radius,

          y:
            centerY -
            Math.sin(angle) *
            radius
        };
      }
    );


  // --------------------------------
  // Edges
  // --------------------------------

  nodes.forEach(
    node => {
      const line =
        document.createElementNS(
          svgNS,
          "line"
        );

      line.setAttribute(
        "x1",
        centerX
      );

      line.setAttribute(
        "y1",
        centerY
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
        "2"
      );

      svg.appendChild(
        line
      );
    }
  );


  // --------------------------------
  // MRT origin node
  // --------------------------------

  const originCircle =
    document.createElementNS(
      svgNS,
      "circle"
    );

  originCircle.setAttribute(
    "cx",
    centerX
  );

  originCircle.setAttribute(
    "cy",
    centerY
  );

  originCircle.setAttribute(
    "r",
    55
  );

  originCircle.setAttribute(
    "fill",
    "#123f77"
  );

  svg.appendChild(
    originCircle
  );


  addText(
    svg,
    centerX,
    centerY,
    origin.name,
    "#ffffff",
    15
  );


  // --------------------------------
  // Toilet nodes
  // --------------------------------

  nodes.forEach(
    node => {
      const circle =
        document.createElementNS(
          svgNS,
          "circle"
        );

      circle.setAttribute(
        "cx",
        node.x
      );

      circle.setAttribute(
        "cy",
        node.y
      );

      circle.setAttribute(
        "r",
        node.rank === 1
          ? 42
          : 36
      );

      circle.setAttribute(
        "fill",
        "#ffffff"
      );

      circle.setAttribute(
        "stroke",
        "#123f77"
      );

      circle.setAttribute(
        "stroke-width",
        node.rank === 1
          ? 4
          : 2
      );

      svg.appendChild(
        circle
      );

      addText(
        svg,
        node.x,
        node.y - 5,
        `#${node.rank}`,
        "#123f77",
        14
      );

      addText(
        svg,
        node.x,
        node.y + 14,
        node.name,
        "#222222",
        10
      );
    }
  );


  container.innerHTML =
    "";

  container.appendChild(
    svg
  );
}


function addText(
  svg,
  x,
  y,
  value,
  fill,
  size
) {
  const text =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );

  text.setAttribute(
    "x",
    x
  );

  text.setAttribute(
    "y",
    y
  );

  text.setAttribute(
    "text-anchor",
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

  text.textContent =
    value;

  svg.appendChild(
    text
  );
}