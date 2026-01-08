'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import Link from 'next/link';
import { 
  Play, MapPin, Users, User, ArrowLeft, Loader2, AlertCircle, RefreshCw 
} from 'lucide-react';

export default function IncidentFeed() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('mine'); // 'mine', 'contacts', 'nearby'
  const [incidents, setIncidents] = useState([]);
  const [activeId, setActiveId] = useState(null);
  
  // Filters
  const [radius, setRadius] = useState(50); // Default 50km

  // Pagination & Loading
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLocating, setIsLocating] = useState(false); // Specific loading state for GPS
  
  // Location
  const [userLocation, setUserLocation] = useState(null);
  const [locError, setLocError] = useState(null);

  // Refs
  const observer = useRef();
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const abortControllerRef = useRef(null); // To cancel stale requests

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // ---------------------------------------------------------
  // 1. DATA FETCHING LOGIC
  // ---------------------------------------------------------
  const fetchIncidents = async (reset = false) => {
    // Prevent fetching nearby if we don't have location yet
    if (activeTab === 'nearby' && !userLocation) return;

    // Cancel previous request if running
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setLoading(true);

    try {
      const currentPage = reset ? 0 : page;
      const limit = 10;
      const offset = currentPage * limit;

      // Build Query
      let queryParams = `?filter=${activeTab}&limit=${limit}&offset=${offset}`;

      if (activeTab === 'nearby') {
        queryParams += `&userLat=${userLocation.lat}&userLng=${userLocation.lng}&radius=${radius}`;
      }

      const res = await fetch(`${API_URL}/incident/feed${queryParams}`, { 
        credentials: 'include',
        signal: abortControllerRef.current.signal
      });

      const data = await res.json();

      if (res.ok) {
        setIncidents(prev => reset ? (data.incidents || []) : [...prev, ...(data.incidents || [])]);
        setHasMore(data.hasMore);
        if (reset) setPage(1); 
        else setPage(prev => prev + 1);
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error("Fetch error:", e);
      }
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // 2. EFFECT: HANDLE TAB or RADIUS CHANGE (RESET)
  // ---------------------------------------------------------
  useEffect(() => {
    // Reset State
    setIncidents([]);
    setPage(0);
    setHasMore(true);
    setActiveId(null);
    setLocError(null);

    // Logic for Nearby vs Others
    if (activeTab === 'nearby') {
      if (!userLocation) {
        // Trigger GPS if we don't have it
        setIsLocating(true);
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
              setIsLocating(false);
              // fetchIncidents will be triggered by the userLocation dependency in the next effect
            },
            (err) => {
              console.error(err);
              setLocError("GPS Access Denied. Enable location services.");
              setIsLocating(false);
            }
          );
        } else {
          setLocError("Geolocation not supported.");
          setIsLocating(false);
        }
      } else {
        // We already have location, just refetch (e.g. radius changed)
        fetchIncidents(true);
      }
    } else {
      // For 'mine' or 'contacts', fetch immediately
      fetchIncidents(true);
    }
  }, [activeTab, radius]); // Runs when Tab or Radius changes

  // ---------------------------------------------------------
  // 3. EFFECT: HANDLE LOCATION UPDATE
  // ---------------------------------------------------------
  // This ensures that as soon as GPS finishes, we fetch data
  useEffect(() => {
    if (activeTab === 'nearby' && userLocation) {
      fetchIncidents(true);
    }
  }, [userLocation]);


  // ---------------------------------------------------------
  // 4. INFINITE SCROLL
  // ---------------------------------------------------------
  const lastElementRef = useCallback(node => {
    if (loading || isLocating) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchIncidents(false); // Load next page
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore, isLocating]);


  // ---------------------------------------------------------
  // 5. VIDEO PLAYER (HLS)
  // ---------------------------------------------------------
  useEffect(() => {
    if (!activeId || !videoRef.current) return;
    const src = `${API_URL}/playback/${activeId}/index.m3u8`;

    if (Hls.isSupported()) {
      if (hlsRef.current) hlsRef.current.destroy();
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(videoRef.current);
      hls.on(Hls.Events.MANIFEST_PARSED, () => videoRef.current.play());
      hlsRef.current = hls;
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = src;
      videoRef.current.play();
    }
    return () => { if(hlsRef.current) hlsRef.current.destroy(); };
  }, [activeId]);


  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------
  return (
    <div className="h-screen flex flex-col bg-black text-white font-sans">
      
      {/* HEADER */}
      <div className="p-4 border-b border-gray-800 bg-gray-900 flex justify-between items-center z-10 shadow-md">
        <h1 className="font-bold text-lg text-blue-500 tracking-wider flex items-center gap-2">
          AEGIS <span className="text-gray-500 text-xs font-normal">SECURE FEED</span>
        </h1>
        <Link href="/dashboard" className="text-xs text-gray-400 flex items-center gap-1 hover:text-white px-3 py-1 rounded bg-gray-800">
          <ArrowLeft size={14} /> Dashboard
        </Link>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* --- LEFT SIDEBAR (FEED) --- */}
        <div className="w-full md:w-[420px] border-r border-gray-800 bg-gray-900 flex flex-col z-20">
          
          {/* TABS */}
          <div className="grid grid-cols-3 bg-black border-b border-gray-800">
            <TabButton 
              icon={<User size={16} />} 
              label="Mine" 
              active={activeTab === 'mine'} 
              onClick={() => setActiveTab('mine')} 
            />
            <TabButton 
              icon={<Users size={16} />} 
              label="Contacts" 
              active={activeTab === 'contacts'} 
              onClick={() => setActiveTab('contacts')} 
            />
            <TabButton 
              icon={<MapPin size={16} />} 
              label="Nearby" 
              active={activeTab === 'nearby'} 
              onClick={() => setActiveTab('nearby')} 
            />
          </div>

          {/* RADIUS SLIDER (Only for Nearby) */}
          {activeTab === 'nearby' && (
            <div className="p-3 bg-gray-800/50 border-b border-gray-800 flex items-center gap-3 animate-in slide-in-from-top-2">
              <span className="text-xs text-blue-400 whitespace-nowrap font-bold w-16">
                {radius} km
              </span>
              <input 
                type="range" 
                min="1" 
                max="500" 
                value={radius} 
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          )}

          {/* INCIDENT LIST */}
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            
            {/* Error Message */}
            {locError && (
              <div className="p-4 m-4 bg-red-900/20 border border-red-900 text-red-400 text-xs rounded flex items-center gap-2">
                <AlertCircle size={16} /> {locError}
              </div>
            )}

            {/* Empty State */}
            {!loading && !isLocating && incidents.length === 0 && !locError && (
              <div className="flex flex-col items-center justify-center h-40 text-gray-600">
                <p className="text-sm">No incidents found.</p>
                {activeTab === 'nearby' && <p className="text-xs mt-1">Try increasing the radius.</p>}
              </div>
            )}

            {/* List Items */}
            {incidents.map((inc, index) => {
              const isLast = index === incidents.length - 1;
              return (
                <div 
                  key={inc.id} 
                  ref={isLast ? lastElementRef : null}
                  onClick={() => setActiveId(inc.id)}
                  className={`p-4 border-b border-gray-800 cursor-pointer transition-all hover:bg-gray-800 
                    ${activeId === inc.id ? 'bg-gray-800 border-l-4 border-blue-500 pl-3' : 'border-l-4 border-transparent pl-4'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-sm text-gray-200 truncate pr-2">
                      {inc.username || 'Anonymous User'}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      inc.status === 'ACTIVE' ? 'bg-red-900/50 text-red-200 border border-red-900 animate-pulse' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {inc.status}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                    <span>{new Date(inc.created_at).toLocaleString()}</span>
                  </div>

                  {/* Location Info */}
                  {(inc.latitude && inc.longitude) && (
                    <div className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-900/10 w-fit px-2 py-1 rounded border border-blue-900/30">
                      <MapPin size={10} /> 
                      {activeTab === 'nearby' 
                        ? `${Math.round(inc.distance)} km away` 
                        : `${inc.latitude.toFixed(4)}, ${inc.longitude.toFixed(4)}`
                      }
                    </div>
                  )}
                </div>
              );
            })}

            {/* Loading Spinner */}
            {(loading || isLocating) && (
              <div className="p-6 flex flex-col items-center justify-center text-gray-500 gap-2">
                <Loader2 className="animate-spin text-blue-500" size={24} />
                <span className="text-xs">{isLocating ? "Acquiring GPS..." : "Loading Feeds..."}</span>
              </div>
            )}

            {/* End of Feed */}
            {!hasMore && incidents.length > 0 && (
              <div className="p-4 text-center text-[10px] text-gray-700 uppercase tracking-widest">
                End of feed
              </div>
            )}
          </div>
        </div>

        {/* --- RIGHT: PLAYER --- */}
        <div className="flex-1 bg-black flex flex-col justify-center items-center relative hidden md:flex border-l border-gray-900">
          {activeId ? (
            <video ref={videoRef} controls autoPlay className="max-h-full w-full object-contain" />
          ) : (
            <div className="text-gray-800 flex flex-col items-center select-none">
              <Play size={64} strokeWidth={1} />
              <p className="mt-4 text-sm font-medium">Select an incident to view evidence</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// Helper Component for Tabs
function TabButton({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center py-3 text-xs font-medium transition-all duration-200
        ${active ? 'text-blue-500 border-b-2 border-blue-500 bg-gray-900' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900/50'}`}
    >
      <div className={`mb-1 transition-transform ${active ? 'scale-110' : ''}`}>{icon}</div>
      {label}
    </button>
  );
}