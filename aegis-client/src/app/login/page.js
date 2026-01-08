// app/login/page.js
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AuthForm from '@/components/AuthForm'; 
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is already logged in, kick them to dashboard
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-4">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-red-600 rounded-full animate-spin"></div>
        <p className="font-mono text-xs tracking-widest uppercase animate-pulse">Secure Handshake...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[100px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-900/10 blur-[100px] rounded-full" />

      <div className="w-full max-w-md z-10">
        <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition text-sm mb-6">
                <ArrowLeft size={16} /> Back to Home
            </Link>
            <h1 className="text-3xl font-black text-white flex items-center justify-center gap-3">
                <ShieldCheck className="text-blue-500" size={32} />
                Access Console
            </h1>
            <p className="text-slate-500 mt-2">Identify yourself to proceed.</p>
        </div>

        {/* The Auth Form Container */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-6 rounded-2xl shadow-2xl">
           {/* Ensure your AuthForm is styled to look good on dark mode, 
               or wrap it in a div with className="text-white" if needed */}
           <AuthForm />
        </div>
      </div>
    </main>
  );
}