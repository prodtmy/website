'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Suspense } from 'react';

function VaultPageContent() {
  const searchParams = useSearchParams();
  const keyParam = searchParams.get('key');
  const supabase = createClient();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState('GUEST');
  const [accessTier, setAccessTier] = useState('');
  const [keyInput, setKeyInput] = useState('');

  // Tabs: 'public' | 'private'
  const [activeTab, setActiveTab] = useState<'public' | 'private'>('public');
  const [tracks, setTracks] = useState<any[]>([]);

  // Accordion open states
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

  // Audio Playback & Scrubber Engine
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [audioObj, setAudioObj] = useState<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio();
    
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => setPlayingTrackId(null);
    const handlePause = () => setPlayingTrackId(null);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);

    setAudioObj(audio);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
      audio.src = '';
    };
  }, []);

function ensurePublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.includes('/storage/v1/object/') && !url.includes('/storage/v1/object/public/')) {
    return url.replace('/storage/v1/object/', '/storage/v1/object/public/');
  }
  return url;
}

  const togglePlay = (trackId: string, rawSrc: string | null) => {
    if (!audioObj) return;

    if (playingTrackId === trackId) {
      audioObj.pause();
      setPlayingTrackId(null);
    } else {
      const sanitizedSrc = ensurePublicUrl(rawSrc);
      if (!sanitizedSrc) {
        alert("Für diesen Track ist keine Audio-Datei für die Vorschau verfügbar.");
        return;
      }

      const tryPlay = (srcToTry: string, isRetry = false) => {
        audioObj.src = srcToTry;
        setCurrentTime(0);
        setDuration(0);
        audioObj.play().then(() => {
          setPlayingTrackId(trackId);
        }).catch(err => {
          console.error("Play error:", err);
          if (!isRetry && srcToTry.includes('/tracks/')) {
            const fallbackSrc = srcToTry.replace('/tracks/', '/previews/');
            tryPlay(fallbackSrc, true);
            return;
          }
          alert("Audio konnte nicht geladen werden (403/404). Bitte lade die MP3-Datei im Admin-Panel neu hoch (Bucket: previews) oder stelle den Bucket 'previews' in Supabase auf Public.");
        });
      };

      tryPlay(sanitizedSrc);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioObj || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * duration;
    audioObj.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const triggerDownload = async (url: string | null, defaultFilename: string) => {
    const sanitizedUrl = ensurePublicUrl(url);
    if (!sanitizedUrl) {
      alert("Diese Datei steht für diesen Track nicht zur Verfügung.");
      return;
    }

    try {
      // 1. Fetch file binary directly into browser blob memory
      const response = await fetch(sanitizedUrl);
      if (!response.ok) throw new Error("Download Error");
      const blob = await response.blob();

      // 2. Create local same-origin blob URL (bypasses Safari cross-origin player tab)
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = defaultFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up local blob URL after download initiates
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      // Fallback
      const link = document.createElement('a');
      link.href = sanitizedUrl;
      link.download = defaultFilename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleLogout = () => {
    if (typeof document !== 'undefined') {
      document.cookie = "vault_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    }
    window.location.href = '/vault';
  };

  // 1. Authorization Gate
  useEffect(() => {
    const verifyAccess = async () => {
      const token = keyParam || (typeof document !== 'undefined' ? getCookie('vault_token') : null);
      
      if (!token) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      try {
        const { data: keyData, error: keyError } = await supabase
          .from('access_keys')
          .select('client_name, is_active, access_tier')
          .eq('code', token)
          .single();

        if (keyError || !keyData || !keyData.is_active) {
          if (keyError) console.error("Vault Key Verification Error:", keyError);
          setIsAuthorized(false);
          setLoading(false);
          return;
        }

        if (typeof document !== 'undefined') {
          document.cookie = `vault_token=${token}; path=/; max-age=604800; SameSite=Lax; Secure`;
        }

        const tier = keyData.access_tier?.toLowerCase() || '';
        if (tier === 'admin' || tier === 'producer') {
          window.location.href = '/admin';
          return;
        }

        setIsAuthorized(true);
        setClientName(keyData.client_name);
        setAccessTier(tier);

        // If artist, default to private tab
        if (tier === 'artist') {
          setActiveTab('private');
        } else {
          setActiveTab('public');
        }

        fetchTracks();
      } catch (err) {
        console.error(err);
        setIsAuthorized(false);
        setLoading(false);
      }
    };

    verifyAccess();
  }, [keyParam]);

  const fetchTracks = async () => {
    try {
      const { data: tracksData, error: tracksError } = await supabase
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false });

      if (tracksError) throw tracksError;
      setTracks(tracksData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAccordion = (id: string) => {
    setOpenAccordions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center font-mono text-xs">
        <div className="flex items-center gap-2 text-zinc-600">
          <span className="w-2 h-2 rounded-full bg-zinc-900 animate-ping"></span>
          <span>[ INITIALIZING SECURE VAULT CONNECTION... ]</span>
        </div>
      </div>
    );
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
              <Link href="/vault" className="text-[#1D1D1F] hover:bg-black/5 px-2.5 py-1.5 rounded transition-colors flex items-center">[ VAULT ]</Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 w-full max-w-lg mx-auto flex flex-col justify-center gap-6 p-6 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="text-xs font-bold text-[#86868B] uppercase tracking-widest">[ SYSTEM // AUTHORIZATION REQUIRED ]</span>
          </div>
          
          <p className="text-xs sm:text-sm text-[#1D1D1F] leading-relaxed">
            RESTRICTED AREA. Enter an active authorization key to access unreleased loops, stems, and project files.
          </p>
          
          <form 
            onSubmit={(e) => { 
              e.preventDefault(); 
              window.location.href = `/vault?key=${keyInput.trim().toUpperCase()}`; 
            }} 
            className="flex flex-col gap-4 mt-2"
          >
            <input 
              name="vaultKey"
              type="text" 
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="ENTER KEY (e.g. ADMIN2026, MARIUS, VIP2026)..." 
              className="w-full bg-transparent border-b-2 border-[#1D1D1F] text-[#1D1D1F] placeholder-[#86868B] text-base sm:text-lg py-3 px-1 focus:outline-none transition-colors font-mono rounded-none tracking-widest uppercase"
              autoComplete="off"
              required
            />
            
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button type="submit" className="flex-1 text-xs font-bold bg-[#1D1D1F] text-white px-6 py-3.5 hover:bg-black transition-colors uppercase tracking-widest">
                [ VERIFY KEY ]
              </button>
            </div>
          </form>

          {/* Testing Credentials Hint */}
          <div className="mt-6 pt-4 border-t border-dashed border-[#E8E8ED] text-[11px] text-[#86868B] space-y-1 text-left">
            <div className="font-bold uppercase tracking-wider text-[#1D1D1F]">[ DEMO KEYS ]</div>
            <div className="flex flex-wrap gap-2 pt-1 font-mono">
              <span 
                className="bg-white px-2 py-0.5 border border-[#E8E8ED] cursor-pointer hover:border-[#1D1D1F]"
                onClick={() => setKeyInput('ADMIN2026')}
              >
                ADMIN: ADMIN2026
              </span>
              <span 
                className="bg-white px-2 py-0.5 border border-[#E8E8ED] cursor-pointer hover:border-[#1D1D1F]"
                onClick={() => setKeyInput('MARIUS')}
              >
                RESTRICTED: MARIUS
              </span>
              <span 
                className="bg-white px-2 py-0.5 border border-[#E8E8ED] cursor-pointer hover:border-[#1D1D1F]"
                onClick={() => setKeyInput('VIP2026')}
              >
                VIP: VIP2026
              </span>
              <span 
                className="bg-white px-2 py-0.5 border border-[#E8E8ED] cursor-pointer hover:border-[#1D1D1F]"
                onClick={() => setKeyInput('PROD2026')}
              >
                PRODUCER: PROD2026
              </span>
            </div>
          </div>
        </main>

        <footer className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between text-[10px] text-[#86868B] border-t border-[#E8E8ED]">
          <span>© 2026 TMY ARCHIVE // VAULT SECTOR</span>
          <span className="font-mono">AUDIO ENGINE: ACTIVE</span>
        </footer>
      </div>
    );
  }

  // Filtered tracks for Vault
  const isArtist = accessTier === 'artist';

  const displayedTracks = tracks.filter(t => {
    if (activeTab === 'public') {
      return !t.is_vault_only;
    } else {
      // Private vault
      if (!t.is_vault_only) return false;
      if (!t.assigned_user) return true; // General unassigned private vault
      return t.assigned_user.toLowerCase() === clientName.toLowerCase();
    }
  });

  // STATE B: AUTHORIZED (Upgraded Pro Studio Vault Layout)
  return (
    <div className="min-h-screen bg-[#F5F5F7] font-mono text-[#1D1D1F] flex flex-col antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E8E8ED]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg text-[#1D1D1F] tracking-tight">tmy</Link>
          
          <div className="flex items-center gap-4 text-xs">
            <span className="text-[#1D1D1F] font-bold hidden sm:inline">
              {clientName.toUpperCase()} [{accessTier.toUpperCase()}]
            </span>
            <button onClick={handleLogout} className="text-[#86868B] hover:text-[#1D1D1F] transition-colors">[ LOGOUT ]</button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 flex flex-col gap-6">
        
        {/* Top Action Bar & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E8ED] pb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#1D1D1F]">
            {isArtist 
              ? `PRIVATE VAULT // ASSIGNED TO: ${clientName.toUpperCase()}`
              : (activeTab === 'public' ? 'PUBLIC VAULT // ALL STEMS' : `PRIVATE VAULT // ${clientName.toUpperCase()}`)
            }
          </h2>

          {/* Tab Bar (Hidden for restricted Artist role) */}
          {!isArtist && (
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setActiveTab('public')}
                className={`text-xs font-bold uppercase tracking-widest transition-colors pb-1 ${
                  activeTab === 'public' 
                    ? 'text-[#1D1D1F] border-b-2 border-[#1D1D1F]' 
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                [ PUBLIC VAULT ]
              </button>
              <button 
                onClick={() => setActiveTab('private')}
                className={`text-xs font-bold uppercase tracking-widest transition-colors pb-1 ${
                  activeTab === 'private' 
                    ? 'text-[#1D1D1F] border-b-2 border-[#1D1D1F]' 
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                [ PRIVATE VAULT ]
              </button>
            </div>
          )}
        </div>

        {/* Tracklist List Container */}
        <div className="flex flex-col gap-3">
          {displayedTracks.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-[#E8E8ED] bg-white rounded-xl text-[#86868B] text-xs uppercase tracking-widest">
              NO EXCLUSIVE TRACKS CURRENTLY ASSIGNED TO YOUR SECTOR.
            </div>
          ) : (
            displayedTracks.map((track) => {
              const isOpen = !!openAccordions[track.id];
              const isPlaying = playingTrackId === track.id;
              const trackDate = track.created_at ? new Date(track.created_at).toISOString().split('T')[0] : '2026-08';

              return (
                <div 
                  key={track.id} 
                  className={`bg-white rounded-xl border transition-all duration-200 shadow-sm overflow-hidden ${
                    isPlaying ? 'border-zinc-900 shadow-md ring-1 ring-zinc-900/10' : 'border-[#E8E8ED] hover:border-zinc-400'
                  }`}
                >
                  <div 
                    onClick={() => toggleAccordion(track.id)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none group"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Play/Pause Button */}
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlay(track.id, track.mp3_url || track.wav_path || null);
                        }}
                        className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all flex-shrink-0 ${
                          isPlaying 
                            ? 'bg-zinc-900 text-white border-zinc-900 shadow-md scale-105' 
                            : 'border-zinc-300 text-zinc-900 hover:bg-zinc-900 hover:text-white hover:border-zinc-900'
                        }`}
                      >
                        {isPlaying ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        ) : (
                          <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        )}
                      </button>

                      {/* Track Details & Scrubber */}
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-[#1D1D1F] tracking-wide group-hover:underline truncate">
                            {track.title}
                          </span>
                          <span className="border border-zinc-300 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold text-zinc-700 bg-zinc-50">
                            {track.track_type || 'BEAT'}
                          </span>
                        </div>
                        
                        <div className="text-xs text-[#86868B] mt-0.5 flex items-center gap-2">
                          <span>{track.bpm || '---'} BPM</span>
                          <span>//</span>
                          <span>{track.key || '---'}</span>
                          <span>//</span>
                          <span className="text-zinc-500 font-medium">{track.credits || 'PROD. TMY'}</span>
                        </div>

                        {/* Interactive Scrubber / Progress Bar (When Playing) */}
                        {isPlaying && (
                          <div 
                            className="mt-3 flex items-center gap-3 w-full pr-2 animate-fadeIn"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[10px] font-mono text-zinc-900 font-bold min-w-[32px]">
                              {formatTime(currentTime)}
                            </span>
                            
                            <div 
                              className="flex-1 h-2.5 bg-zinc-200 rounded-full cursor-pointer relative overflow-hidden group/scrubber shadow-inner"
                              onClick={handleSeek}
                            >
                              <div 
                                className="h-full bg-gradient-to-r from-zinc-800 to-black rounded-full transition-all duration-75 relative" 
                                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                              >
                                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-black rounded-full shadow-md"></span>
                              </div>
                            </div>

                            <span className="text-[10px] font-mono text-zinc-400 min-w-[32px]">
                              {formatTime(duration)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
                      <div className="text-xs text-[#86868B] font-mono">
                        {trackDate}
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerDownload(track.mp3_url, `${track.title}_PREVIEW.mp3`);
                          }}
                          className="text-xs bg-zinc-100 hover:bg-zinc-900 hover:text-white border border-zinc-200 px-3 py-1.5 rounded transition-all uppercase font-medium flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                          <span>PREVIEW</span>
                        </button>

                        <span className="text-xs font-mono font-bold text-zinc-400 group-hover:text-[#1D1D1F] transition-transform duration-200 px-1">
                          {isOpen ? '[ − ]' : '[ + ]'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Accordion Content: 3 Download Options */}
                  {isOpen && (
                    <div className="p-4 sm:p-5 bg-zinc-50/80 border-t border-[#E8E8ED] space-y-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">[ ASSET DOWNLOAD MATRIX ]</span>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* 1. Preview MP3 */}
                        <div 
                          onClick={() => triggerDownload(track.mp3_url, `${track.title}_PREVIEW.mp3`)}
                          className={`p-4 rounded-xl border text-left flex flex-col justify-between gap-3 transition-all cursor-pointer group ${
                            track.mp3_url 
                              ? 'bg-white hover:border-emerald-500 border-zinc-200 shadow-sm hover:shadow-md' 
                              : 'bg-zinc-100/60 border-zinc-200/60 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1D1D1F] flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>
                              <span>PREVIEW MP3</span>
                            </span>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${track.mp3_url ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-200 text-zinc-500'}`}>
                              {track.mp3_url ? 'AVAILABLE' : 'N/A'}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#86868B]">320kbps Audio Preview Stream</p>
                          <div className="text-[10px] font-bold text-emerald-700 group-hover:underline flex items-center gap-1">
                            <span>DOWNLOAD MP3</span>
                            <span>→</span>
                          </div>
                        </div>

                        {/* 2. Master WAV */}
                        <div 
                          onClick={() => triggerDownload(track.wav_path, `${track.title}_MASTER.wav`)}
                          className={`p-4 rounded-xl border text-left flex flex-col justify-between gap-3 transition-all cursor-pointer group ${
                            track.wav_path 
                              ? 'bg-white hover:border-blue-500 border-zinc-200 shadow-sm hover:shadow-md' 
                              : 'bg-zinc-100/60 border-zinc-200/60 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1D1D1F] flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z"/></svg>
                              <span>MASTER WAV</span>
                            </span>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${track.wav_path ? 'bg-blue-100 text-blue-700' : 'bg-zinc-200 text-zinc-500'}`}>
                              {track.wav_path ? 'AVAILABLE' : 'N/A'}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#86868B]">24-Bit Studio Master WAV</p>
                          <div className="text-[10px] font-bold text-blue-700 group-hover:underline flex items-center gap-1">
                            <span>DOWNLOAD WAV</span>
                            <span>→</span>
                          </div>
                        </div>

                        {/* 3. STEMS / FLP Archive */}
                        <div 
                          onClick={() => triggerDownload(track.flp_path, `${track.title}_STEMS_PROJECT.zip`)}
                          className={`p-4 rounded-xl border text-left flex flex-col justify-between gap-3 transition-all cursor-pointer group ${
                            track.flp_path 
                              ? 'bg-white hover:border-purple-500 border-zinc-200 shadow-sm hover:shadow-md' 
                              : 'bg-zinc-100/60 border-zinc-200/60 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1D1D1F] flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1H5zm0 0v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>
                              <span>STEMS / FLP</span>
                            </span>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${track.flp_path ? 'bg-purple-100 text-purple-700' : 'bg-zinc-200 text-zinc-500'}`}>
                              {track.flp_path ? 'AVAILABLE' : 'N/A'}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#86868B]">Track Stems (.ZIP) & FL Studio Project</p>
                          <div className="text-[10px] font-bold text-purple-700 group-hover:underline flex items-center gap-1">
                            <span>DOWNLOAD STEMS / FLP</span>
                            <span>→</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between text-[10px] text-[#86868B] border-t border-[#E8E8ED]">
        <span>© 2026 TMY ARCHIVE // VAULT SECTOR</span>
        <span className="font-mono">AUDIO ENGINE: ACTIVE</span>
      </footer>
    </div>
  );
}

export default function VaultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center font-mono text-xs">[ LOADING VAULT... ]</div>}>
      <VaultPageContent />
    </Suspense>
  );
}

function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
}
