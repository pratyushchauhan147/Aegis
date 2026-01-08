'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, ShieldCheck, CheckCircle, XCircle, List, Loader2 } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-50 p-4 flex justify-center">
      <div className="w-full max-w-lg">
        
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
             <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
               <ShieldCheck className="text-blue-600" /> Safety Consensus
             </h1>
             <p className="text-slate-500 text-sm">Review deletion requests from your contacts</p>
          </div>
          <Link href="/dashboard" className="text-sm font-bold text-blue-600 hover:underline">
            Dashboard
          </Link>
        </div>

        {/* LIST VIEW */}
        {!selectedReq && (
          <div className="space-y-4">
            {loading ? (
               <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-400"/></div>
            ) : requests.length === 0 ? (
               <div className="text-center p-12 bg-white rounded-xl shadow-sm border border-slate-200">
                  <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                  <h3 className="font-bold text-slate-700">All Clear</h3>
                  <p className="text-slate-400 text-sm">No pending safety checks.</p>
               </div>
            ) : (
              requests.map(req => (
                <div 
                  key={req.request_id}
                  onClick={() => setSelectedReq(req)}
                  className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-blue-400 transition group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-800">{req.owner_name}</h3>
                      <p className="text-xs text-slate-500">Requested {new Date(req.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="bg-red-50 text-red-600 text-xs font-bold px-2 py-1 rounded border border-red-100">
                      ACTION REQUIRED
                    </span>
                  </div>
                  
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 italic border-l-4 border-slate-300">
                    "{req.reason}"
                  </div>
                  
                  <div className="mt-3 text-blue-600 text-xs font-bold flex items-center gap-1 opacity-60 group-hover:opacity-100">
                    Review Request &rarr;
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* DETAIL / VOTE VIEW */}
        {selectedReq && (
          <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-4 fade-in">
             <div className="bg-slate-900 p-6 text-white">
                <button onClick={() => setSelectedReq(null)} className="text-xs text-slate-400 hover:text-white mb-4">
                  &larr; Back to List
                </button>
                <h2 className="text-xl font-bold">Verify Safety</h2>
                <p className="opacity-80 text-sm mt-1">
                  Is <strong>{selectedReq.owner_name}</strong> safe to delete this evidence?
                </p>
             </div>

             <div className="p-6">
                <div className="mb-6">
                  <label className="text-xs font-bold text-slate-400 uppercase">Stated Reason</label>
                  <p className="text-lg font-medium text-slate-800 mt-1">"{selectedReq.reason}"</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => castVote('KEEP')}
                    className="p-4 bg-green-50 border-2 border-green-200 rounded-xl hover:bg-green-100 hover:border-green-300 transition text-left group"
                  >
                    <div className="flex items-center gap-2 font-bold text-green-700 mb-1 group-hover:scale-105 transition-transform">
                       <ShieldCheck /> KEEP FILE
                    </div>
                    <p className="text-xs text-green-600 leading-tight">
                       Reject deletion. I suspect they are being forced or are unsafe.
                    </p>
                  </button>

                  <button 
                    onClick={() => castVote('DELETE')}
                    className="p-4 bg-red-50 border-2 border-red-200 rounded-xl hover:bg-red-100 hover:border-red-300 transition text-left group"
                  >
                    <div className="flex items-center gap-2 font-bold text-red-700 mb-1 group-hover:scale-105 transition-transform">
                       <XCircle /> DELETE
                    </div>
                    <p className="text-xs text-red-600 leading-tight">
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