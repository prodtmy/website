'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

export default function AdminPage() {
  const supabase = createClient();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'vault' | 'upload' | 'users' | 'analytics'>('vault');
  const [clientName, setClientName] = useState('');
  const [keyInput, setKeyInput] = useState('');

  // Tab 1: Vault Manager State
  const [tracks, setTracks] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PUBLIC' | 'PRIVATE'>('ALL');

  // Tab 2: Upload Asset State
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadBpm, setUploadBpm] = useState('140');
  const [uploadKey, setUploadKey] = useState('F# MIN');
  const [uploadAccessTier, setUploadAccessTier] = useState('standard');
  const [uploadIsVaultOnly, setUploadIsVaultOnly] = useState(false);
  const [mp3File, setMp3File] = useState<File | null>(null);
  const [wavFile, setWavFile] = useState<File | null>(null);
  const [flpFile, setFlpFile] = useState<File | null>(null);

  // Key to force resetting HTML file inputs
  const [fileInputKey, setFileInputKey] = useState(Date.now());

  // Tab 3: Users State
  const [users, setUsers] = useState<any[]>([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('artist');
  const [newUserKey, setNewUserKey] = useState('');

  // 1. Authentication Check
  useEffect(() => {
    const checkAdminAccess = async () => {
      const token = typeof document !== 'undefined' ? getCookie('vault_token') : null;
      if (!token) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('access_keys')
          .select('client_name, is_active, access_tier')
          .eq('code', token)
          .single();

        if (error || !data || !data.is_active || data.access_tier !== 'admin') {
          setIsAuthorized(false);
          setLoading(false);
          return;
        }

        setIsAuthorized(true);
        setClientName(data.client_name);
        fetchData();
      } catch (err) {
        console.error(err);
        setIsAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, []);

  const fetchData = async () => {
    // Fetch Tracks
    try {
      const { data: tracksData } = await supabase
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false });
      if (tracksData) setTracks(tracksData);
    } catch (e) {
      console.error(e);
    }

    // Fetch Access Keys / Users
    try {
      const { data: keysData } = await supabase
        .from('access_keys')
        .select('*')
        .order('created_at', { ascending: false });
      if (keysData) setUsers(keysData);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('access_keys')
        .select('client_name, is_active, access_tier')
        .eq('code', keyInput)
        .single();

      if (error || !data || !data.is_active || data.access_tier !== 'admin') {
        alert('ACCESS DENIED: Invalid Admin Key.');
        return;
      }

      // Save admin cookie securely
      if (typeof document !== 'undefined') {
        document.cookie = `vault_token=${keyInput}; path=/; max-age=604800; SameSite=Lax; Secure`;
      }
      setIsAuthorized(true);
      setClientName(data.client_name);
      fetchData();
    } catch (err) {
      alert('Login error. Please try again.');
    }
  };

  const handleLogout = () => {
    if (typeof document !== 'undefined') {
      document.cookie = "vault_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    }
    window.location.reload();
  };

  // Asset Upload

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mp3File) {
      alert('Bitte mindestens eine MP3-Datei auswählen.');
      return;
    }

    setUploadProgress(10);
    try {
      const timestamp = Date.now();
      const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9._-]/g, '_');

      // 1. MP3 direkt in Supabase Storage hochladen (übergeht das Vercel-Limit)
      const mp3Path = `mp3/${timestamp}_${sanitize(mp3File.name)}`;
      const { error: mp3Err } = await supabase.storage
        .from('previews') // Öffentlicher Bucket für Previews
        .upload(mp3Path, mp3File);

      if (mp3Err) throw new Error(`MP3 Upload fehlgeschlagen: ${mp3Err.message}`);
      setUploadProgress(40);

      // 2. Optional: Master-WAV direkt hochladen
      let wavPath = null;
      if (wavFile) {
        wavPath = `wav/${timestamp}_${sanitize(wavFile.name)}`;
        const { error: wavErr } = await supabase.storage
          .from('private') // Privater Bucket für WAV Master
          .upload(wavPath, wavFile);
        if (wavErr) throw new Error(`WAV Upload fehlgeschlagen: ${wavErr.message}`);
      }
      setUploadProgress(70);

      // 3. Optional: Stems / FLP direkt hochladen
      let flpPath = null;
      if (flpFile) {
        flpPath = `stems/${timestamp}_${sanitize(flpFile.name)}`;
        const { error: flpErr } = await supabase.storage
          .from('private') // Privater Bucket für WAV/FLP Stems
          .upload(flpPath, flpFile);
        if (flpErr) throw new Error(`FLP Upload fehlgeschlagen: ${flpErr.message}`);
      }
      setUploadProgress(90);

      // 4. URLs aus Supabase abrufen
      const { data: mp3UrlData } = supabase.storage.from('previews').getPublicUrl(mp3Path);
      const { data: wavUrlData } = wavPath
        ? supabase.storage.from('private').getPublicUrl(wavPath)
        : { data: { publicUrl: null } };
      const { data: flpUrlData } = flpPath
        ? supabase.storage.from('private').getPublicUrl(flpPath)
        : { data: { publicUrl: null } };

      // 5. Nur noch leichtes JSON (wenige Bytes) an den API-Endpunkt senden
      // in deiner page.tsx
      const res = await fetch('/api/upload-beat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: uploadTitle,               // Muss gefüllt sein!
          bpm: uploadBpm,
          key: uploadKey,
          isVaultOnly: uploadIsVaultOnly,
          accessTier: uploadAccessTier,
          mp3Url: mp3UrlData.publicUrl,     // WICHTIG: mp3Url (nicht mp3_url)
          wavPath: wavUrlData?.publicUrl || null,
          flpPath: flpUrlData?.publicUrl || null,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Speichern fehlgeschlagen');

      setUploadProgress(100);
      alert('Asset erfolgreich hochgeladen!');

      // Formular zurücksetzen
      setUploadTitle('');
      setUploadBpm('140');
      setUploadKey('F# MIN');
      setUploadAccessTier('standard');
      setUploadIsVaultOnly(false);
      setMp3File(null);
      setWavFile(null);
      setFlpFile(null);
      setFileInputKey(Date.now());
      setUploadProgress(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(`Upload Fehler: ${err.message}`);
      setUploadProgress(null);
    }
  };

  // Toggle Track Visibility (Vault Only vs Public)
  const handleToggleTrackVisibility = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('tracks')
        .update({ is_vault_only: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert(`Error toggling visibility: ${err.message}`);
    }
  };

  // Delete Track
  const handleDeleteTrack = async (id: string) => {
    if (!confirm('Are you sure you want to delete this track?')) return;
    try {
      const { error } = await supabase.from('tracks').delete().eq('id', id);
      if (error) throw error;
      alert('Track deleted successfully!');
      fetchData();
    } catch (err: any) {
      alert(`Error deleting track: ${err.message}`);
    }
  };

  // Toggle Access Key Status
  const handleToggleUserStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('access_keys')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert(`Error toggling status: ${err.message}`);
    }
  };

  // Create User Key
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('access_keys')
        .insert([
          {
            code: newUserKey,
            client_name: newUserName,
            access_tier: newUserRole,
            is_active: true
          }
        ]);

      if (error) throw error;
      alert('User access key created successfully!');
      setNewUserName('');
      setNewUserKey('');
      fetchData();
    } catch (err: any) {
      alert(`Error creating key: ${err.message}`);
    }
  };

  // Delete User Key
  const handleDeleteUser = async (id: string) => {
    if (!confirm('Delete this user key permanently?')) return;
    try {
      const { error } = await supabase.from('access_keys').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert(`Error deleting key: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center font-mono text-sm">[ LOADING MASTER CONTROL... ]</div>;
  }

  // STATE A: UNAUTHORIZED
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] font-mono text-[#1D1D1F] flex flex-col justify-between select-none">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E8E8ED]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link href="/" className="font-bold text-lg text-[#1D1D1F] tracking-tight">tmy</Link>
            <nav className="flex items-center gap-2 sm:gap-4 text-xs font-medium">
              <Link href="/" className="text-[#86868B] hover:text-[#1D1D1F] px-2.5 py-1.5 transition-colors flex items-center">[ ARCHIVE ]</Link>
              <Link href="/vault" className="text-[#86868B] hover:text-[#1D1D1F] px-2.5 py-1.5 transition-colors flex items-center">[ VAULT ]</Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 w-full max-w-lg mx-auto flex flex-col justify-center gap-6 p-6 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="text-xs font-bold text-[#86868B] uppercase tracking-widest">[ SYSTEM // ADMIN PORTAL ACCESS REQUIRED ]</span>
          </div>

          <p className="text-xs sm:text-sm text-[#1D1D1F] leading-relaxed">
            RESTRICTED ADMIN PANEL. Enter an authorized master governance key to control vault media, users, and telemetry.
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4 mt-2">
            <input
              name="adminKey"
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="ENTER MASTER KEY (e.g. ADMIN2026)..."
              className="w-full bg-transparent border-b-2 border-[#1D1D1F] text-[#1D1D1F] placeholder-[#86868B] text-base sm:text-lg py-3 px-1 focus:outline-none transition-colors font-mono rounded-none tracking-widest uppercase"
              autoComplete="off"
              required
            />

            <div className="flex gap-3 mt-4">
              <button type="submit" className="flex-1 text-xs font-bold bg-[#1D1D1F] text-white px-6 py-3.5 hover:bg-black transition-colors uppercase tracking-widest">
                [ AUTHENTICATE MASTER KEY ]
              </button>
            </div>
          </form>
        </main>
      </div>
    );
  }

  // STATE B: AUTHORIZED
  return (
    <div className="min-h-screen bg-[#F5F5F7] font-mono text-[#1D1D1F] flex flex-col">
      {/* Admin Top Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E8E8ED]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-bold text-lg text-[#1D1D1F] tracking-tight">tmy</Link>
            <span className="text-xs text-[#86868B] font-bold">// MASTER CONTROL</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="text-[#1D1D1F] font-bold hidden sm:inline">ADMIN: {clientName} [ACTIVE]</span>
            <button onClick={handleLogout} className="text-[#86868B] hover:text-[#1D1D1F] transition-colors">[ LOGOUT ]</button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-56 flex-shrink-0 flex flex-row md:flex-col gap-2 border-b md:border-b-0 md:border-r border-[#E8E8ED] pb-4 md:pb-0 md:pr-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('vault')}
            className={`flex-1 md:flex-initial text-left px-3 py-2.5 text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'vault' ? 'bg-[#1D1D1F] text-white' : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/5'}`}
          >
            <span>🎛️</span>
            <span>[ VAULT MANAGER ]</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 md:flex-initial text-left px-3 py-2.5 text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'upload' ? 'bg-[#1D1D1F] text-white' : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/5'}`}
          >
            <span>📁</span>
            <span>[ ASSET UPLOAD ]</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 md:flex-initial text-left px-3 py-2.5 text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'users' ? 'bg-[#1D1D1F] text-white' : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/5'}`}
          >
            <span>👥</span>
            <span>[ USERS ]</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 md:flex-initial text-left px-3 py-2.5 text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'analytics' ? 'bg-[#1D1D1F] text-white' : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/5'}`}
          >
            <span>📊</span>
            <span>[ ANALYTICS ]</span>
          </button>
        </aside>

        {/* Workspace */}
        <section className="flex-1 min-w-0">

          {/* TAB 1: VAULT MANAGER */}
          {activeTab === 'vault' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-[#1D1D1F]">[ VAULT GOVERNANCE // LIVE ACCESS EDITOR ]</h2>
                  <p className="text-xs text-[#86868B] mt-1">Listen to beats and directly modify user permissions or visibility in real-time.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#86868B] uppercase font-bold">FILTER:</span>
                  <select
                    value={filter}
                    onChange={(e: any) => setFilter(e.target.value)}
                    className="bg-white border border-[#E8E8ED] text-xs px-2.5 py-1.5 focus:outline-none focus:border-primary font-mono rounded"
                  >
                    <option value="ALL">ALL TRACKS</option>
                    <option value="PUBLIC">PUBLIC ONLY</option>
                    <option value="PRIVATE">PRIVATE ONLY</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-[#E8E8ED] divide-y divide-[#E8E8ED] overflow-hidden">
                {tracks
                  .filter(t => filter === 'ALL' || (filter === 'PUBLIC' && !t.is_vault_only) || (filter === 'PRIVATE' && t.is_vault_only))
                  .map((track) => (
                    <div key={track.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <div className="font-bold text-xs uppercase text-[#1D1D1F] flex items-center gap-2">
                          <span>{track.title}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${track.is_vault_only ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                            {track.is_vault_only ? 'VAULT ONLY' : 'PUBLIC'}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#86868B] uppercase mt-1">{track.bpm} BPM // {track.key} // TIER: {track.access_tier}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleTrackVisibility(track.id, track.is_vault_only)}
                          className="text-[10px] bg-[#F5F5F7] hover:bg-[#E8E8ED] border border-[#E8E8ED] px-2.5 py-1.5 uppercase font-bold transition-colors"
                        >
                          [ TOGGLE: {track.is_vault_only ? 'MAKE PUBLIC' : 'MAKE VAULT ONLY'} ]
                        </button>
                        <button
                          onClick={() => handleDeleteTrack(track.id)}
                          className="text-[10px] bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-3 py-1.5 uppercase font-bold transition-colors"
                        >
                          [ DELETE ]
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 2: ASSET UPLOAD */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#1D1D1F]">[ ASSET UPLOAD // MEDIA DEPLOYMENT ]</h2>
                <p className="text-xs text-[#86868B] mt-1">Upload audio previews, uncompressed WAVs, stem archives (.ZIP) or FL Studio project files (.FLP).</p>
              </div>

              <form onSubmit={handleUploadSubmit} className="bg-white p-6 rounded-lg border border-[#E8E8ED] space-y-4">
                <div key={fileInputKey} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ PREVIEW MP3 FILE ]</label>
                    <input
                      type="file"
                      accept="audio/mpeg,audio/mp3,.mp3"
                      required
                      onChange={(e) => setMp3File(e.target.files?.[0] || null)}
                      className="w-full text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ MASTER WAV FILE ]</label>
                    <input
                      type="file"
                      accept="audio/wav,audio/x-wav,.wav"
                      onChange={(e) => setWavFile(e.target.files?.[0] || null)}
                      className="w-full text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ STEMS / FLP ARCHIVE ]</label>
                    <input
                      type="file"
                      accept=".flp,.zip,.rar"
                      onChange={(e) => setFlpFile(e.target.files?.[0] || null)}
                      className="w-full text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ TRACK TITLE ]</label>
                    <input type="text" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} required placeholder="e.g. CYBER_PUNK" className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none focus:border-primary font-mono uppercase" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ BPM ]</label>
                    <input type="number" value={uploadBpm} onChange={(e) => setUploadBpm(e.target.value)} required className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none focus:border-primary font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ KEY ]</label>
                    <input type="text" value={uploadKey} onChange={(e) => setUploadKey(e.target.value)} required className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none focus:border-primary font-mono uppercase" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ VISIBILITY ]</label>
                    <select value={uploadIsVaultOnly ? 'true' : 'false'} onChange={(e) => setUploadIsVaultOnly(e.target.value === 'true')} className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none font-mono">
                      <option value="false">PUBLIC (Archive Landing Page)</option>
                      <option value="true">VAULT ONLY (Requires Key)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ ACCESS TIER ]</label>
                    <select value={uploadAccessTier} onChange={(e) => setUploadAccessTier(e.target.value)} className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none font-mono">
                      <option value="standard">STANDARD ACCESS</option>
                      <option value="vip">VIP RAPPER ACCESS</option>
                      <option value="admin">ADMIN ACCESS</option>
                    </select>
                  </div>
                </div>

                {uploadProgress !== null && (
                  <div className="w-full bg-[#E8E8ED] h-2 rounded overflow-hidden">
                    <div className="bg-[#1D1D1F] h-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                )}

                <button type="submit" className="w-full bg-[#1D1D1F] text-white text-xs font-bold py-3 hover:bg-black transition-colors uppercase tracking-widest">
                  [ DEPLOY ASSET TO VAULT ]
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#1D1D1F]">[ USER MANAGEMENT // ACCESS GOVERNANCE ]</h2>
                <p className="text-xs text-[#86868B] mt-1">Manage client passwords, revoke sector keys, or issue new restricted clearance.</p>
              </div>

              <div className="bg-white rounded-lg border border-[#E8E8ED] overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F5F5F7] border-b border-[#E8E8ED] text-[10px] font-bold uppercase text-[#86868B]">
                      <th className="py-2.5 px-4">NAME / CLIENT</th>
                      <th className="py-2.5 px-4">KEY / CODE</th>
                      <th className="py-2.5 px-4">ROLE / TIER</th>
                      <th className="py-2.5 px-4">STATUS</th>
                      <th className="py-2.5 px-4 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E8ED] text-xs">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-[#F5F5F7]/30">
                        <td className="py-3 px-4 font-bold">{u.client_name}</td>
                        <td className="py-3 px-4 font-mono">{u.code}</td>
                        <td className="py-3 px-4 uppercase">{u.access_tier}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {u.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button onClick={() => handleToggleUserStatus(u.id, u.is_active)} className="text-[10px] bg-[#F5F5F7] border border-[#E8E8ED] px-2 py-1 uppercase">
                            [ TOGGLE ]
                          </button>
                          <button onClick={() => handleDeleteUser(u.id)} className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-2 py-1 uppercase">
                            [ DELETE ]
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Create User Form */}
              <form onSubmit={handleCreateUserSubmit} className="bg-white p-6 rounded-lg border border-[#E8E8ED] space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1D1D1F]">[ CREATE NEW USER KEY ]</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ CLIENT NAME ]</label>
                    <input type="text" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} required placeholder="e.g. Marius, Gunna..." className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ ROLE / TIER ]</label>
                    <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none font-mono">
                      <option value="artist">ARTIST (Private Vault Only)</option>
                      <option value="vip">VIP ACCESS</option>
                      <option value="producer">PRODUCER</option>
                      <option value="admin">ADMIN</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ ACCESS KEY CODE ]</label>
                    <input type="text" value={newUserKey} onChange={(e) => setNewUserKey(e.target.value)} required placeholder="e.g. VIP_KEY_2026" className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none font-mono uppercase" />
                  </div>
                </div>

                <button type="submit" className="w-full bg-[#1D1D1F] text-white text-xs font-bold py-3 hover:bg-black transition-colors uppercase tracking-widest">
                  [ GENERATE ACCESS KEY ]
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-[#1D1D1F]">[ ANALYTICS // TELEMETRY & LOGS ]</h2>
                <p className="text-xs text-[#86868B] mt-1">Real-time stats on stems downloaded, active sessions, and n8n webhook dispatches.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-lg border border-[#E8E8ED]">
                  <span className="text-[10px] text-[#86868B] uppercase font-bold">TOTAL REGISTERED CLIENT KEYS</span>
                  <div className="text-2xl font-bold text-[#1D1D1F] mt-1">{users.length}</div>
                </div>
                <div className="bg-white p-5 rounded-lg border border-[#E8E8ED]">
                  <span className="text-[10px] text-[#86868B] uppercase font-bold">TOTAL DEPLOYED BEATS</span>
                  <div className="text-2xl font-bold text-[#1D1D1F] mt-1">{tracks.length}</div>
                </div>
              </div>
            </div>
          )}

        </section>
      </main>

      <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between text-[10px] text-[#86868B] border-t border-[#E8E8ED]">
        <span>© 2026 TMY ARCHIVE // VAULT SECTOR</span>
        <span className="font-mono">AUDIO ENGINE: ACTIVE</span>
      </footer>
    </div>
  );
}

// Helper to get cookies in client
function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
}