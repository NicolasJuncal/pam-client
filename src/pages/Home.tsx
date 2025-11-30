import React from 'react';
import type { Map } from 'mapbox-gl';
import MapView from '../components/MapView';

const STADIUM_CENTER: [number, number] = [151.2083, -33.8678];

const Home: React.FC = () => {
  const handleMapReady = (map: Map) => {
    // Basic log to confirm the map instance is ready
    console.log('Map is ready:', map.getCenter().toArray());
  };

  return (
    <main className="min-h-screen w-full">
      <div className="h-screen w-full">
        <MapView center={STADIUM_CENTER} zoom={14} onMapReady={handleMapReady} />
      </div>
    </main>
  );
};

export default Home;
