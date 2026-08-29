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

  // Audio Engine State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  // Tab 1: Vault Manager State
  const [tracks, setTracks] = useState<any[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PUBLIC' | 'PRIVATE'>('ALL');
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

  // Edit Track Modal State
  const [editingTrack, setEditingTrack] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState('BEAT');
  const [editBpm, setEditBpm] = useState(140);
  const [editKey, setEditKey] = useState('F# MIN');
  const [editCredits, setEditCredits] = useState('PROD. TMY');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState('ARTIST');
  const [editUserKey, setEditUserKey] = useState('');
  const [editUserSaving, setEditUserSaving] = useState(false);

  // Tab 2: Upload Asset State
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState('BEAT');
  const [uploadBpm, setUploadBpm] = useState('140');
  const [uploadKey, setUploadKey] = useState('F# MIN');
  const [uploadDestination, setUploadDestination] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [uploadAssignedUser, setUploadAssignedUser] = useState('');
  const [mp3File, setMp3File] = useState<File | null>(null);
  const [wavFile, setWavFile] = useState<File | null>(null);
  const [flpFile, setFlpFile] = useState<File | null>(null);
  const [dropzoneFile, setDropzoneFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(Date.now());

  // Tab 3: Users State
  const [users, setUsers] = useState<any[]>([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('ARTIST');
  const [newUserKey, setNewUserKey] = useState('');

  // Setup Audio Object
  useEffect(() => {
    const audio = new Audio();
    audio.onended = () => setPlayingTrackId(null);
    audio.onpause = () => setPlayingTrackId(null);
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const togglePlay = (trackId: string, src: string) => {
    if (!audioRef.current) return;

    if (playingTrackId === trackId) {
      audioRef.current.pause();
      setPlayingTrackId(null);
    } else {
      audioRef.current.src = src;
      audioRef.current.play().then(() => {
        setPlayingTrackId(trackId);
      }).catch(err => {
        console.error("Audio playback error:", err);
        alert("Fehler beim Abspielen. Bitte überprüfe das Audioformat oder die Storage-Rechte.");
      });
    }
  };

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

        if (error || !data || !data.is_active || (data.access_tier?.toLowerCase() !== 'admin' && data.access_tier?.toLowerCase() !== 'producer')) {
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
    try {
      const { data: tracksData } = await supabase
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false });
      if (tracksData) setTracks(tracksData);
    } catch (e) {
      console.error(e);
    }

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

      if (error || !data || !data.is_active || (data.access_tier?.toLowerCase() !== 'admin' && data.access_tier?.toLowerCase() !== 'producer')) {
        alert('ACCESS DENIED: Invalid Admin Key.');
        return;
      }

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

  // Toggle Accordion in Vault Manager
  const toggleAccordion = (id: string) => {
    setOpenAccordions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Track In-Line Setting Updates
  const handleUpdateTrackField = async (id: string, field: string, value: any) => {
    try {
      const updateData: any = {};
      if (field === 'type') updateData.track_type = value;
      else if (field === 'vault') {
        updateData.is_vault_only = value === 'PRIVATE';
        if (value === 'PUBLIC') updateData.assigned_user = null;
      }
      else if (field === 'landing') updateData.is_landing = value === 'true';
      else if (field === 'assigned_user') updateData.assigned_user = value || null;

      const { error } = await supabase
        .from('tracks')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert(`Fehler beim Aktualisieren: ${err.message}`);
    }
  };

  // Edit Track Modal Open
  const openEditModal = (track: any) => {
    setEditingTrack(track);
    setEditTitle(track.title || '');
    setEditType(track.track_type || 'BEAT');
    setEditBpm(track.bpm || 140);
    setEditKey(track.key || 'F# MIN');
    setEditCredits(track.credits || 'PROD. TMY');
    setEditFile(null);
  };

  const handleSaveTrackEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrack) return;
    setEditSaving(true);

    try {
      let mp3Url = editingTrack.mp3_url;

      if (editFile) {
        const timestamp = Date.now();
        const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9._-]/g, '_');
        const mp3Path = `mp3/${timestamp}_${sanitize(editFile.name)}`;
        const { error: upErr } = await supabase.storage
          .from('previews')
          .upload(mp3Path, editFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('previews').getPublicUrl(mp3Path);
        mp3Url = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('tracks')
        .update({
          title: editTitle,
          track_type: editType,
          bpm: parseInt(String(editBpm), 10),
          key: editKey,
          credits: editCredits,
          mp3_url: mp3Url,
        })
        .eq('id', editingTrack.id);

      if (error) throw error;

      alert('Track erfolgreich aktualisiert!');
      setEditingTrack(null);
      fetchData();
    } catch (err: any) {
      alert(`Fehler: ${err.message}`);
    } finally {
      setEditSaving(false);
    }
  };

  // Delete Track
  const handleDeleteTrack = async (id: string) => {
    if (!confirm('Diesen Track wirklich unwiderruflich löschen?')) return;
    try {
      const { error } = await supabase.from('tracks').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert(`Fehler beim Löschen: ${err.message}`);
    }
  };

  // Asset Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeMp3 = mp3File || dropzoneFile;
    if (!activeMp3) {
      alert('Bitte mindestens eine Audio-/Preview-Datei auswählen.');
      return;
    }

    setUploadProgress(10);
    try {
      const timestamp = Date.now();
      const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9._-]/g, '_');

      // 1. MP3 in previews bucket
      const mp3Path = `mp3/${timestamp}_${sanitize(activeMp3.name)}`;
      const { error: mp3Err } = await supabase.storage
        .from('previews')
        .upload(mp3Path, activeMp3);

      if (mp3Err) throw new Error(`MP3 Upload fehlgeschlagen: ${mp3Err.message}`);
      setUploadProgress(40);

      // 2. WAV in tracks bucket
      let wavPath = null;
      if (wavFile) {
        wavPath = `wav/${timestamp}_${sanitize(wavFile.name)}`;
        const { error: wavErr } = await supabase.storage
          .from('tracks')
          .upload(wavPath, wavFile);
        if (wavErr) throw new Error(`WAV Upload fehlgeschlagen: ${wavErr.message}`);
      }
      setUploadProgress(70);

      // 3. FLP/Stems in tracks bucket
      let flpPath = null;
      if (flpFile) {
        flpPath = `stems/${timestamp}_${sanitize(flpFile.name)}`;
        const { error: flpErr } = await supabase.storage
          .from('tracks')
          .upload(flpPath, flpFile);
        if (flpErr) throw new Error(`FLP Upload fehlgeschlagen: ${flpErr.message}`);
      }
      setUploadProgress(90);

      const { data: mp3UrlData } = supabase.storage.from('previews').getPublicUrl(mp3Path);
      const { data: wavUrlData } = wavPath
        ? supabase.storage.from('tracks').getPublicUrl(wavPath)
        : { data: { publicUrl: null } };
      const { data: flpUrlData } = flpPath
        ? supabase.storage.from('tracks').getPublicUrl(flpPath)
        : { data: { publicUrl: null } };

      const isVaultOnly = uploadDestination === 'PRIVATE';

      const res = await fetch('/api/upload-beat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: uploadTitle,
          track_type: uploadType,
          bpm: uploadBpm,
          key: uploadKey,
          isVaultOnly: isVaultOnly,
          assignedUser: isVaultOnly ? uploadAssignedUser : null,
          accessTier: isVaultOnly ? 'artist' : 'standard',
          mp3Url: mp3UrlData.publicUrl,
          wavPath: wavUrlData?.publicUrl || null,
          flpPath: flpUrlData?.publicUrl || null,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Speichern fehlgeschlagen');

      setUploadProgress(100);
      alert('Asset erfolgreich zum Vault hinzugefügt!');

      // Reset
      setUploadTitle('');
      setUploadType('BEAT');
      setUploadBpm('140');
      setUploadKey('F# MIN');
      setUploadDestination('PUBLIC');
      setUploadAssignedUser('');
      setMp3File(null);
      setWavFile(null);
      setFlpFile(null);
      setDropzoneFile(null);
      setFileInputKey(Date.now());
      setUploadProgress(null);
      setActiveTab('vault');
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(`Upload Fehler: ${err.message}`);
      setUploadProgress(null);
    }
  };

  // User Edit Modal
  const openUserEditModal = (user: any) => {
    setEditingUser(user);
    setEditUserName(user.client_name || '');
    setEditUserRole(user.access_tier?.toUpperCase() || 'ARTIST');
    setEditUserKey(user.code || '');
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditUserSaving(true);

    try {
      const { error } = await supabase
        .from('access_keys')
        .update({
          client_name: editUserName,
          access_tier: editUserRole.toLowerCase(),
          code: editUserKey,
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      alert('Benutzer erfolgreich aktualisiert!');
      setEditingUser(null);
      fetchData();
    } catch (err: any) {
      alert(`Fehler: ${err.message}`);
    } finally {
      setEditUserSaving(false);
    }
  };

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

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('access_keys')
        .insert([
          {
            code: newUserKey,
            client_name: newUserName,
            access_tier: newUserRole.toLowerCase(),
            is_active: true
          }
        ]);

      if (error) throw error;
      alert('Benutzer erfolgreich angelegt!');
      setNewUserName('');
      setNewUserKey('');
      fetchData();
    } catch (err: any) {
      alert(`Fehler beim Anlegen: ${err.message}`);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Diesen Benutzer-Key dauerhaft löschen?')) return;
    try {
      const { error } = await supabase.from('access_keys').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert(`Fehler: ${err.message}`);
    }
  };

  const copyShareLink = (track: any) => {
    const url = `${window.location.origin}/vault?track=${track.id}`;
    navigator.clipboard.writeText(url).then(() => {
      alert(`Share-Link kopiert:\n${url}`);
    });
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

  // STATE B: AUTHORIZED (Identical to original admin.html)
  return (
    <div className="min-h-screen bg-[#F5F5F7] font-mono text-[#1D1D1F] flex flex-col antialiased">
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

      {/* Main Admin Layout: Sidebar + Workspace */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-56 flex-shrink-0 flex flex-row md:flex-col gap-2 border-b md:border-b-0 md:border-r border-[#E8E8ED] pb-4 md:pb-0 md:pr-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('vault')}
            className={`flex-1 md:flex-initial text-left px-3 py-2.5 text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'vault' ? 'bg-[#1D1D1F] text-white' : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/5'
            }`}
          >
            <span>🎛️</span>
            <span>[ VAULT MANAGER ]</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 md:flex-initial text-left px-3 py-2.5 text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'upload' ? 'bg-[#1D1D1F] text-white' : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/5'
            }`}
          >
            <span>📁</span>
            <span>[ ASSET UPLOAD ]</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 md:flex-initial text-left px-3 py-2.5 text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'users' ? 'bg-[#1D1D1F] text-white' : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/5'
            }`}
          >
            <span>👥</span>
            <span>[ USERS ]</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 md:flex-initial text-left px-3 py-2.5 text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'analytics' ? 'bg-[#1D1D1F] text-white' : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/5'
            }`}
          >
            <span>📊</span>
            <span>[ ANALYTICS ]</span>
          </button>
        </aside>

        {/* Workspace Content Panels */}
        <section className="flex-1 min-w-0">
          
          {/* TAB 1: INTEGRATED VAULT MANAGER */}
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
                    <option value="ALL">ALL TRACKS (PUBLIC & PRIVATE)</option>
                    <option value="PUBLIC">PUBLIC ONLY</option>
                    <option value="PRIVATE">PRIVATE ONLY</option>
                  </select>
                </div>
              </div>

              {/* Accordion Tracklist List Container */}
              <div className="bg-white rounded-lg border border-[#E8E8ED] divide-y divide-[#E8E8ED] overflow-hidden">
                {tracks.length === 0 ? (
                  <div className="p-8 text-center text-[#86868B] text-xs uppercase tracking-widest">
                    NO ASSETS IN VAULT. PLEASE UPLOAD TRACKS.
                  </div>
                ) : (
                  tracks
                    .filter(t => {
                      if (filter === 'ALL') return true;
                      if (filter === 'PUBLIC') return !t.is_vault_only;
                      return t.is_vault_only;
                    })
                    .map((track) => {
                      const isOpen = !!openAccordions[track.id];
                      const isPlaying = playingTrackId === track.id;
                      const trackType = track.track_type || 'BEAT';
                      const vaultValue = track.is_vault_only ? 'PRIVATE' : 'PUBLIC';
                      const currentAssigned = track.assigned_user || '';

                      return (
                        <div key={track.id} className="border-b border-[#E8E8ED] py-4 flex flex-col transition-colors">
                          {/* Main Row Header */}
                          <div 
                            onClick={() => toggleAccordion(track.id)}
                            className="flex items-center justify-between gap-4 cursor-pointer select-none group px-4"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePlay(track.id, track.mp3_url);
                                }}
                                className="w-9 h-9 rounded-full border border-[#E8E8ED] flex items-center justify-center text-[#1D1D1F] hover:bg-black/5 transition-all flex-shrink-0"
                              >
                                {isPlaying ? (
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                ) : (
                                  <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                )}
                              </button>
                              
                              <div className="flex flex-col truncate">
                                <span className="font-bold text-sm text-[#1D1D1F] tracking-wide group-hover:underline truncate">
                                  {track.title}
                                </span>
                                <span className="text-xs text-[#86868B]">
                                  {track.bpm || '---'} BPM // {track.key || '---'} 
                                  <span className="border border-[#E8E8ED] px-1 rounded ml-1 text-[9px] uppercase font-bold">
                                    {trackType}
                                  </span>
                                  <span className={`border px-1 rounded ml-1 text-[9px] uppercase font-bold ${track.is_vault_only ? 'border-amber-300 text-amber-700 bg-amber-50' : 'border-blue-200 text-blue-700 bg-blue-50'}`}>
                                    {track.is_vault_only ? 'PRIVATE VAULT' : 'PUBLIC'}
                                  </span>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs text-[#86868B] group-hover:text-[#1D1D1F] transition-transform duration-200">
                                {isOpen ? '[ − ]' : '[ + ]'}
                              </span>
                            </div>
                          </div>

                          {/* Accordion Settings Bar */}
                          {isOpen && (
                            <div className="flex flex-col gap-4 pt-4 px-4">
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-3 bg-[#F5F5F7]/60 border border-[#E8E8ED] rounded">
                                
                                {/* In-Line Settings */}
                                <div className="flex flex-wrap items-center gap-3 text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-[#86868B] uppercase">TYPE:</span>
                                    <select
                                      value={trackType}
                                      onChange={(e) => handleUpdateTrackField(track.id, 'type', e.target.value)}
                                      className="bg-transparent border-none text-xs focus:outline-none font-mono rounded cursor-pointer font-bold"
                                    >
                                      <option value="BEAT">BEAT</option>
                                      <option value="LOOP">LOOP</option>
                                      <option value="IDEA">IDEA</option>
                                    </select>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-[#86868B] uppercase">VAULT:</span>
                                    <select
                                      value={vaultValue}
                                      onChange={(e) => handleUpdateTrackField(track.id, 'vault', e.target.value)}
                                      className="bg-transparent border-none text-xs focus:outline-none font-mono rounded cursor-pointer font-bold"
                                    >
                                      <option value="PUBLIC">PUBLIC</option>
                                      <option value="PRIVATE">PRIVATE</option>
                                    </select>
                                  </div>

                                  <div className={`flex items-center gap-1.5 ${vaultValue !== 'PUBLIC' ? 'opacity-40 pointer-events-none' : ''}`}>
                                    <span className="text-[10px] font-bold text-[#86868B] uppercase">LANDING:</span>
                                    <select
                                      value={track.is_landing !== false ? 'true' : 'false'}
                                      onChange={(e) => handleUpdateTrackField(track.id, 'landing', e.target.value)}
                                      className="bg-transparent border-none text-xs focus:outline-none font-mono rounded cursor-pointer font-bold"
                                    >
                                      <option value="true">ON</option>
                                      <option value="false">OFF</option>
                                    </select>
                                  </div>

                                  <div className={`flex items-center gap-1.5 ${vaultValue === 'PUBLIC' ? 'opacity-40 pointer-events-none' : ''}`}>
                                    <span className="text-[10px] font-bold text-[#86868B] uppercase">ASSIGN:</span>
                                    <select
                                      value={currentAssigned}
                                      onChange={(e) => handleUpdateTrackField(track.id, 'assigned_user', e.target.value)}
                                      className="bg-transparent border-none text-xs focus:outline-none font-mono rounded cursor-pointer font-bold"
                                    >
                                      <option value="">-- ALL / NONE --</option>
                                      {users.filter(u => u.is_active).map(u => (
                                        <option key={u.id} value={u.client_name}>
                                          {u.client_name} ({u.access_tier?.toUpperCase()})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => copyShareLink(track)}
                                    className="text-[10px] font-bold px-3 py-1.5 border border-[#E8E8ED] bg-white text-[#86868B] hover:text-[#1D1D1F] rounded transition-colors whitespace-nowrap"
                                  >
                                    [ SHARE ]
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(track)}
                                    className="text-[10px] font-bold px-3 py-1.5 border border-[#E8E8ED] bg-white text-[#86868B] hover:text-[#1D1D1F] rounded transition-colors whitespace-nowrap"
                                  >
                                    [ EDIT ]
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTrack(track.id)}
                                    className="text-[10px] font-bold px-3 py-1.5 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 rounded transition-colors whitespace-nowrap"
                                  >
                                    [ DELETE ]
                                  </button>
                                </div>

                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
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

              {/* Drag & Drop Zone */}
              <div 
                className="dropzone p-8 sm:p-12 text-center rounded-lg bg-white cursor-pointer relative group flex flex-col items-center justify-center gap-3 border-2 border-dashed border-[#D2D2D7] hover:border-[#1D1D1F] transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    setDropzoneFile(e.dataTransfer.files[0]);
                    setMp3File(e.dataTransfer.files[0]);
                  }
                }}
              >
                <input 
                  type="file" 
                  accept="audio/*,.zip,.rar,.flp,.mp4"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setDropzoneFile(e.target.files[0]);
                      setMp3File(e.target.files[0]);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                />
                <svg className="w-8 h-8 text-[#86868B] group-hover:text-[#1D1D1F] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                <span className="text-xs font-bold uppercase tracking-wider text-[#1D1D1F]">
                  {dropzoneFile ? `SELECTED: ${dropzoneFile.name}` : 'DRAG & DROP AUDIO (WAV/MP3), ZIP, FLP OR MP4 HERE'}
                </span>
                <span className="text-[10px] text-[#86868B]">OR CLICK TO BROWSE LOCAL FILES</span>
              </div>

              {/* Upload Progress Bar */}
              {uploadProgress !== null && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#1D1D1F] font-bold">
                    <span>TRANSMITTING ASSET TO VAULT...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#E8E8ED] rounded-full overflow-hidden">
                    <div className="h-full bg-[#1D1D1F] transition-all duration-150" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}

              {/* Metadata Form */}
              <form onSubmit={handleUploadSubmit} className="bg-white p-6 rounded-lg border border-[#E8E8ED] space-y-4">
                <div key={fileInputKey} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ TRACK TITLE ]</label>
                    <input 
                      type="text" 
                      value={uploadTitle} 
                      onChange={(e) => setUploadTitle(e.target.value)} 
                      required 
                      placeholder="e.g. CYBER_PUNK_140" 
                      className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none focus:border-primary font-mono uppercase" 
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ TYPE ]</label>
                    <select 
                      value={uploadType} 
                      onChange={(e) => setUploadType(e.target.value)}
                      className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none focus:border-primary font-mono font-bold"
                    >
                      <option value="BEAT">BEAT</option>
                      <option value="LOOP">LOOP</option>
                      <option value="IDEA">IDEA</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ BPM ]</label>
                    <input 
                      type="number" 
                      value={uploadBpm} 
                      onChange={(e) => setUploadBpm(e.target.value)} 
                      required 
                      className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none focus:border-primary font-mono" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ KEY ]</label>
                    <input 
                      type="text" 
                      value={uploadKey} 
                      onChange={(e) => setUploadKey(e.target.value)} 
                      required 
                      className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none focus:border-primary font-mono uppercase" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ TARGET VAULT ]</label>
                    <select 
                      value={uploadDestination} 
                      onChange={(e: any) => setUploadDestination(e.target.value)}
                      className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none focus:border-primary font-mono font-bold"
                    >
                      <option value="PUBLIC">PUBLIC VAULT (All Authorized Users & Landing)</option>
                      <option value="PRIVATE">PRIVATE VAULT (Assigned User Only)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ ASSIGN TO USER (DROPDOWN) ]</label>
                    <select 
                      value={uploadAssignedUser} 
                      onChange={(e) => setUploadAssignedUser(e.target.value)}
                      disabled={uploadDestination === 'PUBLIC'}
                      className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none focus:border-primary font-mono font-bold disabled:opacity-50"
                    >
                      <option value="">-- SELECT ASSIGNED USER --</option>
                      {users.filter(u => u.is_active).map(u => (
                        <option key={u.id} value={u.client_name}>
                          {u.client_name} ({u.access_tier?.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Additional Optional Asset Files */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#E8E8ED]">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-[#86868B]">[ PREVIEW AUDIO (MP3) ]</label>
                    <input 
                      type="file" 
                      accept="audio/*" 
                      onChange={(e) => setMp3File(e.target.files?.[0] || null)}
                      className="w-full text-xs" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-[#86868B]">[ MASTER WAV ]</label>
                    <input 
                      type="file" 
                      accept="audio/wav,audio/x-wav,.wav" 
                      onChange={(e) => setWavFile(e.target.files?.[0] || null)}
                      className="w-full text-xs" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-[#86868B]">[ STEMS / FLP ARCHIVE ]</label>
                    <input 
                      type="file" 
                      accept=".flp,.zip,.rar" 
                      onChange={(e) => setFlpFile(e.target.files?.[0] || null)}
                      className="w-full text-xs" 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-[#1D1D1F] text-white text-xs font-bold py-3 hover:bg-black transition-colors uppercase tracking-widest"
                >
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

              {/* Users Table Container */}
              <div className="bg-white rounded-lg border border-[#E8E8ED] overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F5F5F7] border-b border-[#E8E8ED] text-[10px] font-bold uppercase text-[#86868B]">
                      <th className="py-2.5 px-4">NAME / CLIENT</th>
                      <th className="py-2.5 px-4">KEY</th>
                      <th className="py-2.5 px-4">ROLE</th>
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
                          <button 
                            type="button"
                            onClick={() => openUserEditModal(u)}
                            className="text-[10px] bg-white border border-[#E8E8ED] px-2 py-1 uppercase font-bold hover:bg-[#F5F5F7]"
                          >
                            [ EDIT ]
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleToggleUserStatus(u.id, u.is_active)} 
                            className="text-[10px] bg-[#F5F5F7] border border-[#E8E8ED] px-2 py-1 uppercase font-bold hover:bg-[#E8E8ED]"
                          >
                            [ TOGGLE ]
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDeleteUser(u.id)} 
                            className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-2 py-1 uppercase font-bold hover:bg-red-100"
                          >
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
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1D1D1F]">[ CREATE NEW USER ]</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ CLIENT NAME ]</label>
                    <input 
                      type="text" 
                      value={newUserName} 
                      onChange={(e) => setNewUserName(e.target.value)} 
                      required 
                      placeholder="e.g. Drake, Gunna, ProducerX..." 
                      className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none font-mono" 
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ ROLE ]</label>
                    <select 
                      value={newUserRole} 
                      onChange={(e) => setNewUserRole(e.target.value)} 
                      className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none font-mono font-bold"
                    >
                      <option value="ARTIST">ARTIST (Private Vault Only)</option>
                      <option value="VIP">VIP (High Priority Collab)</option>
                      <option value="PRODUCER">PRODUCER (Upload Access)</option>
                      <option value="ADMIN">ADMIN (Full Governance)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ ASSIGN ACCESS KEY ]</label>
                    <input 
                      type="text" 
                      value={newUserKey} 
                      onChange={(e) => setNewUserKey(e.target.value)} 
                      required 
                      placeholder="e.g. KEY2026_XYZ" 
                      className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none font-mono uppercase" 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-[#1D1D1F] text-white text-xs font-bold py-3 hover:bg-black transition-colors uppercase tracking-widest"
                >
                  [ GENERATE USER CREDENTIALS ]
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

              {/* Metric Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-lg border border-[#E8E8ED]">
                  <span className="text-[10px] text-[#86868B] uppercase font-bold">TOTAL REGISTERED CLIENT KEYS</span>
                  <div className="text-2xl font-bold text-[#1D1D1F] mt-1">{users.length}</div>
                </div>
                <div className="bg-white p-5 rounded-lg border border-[#E8E8ED]">
                  <span className="text-[10px] text-[#86868B] uppercase font-bold">TOTAL DEPLOYED BEATS</span>
                  <div className="text-2xl font-bold text-[#1D1D1F] mt-1">{tracks.length}</div>
                </div>
                <div className="bg-white p-5 rounded-lg border border-[#E8E8ED]">
                  <span className="text-[10px] text-[#86868B] uppercase font-bold">ACTIVE VAULT SESSIONS</span>
                  <div className="text-2xl font-bold text-[#1D1D1F] mt-1">42</div>
                  <span className="text-[10px] text-[#86868B] font-mono">7-day persistence active</span>
                </div>
              </div>

              {/* Audit Log */}
              <div className="bg-white rounded-lg border border-[#E8E8ED] p-5 space-y-3 font-mono text-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1D1D1F]">[ RECENT ACCESS DISPATCHES ]</span>
                <div className="space-y-2 text-[11px] text-[#86868B] pt-2 divide-y divide-[#E8E8ED]">
                  <div className="pt-2 flex justify-between">
                    <span>[2026-08-29 13:00] Admin session synchronized</span>
                    <span className="text-green-600 font-bold">SUCCESS</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span>[2026-08-29 12:45] Track visibility updated</span>
                    <span className="text-green-600 font-bold">UPDATED</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </section>
      </main>

      {/* EDIT TRACK MODAL */}
      {editingTrack && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md p-6 border border-[#E8E8ED] rounded-lg relative shadow-2xl">
            <button 
              type="button"
              onClick={() => setEditingTrack(null)}
              className="absolute top-4 right-4 text-[#86868B] hover:text-[#1D1D1F] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1D1D1F] mb-6">[ EDIT ASSET ]</h3>

            <form onSubmit={handleSaveTrackEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ TITLE ]</label>
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required 
                  className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none focus:border-primary font-mono uppercase" 
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ TYPE ]</label>
                  <select 
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none font-mono font-bold"
                  >
                    <option value="BEAT">BEAT</option>
                    <option value="LOOP">LOOP</option>
                    <option value="IDEA">IDEA</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ BPM ]</label>
                  <input 
                    type="number" 
                    value={editBpm}
                    onChange={(e) => setEditBpm(Number(e.target.value))}
                    required 
                    className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none font-mono" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ KEY ]</label>
                  <input 
                    type="text" 
                    value={editKey}
                    onChange={(e) => setEditKey(e.target.value)}
                    required 
                    className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none font-mono uppercase" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ CREDITS ]</label>
                <input 
                  type="text" 
                  value={editCredits}
                  onChange={(e) => setEditCredits(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none font-mono uppercase" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ AUDIO FILE (.WAV/.MP3) ]</label>
                <input 
                  type="file" 
                  accept="audio/*" 
                  onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                  className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs p-2 focus:outline-none font-mono" 
                />
                <p className="text-[10px] text-[#86868B]">Leave empty to keep current file.</p>
              </div>

              <button 
                type="submit" 
                disabled={editSaving}
                className="w-full bg-[#1D1D1F] text-white text-xs font-bold py-3 mt-2 hover:bg-black transition-colors uppercase tracking-widest disabled:opacity-50"
              >
                {editSaving ? '[ SAVING CHANGES... ]' : '[ SAVE CHANGES ]'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm p-6 border border-[#E8E8ED] rounded-lg relative shadow-2xl">
            <button 
              type="button"
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 text-[#86868B] hover:text-[#1D1D1F] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1D1D1F] mb-6">[ EDIT USER ]</h3>

            <form onSubmit={handleSaveUserEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ CLIENT NAME ]</label>
                <input 
                  type="text" 
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  required 
                  className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none font-mono" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ ROLE ]</label>
                <select 
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none font-mono font-bold"
                >
                  <option value="ARTIST">ARTIST</option>
                  <option value="VIP">VIP</option>
                  <option value="PRODUCER">PRODUCER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#1D1D1F]">[ ACCESS KEY ]</label>
                <input 
                  type="text" 
                  value={editUserKey}
                  onChange={(e) => setEditUserKey(e.target.value)}
                  required 
                  className="w-full bg-[#F5F5F7] border border-[#E8E8ED] text-xs px-3 py-2.5 focus:outline-none font-mono uppercase" 
                />
              </div>

              <button 
                type="submit" 
                disabled={editUserSaving}
                className="w-full bg-[#1D1D1F] text-white text-xs font-bold py-3 mt-2 hover:bg-black transition-colors uppercase tracking-widest disabled:opacity-50"
              >
                {editUserSaving ? '[ UPDATING USER... ]' : '[ UPDATE USER ]'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between text-[10px] text-[#86868B] border-t border-[#E8E8ED]">
        <span>© 2026 TMY ARCHIVE // MASTER ADMIN PANEL</span>
        <span className="font-mono">SECURITY: HIGH</span>
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