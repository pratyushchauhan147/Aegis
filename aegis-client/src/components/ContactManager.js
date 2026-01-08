'use client';
import React, { useState, useEffect } from 'react';
import { UserPlus, Users, Trash2, ShieldCheck, Search, Mail, Phone, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ContactManager() {
  const [contacts, setContacts] = useState([]);
  const [view, setView] = useState('list'); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // --- LOGIC (UNTOUCHED) ---
  const fetchContacts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/contacts`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setContacts(data.contacts);
    } catch (err) { console.error("Network error:", err); }
  };

  useEffect(() => { fetchContacts(); }, []);

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length < 3) { setSearchResults([]); return; }
    try {
      const res = await fetch(`${API_URL}/api/contacts/search?query=${query}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setSearchResults(data.results || []);
    } catch (err) { console.error("Search error", err); }
  };

  const selectProfile = (profile) => {
    setFormData({ name: profile.username || '', phone: profile.phone_number || '', email: '' });
    setSearchResults([]); 
    setSearchQuery(''); 
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!formData.name || !formData.phone) { setError('Name and Phone are required.'); setLoading(false); return; }
    try {
      const res = await fetch(`${API_URL}/api/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add contact');
      alert(data.is_registered_user ? "Contact added & reciprocal link created!" : "Contact added locally.");
      setFormData({ name: '', phone: '', email: '' });
      setView('list');
      await fetchContacts();
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    try {
      const res = await fetch(`${API_URL}/api/contacts/${id}/delete`, { method: 'POST', credentials: 'include' });
      if (res.ok) setContacts(prev => prev.filter(c => c.id !== id));
      else { const data = await res.json(); alert(data.error || "Failed to delete"); }
    } catch (err) { alert("Network error trying to delete."); }
  };

  // --- UI RENDER (THEMED) ---
  return (
    <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-sm">
      
      {/* 1. COMPACT HEADER & TOGGLE */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Security Network</h2>
          <span className="text-[10px] font-mono text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
            {contacts.length} Active
          </span>
        </div>
        
        <div className="flex p-1 bg-black/40 rounded-xl border border-slate-800">
          <button 
            onClick={() => setView('list')} 
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${view === 'list' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Users size={14} /> List
          </button>
          <button 
            onClick={() => setView('add')} 
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${view === 'add' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <UserPlus size={14} /> Add New
          </button>
        </div>
      </div>

      {/* 2. CONTENT AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        
        {/* ADD VIEW */}
        {view === 'add' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {/* Search Section */}
            <div className="relative">
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Search Database</label>
              <div className="relative group">
                <Search className="absolute left-3 top-3 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input
                  type="text"
                  placeholder="Username or Phone..."
                  className="w-full bg-black/40 border border-slate-800 p-3 pl-10 rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all placeholder:text-slate-700"
                  value={searchQuery}
                  onChange={handleSearch}
                />
              </div>

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <ul className="absolute z-50 w-full bg-slate-800 border border-slate-700 shadow-2xl mt-2 rounded-xl overflow-hidden divide-y divide-slate-700">
                  {searchResults.map(user => (
                    <li 
                      key={user.id} 
                      onClick={() => selectProfile(user)}
                      className="p-3 hover:bg-slate-700 cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-200 text-sm">{user.username}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{user.phone_number}</div>
                      </div>
                      <UserPlus size={14} className="text-blue-400" />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="relative flex items-center opacity-20">
              <div className="flex-grow border-t border-slate-700"></div>
              <span className="mx-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Manual Entry</span>
              <div className="flex-grow border-t border-slate-700"></div>
            </div>

            {/* Manual Form */}
            <form onSubmit={handleAddContact} className="space-y-4">
              {error && <div className="p-3 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl">{error}</div>}
              
              <div className="space-y-3">
                <input 
                  placeholder="Contact Name"
                  className="w-full bg-black/20 border border-slate-800 p-3 rounded-xl text-sm focus:border-blue-500 focus:outline-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    placeholder="Phone Number"
                    className="bg-black/20 border border-slate-800 p-3 rounded-xl text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                  <input 
                    placeholder="Email (Optional)"
                    className="bg-black/20 border border-slate-800 p-3 rounded-xl text-sm focus:border-blue-500 focus:outline-none"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : 'Secure Contact'}
              </button>
            </form>
          </div>
        )}

        {/* LIST VIEW */}
        {view === 'list' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
            {contacts.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-3xl">
                <Users size={32} className="mx-auto text-slate-700 mb-2 opacity-20" />
                <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Network Empty</p>
              </div>
            ) : (
              contacts.map(contact => (
                <div key={contact.id} className="group p-4 bg-slate-800/30 border border-slate-800 hover:border-slate-600 rounded-2xl transition-all flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:border-blue-500/50 transition-colors">
                      <Users size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-200">{contact.name}</span>
                        {contact.is_trusted_voter && (
                          <span className="flex items-center gap-1 text-[8px] bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">
                            <ShieldCheck size={10} /> Trusted
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-slate-500">
                        <span className="flex items-center gap-1"><Phone size={10}/> {contact.phone}</span>
                        {contact.email && <span className="flex items-center gap-1"><Mail size={10}/> {contact.email}</span>}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(contact.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}