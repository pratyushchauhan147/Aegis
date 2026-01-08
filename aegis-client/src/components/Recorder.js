'use client';

import { useState, useRef, useEffect } from 'react';

import { Camera, AlertCircle, StopCircle, PlayCircle, MapPin } from 'lucide-react';



export default function Recorder() {

  const [stream, setStream] = useState(null);

  const [isRecording, setIsRecording] = useState(false);

  const [incidentId, setIncidentId] = useState(null);

  const [logs, setLogs] = useState([]);

 

  const videoRef = useRef(null);

 

  // Refs for Async Loop State

  const isRecordingRef = useRef(false);

  const sequenceRef = useRef(0);

  const streamRef = useRef(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';



  const addLog = (msg) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 4)]);



  // 1. Initialize Camera

  useEffect(() => {

    async function init() {

      try {

        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        setStream(s);

        streamRef.current = s;

        if (videoRef.current) videoRef.current.srcObject = s;

        addLog('Ready to record');

      } catch (e) {

        addLog('❌ Camera Access Denied');

      }

    }

    init();

    return () => { if(streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };

  }, []);



  // 🆕 2. LIVE TRACKING LOOP (Runs while recording)

  useEffect(() => {

    let intervalId = null;



    if (isRecording && incidentId) {

      // Start Tracking

      // addLog('📡 Tracking Active'); // Optional: clutter log?

     

      intervalId = setInterval(() => {

        if (!navigator.geolocation) return;



        navigator.geolocation.getCurrentPosition(

          async (pos) => {

            const { latitude, longitude, speed } = pos.coords;

            try {

              // Send "Heartbeat" with location

              await fetch(`${API_URL}/incident/ping`, {

                method: 'POST',

                headers: { 'Content-Type': 'application/json' },

                body: JSON.stringify({

                  incident_id: incidentId,

                  lat: latitude,

                  lng: longitude,

                  speed: speed

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

      }, 10000); // Every 10 Seconds

    }



    // Cleanup when stopping

    return () => {

      if (intervalId) clearInterval(intervalId);

    };

  }, [isRecording, incidentId]);



  // 3. HELPER: Get Initial Location (with 3s timeout)

 const getLocation = async () => {

  return new Promise((resolve) => {

    if (!navigator.geolocation) {

      addLog('❌ GPS not supported');

      resolve({ lat: null, lng: null });

      return;

    }



    // 1. We increase timeout to 10 seconds (10000ms)

    // 2. We handle specific error codes for better debugging

    navigator.geolocation.getCurrentPosition(

      (pos) => {

        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });

      },

      (err) => {

        let errorMsg = "GPS Error";

        switch(err.code) {

          case err.PERMISSION_DENIED:

            errorMsg = "❌ GPS Permission Denied";

            break;

          case err.POSITION_UNAVAILABLE:

            errorMsg = "❌ Signal Unavailable";

            break;

          case err.TIMEOUT:

            errorMsg = "❌ GPS Timeout";

            break;

        }

        console.warn(errorMsg, err);

        addLog(errorMsg); // Show this on your UI logs

        resolve({ lat: null, lng: null });

      },

      // Increase timeout to 10s, but accept lower accuracy if needed to be faster

      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }

    );

  });

};



  // 4. Start Incident

  async function startIncident() {

    try {

      addLog('📍 Acquiring GPS...');

     

      const { lat, lng } = await getLocation();

      if(lat) addLog(`📍 Location Found: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);



      const res = await fetch(`${API_URL}/incident/start`, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ lat, lng }),

        credentials: 'include'

      });

      const data = await res.json();

     

      if (data.success) {

        setIncidentId(data.incident_id);

        setIsRecording(true);

        isRecordingRef.current = true;

        sequenceRef.current = 0;

       

        addLog(`Incident Started: ${data.incident_id.substring(0,8)}...`);

        runRecordingLoop(data.incident_id);

      }

    } catch (e) {

      addLog("❌ Failed to start: " + e.message);

    }

  }



  // 5. Recording Loop (Unchanged)

  const runRecordingLoop = async (activeIncidentId) => {

    if (!isRecordingRef.current || !streamRef.current) return;



    const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm; codecs=vp8' });

    const chunks = [];



    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

   

    recorder.onstop = async () => {

      const blob = new Blob(chunks, { type: 'video/webm' });

      if (blob.size > 0) uploadChunk(blob, activeIncidentId);

    };



    recorder.start();

    await new Promise(r => setTimeout(r, 2000));

    if (recorder.state !== 'inactive') recorder.stop();

    if (isRecordingRef.current) runRecordingLoop(activeIncidentId);

  };



  // 6. Upload Chunk (Unchanged)

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



  // 7. Stop Incident (Unchanged)

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

  }



  return (

    <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-gray-800">

     

      {/* Video Viewport */}

      <div className="relative flex-1 bg-black">

        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />

       

        {/* Status Overlay */}

        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">

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

          <div className="text-white/50 text-xs">

             <Camera size={16} />

          </div>

        </div>



        {/* Logs Overlay */}

        <div className="absolute bottom-4 left-4 p-2 bg-black/50 backdrop-blur rounded text-[10px] font-mono text-green-400 max-w-[200px]">

           {logs[0]}

        </div>

      </div>



      {/* Main Control Bar */}

      <div className="h-28 bg-gray-900 border-t border-gray-800 flex items-center justify-center relative">

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

