'use client';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

// 🛑 IMPORTANT: Dynamically import the map component to avoid "window is not defined" error
const LiveTracker = dynamic(() => import('@/components/LiveTracker'), {
  ssr: false, 
  loading: () => <div className="h-screen bg-gray-950 flex items-center justify-center text-blue-500">Loading Map Engine...</div>
});

export default function TrackingPage() {
  const { id } = useParams();

  return (
    <div className="h-screen w-full flex flex-col bg-gray-950">
      {/* Header */}
      <div className="h-14 border-b border-gray-800 bg-black flex items-center px-4 justify-between">
        <h1 className="text-white font-bold text-lg tracking-tight">
          <span className="text-blue-600">AEGIS</span> TACTICAL MAP
        </h1>
        <div className="text-xs text-gray-500 font-mono">INCIDENT: {id.slice(0,8)}</div>
      </div>

      {/* Map Viewport */}
      <div className="flex-1 relative">
        <LiveTracker incidentId={id} />
      </div>
    </div>
  );
}