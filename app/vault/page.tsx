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

  // Audio Playback
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [audioObj, setAudioObj] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.onended = () => setPlayingTrackId(null);
    audio.onpause = () => setPlayingTrackId(null);
    setAudioObj(audio);

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const togglePlay = (trackId: string, src: string) => {
    if (!audioObj) return;

    if (playingTrackId === trackId) {
      audioObj.pause();
      setPlayingTrackId(null);
    } else {
      audioObj.src = src;
      audioObj.play().then(() => {
        setPlayingTrackId(trackId);
      }).catch(err => {
        console.error("Play error:", err);
        alert("Audio konnte nicht abgespielt werden.");
      });
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

  const handleDownload = (type: string, trackTitle: string) => {
    alert(`DOWNLOAD STARTED: ${trackTitle} (${type})`);
  };

  if (loading) {
    return <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center font-mono text-sm">[ INITIALIZING SECURE CONNECTION... ]</div>;
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

  // STATE B: AUTHORIZED (Original Accordion Layout from vault.html)
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

        {/* Accordion Tracklist List Container */}
        <div className="flex flex-col divide-y divide-[#E8E8ED]">
          {displayedTracks.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-[#E8E8ED] text-[#86868B] text-xs uppercase tracking-widest">
              NO EXCLUSIVE TRACKS CURRENTLY ASSIGNED TO YOUR SECTOR.
            </div>
          ) : (
            displayedTracks.map((track) => {
              const isOpen = !!openAccordions[track.id];
              const isPlaying = playingTrackId === track.id;
              const trackDate = track.created_at ? new Date(track.created_at).toISOString().split('T')[0] : '2026-08';

              return (
                <div key={track.id} className="border-b border-[#E8E8ED] py-4 flex flex-col transition-colors">
                  <div 
                    onClick={() => toggleAccordion(track.id)}
                    className="flex items-center justify-between gap-4 cursor-pointer select-none group"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
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
                          {track.bpm || '---'} BPM // {track.key || '---'}{' '}
                          <span className="border border-[#E8E8ED] px-1 rounded ml-1 text-[9px] uppercase font-bold">
                            {track.track_type || 'BEAT'}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="hidden md:block text-xs text-[#86868B] font-mono">
                      {trackDate}
                    </div>

                    <div className="flex items-center gap-3">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload('PREVIEW', track.title);
                        }}
                        className="text-xs border border-[#E8E8ED] px-2.5 py-1.5 hover:bg-black/5 transition-colors uppercase font-medium hidden sm:flex items-center gap-1.5"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                        <span>PREVIEW</span>
                      </button>

                      <span className="text-xs text-[#86868B] group-hover:text-[#1D1D1F] transition-transform duration-200">
                        {isOpen ? '[ − ]' : '[ + ]'}
                      </span>
                    </div>
                  </div>

                  {/* Accordion Content */}
                  {isOpen && (
                    <div className="pt-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button 
                          onClick={() => handleDownload('STEMS (WAV-ZIP)', track.title)}
                          className="p-3 bg-[#F5F5F7] hover:bg-black/5 border border-[#E8E8ED] rounded text-left flex flex-col justify-between gap-2 transition-all group"
                        >
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#1D1D1F]">[ STEMS (WAV-ZIP) ]</span>
                          <span className="text-[10px] text-[#86868B]">24-Bit Dry & Wet Stems</span>
                        </button>

                        <button 
                          onClick={() => handleDownload('PROJECT (.FLP)', track.title)}
                          className="p-3 bg-[#F5F5F7] hover:bg-black/5 border border-[#E8E8ED] rounded text-left flex flex-col justify-between gap-2 transition-all group"
                        >
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#1D1D1F]">[ PROJECT (.FLP) ]</span>
                          <span className="text-[10px] text-[#86868B]">FL Studio Project File</span>
                        </button>

                        <div className="p-3 bg-[#F5F5F7]/50 border border-[#E8E8ED] rounded text-left flex flex-col justify-between gap-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#86868B]">[ CREDITS ]</span>
                          <span className="text-[10px] text-[#1D1D1F] truncate font-medium">{track.credits || 'PROD. TMY'}</span>
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
    <Suspense fallback={<div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center font-mono text-sm">[ LOADING VAULT... ]</div>}>
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
