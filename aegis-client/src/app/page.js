// app/page.js
import Link from 'next/link';
import { ShieldAlert, Video, Radio, Lock, ChevronRight, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-red-500/30">
      
      {/* --- NAVBAR --- */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-xl tracking-tighter text-white">
            <ShieldAlert className="text-red-600" /> AEGIS
          </div>
          <div className="flex gap-4">
            <Link 
              href="/login" 
              className="px-4 py-2 text-sm font-bold text-slate-300 hover:text-white transition"
            >
              Log In
            </Link>
            <Link 
              href="/login" 
              className="px-4 py-2 text-sm font-bold bg-white text-black rounded-lg hover:bg-slate-200 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <header className="relative pt-20 pb-32 px-6 flex flex-col items-center text-center max-w-4xl mx-auto">
        {/* Background Glow */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-600/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs font-medium text-slate-400 mb-6">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> System Online v2.0
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-6 leading-tight">
          Personal Security <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Decentralized.
          </span>
        </h1>

        <p className="text-lg text-slate-400 mb-10 max-w-2xl leading-relaxed">
          Secure evidence recording, SOS broadcasting, and community-verified safety checks. 
          Your data belongs to you, not the cloud providers.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link 
            href="/login" 
            className="group flex items-center justify-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all hover:scale-105 shadow-lg shadow-red-900/20"
          >
            Launch Console <ArrowRight size={18} className="group-hover:translate-x-1 transition" />
          </Link>
          <Link href="/about">
          <button className="px-8 py-4 bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 font-bold rounded-xl transition">
            How it Works
          </button></Link>
        </div>
      </header>

      {/* --- FEATURES GRID --- */}
      <section className="py-24 bg-slate-900/30 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Video className="text-blue-400" />}
              title="Secure Recording"
              desc="Evidence is chunked, encrypted, and uploaded instantly. Even if your phone is destroyed, the data survives."
            />
            <FeatureCard 
              icon={<Radio className="text-red-400" />}
              title="SOS Broadcast"
              desc="One-tap alerts send your live location and video feed to your trusted contact network immediately."
            />
            <FeatureCard 
              icon={<Lock className="text-purple-400" />}
              title="Consensus Deletion"
              desc="Prevents forced deletion. Files can only be removed if your trusted contacts vote that you are safe."
            />
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-12 text-center text-slate-600 text-sm border-t border-slate-900">
        <p>© 2026 Aegis Security Protocols. All rights reserved.</p>
      </footer>
    </div>
  );
}

// Helper Component for Features
function FeatureCard({ icon, title, desc }) {
  return (
    <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl hover:border-slate-700 transition group">
      <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}