import type { FeatureCollection, LineString } from 'geojson';

export type LngLatTuple = [number, number];

type MapboxProfile = 'walking' | 'driving' | 'driving-traffic' | 'cycling';

interface MapboxDirectionsRoute {
  geometry: {
    coordinates: [number, number][];
  };
  distance: number;
  duration: number;
}

interface MapboxDirectionsResponse {
  routes?: MapboxDirectionsRoute[];
  code?: string;
  message?: string;
}

export interface RouteResult {
  featureCollection: FeatureCollection<LineString>;
  distance: number;
  duration: number;
}

interface FetchRouteOptions {
  profile?: MapboxProfile;
  accessToken?: string;
}

/**
 * Fetches a GeoJSON LineString route between two points using Mapbox Directions.
 */
export async function fetchRouteFeatureCollection(
  from: LngLatTuple,
  to: LngLatTuple,
  options: FetchRouteOptions = {},
): Promise<RouteResult> {
  const accessToken = options.accessToken ?? import.meta.env.VITE_MAPBOX_TOKEN;
  if (!accessToken) {
    throw new Error('Missing Mapbox access token (VITE_MAPBOX_TOKEN).');
  }

  const profile = options.profile ?? 'walking';

  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/${profile}/${from[0]},${from[1]};${to[0]},${to[1]}`,
  );
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('overview', 'full');
  url.searchParams.set('alternatives', 'false');
  url.searchParams.set('steps', 'false');
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(
      `Mapbox directions request failed (${response.status}): ${response.statusText}`,
    );
  }

  const data = (await response.json()) as MapboxDirectionsResponse;
  const firstRoute = data.routes?.[0];

  if (!firstRoute?.geometry?.coordinates?.length) {
    throw new Error(
      data.message ?? 'Mapbox did not return a route geometry for the request.',
    );
  }

  const featureCollection: FeatureCollection<LineString> = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          distance: firstRoute.distance,
          duration: firstRoute.duration,
        },
        geometry: {
          type: 'LineString',
          coordinates: firstRoute.geometry.coordinates,
        },
      },
    ],
  };

  return {
    featureCollection,
    distance: firstRoute.distance,
    duration: firstRoute.duration,
  };
}
