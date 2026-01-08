'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lock, Mail, User, Phone, Key, AlertCircle } from 'lucide-react';

export default function AuthForm() {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    name: '', 
    phone: '' 
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    let result;
    if (isLogin) {
      result = await login(formData.email, formData.password);
    } else {
      result = await signup(formData);
    }

    setLoading(false);
    if (!result.success) {
      setErrorMsg(result.error);
    }
  }

  return (
    <div className="w-full">
      
      {/* --- TOGGLE TABS --- */}
      <div className="flex p-1 bg-slate-900/50 rounded-xl mb-6 border border-slate-800">
        <button 
          onClick={() => { setIsLogin(true); setErrorMsg(''); }} 
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            isLogin 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Login
        </button>
        <button 
          onClick={() => { setIsLogin(false); setErrorMsg(''); }} 
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            !isLogin 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Register
        </button>
      </div>

      {/* --- ERROR BANNER --- */}
      {errorMsg && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {/* --- FORM --- */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {!isLogin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-slate-500" size={16} />
                <input 
                  name="name"
                  placeholder="John Doe" 
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                  required 
                  onChange={handleChange} 
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider ml-1">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-slate-500" size={16} />
                <input 
                  name="phone"
                  placeholder="+1..." 
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                  required 
                  onChange={handleChange} 
                />
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider ml-1">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-slate-500" size={16} />
            <input 
              name="email"
              type="email" 
              placeholder="user@example.com" 
              className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
              required 
              onChange={handleChange} 
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider ml-1">Password</label>
          <div className="relative">
            <Key className="absolute left-3 top-3 text-slate-500" size={16} />
            <input 
              name="password"
              type="password" 
              placeholder="••••••••" 
              className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
              required 
              onChange={handleChange} 
            />
          </div>
        </div>
        
        <button 
          disabled={loading} 
          className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20 mt-6 flex justify-center items-center gap-2"
        >
          {loading ? (
             <>
               <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
               Processing...
             </>
          ) : (
             <>
               <Lock size={16} /> 
               {isLogin ? 'Authenticate' : 'Initialize Account'}
             </>
          )}
        </button>
      </form>

      {/* Footer Text */}
      <p className="text-center text-xs text-slate-500 mt-6">
        Protected by 256-bit AES Encryption.
        <br/>Access is monitored.
      </p>
    </div>
  );
}