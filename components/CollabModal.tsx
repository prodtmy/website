'use client';

import { useState } from 'react';

export default function CollabModal({ 
  isOpen, 
  onClose, 
  trackTitle 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  trackTitle: string; 
}) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    
    // Simulate API call
    setTimeout(() => {
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        onClose();
      }, 2000);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm font-mono text-[#1D1D1F]">
      <div className="bg-[#FFFFFF] w-full max-w-md border border-[#E8E8ED] shadow-xl rounded-none relative">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-[#86868B] hover:text-black">
          [ X ]
        </button>

        {/* Header */}
        <div className="border-b border-dashed border-[#E8E8ED] p-6 pb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#1D1D1F]">
            [ REQUEST CLEARANCE // {trackTitle} ]
          </h2>
        </div>

        {/* Body */}
        <div className="p-6">
          {status === 'success' ? (
            <div className="text-center py-10 font-bold text-[#34C759] uppercase tracking-widest animate-pulse">
              [ REQUEST TRANSMITTED ]
            </div>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase">[ ARTIST / MANAGEMENT NAME ]</label>
                <input required type="text" className="w-full bg-[#F5F5F7] border border-[#E8E8ED] px-3 py-2 focus:outline-none focus:border-[#1D1D1F] text-sm" />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase">[ CONTACT (IG / TELEGRAM / EMAIL) ]</label>
                <input required type="text" className="w-full bg-[#F5F5F7] border border-[#E8E8ED] px-3 py-2 focus:outline-none focus:border-[#1D1D1F] text-sm" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase">[ PROPOSED USE / NOTES ]</label>
                <textarea required rows={3} className="w-full bg-[#F5F5F7] border border-[#E8E8ED] px-3 py-2 focus:outline-none focus:border-[#1D1D1F] text-sm resize-none"></textarea>
              </div>

              <button 
                type="submit" 
                disabled={status === 'submitting'}
                className="mt-4 w-full bg-[#1D1D1F] text-white text-sm font-bold px-4 py-3 hover:bg-black transition-colors uppercase disabled:opacity-50"
              >
                {status === 'submitting' ? '[ TRANSMITTING... ]' : '[ TRANSMIT REQUEST ]'}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
