'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ContactManager from '@/components/ContactManager';
import Recorder from '@/components/Recorder';
import { AlertTriangle, LogOut, ShieldAlert, PlayCircle, Vote, Menu, ChevronLeft } from 'lucide-react';

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [dangerId, setDangerId] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // 🛡️ Redirect to login if token is missing/expired
  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  if (loading || !user) return (
    <div className="h-screen flex items-center justify-center bg-slate-950 text-red-500 font-mono italic animate-pulse">
      SYSTEM_AUTHENTICATING...
    </div>
  );

  return (
    <div className="h-screen bg-black flex flex-col md:flex-row overflow-hidden font-sans text-slate-200 relative">
      
      {/* --- MOBILE TOP HEADER --- */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-20">
        <div className="flex items-center gap-2 text-red-500 font-black tracking-tighter text-xl">
          <ShieldAlert size={22}/> AEGIS
        </div>
        <button 
          onClick={() => setSidebarOpen(true)} 
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-300 active:scale-95 transition-all shadow-lg border border-slate-700"
        >
          <Menu size={18}/> Menu
        </button>
      </div>

      {/* --- MOBILE OVERLAY --- (Closes sidebar when clicking on the blurred area) */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300 ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* --- SLIDING SIDEBAR --- */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
        w-[85%] sm:w-[350px] md:relative md:translate-x-0 md:w-[350px] lg:w-[400px]
        bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* Sidebar Header with Back Button */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-red-500 tracking-tighter flex items-center gap-2">
              <ShieldAlert /> AEGIS
            </h1>
            <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-widest truncate max-w-[140px]">
              {user.email}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* BACK BUTTON (Only visible on mobile) */}
            <button 
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-2.5 bg-slate-800 text-white rounded-full border border-slate-700 active:scale-90 transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <button onClick={logout} className="p-2 text-slate-500 hover:text-red-400 transition">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Navigation Grid */}
        <div className="p-4 grid grid-cols-2 gap-3 bg-slate-950/30">
          <Link href="/feed" className="flex flex-col items-center gap-2 p-4 bg-slate-800/40 border border-slate-700 rounded-2xl hover:border-blue-500/50 transition group">
            <PlayCircle size={22} className="text-blue-400 group-hover:scale-110 transition" />
            <span className="text-[10px] font-black uppercase tracking-widest">Playback</span>
          </Link>
          <Link href="/vote" className="flex flex-col items-center gap-2 p-4 bg-slate-800/40 border border-slate-700 rounded-2xl hover:border-purple-500/50 transition group">
            <Vote size={22} className="text-purple-400 group-hover:scale-110 transition" />
            <span className="text-[10px] font-black uppercase tracking-widest">Voting</span>
          </Link>
        </div>

        {/* Contacts Section */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <ContactManager />
        </div>

        {/* Danger Zone */}
        
      </aside>

      {/* --- MAIN RECORDER VIEWPORT --- */}
      <main className="flex-1 relative flex items-center justify-center p-4 md:p-12 bg-slate-950">
        {/* Glow effect for background depth */}
        <div className="absolute w-64 h-64 bg-red-600/5 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="w-full max-w-[450px] aspect-[9/16] md:aspect-[3/4] lg:aspect-[9/16] max-h-[85vh] z-10">
          <Recorder />
        </div>
      </main>
    </div>
  );
}