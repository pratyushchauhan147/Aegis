'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ContactManager from './ContactManager';
import Recorder from './Recorder';
import { AlertTriangle, LogOut, ShieldAlert, PlayCircle, Vote, Menu, X, ChevronLeft } from 'lucide-react';

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [dangerId, setDangerId] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // 🛡️ Protect Route
  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  if (loading || !user) return <div className="h-screen flex items-center justify-center bg-black text-red-500 font-mono">SECURE_LOADING...</div>;

  return (
    <div className="h-screen bg-black flex flex-col md:flex-row overflow-hidden font-sans text-slate-200">
      
      {/* --- MOBILE HEADER (Sticky Top) --- */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-30">
        <div className="flex items-center gap-2 text-red-500 font-black tracking-tighter text-xl">
          <ShieldAlert size={22}/> AEGIS
        </div>
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-2 bg-slate-800 rounded-full text-slate-300 hover:text-white transition-colors"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* --- MOBILE OVERLAY (Blackout background) --- */}
      <div 
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${
          isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* --- SIDEBAR (The Sliding Drawer) --- */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[300px] sm:w-[350px] bg-slate-950 border-r border-slate-800 
        flex flex-col transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
        md:relative md:translate-x-0 md:z-auto
        ${isSidebarOpen ? 'translate-x-0 shadow-[20px_0_50px_rgba(0,0,0,0.8)]' : '-translate-x-full'}
      `}>
        
        {/* Sidebar Top: Branding & Close Button */}
        <div className="p-6 border-b border-slate-900 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-red-600 tracking-tighter flex items-center gap-2">
              <ShieldAlert size={20}/> AEGIS
            </h1>
            <p className="text-[10px] text-slate-600 font-mono mt-0.5 truncate max-w-[150px] uppercase">
              {user.email}
            </p>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 bg-slate-900 rounded-full text-slate-400 hover:text-white border border-slate-800"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* Action Grid */}
        <div className="p-4 grid grid-cols-2 gap-3">
          <Link href="/feed" className="flex flex-col items-center gap-2 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-blue-500/50 transition-all">
            <PlayCircle size={20} className="text-blue-500" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Library</span>
          </Link>
          <Link href="/vote" className="flex flex-col items-center gap-2 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-purple-500/50 transition-all">
            <Vote size={20} className="text-purple-500" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Validate</span>
          </Link>
        </div>

        {/* Main List Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <ContactManager />
        </div>

        {/* Bottom Panel: Logout & Danger Zone */}
        <div className="p-4 bg-slate-950 border-t border-slate-900">
           <div className="mb-4">
              <label className="text-[10px] font-black text-red-900 uppercase tracking-[0.2em] mb-2 block">Danger Zone</label>
              <div className="flex gap-2">
                <input 
                  placeholder="ID"
                  className="flex-1 bg-black border border-red-950 p-2 rounded-lg text-xs text-red-200 focus:outline-none focus:border-red-600"
                  onChange={e => setDangerId(e.target.value)}
                />
                <button className="bg-red-600/10 border border-red-600/30 text-red-500 p-2 rounded-lg hover:bg-red-600 hover:text-white transition-all">
                  <AlertTriangle size={18} />
                </button>
              </div>
           </div>
           
           <button 
             onClick={logout}
             className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
           >
             <LogOut size={16} /> Disconnect System
           </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT (The Recorder) --- */}
      <main className="flex-1 relative flex items-center justify-center bg-black p-4 md:p-8 lg:p-16">
        {/* Background Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-red-600/10 blur-[120px] pointer-events-none rounded-full" />
        
        <div className="w-full max-w-[420px] aspect-[9/16] md:aspect-[3/4] lg:aspect-[9/16] z-10">
          <Recorder />
        </div>
      </main>

    </div>
  );
}