import React, { useRef } from 'react';
import type { Map } from 'mapbox-gl';
import MapView, { type MapViewHandle } from '../components/MapView';

const STADIUM_CENTER: [number, number] = [151.2083, -33.8678];

const Home: React.FC = () => {
  const mapViewRef = useRef<MapViewHandle | null>(null);

  const handleMapReady = (map: Map) => {
    // Basic log to confirm the map instance is ready
    console.log('Map is ready:', map.getCenter().toArray());
  };

  return (
    <main className="min-h-screen w-full">
      <div
        style={{
          position: 'fixed',
          zIndex: 30,
          bottom: 26,
          left: 26,
          display: 'flex',
          gap: 12,
          padding: '10px 12px',
          borderRadius: 16,
          background: 'rgba(17, 24, 39, 0.8)',
          border: '1px solid rgba(75,85,99,0.6)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <button
          type="button"
          onClick={() => mapViewRef.current?.addRandomBuilding()}
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #6366F1, #22C55E)',
            color: 'white',
            fontWeight: 700,
            border: 'none',
            boxShadow: '0 10px 30px rgba(99,102,241,0.45)',
            cursor: 'pointer',
          }}
        >
          Add building
        </button>
        <button
          type="button"
          onClick={() => mapViewRef.current?.resetRoute()}
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            background: 'rgba(55,65,81,0.75)',
            color: 'white',
            fontWeight: 600,
            border: '1px solid rgba(107,114,128,0.7)',
            cursor: 'pointer',
          }}
        >
          Reset route
        </button>
      </div>

      <div className="h-screen w-full">
        <MapView ref={mapViewRef} center={STADIUM_CENTER} zoom={14} onMapReady={handleMapReady} />
      </div>
    </main>
  );
};

export default Home;
