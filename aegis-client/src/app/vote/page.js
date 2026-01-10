'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, ShieldCheck, CheckCircle, XCircle, List, Loader2, ArrowLeft } from 'lucide-react';

export default function VotePage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [msg, setMsg] = useState(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  // 1. Fetch My Pending Tasks
  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/voting/pending`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setRequests(data.requests || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  // 2. Cast Vote Logic
  const castVote = async (choice) => {
    if(!selectedReq) return;
    
    // Optimistic UI update
    const previousReqs = [...requests];
    setRequests(requests.filter(r => r.request_id !== selectedReq.request_id));
    setSelectedReq(null); // Close modal

    try {
      const res = await fetch(`${API_URL}/voting/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: selectedReq.request_id, choice }),
        credentials: 'include'
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if(data.outcome === 'BLOCKED_SAFE') alert("⚠️ You voted KEEP. The file has been locked for safety.");
        else alert("Vote Cast Successfully.");
      } else {
        // Revert on error
        setRequests(previousReqs);
        alert(data.error);
      }
    } catch (e) {
      setRequests(previousReqs);
      alert("Network Error");
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 flex justify-center text-gray-200 font-sans">
      <div className="w-full max-w-lg">
        
        {/* Header */}
        <div className="mb-6 flex justify-between items-center border-b border-gray-800 pb-4">
          <div>
             <h1 className="text-xl font-bold text-white flex items-center gap-2">
               <ShieldCheck className="text-blue-500" /> Safety Consensus
             </h1>
             <p className="text-gray-500 text-xs mt-1">Review deletion requests from your contacts</p>
          </div>
          <Link href="/dashboard" className="text-xs font-bold text-gray-400 hover:text-white flex items-center gap-1 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-800 transition">
            <ArrowLeft size={14} /> Dashboard
          </Link>
        </div>

        {/* LIST VIEW */}
        {!selectedReq && (
          <div className="space-y-4">
            {loading ? (
               <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500"/></div>
            ) : requests.length === 0 ? (
               <div className="text-center p-12 bg-gray-900/50 rounded-xl border border-gray-800 dashed">
                  <CheckCircle size={48} className="mx-auto text-green-500/50 mb-4" />
                  <h3 className="font-bold text-gray-300">All Clear</h3>
                  <p className="text-gray-600 text-sm">No pending safety checks.</p>
               </div>
            ) : (
              requests.map(req => (
                <div 
                  key={req.request_id}
                  onClick={() => setSelectedReq(req)}
                  className="bg-gray-900 p-4 rounded-xl border border-gray-800 cursor-pointer hover:border-blue-500/50 hover:bg-gray-800 transition group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-white text-lg">{req.owner_name}</h3>
                      <p className="text-xs text-gray-500">Requested {new Date(req.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="bg-red-900/20 text-red-400 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border border-red-900/30 animate-pulse">
                      Action Required
                    </span>
                  </div>
                  
                  <div className="mt-4 p-3 bg-black/40 rounded-lg text-sm text-gray-400 italic border-l-2 border-gray-700">
                    "{req.reason}"
                  </div>
                  
                  <div className="mt-4 text-blue-400 text-xs font-bold flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
                    Review Request &rarr;
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* DETAIL / VOTE VIEW */}
        {selectedReq && (
          <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 animate-in slide-in-from-bottom-4 fade-in shadow-2xl shadow-black">
             <div className="bg-black/50 p-6 border-b border-gray-800">
                <button onClick={() => setSelectedReq(null)} className="text-xs text-gray-500 hover:text-white mb-4 flex items-center gap-1 transition">
                  <ArrowLeft size={14} /> Back to List
                </button>
                <h2 className="text-xl font-bold text-white">Verify Safety</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Is <strong className="text-blue-400">{selectedReq.owner_name}</strong> safe to delete this evidence?
                </p>
             </div>

             <div className="p-6">
                <div className="mb-8">
                  <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Stated Reason</label>
                  <p className="text-lg font-medium text-white mt-2 p-4 bg-black rounded-lg border border-gray-800">
                    "{selectedReq.reason}"
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* KEEP BUTTON */}
                  <button 
                    onClick={() => castVote('KEEP')}
                    className="p-4 bg-green-900/10 border border-green-900/30 rounded-xl hover:bg-green-900/20 hover:border-green-500/50 transition text-left group"
                  >
                    <div className="flex items-center gap-2 font-bold text-green-400 mb-1 group-hover:scale-105 transition-transform">
                       <ShieldCheck size={20} /> KEEP FILE
                    </div>
                    <p className="text-[10px] text-green-600/80 leading-tight mt-2">
                       Reject deletion. I suspect they are being forced or are unsafe.
                    </p>
                  </button>

                  {/* DELETE BUTTON */}
                  <button 
                    onClick={() => castVote('DELETE')}
                    className="p-4 bg-red-900/10 border border-red-900/30 rounded-xl hover:bg-red-900/20 hover:border-red-500/50 transition text-left group"
                  >
                    <div className="flex items-center gap-2 font-bold text-red-400 mb-1 group-hover:scale-105 transition-transform">
                       <XCircle size={20} /> DELETE
                    </div>
                    <p className="text-[10px] text-red-600/80 leading-tight mt-2">
                       Approve deletion. I have verified they are safe.
                    </p>
                  </button>
                </div>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}