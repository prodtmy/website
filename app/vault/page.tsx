'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AudioPlayer from '@/components/AudioPlayer';
import CollabModal from '@/components/CollabModal';
import { createClient } from '@/utils/supabase/client';

import { Suspense } from 'react';

function VaultPageContent() {
  const searchParams = useSearchParams();
  const keyParam = searchParams.get('key');
  const supabase = createClient();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState<any[]>([]);
  const [clientName, setClientName] = useState('GUEST');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [accessTier, setAccessTier] = useState('');

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
        // Query Supabase for the access key
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

        // Save to cookie for subsequent visits
        if (typeof document !== 'undefined') {
          document.cookie = `vault_token=${token}; path=/; max-age=604800`; // 7 days
        }

        const tier = keyData.access_tier || '';
        if (tier === 'admin' || tier === 'producer') {
          window.location.href = '/admin';
          return;
        }

        setIsAuthorized(true);
        setClientName(keyData.client_name);
        setAccessTier(tier);

        fetchTracks(tier);
      } catch (err) {
        console.error(err);
        setIsAuthorized(false);
        setLoading(false);
      }
    };

    verifyAccess();
  }, [keyParam]);

  const fetchTracks = async (accessTier: string) => {
    try {
      // Query exclusive tracks from Supabase
      const { data: tracksData, error: tracksError } = await supabase
        .from('tracks')
        .select('*')
        .eq('is_vault_only', true)
        // Optionally filter by access_tier if required
        .order('created_at', { ascending: false });

      if (tracksError) throw tracksError;

      // Map to the expected format
      const formattedTracks = tracksData.map((t: any) => ({
        id: t.id,
        title: t.title,
        bpm: t.bpm,
        key: t.key,
        date: new Date(t.created_at).toISOString().split('T')[0],
        src: t.mp3_url,
      }));

      setTracks(formattedTracks);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleDownload = async (type: string, trackTitle: string) => {
    // Trigger download logic here
    alert(`Downloading ${type} for ${trackTitle}`);
    
    // Async webhook call in background
    try {
      // await fetch('https://n8n.yourdomain.com/webhook/track-download', { ... })
      console.log(`[WEBHOOK] Track downloaded: ${type} - ${trackTitle}`);
    } catch (e) {
      console.error(e);
    }
  };

  const openClearanceModal = (title: string) => {
    setSelectedTrack(title);
    setIsModalOpen(true);
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
              window.location.href = `/vault?key=${keyInput}`; 
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
              <Link href="/contact" className="flex-1 text-xs font-bold bg-transparent text-[#1D1D1F] border border-[#1D1D1F] px-6 py-3.5 hover:bg-black/5 transition-colors uppercase text-center flex items-center justify-center tracking-widest">
                [ REQUEST PERMISSION ]
              </Link>
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
      </div>
    );
  }

  // STATE B: AUTHORIZED
  return (
    <div className="min-h-screen bg-[#F5F5F7] font-mono text-[#1D1D1F] flex flex-col">
      {/* Global Top Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E8E8ED]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg text-[#1D1D1F] tracking-tight">tmy</Link>
          
          <div className="flex items-center gap-4 text-xs font-medium">
            {accessTier === 'admin' && (
              <Link href="/admin" className="text-[#FF3B30] hover:bg-red-50 px-2.5 py-1.5 rounded transition-colors flex items-center font-bold">[ ADMIN ]</Link>
            )}
            <span className="text-[#1D1D1F] font-bold">
              {clientName} ({accessTier.toUpperCase()})
            </span>
            <button onClick={handleLogout} className="text-[#86868B] hover:text-[#1D1D1F] px-2.5 py-1.5 transition-colors flex items-center font-mono">[ LOGOUT ]</button>
          </div>
        </div>
      </header>



      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-12 flex flex-col gap-8">
        <h1 className="text-xl font-bold uppercase tracking-widest text-[#1D1D1F] border-b border-[#E8E8ED] pb-4">
          EXCLUSIVE VAULT
        </h1>

        <div className="flex flex-col gap-8">
          {tracks.map((track) => (
            <div key={track.id} className="bg-[#FFFFFF] rounded-lg border border-[#E8E8ED] p-4 flex flex-col gap-4 shadow-sm">
              {/* Metadata */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-[#1D1D1F] uppercase">{track.title}</span>
                  <span className="text-xs text-[#86868B] uppercase">{track.bpm} BPM // {track.key}</span>
                </div>
                <span className="text-xs text-[#86868B]">ADDED: {track.date}</span>
              </div>
              
              {/* Audio Player */}
              <AudioPlayer src={track.src} />
              
              {/* Action Bar */}
              <div className="pt-4 border-t border-[#E8E8ED] flex flex-col sm:flex-row gap-2 justify-end">
                <button onClick={() => handleDownload('MP3 DEMO', track.title)} className="text-[10px] sm:text-xs bg-[#F5F5F7] border border-[#E8E8ED] px-3 py-2 uppercase hover:bg-black/5 transition-colors">
                  [ MP3 DEMO ]
                </button>
                <button onClick={() => handleDownload('WAV UNCUT', track.title)} className="text-[10px] sm:text-xs bg-[#F5F5F7] border border-[#E8E8ED] px-3 py-2 uppercase hover:bg-black/5 transition-colors">
                  [ WAV UNCUT ]
                </button>
                <button onClick={() => handleDownload('STEMS', track.title)} className="text-[10px] sm:text-xs bg-[#F5F5F7] border border-[#E8E8ED] px-3 py-2 uppercase font-bold hover:bg-black/5 transition-colors">
                  [ DOWNLOAD STEMS (.ZIP) ]
                </button>
                <button onClick={() => openClearanceModal(track.title)} className="text-[10px] sm:text-xs bg-transparent border border-dashed border-[#1D1D1F] text-[#1D1D1F] px-4 py-2 uppercase hover:bg-[#F5F5F7] transition-colors ml-0 sm:ml-2">
                  [ REQUEST CLEARANCE ]
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <CollabModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        trackTitle={selectedTrack} 
      />
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

// Helper to get cookies in client
function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
}
