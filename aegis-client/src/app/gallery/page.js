'use client';
import { useEffect, useState, useRef } from 'react';
import Hls from 'hls.js';
import Link from 'next/link';
import { Trash2, Play, ArrowLeft, User, Globe, AlertTriangle, Loader2 } from 'lucide-react';

export default function IncidentFeed() {
  const [activeTab, setActiveTab] = useState('mine');
  const [incidents, setIncidents] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // 1. Fetch List
  const fetchIncidents = async () => {
    setLoading(true);
    // Optimistic clear to show loading state
    setIncidents([]); 
    try {
      // Toggles between your 'mine' and 'list' endpoints
      const endpoint = activeTab === 'mine' ? '/incident/mine' : '/incident/list';
      const res = await fetch(`${API_URL}${endpoint}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setIncidents(data.incidents || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    setActiveId(null);
  }, [activeTab]);

  // 2. PLAYER LOGIC (Stable Checkpoint Version)
  useEffect(() => {
    // If no video selected or no video tag found, stop.
    if (!activeId || !videoRef.current) return;

    const src = `${API_URL}/playback/${activeId}/index.m3u8`;

    // A. Cleanup previous HLS if it exists
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // B. Initialize HLS
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        manifestLoadingMaxRetry: 3
      });
      
      hls.loadSource(src);
      hls.attachMedia(videoRef.current);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (videoRef.current) {
          videoRef.current.muted = true; // Browser requirement for autoplay
          videoRef.current.play().catch(e => console.log("Auto-play blocked", e));
        }
      });
      
      hlsRef.current = hls;
    } 
    // C. Native Support (Safari/iOS)
    else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = src;
      videoRef.current.addEventListener('loadedmetadata', () => {
        videoRef.current.play();
      });
    }

    // D. Cleanup
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeId]);

  // 3. DELETE LOGIC (Connects to votingRoutes)
  const handleDelete = async (e, id) => {
    if(e) e.stopPropagation(); // Prevent opening the video when clicking delete
    
    const reason = prompt("⚠️ SECURITY CHECK\n\nYour Trusted Contacts will be asked to vote on this deletion to ensure you are safe.\n\nEnter reason:");
    if (!reason) return;

    try {
      const res = await fetch(`${API_URL}/voting/request-deletion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incident_id: id, reason }),
        credentials: 'include'
      });
      
      const data = await res.json();
      
      if (res.ok) {
        alert("Deletion Request Sent! Status: Pending Vote");
        fetchIncidents(); // Refresh list to show status change
        if(activeId === id) setActiveId(null);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) { alert("Network Error"); }
  };

  const activeIncident = incidents.find(i => i.id === activeId);

  // Helper to determine if we can show the delete button
  const isDeletable = (status) => activeTab === 'mine' && status !== 'SOFT_DELETED' && status !== 'PENDING_DELETION';

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white font-sans">
      
      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-gray-900 flex justify-between items-center shadow-md">
        <h1 className="font-bold text-xl text-blue-500 flex items-center gap-2">Evidence Locker</h1>
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-lg transition">
          <ArrowLeft size={16} /> Dashboard
        </Link>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar List */}
        <div className="w-full md:w-96 border-r border-gray-800 bg-gray-900/50 flex flex-col z-20">
          <div className="grid grid-cols-2 p-2 gap-2 border-b border-gray-800">
            <button 
              onClick={() => setActiveTab('mine')} 
              className={`py-2 text-sm font-bold rounded transition ${activeTab === 'mine' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              My Evidence
            </button>
            <button 
              onClick={() => setActiveTab('public')} 
              className={`py-2 text-sm font-bold rounded transition ${activeTab === 'public' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              Public Feed
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? <div className="p-8 text-center text-xs animate-pulse text-gray-500">Decrypting records...</div> : 
             incidents.length === 0 ? <div className="p-8 text-center text-xs text-gray-600">No recordings found.</div> :
             incidents.map(inc => (
              <div 
                key={inc.id} 
                onClick={() => setActiveId(inc.id)}
                className={`relative group p-4 border-b border-gray-800 cursor-pointer transition-all ${activeId === inc.id ? 'bg-gray-800 border-l-4 border-blue-500' : 'hover:bg-gray-900'}`}
              >
                <div className="flex justify-between mb-1 pr-6">
                  <span className="text-[10px] text-gray-400 font-bold">{new Date(inc.created_at).toLocaleDateString()}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                    inc.status === 'ACTIVE' ? 'bg-red-900 text-red-200 animate-pulse' : 
                    inc.status === 'PENDING_DELETION' ? 'bg-yellow-900 text-yellow-200' : 'bg-gray-700 text-gray-400'
                  }`}>
                    {inc.status === 'PENDING_DELETION' ? 'In Review' : inc.status}
                  </span>
                </div>
                <div className="text-xs font-mono text-gray-500 truncate w-3/4">ID: {inc.id}</div>

                {/* 🗑️ NEW SIDEBAR DELETE BUTTON */}
                {isDeletable(inc.status) && (
                  <button 
                    onClick={(e) => handleDelete(e, inc.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-600 hover:text-red-500 hover:bg-red-900/20 rounded-full transition opacity-0 group-hover:opacity-100"
                    title="Request Deletion"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Player View */}
        <div className="flex-1 bg-black flex flex-col relative">
          {activeId ? (
            <>
              <div className="flex-1 flex items-center justify-center bg-black">
                 {/* FORCE RESET using key={activeId} */}
                 <video 
                   key={activeId} 
                   ref={videoRef} 
                   controls 
                   autoPlay 
                   playsInline
                   muted 
                   className="w-full h-full object-contain" 
                 />
              </div>
              
              {activeIncident && (
                <div className="p-4 bg-gray-900 border-t border-gray-800 flex justify-between items-center">
                   <div>
                      <h2 className="text-sm font-bold text-white">Incident: {activeId.slice(0,8)}...</h2>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">{activeIncident.status}</p>
                   </div>
                   
                   {/* Main Footer Delete Button */}
                   {isDeletable(activeIncident.status) && (
                      <button onClick={(e) => handleDelete(e, activeId)} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded transition">
                        <Trash2 size={14} /> Request Deletion
                      </button>
                   )}

                   {activeIncident.status === 'PENDING_DELETION' && (
                     <div className="flex items-center gap-2 text-yellow-500 text-xs font-bold bg-yellow-900/20 px-3 py-2 rounded border border-yellow-900/50">
                        <AlertTriangle size={14} /> Deletion Pending Vote
                     </div>
                   )}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-700 italic">
               <Play size={48} className="mb-4 opacity-20" />
               <p>Select recording</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}