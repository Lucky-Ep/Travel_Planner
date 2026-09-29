const photoCache = new Map();
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL?.trim().replace(/\/$/, "") ?? "";

export function getPoiPhoto(poiId, poiName, fallbackImageUrl) {
  const cacheKey = `${poiId}:${poiName}`;
  const cached = photoCache.get(cacheKey);
  if (cached) return cached;

  const request = loadPoiPhoto(poiId, poiName, fallbackImageUrl);
  photoCache.set(cacheKey, request);
  return request;
}

async function loadPoiPhoto(poiId, poiName, fallbackImageUrl) {
  if (API_BASE_URL) {
    const backendPhoto = await loadBackendPhoto(API_BASE_URL, poiId);
    if (backendPhoto) return backendPhoto;
  }

  return loadWikipediaPhoto(poiName, fallbackImageUrl);
}

async function loadBackendPhoto(apiBaseUrl, poiId) {
  try {
    const response = await fetch(
      `${apiBaseUrl}/pois/${encodeURIComponent(poiId)}/photo`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) return null;

    const data = await response.json();
    if (typeof data.imageUrl !== "string" || !data.imageUrl) {
      return null;
    }

    const attribution =
      data.attribution && typeof data.attribution.displayName === "string"
        ? {
            displayName: data.attribution.displayName,
            uri:
              typeof data.attribution.uri === "string"
                ? data.attribution.uri
                : undefined,
          }
        : undefined;

    return { imageUrl: data.imageUrl, attribution };
  } catch {
    return null;
  }
}

async function loadWikipediaPhoto(poiName, fallbackImageUrl) {
  const wikipediaTitle =
    poiName === "Shanghai Disneyland" ? "Shanghai Disneyland Park" : poiName;

  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikipediaTitle)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) return { imageUrl: fallbackImageUrl };

    const data = await response.json();
    const imageUrl =
      typeof data.thumbnail?.source === "string"
        ? data.thumbnail.source
        : typeof data.originalimage?.source === "string"
          ? data.originalimage.source
          : undefined;

    if (!imageUrl) return { imageUrl: fallbackImageUrl };

    return {
      imageUrl,
      attribution: {
        displayName: "Wikipedia / Wikimedia Commons",
        uri:
          typeof data.content_urls?.desktop?.page === "string"
            ? data.content_urls.desktop.page
            : `https://en.wikipedia.org/wiki/${encodeURIComponent(wikipediaTitle)}`,
      },
    };
  } catch {
    return { imageUrl: fallbackImageUrl };
  }
}
