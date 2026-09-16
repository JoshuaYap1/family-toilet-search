// ============================================================
// ANALYSIS PANEL
// ============================================================


const SOM_IMAGE =
    "./data/generated/mrt_context_component_planes.png";



// ============================================================
// MAIN
// ============================================================

export function renderAnalysisPanel(

    container,

    record = {},

    tab = "overview"

) {

    if (!container) {

        return;
    }


    const journey =
        record.journey
        ||
        null;


    const context =
        record.demographicContext
        ||
        {};


    const imageAnalysis =
        record.imageAnalysis
        ||
        null;


    switch (
        tab
    ) {

        case "context":

            renderContext(

                container,

                context

            );

            break;


        case "images":

            renderImages(

                container,

                imageAnalysis

            );

            break;


        case "opportunities":

            renderOpportunities(

                container,

                context,

                imageAnalysis

            );

            break;


        default:

            renderOverview(

                container,

                journey,

                context,

                imageAnalysis

            );

            break;
    }
}



// ============================================================
// OVERVIEW
// ============================================================

function renderOverview(

    container,

    journey,

    context,

    imageAnalysis

) {

    container.innerHTML = `

        <section class="visual-analysis-section">

            <span class="panel-kicker">
                JOURNEY CONTEXT
            </span>


            <h3>
                Journey overview
            </h3>


            ${
                journey

                    ?

                    `

                    <div class="analysis-callout">

                        <strong>

                            ${
                                escapeHTML(
                                    journey.origin
                                        ?.station
                                    ||
                                    ""
                                )
                            }

                            →

                            ${
                                escapeHTML(
                                    journey.toilet
                                        ?.name
                                    ||
                                    "Public toilet"
                                )
                            }

                        </strong>


                        <p>

                            ${
                                Math.round(
                                    journey.route
                                        ?.distance
                                    ||
                                    0
                                )
                            }

                            m precomputed walking journey.

                        </p>

                    </div>

                    `

                    :

                    `

                    <div class="analysis-callout">

                        <strong>
                            Demographic search context
                        </strong>

                        <p>

                            Load the stored family-access
                            journeys to inspect individual routes.

                        </p>

                    </div>

                    `
            }


            <div class="metric-grid">

                ${
                    metric(

                        "SOM cell",

                        context.somCell
                        ||
                        "—"

                    )
                }


                ${
                    metric(

                        "Children",

                        percent(
                            context.childrenPercent
                        )

                    )
                }


                ${
                    metric(

                        "HDB",

                        percent(
                            context.hdbPercent
                        )

                    )
                }


                ${
                    metric(

                        "Private housing",

                        percent(
                            context.privateHousingPercent
                        )

                    )
                }


                ${
                    metric(

                        "Stored image sample",

                        imageAnalysis
                        ?.imageCount
                        ??
                        "—"

                    )
                }

            </div>

        </section>

    `;
}



// ============================================================
// DEMOGRAPHIC CONTEXT
// ============================================================

function renderContext(

    container,

    context

) {

    container.innerHTML = `

        <section class="visual-analysis-section">

            <span class="panel-kicker">
                DEMOGRAPHIC SEARCH SPACE
            </span>


            <h3>
                MRT context component planes
            </h3>


            <div class="analysis-callout">

                <strong>

                    ${
                        escapeHTML(
                            context.descriptor
                            ||
                            "mixed-context"
                        )
                    }

                </strong>


                <p>

                    Selected MRT SOM cell:

                    <b>
                        ${
                            escapeHTML(
                                context.somCell
                                ||
                                "—"
                            )
                        }
                    </b>

                </p>

            </div>



            <div class="metric-grid">

                ${
                    metric(

                        "Population density",

                        number(
                            context.populationDensity
                        )

                    )
                }


                ${
                    metric(

                        "Children",

                        percent(
                            context.childrenPercent
                        )

                    )
                }


                ${
                    metric(

                        "Average household size",

                        number(
                            context.averageHouseholdSize,
                            2
                        )

                    )
                }


                ${
                    metric(

                        "HDB",

                        percent(
                            context.hdbPercent
                        )

                    )
                }


                ${
                    metric(

                        "Private housing",

                        percent(
                            context.privateHousingPercent
                        )

                    )
                }


                ${
                    metric(

                        "Elderly",

                        percent(
                            context.elderlyPercent
                        )

                    )
                }


                ${
                    metric(

                        "Commercial intensity",

                        percent(
                            context.commercialIntensity
                        )

                    )
                }

            </div>



            <p class="analysis-description">

                The component planes describe the complete
                Singapore MRT demographic SOM.

                The figure therefore remains constant while
                individual MRTs occupy different SOM cells.

            </p>



            <div class="single-analysis-image">

                <img

                    src="${SOM_IMAGE}"

                    alt="
                        Singapore MRT demographic
                        SOM component planes
                    "

                    loading="lazy"

                />

            </div>

        </section>

    `;


    installImageErrors(
        container
    );
}



// ============================================================
// STATIC STREET-IMAGE ANALYSIS
// ============================================================

function renderImages(

    container,

    imageAnalysis

) {

    if (
        !imageAnalysis
        ||
        !imageAnalysis.originalGrid
        ||
        !imageAnalysis.segmentationGrid
    ) {

        container.innerHTML = `

            <section class="visual-analysis-section">

                <span class="panel-kicker">
                    VISUAL SEARCH SPACE
                </span>


                <h3>
                    Street-view image analysis
                </h3>


                <div class="analysis-callout">

                    <strong>
                        No stored image batch is selected.
                    </strong>


                    <p>

                        Use

                        <b>
                            Show street-image analysis
                        </b>

                        in the search panel.

                    </p>

                </div>

            </section>

        `;


        return;
    }


    const version =
        imageAnalysis.generatedAt
        ||
        1;


    const stations =
        imageAnalysis.stations
        ||
        [];


    container.innerHTML = `

        <section class="visual-analysis-section">

            <span class="panel-kicker">
                VISUAL SEARCH SPACE
            </span>


            <h3>
                Street-view image analysis
            </h3>


            <p class="analysis-description">

                ${
                    imageAnalysis.imageCount
                    ||
                    0
                }

                preprocessed Mapillary observations sampled
                across the selected demographic comparison.

                No image analysis is being performed in the
                browser.

            </p>



            <div class="analysis-callout">

                <strong>
                    Stored query
                </strong>


                <p>

                    ${
                        escapeHTML(

                            imageAnalysis.queryKey

                            ||

                            imageAnalysis.seedStation

                            ||

                            "Current MRT query"

                        )
                    }

                </p>


                <p>

                    ${
                        stations
                        .map(
                            escapeHTML
                        )
                        .join(
                            " · "
                        )
                    }

                </p>

            </div>



            <div class="image-grid-comparison">


                <!-- =========================================
                     ORIGINAL GRID
                     ========================================= -->

                <article class="image-grid-card">

                    <header class="image-grid-card-header">

                        <span class="analysis-letter">
                            A
                        </span>


                        <div>

                            <strong>
                                Original street-view images
                            </strong>


                            <small>

                                Stored Mapillary image sample

                            </small>

                        </div>

                    </header>


                    <div class="grid-image-wrapper">

                        <img

                            src="${versioned(
                                imageAnalysis.originalGrid,
                                version
                            )}"

                            alt="
                                Original street-view image grid
                            "

                        />

                    </div>

                </article>



                <!-- =========================================
                     SEGMENTATION GRID
                     ========================================= -->

                <article class="image-grid-card">

                    <header class="image-grid-card-header">

                        <span class="analysis-letter">
                            B
                        </span>


                        <div>

                            <strong>
                                Semantic segmentation
                            </strong>


                            <small>

                                Precomputed SegFormer result
                                for the identical image sequence

                            </small>

                        </div>

                    </header>


                    <div class="grid-image-wrapper">

                        <img

                            src="${versioned(
                                imageAnalysis.segmentationGrid,
                                version
                            )}"

                            alt="
                                SegFormer semantic
                                segmentation grid
                            "

                        />

                    </div>

                </article>

            </div>

        </section>

    `;


    installImageErrors(
        container
    );
}



// ============================================================
// DESIGN OPPORTUNITIES
// ============================================================

function renderOpportunities(

    container,

    context,

    imageAnalysis

) {

    const opportunities =
        [];


    if (
        Number(
            context.childrenPercent
        )
        >
        15
    ) {

        opportunities.push(

            "Compare stroller continuity, crossings, shelter "
            +
            "and family-support infrastructure along the "
            +
            "precomputed journeys."

        );
    }


    if (
        Number(
            context.hdbPercent
        )
        >
        70
    ) {

        opportunities.push(

            "Compare recurring pedestrian conditions across "
            +
            "HDB-dominant MRT environments."

        );
    }


    if (
        Number(
            context.commercialIntensity
        )
        >
        10
    ) {

        opportunities.push(

            "Inspect crowding, stopping behaviour, crossings "
            +
            "and wayfinding around commercially intensive routes."

        );
    }


    const semantic =
        averageSemanticFeatures(
            imageAnalysis
        );


    if (
        semantic.greenery !==
        null
    ) {

        opportunities.push(

            `The stored image sample contains approximately ${
                Math.round(
                    semantic.greenery
                    *
                    100
                )
            }% greenery and ${
                Math.round(
                    semantic.pedestrian_space
                    *
                    100
                )
            }% pedestrian-space pixels on average. `
            +
            "Use these recurring visual conditions as evidence "
            +
            "rather than treating a single route image as representative."

        );
    }


    if (
        opportunities.length ===
        0
    ) {

        opportunities.push(

            "Compare recurring route and image conditions "
            +
            "across the matched demographic contexts before "
            +
            "choosing a design intervention."

        );
    }


    container.innerHTML = `

        <section class="visual-analysis-section">

            <span class="panel-kicker">
                DESIGN SEARCH
            </span>


            <h3>
                Emerging design opportunities
            </h3>


            <ul class="opportunity-list">

                ${
                    opportunities

                    .map(
                        opportunity => `

                            <li>

                                ${
                                    escapeHTML(
                                        opportunity
                                    )
                                }

                            </li>

                        `
                    )

                    .join("")
                }

            </ul>

        </section>

    `;
}



// ============================================================
// AVERAGE SEMANTIC FEATURES
// ============================================================

function averageSemanticFeatures(
    imageAnalysis
) {

    const images =
        imageAnalysis
        ?.images
        ||
        [];


    if (
        images.length === 0
    ) {

        return {

            greenery:
                null,

            pedestrian_space:
                null,

            road:
                null,

            built_frontage:
                null

        };
    }


    const keys = [

        "greenery",

        "pedestrian_space",

        "road",

        "built_frontage"

    ];


    const totals = {

        greenery:
            0,

        pedestrian_space:
            0,

        road:
            0,

        built_frontage:
            0

    };


    let valid =
        0;


    for (
        const image
        of images
    ) {

        const semantic =
            image.semantic
            ||
            {};


        if (
            Object.keys(
                semantic
            ).length ===
            0
        ) {

            continue;
        }


        valid += 1;


        for (
            const key
            of keys
        ) {

            totals[
                key
            ] +=

                Number(
                    semantic[
                        key
                    ]
                    ||
                    0
                );

        }
    }


    if (
        valid === 0
    ) {

        return {

            greenery:
                null,

            pedestrian_space:
                null,

            road:
                null,

            built_frontage:
                null

        };
    }


    const result =
        {};


    for (
        const key
        of keys
    ) {

        result[
            key
        ] =

            totals[
                key
            ]

            /

            valid;

    }


    return result;
}



// ============================================================
// IMAGE ERROR
// ============================================================

function installImageErrors(
    container
) {

    container
    .querySelectorAll(
        "img"
    )
    .forEach(
        image => {

            image.addEventListener(

                "error",

                () => {

                    const warning =
                        document.createElement(
                            "div"
                        );


                    warning.className =
                        "image-error";


                    warning.innerHTML = `

                        <strong>
                            Stored analysis image unavailable.
                        </strong>

                        <span>

                            Confirm that image_analysis.ipynb
                            successfully generated this query preview.

                        </span>

                    `;


                    image.replaceWith(
                        warning
                    );

                },

                {
                    once:
                        true
                }

            );

        }
    );
}



// ============================================================
// VERSION PATH
// ============================================================

function versioned(
    path,
    version
) {

    if (!path) {

        return "";
    }


    return (

        path

        +

        (
            path.includes(
                "?"
            )

                ?

                "&"

                :

                "?"
        )

        +

        "v="

        +

        encodeURIComponent(
            version
        )

    );
}



// ============================================================
// METRICS
// ============================================================

function metric(
    label,
    value
) {

    return `

        <div class="metric-card">

            <span>

                ${
                    escapeHTML(
                        label
                    )
                }

            </span>


            <strong>

                ${
                    escapeHTML(
                        value
                    )
                }

            </strong>

        </div>

    `;
}


function percent(
    value
) {

    const numberValue =
        Number(
            value
        );


    return Number.isFinite(
        numberValue
    )

        ?

        `${numberValue.toFixed(1)}%`

        :

        "—";
}


function number(
    value,
    digits = 0
) {

    const numberValue =
        Number(
            value
        );


    return Number.isFinite(
        numberValue
    )

        ?

        numberValue.toLocaleString(

            undefined,

            {

                minimumFractionDigits:
                    digits,

                maximumFractionDigits:
                    digits

            }

        )

        :

        "—";
}



// ============================================================
// ESCAPE
// ============================================================

function escapeHTML(
    value
) {

    return String(
        value
        ??
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
    );
}