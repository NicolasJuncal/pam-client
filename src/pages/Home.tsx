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

  const handleAddBuildingClick = () => {
    mapViewRef.current?.addRandomBuilding();
  };

  return (
    <main className="min-h-screen w-full">
      {/* <button
        type="button"
        onClick={handleAddBuildingClick}
        style={{
          position: 'fixed',
          zIndex: 20,
          top: 16,
          left: 16,
          padding: '8px 12px',
          borderRadius: 999,
          background: '#111827',
          color: 'white',
          border: '1px solid #4B5563',
        }}
      >
        Add random building
      </button> */}

      <div className="h-screen w-full">
        <MapView ref={mapViewRef} center={STADIUM_CENTER} zoom={14} onMapReady={handleMapReady} />
      </div>
    </main>
  );
};

export default Home;
