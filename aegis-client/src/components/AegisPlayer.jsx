'use client';
import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';

export default function AegisPlayer({ incidentId, apiUrl }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [manifestUrl, setManifestUrl] = useState('');

  useEffect(() => {
    const video = videoRef.current;
    if (!incidentId || !video) return;

    const src = `${apiUrl}/playback/${incidentId}/index.m3u8`;
    setManifestUrl(src);
    setLoading(true);
    setError(null);

    const initPlayer = () => {
      if (hlsRef.current) hlsRef.current.destroy();

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          // Force credential handling for S3
          xhrSetup: (xhr) => { xhr.withCredentials = false; }
        });

        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false);
          video.play().catch(() => {
            video.muted = true;
            video.play();
          });
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error("HLS_DEBUG_LOG:", data);
          if (data.fatal) {
            setError(`Failed at: ${data.details}. Possible CORS or 404 issue.`);
            setLoading(false);
          }
        });

        hlsRef.current = hls;
      }
    };

    initPlayer();
    return () => { if (hlsRef.current) hlsRef.current.destroy(); };
  }, [incidentId, apiUrl]);

  return (
    <div className="w-full h-full bg-black flex flex-col items-center justify-center relative">
      {loading && !error && <Loader2 className="animate-spin text-blue-500" size={32} />}
      
      {error && (
        <div className="z-20 p-6 text-center">
          <AlertCircle className="text-red-500 mx-auto mb-2" size={32} />
          <p className="text-xs text-gray-400 mb-4">{error}</p>
          <a 
            href={manifestUrl} 
            target="_blank" 
            className="flex items-center gap-2 text-[10px] bg-blue-600 px-3 py-2 rounded font-bold hover:bg-blue-500 transition-colors"
          >
            <ExternalLink size={12} /> TEST DIRECT MANIFEST LINK
          </a>
          <p className="text-[9px] text-gray-600 mt-2 uppercase tracking-widest">
            If the link above shows "Access Denied", your S3 Permissions are wrong.
          </p>
        </div>
      )}

      <video ref={videoRef} controls playsInline className="w-full h-full object-contain" />
    </div>
  );
}