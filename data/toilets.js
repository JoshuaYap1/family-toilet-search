const OVERPASS_URL =
  "https://overpass-api.de/api/interpreter";


export async function searchToilets(
  origin,
  radius = 500
) {

  const query = `
    [out:json][timeout:25];

    (
      node["amenity"="toilets"]
        (around:${radius},${origin.lat},${origin.lon});

      way["amenity"="toilets"]
        (around:${radius},${origin.lat},${origin.lon});

      relation["amenity"="toilets"]
        (around:${radius},${origin.lat},${origin.lon});
    );

    out center tags;
  `;


  const response =
    await fetch(
      OVERPASS_URL,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body:
          "data=" +
          encodeURIComponent(query)
      }
    );


  if (!response.ok) {
    throw new Error(
      `Overpass request failed: ${response.status}`
    );
  }


  const data =
    await response.json();


  return data.elements
    .map((element, index) => {

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

        name:
          element.tags?.name ||
          element.tags?.operator ||
          `Toilet ${index + 1}`,

        lat,

        lon,

        tags:
          element.tags || {}
      };

    })
    .filter(Boolean);
}