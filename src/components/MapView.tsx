import React, { useEffect, useRef } from 'react';
import mapboxgl, { Map } from 'mapbox-gl';

export interface MapViewProps {
  center: [number, number];
  zoom?: number;
  style?: string;
  onMapReady?: (map: Map) => void;
}

const MapView: React.FC<MapViewProps> = ({ center, zoom = 16, style = 'mapbox://styles/mapbox/streets-v12', onMapReady }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    console.log('MapView: token', token);
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style,
      center,
      zoom,
      pitch: 60,
      antialias: true,
    });
    console.log('MapView: map created');

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-left');

    const handleStyleLoad = () => {
      console.log('MapView: style.load event');

      // Simple 3D extrusion example near 11/10 Carrington St, Sydney
      const buildingSourceId = 'custom-building-source';
      const buildingLayerId = 'custom-building-layer';

      const carringtonBuilding = {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            properties: {
              height: 80,
              base: 0,
            },
            geometry: {
              type: 'Polygon' as const,
              coordinates: [
                [
                  [151.20661, -33.86548],
                  [151.20682, -33.86549],
                  [151.20682, -33.86530],
                  [151.20660, -33.86530],
                  [151.20661, -33.86548],
                ],
              ],
            },
          },
        ],
      };

      if (!map.getSource(buildingSourceId)) {
        map.addSource(buildingSourceId, {
          type: 'geojson',
          data: carringtonBuilding as any,
        });
      }

      if (!map.getLayer(buildingLayerId)) {
        map.addLayer({
          id: buildingLayerId,
          type: 'fill-extrusion',
          source: buildingSourceId,
          paint: {
            'fill-extrusion-color': '#4F46E5',
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'base'],
            'fill-extrusion-opacity': 0.9,
          },
        });
      }
    };

    map.on('style.load', handleStyleLoad);

    const handleLoad = () => {
      console.log('MapView: map load event');
      onMapReady?.(map);
    };

    map.on('load', handleLoad);

    mapRef.current = map;

    return () => {
      map.off('style.load', handleStyleLoad);
      map.off('load', handleLoad);
      map.remove();
      mapRef.current = null;
    };
  }, [center[0], center[1], zoom, style, onMapReady]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', backgroundColor: '#111827' }}
      aria-label="Interactive venue map"
    />
  );
};

export default MapView;
