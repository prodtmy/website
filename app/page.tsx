'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AudioPlayer from '@/components/AudioPlayer';
import { createClient } from '@/utils/supabase/client';

export default function ArchivePage() {
  const supabase = createClient();
  const [tracks, setTracks] = useState<any[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicTracks = async () => {
      try {
        const { data, error } = await supabase
          .from('tracks')
          .select('*')
          .eq('is_vault_only', false)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          const landingTracks = data.filter((t: any) => t.access_tier === 'landing');
          setTracks(landingTracks);
        }
      } catch (err) {
        console.error('Error fetching public tracks:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicTracks();
  }, []);

  const currentTrack = tracks[currentTrackIndex];

  const handleNext = () => {
    if (tracks.length === 0) return;
    setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
  };

  const handlePrev = () => {
    if (tracks.length === 0) return;
    setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
  };

  const handleCopyInfo = () => {
    if (!currentTrack) return;
    const info = `${currentTrack.title} - ${currentTrack.bpm} BPM - ${currentTrack.key}`;
    navigator.clipboard.writeText(info).then(() => {
      alert('Track info copied to clipboard!');
    });
  };

  return (
    <div className="bg-[#F5F5F7] text-[#1D1D1F] font-mono antialiased min-h-screen flex flex-col justify-between select-none">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E8E8ED]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg text-[#1D1D1F] tracking-tight">tmy</Link>
          <nav className="flex items-center gap-2 sm:gap-4 text-xs font-medium">
            <Link href="/" className="text-[#1D1D1F] hover:bg-black/5 px-2.5 py-1.5 rounded transition-colors flex items-center">[ ARCHIVE ]</Link>
            <Link href="/vault" className="text-[#86868B] hover:text-[#1D1D1F] px-2.5 py-1.5 transition-colors flex items-center">[ VAULT ]</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 sm:py-12 flex flex-col justify-center gap-8">
        <section className="text-center space-y-2">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-wider text-[#1D1D1F] uppercase">
            TMY — AUDIO ARCHIVE // VOL. 01
          </h1>
          <p className="text-xs sm:text-sm text-[#86868B]">
            Selected public previews. Full stems and unreleased loops available in the Vault.
          </p>
        </section>

        <section className="w-full">
          <div className="bg-white rounded-lg border border-[#E8E8ED] shadow-sm p-6 sm:p-8 flex flex-col gap-6 w-full">
            {loading ? (
              <div className="text-center text-xs text-[#86868B] py-8">[ LOADING ARCHIVE... ]</div>
            ) : currentTrack ? (
              <>
                {/* Track Info */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-base sm:text-lg text-[#1D1D1F] tracking-wide truncate">
                      {currentTrack.title}
                    </span>
                    <span className="text-xs text-[#86868B] mt-0.5">
                      {currentTrack.bpm} BPM // {currentTrack.key}
                    </span>
                  </div>
                  <button 
                    onClick={handleCopyInfo} 
                    className="text-[10px] sm:text-xs text-[#1D1D1F] bg-transparent hover:bg-[#F5F5F7] border border-[#E8E8ED] px-3 py-2 flex items-center justify-center rounded transition-colors whitespace-nowrap"
                  >
                    [ COPY INFO ]
                  </button>
                </div>

                {/* Audio Player Component */}
                <AudioPlayer src={currentTrack.mp3_url} />

                {/* Navigation Controls */}
                <div className="pt-4 border-t border-[#E8E8ED] flex items-center justify-between">
                  <button 
                    onClick={handlePrev} 
                    className="text-xs text-[#86868B] hover:text-[#1D1D1F] transition-colors uppercase font-bold px-3 sm:px-4 py-2 hover:bg-black/5 rounded flex items-center justify-center"
                  >
                    [ PREV ]
                  </button>
                  <button 
                    onClick={handleNext} 
                    className="text-xs text-[#86868B] hover:text-[#1D1D1F] transition-colors uppercase font-bold px-3 sm:px-4 py-2 hover:bg-black/5 rounded flex items-center justify-center"
                  >
                    [ NEXT ]
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center text-xs text-[#86868B] py-8">[ NO PUBLIC TRACKS FOUND ]</div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between text-[10px] text-[#86868B] border-t border-[#E8E8ED]">
        <span>© 2026 TMY ARCHIVE // ALL RIGHTS RESERVED</span>
        <Link href="/vault" className="hover:text-[#1D1D1F] transition-colors">[ ENTER VAULT ↵ ]</Link>
      </footer>
    </div>
  );
}
