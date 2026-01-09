'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import Link from 'next/link';
import { 
  Play, MapPin, Users, User, ArrowLeft, Loader2, AlertCircle, Trash2, Download, Filter, RefreshCw, Map 
} from 'lucide-react';
import { downloadIncidentVideo } from '@/utils/downloader';

export default function IncidentFeed() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('mine');
  const [incidents, setIncidents] = useState([]);
  const [activeId, setActiveId] = useState(null);
  
  // FILTERS
  const [radius, setRadius] = useState(50); 
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination & Loading
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLocating, setIsLocating] = useState(false); 
  const [isDownloading, setIsDownloading] = useState(false); 
  
  // Location
  const [userLocation, setUserLocation] = useState(null);
  const [locError, setLocError] = useState(null);

  // Refs
  const observer = useRef();
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const abortControllerRef = useRef(null); 

  const API_URL = process.env.NEXT_PUBLIC_API_URL // || 'http://localhost:3001';

  // ---------------------------------------------------------
  // 1. DATA FETCHING
  // ---------------------------------------------------------
  const fetchIncidents = async (reset = false) => {
    if (activeTab === 'nearby' && !userLocation) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setLoading(true);

    try {
      const currentPage = reset ? 0 : page;
      const limit = 20; 
      const offset = currentPage * limit;

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
      if (e.name !== 'AbortError') console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // 2. DOWNLOAD LOGIC
  // ---------------------------------------------------------
  const handleDownload = async (incidentId) => {
    if (!confirm("Download this full evidence file? This consumes data.")) return;

    setIsDownloading(true);
    try {
      await downloadIncidentVideo(incidentId, API_URL);
    } catch (err) {
      alert("Download Failed: " + err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  // ---------------------------------------------------------
  // 3. DELETE & HELPERS
  // ---------------------------------------------------------
  const handleDelete = async (e, id) => {
    if(e) e.stopPropagation(); 
    const reason = prompt("⚠️ SECURITY CHECK: Enter reason for deletion.");
    if (!reason) return;

    try {
      const res = await fetch(`${API_URL}/voting/request-deletion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incident_id: id, reason }),
        credentials: 'include'
      });
      if (res.ok) {
        alert("Deletion Request Sent.");
        fetchIncidents(true); 
        if(activeId === id) setActiveId(null);
      } else {
        const d = await res.json();
        alert(`Error: ${d.error}`);
      }
    } catch (err) { alert("Network Error"); }
  };

  const canDelete = (status) => activeTab === 'mine' && status !== 'SOFT_DELETED' && status !== 'PENDING_DELETION';

  // Filter Logic
  const filteredIncidents = incidents.filter(inc => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ACTIVE') return inc.status === 'ACTIVE';
    if (statusFilter === 'ENDED') return inc.status !== 'ACTIVE';
    return true;
  });

  // ---------------------------------------------------------
  // 4. EFFECTS
  // ---------------------------------------------------------
  useEffect(() => {
    setIncidents([]);
    setPage(0);
    setHasMore(true);
    setActiveId(null);
    setLocError(null);

    if (activeTab === 'nearby') {
      if (!userLocation) {
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setIsLocating(false);
          },
          (err) => { setLocError("GPS Access Denied."); setIsLocating(false); }
        );
      } else { fetchIncidents(true); }
    } else { fetchIncidents(true); }
  }, [activeTab, radius]);

  useEffect(() => {
    if (activeTab === 'nearby' && userLocation) fetchIncidents(true);
  }, [userLocation]);

  const lastElementRef = useCallback(node => {
    if (loading || isLocating) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) fetchIncidents(false);
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, isLocating]);

  useEffect(() => {
    if (!activeId || !videoRef.current) return;
    const src = `${API_URL}/playback/${activeId}/index.m3u8`;

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(videoRef.current);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
      });
      hlsRef.current = hls;
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = src;
      videoRef.current.play();
    }
    return () => { if(hlsRef.current) hlsRef.current.destroy(); };
  }, [activeId]);

  const activeIncident = incidents.find(i => i.id === activeId);

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------
  return (
    <div className="h-screen flex flex-col bg-black text-white font-sans overflow-hidden">
      
      {/* HEADER */}
      <div className="p-4 border-b border-gray-800 bg-gray-900 flex justify-between items-center z-10 shadow-md shrink-0">
        <h1 className="font-bold text-lg text-blue-500 tracking-wider flex items-center gap-2">
          AEGIS <span className="text-gray-500 text-xs font-normal">SECURE FEED</span>
        </h1>
        <Link href="/dashboard" className="text-xs text-gray-400 flex items-center gap-1 hover:text-white px-3 py-1 rounded bg-gray-800">
          <ArrowLeft size={14} /> Dashboard
        </Link>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* --- LEFT SIDEBAR (Responsive Logic) --- */}
        <div className={`
            flex flex-col bg-gray-900 border-r border-gray-800 z-20 transition-all duration-300
            ${activeId ? 'hidden md:flex' : 'flex w-full'} 
            md:w-[420px] md:static
        `}>
          {/* Main Tabs */}
          <div className="grid grid-cols-3 bg-black border-b border-gray-800 shrink-0">
            <TabButton icon={<User size={16} />} label="Mine" active={activeTab === 'mine'} onClick={() => setActiveTab('mine')} />
            <TabButton icon={<Users size={16} />} label="Contacts" active={activeTab === 'contacts'} onClick={() => setActiveTab('contacts')} />
            <TabButton icon={<MapPin size={16} />} label="Nearby" active={activeTab === 'nearby'} onClick={() => setActiveTab('nearby')} />
          </div>

          {/* Sub-Filters */}
          <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-gray-900/50 shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <Filter size={12} className="text-gray-500 shrink-0" />
              {['ALL', 'ACTIVE', 'ENDED'].map(status => (
                <button 
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`text-[10px] font-bold px-3 py-1 rounded-full transition-all whitespace-nowrap ${
                    statusFilter === status 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <button 
              onClick={() => fetchIncidents(true)} 
              className="text-gray-500 hover:text-white transition-colors p-1 shrink-0"
              title="Refresh Feed"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Radius Filter */}
          {activeTab === 'nearby' && (
            <div className="p-3 bg-gray-800/50 border-b border-gray-800 flex items-center gap-3 shrink-0">
              <span className="text-xs text-blue-400 font-bold w-16">{radius} km</span>
              <input type="range" min="1" max="500" value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg cursor-pointer accent-blue-500" />
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            {locError && <div className="p-4 m-4 bg-red-900/20 border border-red-900 text-red-400 text-xs rounded flex items-center gap-2"><AlertCircle size={16} /> {locError}</div>}

            {!loading && filteredIncidents.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-gray-600 text-sm">No incidents found.</div>
            )}

            {filteredIncidents.map((inc, index) => (
                <div 
                  key={inc.id} 
                  ref={index === filteredIncidents.length - 1 ? lastElementRef : null}
                  onClick={() => setActiveId(inc.id)}
                  className={`relative group p-4 border-b border-gray-800 cursor-pointer transition-all hover:bg-gray-800 
                    ${activeId === inc.id ? 'bg-gray-800 border-l-4 border-blue-500 pl-3' : 'border-l-4 border-transparent pl-4'}`}
                >
                  <div className="flex justify-between items-start mb-1 pr-6">
                    <span className="font-bold text-sm text-gray-200 truncate">{inc.username || 'Anonymous User'}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      inc.status === 'ACTIVE' ? 'bg-red-900/50 text-red-200 border border-red-900 animate-pulse' : 
                      inc.status === 'PENDING_DELETION' ? 'bg-yellow-900/50 text-yellow-200 border border-yellow-900' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {inc.status === 'PENDING_DELETION' ? 'IN REVIEW' : inc.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">{new Date(inc.created_at).toLocaleString()}</div>
                  {canDelete(inc.status) && (
                    <button onClick={(e) => handleDelete(e, inc.id)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-gray-800 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-900/20 transition opacity-0 group-hover:opacity-100 z-10">
                        <Trash2 size={14} />
                    </button>
                  )}
                </div>
            ))}
            {(loading || isLocating) && <div className="p-6 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={24} /></div>}
          </div>
        </div>

        {/* --- RIGHT: PLAYER (Responsive Logic) --- */}
        <div className={`
            flex-col bg-neutral-950 border-l border-gray-900 relative transition-all duration-300
            ${activeId ? 'flex w-full absolute inset-0 z-30 md:static md:flex-1' : 'hidden md:flex md:flex-1'}
        `}>
          
          {/* Mobile Back Button */}
          {activeId && (
            <div className="md:hidden absolute top-4 left-4 z-50">
                <button 
                    onClick={() => setActiveId(null)}
                    className="flex items-center gap-2 bg-black/50 backdrop-blur px-4 py-2 rounded-full text-white text-xs font-bold border border-white/10 hover:bg-black/80 transition"
                >
                    <ArrowLeft size={14} /> Back to List
                </button>
            </div>
          )}

          {activeId ? (
            <>
              <div className="flex-1 w-full h-full flex items-center justify-center bg-neutral-950 relative overflow-hidden p-0 md:p-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900/40 to-black pointer-events-none"></div>
                <div className="relative w-full h-full max-w-full max-h-full flex items-center justify-center z-10">
                  <video key={activeId} ref={videoRef} controls autoPlay playsInline className="max-w-full max-h-full w-auto h-auto object-contain md:shadow-2xl md:rounded-lg bg-black" />
                </div>
              </div>
              
              <div className="w-full p-4 md:p-6 bg-gray-900 border-t border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center z-20 gap-4 md:gap-0 shrink-0">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">Incident: <span className="font-mono text-blue-400">{activeIncident?.id.slice(0,8)}...</span></h2>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">{activeIncident?.status}</p>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto justify-end">
                  {/* MAP BUTTON */}
                  <Link 
                    href={`/track/${activeId}`} 
                    target="_blank"
                    className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded transition flex-1 md:flex-none"
                  >
                    <Map size={14} /> <span className="md:hidden lg:inline">Map</span>
                  </Link>

                  {/* DOWNLOAD BUTTON */}
                  {activeIncident?.status !== 'ACTIVE' && (
                    <button 
                      onClick={() => handleDownload(activeId)}
                      disabled={isDownloading}
                      className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded transition disabled:opacity-50 flex-1 md:flex-none"
                    >
                      {isDownloading ? <Loader2 size={14} className="animate-spin"/> : <Download size={14} />} 
                      <span className="md:hidden lg:inline">{isDownloading ? 'Saving...' : 'Download'}</span>
                    </button>
                  )}

                  {canDelete(activeIncident?.status) && (
                    <button onClick={(e) => handleDelete(e, activeId)} className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded transition flex-1 md:flex-none">
                      <Trash2 size={14} /> <span className="md:hidden lg:inline">Delete</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-800 select-none">
              <Play size={64} strokeWidth={1} className="opacity-50 mb-4" />
              <p className="text-sm font-medium text-gray-600">Select an incident</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center py-3 text-xs font-medium transition-all duration-200 ${active ? 'text-blue-500 border-b-2 border-blue-500 bg-gray-900' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900/50'}`}>
      <div className={`mb-1 transition-transform ${active ? 'scale-110' : ''}`}>{icon}</div>{label}
    </button>
  );
}