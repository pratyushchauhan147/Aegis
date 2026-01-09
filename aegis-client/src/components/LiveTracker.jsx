'use client';
import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, Navigation } from 'lucide-react';

// Helper: Calculate distance between two coords in meters
function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lng2-lng1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Helper: Auto-center map when points update
function MapRecenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.panTo(position, { animate: true });
  }, [position, map]);
  return null;
}

export default function LiveTracker({ incidentId }) {
  const [path, setPath] = useState([]); // Array of { lat, lng, time, speed }
  const [loading, setLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL // || 'http://localhost:3001';
  const POLL_INTERVAL = 4000; // 4 seconds

  // --- OPTIMIZED MERGE LOGIC ---
  const mergePoints = (newPoints) => {
    setPath(prevPath => {
      let updatedPath = [...prevPath];
      
      newPoints.forEach(p => {
        const lastPoint = updatedPath[updatedPath.length - 1];

        if (lastPoint) {
          const dist = getDistanceMeters(lastPoint.lat, lastPoint.lng, p.latitude, p.longitude);
          
          // 🛑 OPTIMIZATION: If movement < 5 meters, just update the timestamp
          // This prevents "jitter" clouds on the map when the user is standing still.
          if (dist < 5) {
            updatedPath[updatedPath.length - 1].time = p.recorded_at;
            updatedPath[updatedPath.length - 1].speed = p.speed; // Update speed even if static
          } else {
            // Significant move -> Add new point
            updatedPath.push({ 
              lat: p.latitude, 
              lng: p.longitude, 
              time: p.recorded_at, 
              speed: p.speed 
            });
          }
        } else {
          // First point ever
          updatedPath.push({ 
            lat: p.latitude, 
            lng: p.longitude, 
            time: p.recorded_at, 
            speed: p.speed 
          });
        }
      });
      return updatedPath;
    });
  };

  // --- POLLING LOOP ---
  useEffect(() => {
    let isMounted = true;
    
    const fetchUpdates = async () => {
      try {
        // Construct URL: If we have a last time, ask only for NEW data
        let url = `${API_URL}/incident/${incidentId}/live-path`;
        if (lastFetchTime) url += `?since=${lastFetchTime}`;

        const res = await fetch(url, { credentials: 'include' });
        const data = await res.json();

        if (res.ok && data.points.length > 0 && isMounted) {
          mergePoints(data.points);
          // Store the timestamp of the very last item we received to use in the next request
          setLastFetchTime(data.points[data.points.length - 1].recorded_at);
        }
      } catch (e) {
        console.error("Live track error:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // Initial Fetch
    fetchUpdates();

    // Loop
    const intervalId = setInterval(fetchUpdates, POLL_INTERVAL);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [incidentId, lastFetchTime]); // Dependency ensures we always use the latest timestamp

  // Derived State for UI
  const currentPos = path.length > 0 ? path[path.length - 1] : null;
  const polylineCoords = path.map(p => [p.lat, p.lng]);

  if (loading && path.length === 0) {
    return <div className="h-full flex items-center justify-center text-gray-500"><Loader2 className="animate-spin mr-2"/> Acquiring Signal...</div>;
  }

  if (path.length === 0) {
    return <div className="h-full flex items-center justify-center text-gray-500">Waiting for GPS data...</div>;
  }

  return (
    <div className="w-full h-full relative">
      <MapContainer 
        center={[currentPos.lat, currentPos.lng]} 
        zoom={16} 
        style={{ height: '100%', width: '100%' }}
        className="z-0 bg-gray-900"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" // Dark Mode Map Tiles
        />
        
        {/* The Path Traveled */}
        <Polyline 
          positions={polylineCoords} 
          pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.7 }} 
        />

        {/* The Current Location Head */}
        <CircleMarker 
          center={[currentPos.lat, currentPos.lng]} 
          radius={8} 
          pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1 }}
        >
          <Popup>
            <div className="text-xs font-sans">
              <p><strong>Speed:</strong> {currentPos.speed ? Math.round(currentPos.speed * 3.6) + ' km/h' : '0 km/h'}</p>
              <p className="text-gray-500">{new Date(currentPos.time).toLocaleTimeString()}</p>
            </div>
          </Popup>
        </CircleMarker>

        <MapRecenter position={[currentPos.lat, currentPos.lng]} />
      </MapContainer>

      {/* Floating Status Badge */}
      <div className="absolute top-4 right-4 z-[400] bg-gray-900/90 backdrop-blur border border-blue-500/30 px-4 py-2 rounded-lg shadow-xl flex items-center gap-3">
        <div className="relative">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75"></div>
        </div>
        <div>
          <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Live Tracking</div>
          <div className="text-sm font-mono text-white font-bold flex items-center gap-1">
             <Navigation size={12} className="text-blue-400"/>
             {currentPos.lat.toFixed(5)}, {currentPos.lng.toFixed(5)}
          </div>
        </div>
      </div>
    </div>
  );
}