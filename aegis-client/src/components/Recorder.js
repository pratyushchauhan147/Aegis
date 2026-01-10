'use client';

import { useState, useRef, useEffect } from 'react';
// 1. Import SwitchCamera icon
import { Camera, AlertCircle, StopCircle, PlayCircle, MapPin, SwitchCamera } from 'lucide-react';

export default function Recorder() {
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [incidentId, setIncidentId] = useState(null);
  const [logs, setLogs] = useState([]);

  // 2. New State for Camera Mode
  const [facingMode, setFacingMode] = useState('environment'); // 'user' (front) or 'environment' (back)

  const videoRef = useRef(null);

  // Refs for Async Loop State
  const isRecordingRef = useRef(false);
  const sequenceRef = useRef(0);
  const streamRef = useRef(null);
  // Keep track of active incident ID for the loop
  const activeIncidentIdRef = useRef(null); 

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const addLog = (msg) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 4)]);

  // 3. Updated Initialize Camera (Depends on facingMode)
  useEffect(() => {
    async function init() {
      // Stop previous tracks if switching cameras
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      try {
        const s = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: facingMode }, // Use dynamic mode
          audio: true 
        });
        
        setStream(s);
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        addLog(`Camera: ${facingMode === 'user' ? 'Front' : 'Back'}`);
      } catch (e) {
        addLog('❌ Camera Access Denied');
      }
    }
    
    init();

    // Cleanup function
    return () => { 
        if(streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); 
    };
  }, [facingMode]); // Re-run when facingMode changes

  // 4. Toggle Function
  const toggleCamera = () => {
    if (isRecording) return; // Prevent switching while recording
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // 🆕 2. LIVE TRACKING LOOP (Unchanged logic, just ensure refs are used)
  useEffect(() => {
    let intervalId = null;

    if (isRecording) {
      intervalId = setInterval(() => {
        if (!navigator.geolocation || !activeIncidentIdRef.current) return;

        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude, speed } = pos.coords;
            try {
              await fetch(`${API_URL}/incident/ping`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  incident_id: activeIncidentIdRef.current,
                  lat: latitude,
                  lng: longitude,
                  speed: speed || 0
                }),
                credentials: 'include'
              });
            } catch (e) {
              console.error("Tracking Ping Failed", e);
            }
          },
          (err) => console.warn("GPS Update Failed:", err),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }, 10000); 
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRecording]);

  // 3. HELPER: Get Initial Location
  const getLocation = async () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        addLog('❌ GPS not supported');
        resolve({ lat: null, lng: null });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          console.warn("GPS Error", err);
          addLog("⚠️ GPS Signal Weak");
          resolve({ lat: null, lng: null });
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  };

  // 4. Start Incident
  async function startIncident() {
    try {
      addLog('📍 Acquiring GPS...');
      const { lat, lng } = await getLocation();
      if(lat) addLog(`📍 Location Found`);

      const res = await fetch(`${API_URL}/incident/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
        credentials: 'include'
      });
      const data = await res.json();
      
      if (data.success) {
        setIncidentId(data.incident_id);
        activeIncidentIdRef.current = data.incident_id; // Set Ref for loop
        setIsRecording(true);
        isRecordingRef.current = true;
        sequenceRef.current = 0;
        
        addLog(`Started: ${data.incident_id.substring(0,8)}...`);
        runRecordingLoop(data.incident_id);
      }
    } catch (e) {
      addLog("❌ Failed to start: " + e.message);
    }
  }

  // 5. Recording Loop 
  const runRecordingLoop = async (activeIncidentId) => {
    if (!isRecordingRef.current || !streamRef.current) return;

    // Handle mimeType support
    const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9') 
      ? 'video/webm; codecs=vp9' 
      : 'video/webm'; 

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    const chunks = [];

    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size > 0) uploadChunk(blob, activeIncidentId);
    };

    recorder.start();
    await new Promise(r => setTimeout(r, 2000));
    if (recorder.state !== 'inactive') recorder.stop();
    if (isRecordingRef.current) runRecordingLoop(activeIncidentId);
  };

  // 6. Upload Chunk
  async function uploadChunk(blob, id) {
    const seq = sequenceRef.current++;
    const fd = new FormData();
    fd.append('incident_id', id);
    fd.append('sequence_no', seq.toString());
    fd.append('duration', '2.0');
    fd.append('file', blob, `chunk_${seq}.webm`);

    try {
      const res = await fetch(`${API_URL}/ingest/chunk`, {
        method: 'POST', body: fd, credentials: 'include'
      });
      if(res.ok) addLog(`✅ Seq ${seq} Safe`);
      else addLog(`❌ Upload Failed`);
    } catch (e) { addLog(`❌ Network Error`); }
  }

  // 7. Stop Incident
  async function stopIncident() {
    setIsRecording(false);
    isRecordingRef.current = false;
    
    if (incidentId) {
      addLog('Stopping...');
      await fetch(`${API_URL}/incident/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incident_id: incidentId }),
        credentials: 'include'
      });
      addLog('🛑 Incident Closed');
    }
    setIncidentId(null);
    activeIncidentIdRef.current = null;
  }

  return (
    <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-gray-800">
      
      {/* Video Viewport */}
      <div className="relative flex-1 bg-black">
        {/* 5. Mirror effect for front camera */}
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline 
          className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform scale-x-[-1]' : ''}`} 
        />
        
        {/* Status Overlay */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
          <div className="flex gap-2">
            <span className={`px-2 py-1 rounded text-xs font-bold tracking-wider ${isRecording ? 'bg-red-600 animate-pulse text-white' : 'bg-gray-800/80 text-gray-400 backdrop-blur'}`}>
              {isRecording ? 'LIVE REC' : 'STANDBY'}
            </span>
            {incidentId && (
              <span className="px-2 py-1 bg-black/60 backdrop-blur text-white text-xs font-mono rounded border border-white/10">
                ID: {incidentId.slice(0,8)}
              </span>
            )}
          </div>

          {/* 6. Switch Camera Button */}
          {!isRecording && (
            <button 
              onClick={toggleCamera}
              className="bg-black/40 backdrop-blur p-2 rounded-full text-white/70 hover:text-white hover:bg-black/60 transition active:scale-95"
            >
              <SwitchCamera size={20} />
            </button>
          )}
        </div>

        {/* Logs Overlay */}
        <div className="absolute bottom-4 left-4 p-2 bg-black/50 backdrop-blur rounded text-[10px] font-mono text-green-400 max-w-[200px]">
           {logs[0]}
        </div>
      </div>

      {/* Main Control Bar */}
      <div className="h-28 bg-gray-900 border-t border-gray-800 flex items-center justify-center relative z-20">
         <button
          onClick={isRecording ? stopIncident : startIncident}
          className={`
            w-16 h-16 rounded-full border-4 shadow-lg flex items-center justify-center transition-all duration-300
            ${isRecording
              ? 'bg-red-600 border-red-800 scale-100'
              : 'bg-white border-gray-300 hover:scale-105 active:scale-95'
            }
          `}
        >
          {isRecording ? (
            <div className="w-6 h-6 bg-white rounded-sm" />
          ) : (
            <div className="w-14 h-14 bg-red-600 rounded-full border-2 border-white" />
          )}
        </button>
        
        <p className="absolute bottom-2 text-[10px] text-gray-500 font-medium uppercase tracking-widest">
          {isRecording ? 'Tap to Stop' : 'Tap to Record'}
        </p>
      </div>
    </div>
  );
}