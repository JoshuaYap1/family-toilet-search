// ======================================================
// SURROUNDING AMENITIES
// ======================================================

const OVERPASS_URL =
  "https://overpass-api.de/api/interpreter";


export async function loadAmenities(
  origin,
  radius = 600
) {
  const queryRadius =
    Math.max(radius, 600);

  const query = `
    [out:json][timeout:30];

    (
      nwr["shop"]
        (around:${queryRadius},${origin.lat},${origin.lon});

      nwr["amenity"="restaurant"]
        (around:${queryRadius},${origin.lat},${origin.lon});

      nwr["amenity"="cafe"]
        (around:${queryRadius},${origin.lat},${origin.lon});

      nwr["amenity"="fast_food"]
        (around:${queryRadius},${origin.lat},${origin.lon});

      nwr["amenity"="food_court"]
        (around:${queryRadius},${origin.lat},${origin.lon});

      nwr["amenity"="marketplace"]
        (around:${queryRadius},${origin.lat},${origin.lon});

      nwr["leisure"="park"]
        (around:${queryRadius},${origin.lat},${origin.lon});

      nwr["leisure"="playground"]
        (around:${queryRadius},${origin.lat},${origin.lon});

      nwr["amenity"="hospital"]
        (around:${queryRadius},${origin.lat},${origin.lon});

      nwr["amenity"="clinic"]
        (around:${queryRadius},${origin.lat},${origin.lon});

      nwr["amenity"="school"]
        (around:${queryRadius},${origin.lat},${origin.lon});

      nwr["amenity"="kindergarten"]
        (around:${queryRadius},${origin.lat},${origin.lon});

      nwr["amenity"="childcare"]
        (around:${queryRadius},${origin.lat},${origin.lon});

      nwr["tourism"]
        (around:${queryRadius},${origin.lat},${origin.lon});

      nwr["building"="apartments"]
        (around:${queryRadius},${origin.lat},${origin.lon});

      nwr["landuse"="residential"]
        (around:${queryRadius},${origin.lat},${origin.lon});
    );

    out center tags;
  `;

  try {
    const response =
      await fetch(
        OVERPASS_URL,
        {
          method: "POST",
          body: query.trim()
        }
      );

    if (!response.ok) {
      console.warn(
        "Amenity Overpass query failed."
      );

      return [];
    }

    const data =
      await response.json();

    return data.elements
      .map(element => {
        const lat =
          element.lat ??
          element.center?.lat;

        const lon =
          element.lon ??
          element.center?.lon;

        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lon)
        ) {
          return null;
        }

        return {
          id:
            `${element.type}-${element.id}`,

          lat,
          lon,

          tags:
            element.tags || {}
        };
      })
      .filter(Boolean);

  } catch (error) {
    console.warn(
      "Amenity query error:",
      error
    );

    return [];
  }
}