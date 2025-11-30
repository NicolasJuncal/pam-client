import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import mapboxgl, { Map } from 'mapbox-gl';
import type { GeoJSONSource, LngLatLike } from 'mapbox-gl';
import type { FeatureCollection, LineString } from 'geojson';
import { fetchRouteFeatureCollection } from '../engine/routing';

export interface MapViewProps {
  center: [number, number];
  zoom?: number;
  style?: string;
  onMapReady?: (map: Map) => void;
}

export interface MapViewHandle {
  addRandomBuilding: () => void;
  setRoute: (from: [number, number], to: [number, number]) => void;
  resetRoute: () => void;
}

// --- Constants -------------------------------------------------------------

const CARRINGTON_CENTER: [number, number] = [151.2067, -33.86545];
const OPERA_CENTER: [number, number] = [151.2153, -33.8568];

const RANDOM_OFFSET = 0.001;
const RANDOM_BUILDING_SIZE = 0.00015;

const INITIAL_BUILDINGS = [
  {
    id: 'carrington-1',
    color: '#4F46E5',
    fc: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { height: 80, base: 0 },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [151.20661, -33.86548],
                [151.20682, -33.86549],
                [151.20682, -33.8653],
                [151.2066, -33.8653],
                [151.20661, -33.86548],
              ],
            ],
          },
        },
      ],
    },
  },
  {
    id: 'carrington-2',
    color: '#22C55E',
    fc: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { height: 60, base: 0 },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [151.2069, -33.86546],
                [151.2071, -33.86547],
                [151.2071, -33.86529],
                [151.20689, -33.86529],
                [151.2069, -33.86546],
              ],
            ],
          },
        },
      ],
    },
  },
  {
    id: 'carrington-3',
    color: '#EAB308',
    fc: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { height: 45, base: 0 },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [151.20655, -33.86563],
                [151.20685, -33.86563],
                [151.20685, -33.86553],
                [151.20655, -33.86553],
                [151.20655, -33.86563],
              ],
            ],
          },
        },
      ],
    },
  },
] as const;

const FLOOR_COUNT = 4;
const FLOOR_HEIGHT = 20;

const ROUTE_SOURCE_ID = 'carrington-opera-route-source';
const ROUTE_LAYER_ID = 'carrington-opera-route-layer';
const DEFAULT_ROUTE: FeatureCollection<LineString> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          CARRINGTON_CENTER,
          [151.21, -33.8615],
          OPERA_CENTER,
        ],
      },
    },
  ],
};

// --- Component -------------------------------------------------------------

const MapViewInner: React.ForwardRefRenderFunction<
  MapViewHandle,
  MapViewProps
> = ({ center, zoom = 16, style = 'mapbox://styles/mapbox/streets-v12', onMapReady }, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const buildingCountRef = useRef(3); // starting after 3 base buildings
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const endMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const routePointsRef = useRef<{ start?: [number, number]; end?: [number, number] }>({});
  const didCancelRef = useRef(false);

  const clearMarker = (markerRef: React.MutableRefObject<mapboxgl.Marker | null>) => {
    markerRef.current?.remove();
    markerRef.current = null;
  };

  const placeMarker = (
    markerRef: React.MutableRefObject<mapboxgl.Marker | null>,
    lngLat: [number, number],
    label: string,
    color: string,
  ) => {
    const map = mapRef.current;
    if (!map) return;

    clearMarker(markerRef);

    const el = document.createElement('div');
    el.style.width = '24px';
    el.style.height = '24px';
    el.style.borderRadius = '50%';
    el.style.background = color;
    el.style.color = '#0B0F1A';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.fontSize = '12px';
    el.style.fontWeight = '700';
    el.style.boxShadow = '0 8px 16px rgba(0,0,0,0.35)';
    el.textContent = label;

    markerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat(lngLat)
      .addTo(map);
  };

  const upsertRoute = (routeFc: FeatureCollection<LineString>) => {
    const map = mapRef.current;
    if (!map) return;

    const existingSource = map.getSource(ROUTE_SOURCE_ID) as GeoJSONSource | undefined;

    if (existingSource) {
      existingSource.setData(routeFc);
    } else {
      map.addSource(ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: routeFc,
      });
    }

    if (!map.getLayer(ROUTE_LAYER_ID)) {
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#FACC15',
          'line-width': 4,
          'line-opacity': 0.9,
        },
      });
    }
  };

  const loadRoute = async (from: [number, number], to: [number, number]) => {
    try {
      const { featureCollection } = await fetchRouteFeatureCollection(
        from,
        to,
        {
          profile: 'walking',
          accessToken: mapboxgl.accessToken,
        },
      );

      if (didCancelRef.current) return;
      upsertRoute(featureCollection);
    } catch (error) {
      console.error('MapView: Routing request failed, using fallback geometry.', error);
      if (didCancelRef.current) return;
      upsertRoute(DEFAULT_ROUTE);
    }
  };

  useImperativeHandle(ref, () => ({
    addRandomBuilding() {
      const map = mapRef.current;
      if (!map) return;

      const id = `dynamic-${buildingCountRef.current + 1}`;
      buildingCountRef.current += 1;

      const [centerLng, centerLat] = CARRINGTON_CENTER;
      const offsetLng = (Math.random() - 0.5) * RANDOM_OFFSET;
      const offsetLat = (Math.random() - 0.5) * RANDOM_OFFSET;

      const w = RANDOM_BUILDING_SIZE;
      const h = RANDOM_BUILDING_SIZE;

      const lng0 = centerLng + offsetLng;
      const lat0 = centerLat + offsetLat;

      const featureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              height: 40 + Math.random() * 60,
              base: 0,
            },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [lng0, lat0],
                  [lng0 + w, lat0],
                  [lng0 + w, lat0 + h],
                  [lng0, lat0 + h],
                  [lng0, lat0],
                ],
              ],
            },
          },
        ],
      };

      const colors = ['#6366F1', '#22C55E', '#EAB308', '#F97316', '#EC4899'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      const sourceId = `${id}-source`;
      const layerId = `${id}-layer`;

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: featureCollection as any,
        });
      }

      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'fill-extrusion',
          source: sourceId,
          paint: {
            'fill-extrusion-color': color,
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'base'],
            'fill-extrusion-opacity': 0.9,
          },
        });

        map.on('click', layerId, (e) => {
          map.easeTo({
            center: e.lngLat as LngLatLike,
            zoom: 18,
            pitch: 60,
            bearing: 20,
            duration: 1000,
          });
        });

        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = '';
        });
      }
    },
    setRoute(from, to) {
      if (!mapRef.current) return;
      routePointsRef.current = { start: from, end: to };
      placeMarker(startMarkerRef, from, 'A', '#22C55E');
      placeMarker(endMarkerRef, to, 'B', '#F97316');
      void loadRoute(from, to);
    },
    resetRoute() {
      if (!mapRef.current) return;
      routePointsRef.current = {};
      clearMarker(startMarkerRef);
      clearMarker(endMarkerRef);
      upsertRoute(DEFAULT_ROUTE);
    },
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    didCancelRef.current = false;

    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) {
      console.error('MapView: Missing VITE_MAPBOX_TOKEN');
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current ?? containerRef.current,
      style,
      center,
      zoom,
      pitch: 60,
      antialias: true,
    });
    mapRef.current = map;

    map.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      'top-left',
    );

    const addBuilding = (id: string, featureCollection: any, color: string) => {
      const sourceId = `${id}-source`;
      const layerId = `${id}-layer`;

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: featureCollection,
        });
      }

      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'fill-extrusion',
          source: sourceId,
          paint: {
            'fill-extrusion-color': color,
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'base'],
            'fill-extrusion-opacity': 0.6,
          },
        });

        map.on('click', layerId, (e) => {
          map.easeTo({
            center: e.lngLat as LngLatLike,
            zoom: 18,
            pitch: 60,
            bearing: 20,
            duration: 1000,
          });
        });

        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = '';
        });
      }
    };

    const handleStyleLoad = () => {
      // Initial flyover so buildings are visible
      map.easeTo({
        center: CARRINGTON_CENTER,
        zoom: 18,
        pitch: 60,
        bearing: 20,
        duration: 0,
      });

      // Base buildings
      INITIAL_BUILDINGS.forEach(({ id, fc, color }) =>
        addBuilding(id, fc, color),
      );

      // Multi-floor building (same footprint as carrington-1)
      const floorsFc = {
        type: 'FeatureCollection',
        features: Array.from({ length: FLOOR_COUNT }).map((_, i) => ({
          type: 'Feature',
          properties: {
            height: FLOOR_HEIGHT,
            base: i * FLOOR_HEIGHT,
            floor: i + 1,
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [151.20661, -33.86548],
                [151.20682, -33.86549],
                [151.20682, -33.8653],
                [151.2066, -33.8653],
                [151.20661, -33.86548],
              ],
            ],
          },
        })),
      };

      const floorsSourceId = 'carrington-1-floors-source';
      if (!map.getSource(floorsSourceId)) {
        map.addSource(floorsSourceId, {
          type: 'geojson',
          data: floorsFc,
        });
      }

      for (let i = 0; i < FLOOR_COUNT; i++) {
        const floorLayerId = `carrington-1-floor-${i + 1}`;
        if (!map.getLayer(floorLayerId)) {
          map.addLayer({
            id: floorLayerId,
            type: 'fill-extrusion',
            source: floorsSourceId,
            paint: {
              'fill-extrusion-color': i % 2 === 0 ? '#6366F1' : '#818CF8',
              'fill-extrusion-height': [
                '+',
                ['get', 'base'],
                ['get', 'height'],
              ],
              'fill-extrusion-base': ['get', 'base'],
              'fill-extrusion-opacity': 0.95,
            },
            filter: ['==', ['get', 'floor'], i + 1],
          });
        }
      }

      // Opera House block
      const operaOffsetLng = 0.00025;
      const operaOffsetLat = 0.0002;

      const operaBuilding = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { height: 50, base: 0 },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [OPERA_CENTER[0] - operaOffsetLng, OPERA_CENTER[1] - operaOffsetLat],
                  [OPERA_CENTER[0] + operaOffsetLng, OPERA_CENTER[1] - operaOffsetLat],
                  [OPERA_CENTER[0] + operaOffsetLng, OPERA_CENTER[1] + operaOffsetLat],
                  [OPERA_CENTER[0] - operaOffsetLng, OPERA_CENTER[1] + operaOffsetLat],
                  [OPERA_CENTER[0] - operaOffsetLng, OPERA_CENTER[1] - operaOffsetLat],
                ],
              ],
            },
          },
        ],
      };

      addBuilding('opera-house', operaBuilding, '#F97316');

      // Fetch a real route between Carrington cluster and Opera House
      loadRoute(CARRINGTON_CENTER, OPERA_CENTER);
    };

    const handleLoad = () => {
      onMapReady?.(map);
    };

    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      const clicked: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const { start, end } = routePointsRef.current;

      if (!start || end) {
        // Start a new selection with this as point A
        routePointsRef.current = { start: clicked };
        placeMarker(startMarkerRef, clicked, 'A', '#22C55E');
        clearMarker(endMarkerRef);
        return;
      }

      // Set point B and route
      routePointsRef.current = { start, end: clicked };
      placeMarker(endMarkerRef, clicked, 'B', '#F97316');
      void loadRoute(start, clicked);
    };

    map.on('style.load', handleStyleLoad);
    map.on('load', handleLoad);
    map.on('click', handleMapClick);

    return () => {
      didCancelRef.current = true;
      map.off('style.load', handleStyleLoad);
      map.off('load', handleLoad);
      map.off('click', handleMapClick);
      map.remove();
      mapRef.current = null;
    };
  }, [center, zoom, style, onMapReady]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#111827',
      }}
    >
      <div
        ref={mapContainerRef}
        style={{
          position: 'absolute',
          inset: 0,
        }}
        aria-label="Interactive venue map"
      />
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          padding: '8px 12px',
          borderRadius: 12,
          background: 'rgba(17, 24, 39, 0.8)',
          color: '#E5E7EB',
          fontSize: 12,
          lineHeight: 1.4,
          pointerEvents: 'none',
          border: '1px solid rgba(75,85,99,0.6)',
        }}
      >
        Click map to set A, then B to fetch a route. Click again to restart.
      </div>
    </div>
  );
};

const MapView = forwardRef<MapViewHandle, MapViewProps>(MapViewInner);

export default MapView;
