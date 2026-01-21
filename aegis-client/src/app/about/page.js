import Link from 'next/link';
import { 
  Shield, Server, Database, Lock, Users, AlertTriangle, 
  Cpu, Activity, Eye, FileWarning, Network, ArrowRight, 
  Layers, Terminal, CheckCircle
} from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* --- NAVBAR (Consistent) --- */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-black text-xl tracking-tighter text-white hover:opacity-80 transition">
            <Shield className="text-blue-600" /> AEGIS <span className="text-slate-600 font-medium text-xs ml-1">DOCS</span>
          </Link>
          <div className="flex gap-4">
            <Link href="/login" className="px-4 py-2 text-sm font-bold text-slate-300 hover:text-white transition">Log In</Link>
            <Link href="/" className="px-4 py-2 text-sm font-bold bg-white text-black rounded-lg hover:bg-slate-200 transition">
              Back Home
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO HEADER --- */}
      <header className="relative py-24 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none" />
        
        <h1 className="relative z-10 text-4xl md:text-6xl font-black text-white tracking-tight mb-6">
          The Logic Behind <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
            The Shield
          </span>
        </h1>
        <p className="relative z-10 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          A forensic-grade anti-coercion system designed to shift control from the device owner 
          to a distributed network of trust.
        </p>
      </header>

      {/* --- SECTION 1: THE PHILOSOPHY --- */}
      <section className="py-20 bg-slate-900/30 border-y border-slate-800">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-900/20 border border-red-800/50 text-xs font-bold text-red-400 mb-6">
                <AlertTriangle size={14} /> THE CORE PROBLEM
              </div>
              <h2 className="text-3xl font-bold text-white mb-6">Forced Deletion & <br />Loss of Evidence</h2>
              <p className="text-slate-400 mb-4 leading-relaxed">
                In confrontations, perpetrators often force victims to unlock their phones and delete media immediately. 
                Standard cloud backups fail here because the user has full admin rights to delete files instantly.
              </p>
              <ul className="space-y-3 mt-6">
                <li className="flex items-center gap-3 text-slate-300">
                  <FileWarning className="text-slate-500" size={20} /> 
                  <span>User has instant delete permissions.</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <Eye className="text-slate-500" size={20} /> 
                  <span>Aggressor gets visual confirmation of deletion.</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <Network className="text-slate-500" size={20} /> 
                  <span>Evidence lost if phone is destroyed offline.</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-slate-950 border border-slate-800 p-8 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-32 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Lock className="text-blue-500" /> The "Dead Hand" Solution
              </h3>
              <p className="text-slate-400 mb-6">
                Aegis removes the user's ability to comply. By making the user "powerless" to delete footage, 
                we de-escalate the threat of violence used to enforce that deletion.
              </p>
              <div className="space-y-4">
                <div className="p-4 bg-slate-900 rounded-lg border-l-4 border-green-500">
                  <h4 className="font-bold text-white text-sm">Consensus-Based Deletion</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Deletion requires a 60% majority vote from trusted contacts. You literally cannot delete it yourself.
                  </p>
                </div>
                <div className="p-4 bg-slate-900 rounded-lg border-l-4 border-blue-500">
                  <h4 className="font-bold text-white text-sm">Tamper-Proof Ingestion</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Video is uploaded in 2-second chunks. Even if the phone is smashed at 5 seconds, the first 4 seconds are already safe.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION 2: ARCHITECTURE --- */}
      <section className="py-24 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black text-white mb-4">Micro-Monolith Architecture</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            A single deployable unit handling distinct logical domains for speed and reliability. 
            Optimized for high-concurrency ingestion and forensic integrity.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Pipeline 1 */}
          <div className="group p-6 bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 rounded-xl transition-all">
            <div className="w-12 h-12 bg-blue-900/20 rounded-lg flex items-center justify-center mb-6 text-blue-400 group-hover:scale-110 transition">
              <Activity />
            </div>
            <h3 className="text-lg font-bold text-white mb-3">1. Ingestion Pipeline</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Write-heavy optimization. Captures video buffer every 2 seconds, wraps in FormData, and streams to Fastify API Gateway.
            </p>
            <div className="text-xs font-mono text-slate-500 bg-black/50 p-2 rounded border border-slate-800">
              Client &rarr; API &rarr; Worker &rarr; Disk
            </div>
          </div>

          {/* Pipeline 2 */}
          <div className="group p-6 bg-slate-900/50 border border-slate-800 hover:border-purple-500/50 rounded-xl transition-all">
            <div className="w-12 h-12 bg-purple-900/20 rounded-lg flex items-center justify-center mb-6 text-purple-400 group-hover:scale-110 transition">
              <Users />
            </div>
            <h3 className="text-lg font-bold text-white mb-3">2. Consensus Engine</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Logic-heavy security brain. Triggers async emails via Nodemailer, tracks voting ratios in PostgreSQL, and resolves status.
            </p>
            <div className="text-xs font-mono text-slate-500 bg-black/50 p-2 rounded border border-slate-800">
              Trigger &rarr; Notify &rarr; Vote &rarr; Resolve
            </div>
          </div>

          {/* Pipeline 3 */}
          <div className="group p-6 bg-slate-900/50 border border-slate-800 hover:border-green-500/50 rounded-xl transition-all">
            <div className="w-12 h-12 bg-green-900/20 rounded-lg flex items-center justify-center mb-6 text-green-400 group-hover:scale-110 transition">
              <Layers />
            </div>
            <h3 className="text-lg font-bold text-white mb-3">3. Playback Pipeline</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Read-heavy distribution. Dynamically generates HLS manifests (`.m3u8`) from immutable chunks stored on disk/S3.
            </p>
            <div className="text-xs font-mono text-slate-500 bg-black/50 p-2 rounded border border-slate-800">
              Query &rarr; Manifest &rarr; Stream
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION 3: TECH STACK --- */}
      <section className="py-24 bg-black border-t border-slate-900">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-black text-white mb-12 flex items-center gap-3">
            <Terminal className="text-slate-600" /> Technology Stack
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TechCard 
              title="Next.js 14" 
              desc="App Router for separating server-side secrets from client-side recording logic."
              color="text-white"
            />
            <TechCard 
              title="Fastify" 
              desc="Chosen over Express for 20% lower overhead on high-frequency chunk uploads."
              color="text-white"
            />
            <TechCard 
              title="PostgreSQL" 
              desc="ACID compliance for strict relational integrity between Votes and Incidents."
              color="text-blue-400"
            />
            <TechCard 
              title="FFmpeg + HLS" 
              desc="Transcoding raw WebM chunks into streamable Transport Stream segments."
              color="text-green-400"
            />
            <TechCard 
              title="React-Leaflet" 
              desc="Open-source mapping to visualize GPS breadcrumbs without API billing limits."
              color="text-yellow-400"
            />
            <TechCard 
              title="Nodemailer" 
              desc="Reliable SMTP transport for sending emergency SOS alerts."
              color="text-orange-400"
            />
            <TechCard 
              title="Tailwind CSS" 
              desc="Utility-first styling for rapid 'Stealth Mode' UI iterations."
              color="text-cyan-400"
            />
            <TechCard 
              title="JWT Auth" 
              desc="Stateless authentication allows seamless reconnection during recording."
              color="text-purple-400"
            />
          </div>
        </div>
      </section>

      {/* --- SECTION 4: USER WORKFLOW --- */}
      <section className="py-24 bg-slate-900/30 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-black text-white mb-12 text-center">System Workflow</h2>
          
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
            
            <TimelineItem 
              step="01" 
              title="The Trigger" 
              desc="User feels unsafe and opens the app or a panic link. Camera activates, GPS locks on, and an 'ACTIVE' incident is initialized in the DB."
            />
            <TimelineItem 
              step="02" 
              title="Secure Recording" 
              desc="Video is streamed in 2-second chunks. Trusted contacts receive immediate emails/SMS: 'SOS: Jane is recording'."
            />
            <TimelineItem 
              step="03" 
              title="The Coercion Attempt" 
              desc="Attacker demands deletion. User clicks 'Delete'. The app blocks the action: 'Deletion Request Sent. Awaiting Consensus.'"
            />
            <TimelineItem 
              step="04" 
              title="Distributed Consensus" 
              desc="Contacts receive alerts. They review the footage and vote. If suspicious, they vote KEEP, permanently locking the file."
            />
            
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-12 text-center text-slate-600 text-sm border-t border-slate-900 bg-slate-950">
        <div className="flex justify-center items-center gap-2 mb-4 text-slate-500">
          <Shield size={16} /> Project Aegis Documentation
        </div>
        <p>© 2026 Pratyush Chauhan. System Online.</p>
      </footer>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function TechCard({ title, desc, color }) {
  return (
    <div className="p-5 bg-slate-900 rounded-xl border border-slate-800 hover:bg-slate-800 transition">
      <h4 className={`font-bold text-lg mb-2 ${color}`}>{title}</h4>
      <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function TimelineItem({ step, title, desc }) {
  return (
    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
      {/* Icon */}
      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-700 bg-slate-900 group-hover:bg-blue-600 group-hover:border-blue-500 transition shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_20px_-5px_rgba(59,130,246,0)] group-hover:shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)]">
        <span className="font-bold text-xs text-slate-300 group-hover:text-white">{step}</span>
      </div>
      
      {/* Content */}
      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 bg-slate-950 border border-slate-800 rounded-xl shadow-sm hover:border-slate-600 transition">
        <h3 className="font-bold text-white text-lg mb-2">{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}