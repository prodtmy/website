'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { analyzeAudioFile } from '@/utils/audioAnalyzer';

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
  const [editBpm, setEditBpm] = useState<number | string>('');
  const [editKey, setEditKey] = useState('F# MIN');
  const [editCredits, setEditCredits] = useState('PROD. TMY');
  const [editDestination, setEditDestination] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [editLanding, setEditLanding] = useState('true');
  const [editAssignedUser, setEditAssignedUser] = useState('');
  const [editMp3File, setEditMp3File] = useState<File | null>(null);
  const [editWavFile, setEditWavFile] = useState<File | null>(null);
  const [editFlpFile, setEditFlpFile] = useState<File | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState('ARTIST');
  const [editUserKey, setEditUserKey] = useState('');
  const [editUserStatus, setEditUserStatus] = useState(true);
  const [editUserSaving, setEditUserSaving] = useState(false);

  // Tab 2: Upload Asset State
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState('BEAT');
  const [uploadBpm, setUploadBpm] = useState('');
  const [uploadKey, setUploadKey] = useState('');
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const [uploadDestination, setUploadDestination] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [uploadLanding, setUploadLanding] = useState<'ON' | 'OFF'>('OFF');
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

  const togglePlay = (trackId: string, src: string | null) => {
    if (!audioRef.current) return;

    if (playingTrackId === trackId) {
      audioRef.current.pause();
      setPlayingTrackId(null);
    } else {
      if (!src) {
        alert("Für diesen Track wurde keine Vorschau-Datei verknüpft.");
        return;
      }

      const tryPlay = (srcToTry: string, isRetry = false) => {
        audioRef.current!.src = srcToTry;
        audioRef.current!.play().then(() => {
          setPlayingTrackId(trackId);
        }).catch(err => {
          console.error("Audio playback error:", err);
          if (!isRetry && srcToTry.includes('/tracks/')) {
            const fallbackSrc = srcToTry.replace('/tracks/', '/previews/');
            tryPlay(fallbackSrc, true);
            return;
          }
          alert("Audio konnte nicht geladen werden (403/404). Bitte lade die MP3-Datei im Admin-Panel neu hoch (Bucket: previews) oder stelle den Bucket 'previews' in Supabase auf Public.");
        });
      };

      tryPlay(src);
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
    window.location.href = '/';
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
        if (value === 'PUBLIC') updateData.access_tier = 'standard';
      }
      else if (field === 'landing') {
        if (value === 'true') {
          updateData.is_vault_only = false;
          updateData.access_tier = 'landing';
        } else {
          updateData.access_tier = 'standard';
        }
      }
      else if (field === 'assigned_user') {
        updateData.is_vault_only = true;
        updateData.access_tier = value || 'artist';
      }

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_track',
          payload: { id, updateData }
        })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);
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
    setEditBpm(track.bpm || '');
    setEditKey(track.key || '');
    setEditCredits(track.credits || 'PROD. TMY');
    setEditDestination(track.is_vault_only ? 'PRIVATE' : 'PUBLIC');
    setEditLanding(track.access_tier === 'landing' ? 'true' : 'false');
    setEditAssignedUser(track.assigned_user || '');
    setEditMp3File(null);
    setEditWavFile(null);
    setEditFlpFile(null);
  };

  const uploadFileViaApi = async (file: File, bucket: string, folder: string) => {
    // 1. Get signed upload URL token from server (tiny JSON request to Vercel)
    const res = await fetch('/api/get-upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket, filename: file.name, folder }),
    });

    const urlData = await res.json();
    if (!res.ok) throw new Error(urlData.error || 'Upload URL generation failed');

    // 2. Upload file directly from browser to Supabase Storage via signed token!
    // Completely bypasses Vercel 4.5MB limit & Storage RLS policies!
    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .uploadToSignedUrl(urlData.path, urlData.token, file);

    if (uploadErr) {
      throw new Error(`Direct upload failed: ${uploadErr.message}`);
    }

    return urlData.publicUrl as string;
  };

  const handleSaveTrackEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrack) return;
    setEditSaving(true);

    try {
      let mp3Url = editingTrack.mp3_url;
      let wavPath = editingTrack.wav_path;
      let flpPath = editingTrack.flp_path;

      // 1. Replace MP3 preview if selected (via Server API)
      if (editMp3File) {
        mp3Url = await uploadFileViaApi(editMp3File, 'previews', 'mp3');
      }

      // 2. Replace WAV if selected (via Server API)
      if (editWavFile) {
        wavPath = await uploadFileViaApi(editWavFile, 'previews', 'wav');
      }

      // 3. Replace FLP / Stems if selected (via Server API)
      if (editFlpFile) {
        flpPath = await uploadFileViaApi(editFlpFile, 'tracks', 'stems');
      }

      const isVaultOnly = editDestination === 'PRIVATE';
      const computedAccessTier = isVaultOnly
        ? (editAssignedUser || 'artist')
        : (editLanding === 'true' ? 'landing' : 'standard');

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_track',
          payload: {
            id: editingTrack.id,
            updateData: {
              title: editTitle,
              track_type: editType,
              bpm: editBpm ? parseInt(String(editBpm), 10) : null,
              key: editKey || null,
              credits: editCredits,
              is_vault_only: isVaultOnly,
              access_tier: computedAccessTier,
              ...(mp3Url && { mp3_url: mp3Url }),
              ...(wavPath && { wav_path: wavPath }),
              ...(flpPath && { flp_path: flpPath }),
            }
          }
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);

      alert('Track erfolgreich aktualisiert!');
      setEditingTrack(null);
      fetchData();
    } catch (err: any) {
      alert(`Fehler beim Speichern: ${err.message}`);
    } finally {
      setEditSaving(false);
    }
  };

  // Delete Track
  const handleDeleteTrack = async (id: string) => {
    if (!confirm('Diesen Track wirklich unwiderruflich löschen?')) return;
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_track', payload: { id } })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);
      fetchData();
    } catch (err: any) {
      alert(`Fehler beim Löschen: ${err.message}`);
    }
  };

  const parseTrackFilename = (filename: string) => {
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '').trim();

    let bpm: string | null = null;
    let key: string | null = null;

    // 1. Detect BPM: e.g. 140bpm, 140 bpm, 140BPM, _140_
    const bpmMatch = nameWithoutExt.match(/(?:^|[\s_.-])(7[0-9]|[8-9][0-9]|1[0-9]{2})\s*(?:bpm)?(?:$|[\s_.-])/i);
    if (bpmMatch) {
      bpm = bpmMatch[1];
    }

    // 2. Detect Key: e.g. F#m, F# min, F# minor, F# maj, C#m, Bb maj, Fm, G# MIN
    const keyMatch = nameWithoutExt.match(/(?:^|[\s_.-])([A-G][b#]?)\s*(min|maj|minor|major|m)?(?:$|[\s_.-])/i);
    if (keyMatch) {
      const root = keyMatch[1].toUpperCase();
      const modeRaw = (keyMatch[2] || '').toLowerCase();

      let mode = 'MIN';
      if (modeRaw === 'maj' || modeRaw === 'major') {
        mode = 'MAJ';
      } else if (modeRaw === 'min' || modeRaw === 'minor' || modeRaw === 'm') {
        mode = 'MIN';
      }
      key = `${root} ${mode}`;
    }

    // 3. Clean Title
    let cleanTitle = nameWithoutExt;
    if (bpm) {
      cleanTitle = cleanTitle.replace(new RegExp(`(?:^|[\\s_.-])${bpm}\\s*(?:bpm)?(?:$|[\\s_.-])`, 'gi'), ' ');
    }
    if (keyMatch) {
      cleanTitle = cleanTitle.replace(keyMatch[0], ' ');
    }
    cleanTitle = cleanTitle.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

    return {
      title: cleanTitle ? cleanTitle.toUpperCase() : nameWithoutExt.toUpperCase(),
      bpm,
      key,
    };
  };

  const processSelectedFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    let newMp3: File | null = null;
    let newWav: File | null = null;
    let newFlp: File | null = null;

    fileArray.forEach(file => {
      const ext = file.name.toLowerCase().split('.').pop() || '';
      if (['mp3', 'm4a', 'aac', 'ogg'].includes(ext)) {
        newMp3 = file;
      } else if (['wav', 'flac', 'aiff', 'aif'].includes(ext)) {
        newWav = file;
      } else if (['zip', 'rar', 'flp', '7z'].includes(ext)) {
        newFlp = file;
      } else {
        if (!newMp3) newMp3 = file;
      }
    });

    if (newMp3) setMp3File(newMp3);
    if (newWav) setWavFile(newWav);
    if (newFlp) setFlpFile(newFlp);
    setDropzoneFile(fileArray[0]);

    const primaryAudio = (newMp3 || newWav) as File | null;
    if (primaryAudio) {
      const parsed = parseTrackFilename((primaryAudio as File).name);
      if (parsed.title) setUploadTitle(parsed.title);
      if (parsed.bpm) setUploadBpm(parsed.bpm);
      if (parsed.key) setUploadKey(parsed.key);

      // Perform deep Audio Buffer Analysis via Web Audio API if BPM or Key is missing from filename!
      if (!parsed.bpm || !parsed.key) {
        setIsAnalyzingAudio(true);
        analyzeAudioFile(primaryAudio)
          .then(({ bpm, key }) => {
            if (bpm && !parsed.bpm) setUploadBpm(bpm);
            if (key && !parsed.key) setUploadKey(key);
          })
          .finally(() => {
            setIsAnalyzingAudio(false);
          });
      }
    }
  };

  // Asset Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Minimum requirement: At least MP3 or WAV audio file
    if (!mp3File && !wavFile) {
      alert('Bitte mindestens eine Audio-Datei (MP3 oder WAV) auswählen.');
      return;
    }

    setUploadProgress(10);
    try {
      const timestamp = Date.now();
      const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9._-]/g, '_');

      let uploadedMp3Url: string | null = null;
      let uploadedWavUrl: string | null = null;
      let uploadedFlpUrl: string | null = null;

      // 1. Upload MP3 if provided (previews bucket via Server API)
      if (mp3File) {
        uploadedMp3Url = await uploadFileViaApi(mp3File, 'previews', 'mp3');
      }
      setUploadProgress(40);

      // 2. Upload WAV if provided (previews bucket via Server API)
      if (wavFile) {
        uploadedWavUrl = await uploadFileViaApi(wavFile, 'previews', 'wav');
      }
      setUploadProgress(70);

      // 3. Upload FLP / Stems if provided (tracks bucket via Server API)
      if (flpFile) {
        uploadedFlpUrl = await uploadFileViaApi(flpFile, 'tracks', 'stems');
      }
      setUploadProgress(90);

      const isVaultOnly = uploadDestination === 'PRIVATE';
      const computedAccessTier = isVaultOnly
        ? (uploadAssignedUser || 'artist')
        : (uploadLanding === 'ON' ? 'landing' : 'standard');

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
          accessTier: computedAccessTier,
          mp3Url: uploadedMp3Url || '',
          wavPath: uploadedWavUrl || null,
          flpPath: uploadedFlpUrl || null,
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
      fetchData();
    } catch (err: any) {
      alert(`Upload-Fehler: ${err.message}`);
      setUploadProgress(null);
    }
  };

  // User Edit Modal
  const openUserEditModal = (user: any) => {
    setEditingUser(user);
    setEditUserName(user.client_name || '');
    setEditUserRole(user.access_tier?.toUpperCase() || 'ARTIST');
    setEditUserKey(user.code || '');
    setEditUserStatus(user.is_active !== false);
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditUserSaving(true);

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_user',
          payload: {
            id: editingUser.id,
            updateData: {
              client_name: editUserName,
              access_tier: editUserRole.toLowerCase(),
              code: editUserKey,
              is_active: editUserStatus,
            }
          }
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);

      alert('Benutzer erfolgreich aktualisiert!');
      setEditingUser(null);
      fetchData();
    } catch (err: any) {
      alert(`Fehler beim Aktualisieren: ${err.message}`);
    } finally {
      setEditUserSaving(false);
    }
  };

  const handleToggleUserStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_user',
          payload: {
            id,
            updateData: { is_active: !currentStatus }
          }
        })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);
      fetchData();
    } catch (err: any) {
      alert(`Error toggling status: ${err.message}`);
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_user',
          payload: {
            client_name: newUserName,
            access_tier: newUserRole.toLowerCase(),
            code: newUserKey,
          }
        })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);

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
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_user', payload: { id } })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error);
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
              placeholder="ENTER MASTER KEY..."
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

                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-[#86868B] uppercase">LANDING PAGE:</span>
                                    <select
                                      value={track.access_tier === 'landing' ? 'true' : 'false'}
                                      onChange={(e) => handleUpdateTrackField(track.id, 'landing', e.target.value)}
                                      className="bg-transparent border-none text-xs focus:outline-none font-mono rounded cursor-pointer font-bold"
                                    >
                                      <option value="true">ON (FEATURED)</option>
                                      <option value="false">OFF (HIDDEN)</option>
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
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-900">[ ASSET UPLOAD // MEDIA DEPLOYMENT ]</h2>
                    <span className="text-[9px] font-bold uppercase bg-zinc-900 text-white px-2 py-0.5 rounded-full tracking-wider">PRO STUDIO</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Deploy audio previews, uncompressed master WAVs, stem archives (.ZIP) or FL Studio project files (.FLP).</p>
                </div>
              </div>

              {/* Drag & Drop Zone */}
              <div 
                className={`dropzone p-8 sm:p-12 text-center rounded-xl relative group flex flex-col items-center justify-center gap-4 border-2 border-dashed transition-all duration-200 shadow-sm ${
                  mp3File || wavFile || flpFile 
                    ? 'border-zinc-900 bg-gradient-to-b from-zinc-50/80 to-white shadow-md' 
                    : 'border-zinc-300 hover:border-zinc-900 bg-white hover:bg-zinc-50/60'
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    processSelectedFiles(e.dataTransfer.files);
                  }
                }}
              >
                <input 
                  type="file" 
                  multiple
                  accept="audio/*,.wav,.zip,.rar,.flp,.mp4"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      processSelectedFiles(e.target.files);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                />
                
                <div className="w-12 h-12 rounded-full bg-zinc-100 group-hover:bg-zinc-900 group-hover:text-white text-zinc-600 flex items-center justify-center transition-all duration-200 group-hover:scale-110 shadow-inner">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                  </svg>
                </div>

                {mp3File || wavFile || flpFile ? (
                  <div className="w-full max-w-xl space-y-2 z-20 relative pointer-events-auto">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">[ ATTACHED ASSETS ]</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setMp3File(null);
                          setWavFile(null);
                          setFlpFile(null);
                          setDropzoneFile(null);
                        }}
                        className="text-[10px] font-mono text-zinc-400 hover:text-red-600 transition-colors uppercase underline"
                      >
                        [ CLEAR ALL ]
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left">
                      {/* MP3 Pill */}
                      <div className={`p-3 rounded-lg border text-xs font-mono transition-all ${mp3File ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950' : 'border-dashed border-zinc-200 bg-zinc-50/50 text-zinc-400'}`}>
                        <div className="flex items-center justify-between font-bold text-[10px] uppercase">
                          <span>MP3 PREVIEW</span>
                          {mp3File ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-emerald-600 font-sans text-[9px] bg-emerald-100 px-1.5 py-0.5 rounded font-bold">READY</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setMp3File(null);
                                }}
                                className="w-4 h-4 rounded-full bg-emerald-200 hover:bg-red-500 hover:text-white text-emerald-800 flex items-center justify-center text-[9px] transition-colors"
                                title="Remove MP3"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <span>OPTIONAL</span>
                          )}
                        </div>
                        <p className="truncate mt-1 text-[11px] font-semibold">{mp3File ? mp3File.name : 'Not selected'}</p>
                      </div>

                      {/* WAV Pill */}
                      <div className={`p-3 rounded-lg border text-xs font-mono transition-all ${wavFile ? 'border-blue-200 bg-blue-50/70 text-blue-950' : 'border-dashed border-zinc-200 bg-zinc-50/50 text-zinc-400'}`}>
                        <div className="flex items-center justify-between font-bold text-[10px] uppercase">
                          <span>MASTER WAV</span>
                          {wavFile ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-blue-600 font-sans text-[9px] bg-blue-100 px-1.5 py-0.5 rounded font-bold">READY</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setWavFile(null);
                                }}
                                className="w-4 h-4 rounded-full bg-blue-200 hover:bg-red-500 hover:text-white text-blue-800 flex items-center justify-center text-[9px] transition-colors"
                                title="Remove WAV"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <span>OPTIONAL</span>
                          )}
                        </div>
                        <p className="truncate mt-1 text-[11px] font-semibold">{wavFile ? wavFile.name : 'Not selected'}</p>
                      </div>

                      {/* STEMS Pill */}
                      <div className={`p-3 rounded-lg border text-xs font-mono transition-all ${flpFile ? 'border-purple-200 bg-purple-50/70 text-purple-950' : 'border-dashed border-zinc-200 bg-zinc-50/50 text-zinc-400'}`}>
                        <div className="flex items-center justify-between font-bold text-[10px] uppercase">
                          <span>STEMS / FLP</span>
                          {flpFile ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-purple-600 font-sans text-[9px] bg-purple-100 px-1.5 py-0.5 rounded font-bold">READY</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setFlpFile(null);
                                }}
                                className="w-4 h-4 rounded-full bg-purple-200 hover:bg-red-500 hover:text-white text-purple-800 flex items-center justify-center text-[9px] transition-colors"
                                title="Remove STEMS/FLP"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <span>OPTIONAL</span>
                          )}
                        </div>
                        <p className="truncate mt-1 text-[11px] font-semibold">{flpFile ? flpFile.name : 'Not selected'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 block">
                      DRAG & DROP FILES HERE (MP3, WAV, ZIP / FLP)
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      OR CLICK ANYWHERE TO BROWSE LOCAL DISK
                    </span>
                  </div>
                )}
                
                <div className="text-[10px] text-zinc-400 bg-zinc-100/80 px-3 py-1 rounded-full font-mono uppercase">
                  REQUIREMENT: MINIMUM 1 AUDIO FILE (MP3 OR WAV)
                </div>
              </div>

              {/* Upload Progress Bar */}
              {uploadProgress !== null && (
                <div className="space-y-2 bg-zinc-900 text-white p-4 rounded-xl shadow-lg">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold tracking-wider">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      TRANSMITTING ASSETS TO SUPABASE STORAGE SECTOR...
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden p-0.5">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}

              {/* Metadata Form */}
              <form onSubmit={handleUploadSubmit} className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-2">
                    <span>🎛️</span>
                    <span>[ METADATA CONFIGURATION ]</span>
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-400">ID: AUTO_GEN</span>
                </div>

                <div key={fileInputKey} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-zinc-900">[ TRACK TITLE ]</label>
                    <input 
                      type="text" 
                      value={uploadTitle} 
                      onChange={(e) => setUploadTitle(e.target.value)} 
                      required 
                      placeholder="e.g. CYBER_PUNK_140" 
                      className="w-full bg-zinc-50 border border-zinc-200 text-xs px-3.5 py-2.5 focus:outline-none focus:border-zinc-900 focus:bg-white font-mono uppercase rounded-md transition-all font-semibold" 
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-zinc-900">[ TYPE ]</label>
                    <select 
                      value={uploadType} 
                      onChange={(e) => setUploadType(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 text-xs px-3.5 py-2.5 focus:outline-none focus:border-zinc-900 focus:bg-white font-mono font-bold rounded-md transition-all"
                    >
                      <option value="BEAT">BEAT</option>
                      <option value="LOOP">LOOP</option>
                      <option value="IDEA">IDEA</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase text-zinc-900">[ BPM ]</label>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase">OPTIONAL</span>
                    </div>
                    <input 
                      type="text" 
                      value={uploadBpm} 
                      onChange={(e) => setUploadBpm(e.target.value)} 
                      placeholder={isAnalyzingAudio ? "Detecting..." : "e.g. 140"}
                      className="w-full bg-zinc-50 border border-zinc-200 text-xs px-3.5 py-2.5 focus:outline-none focus:border-zinc-900 focus:bg-white font-mono rounded-md transition-all font-semibold" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase text-zinc-900">[ KEY ]</label>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase">OPTIONAL</span>
                    </div>
                    <input 
                      type="text" 
                      value={uploadKey} 
                      onChange={(e) => setUploadKey(e.target.value)} 
                      placeholder={isAnalyzingAudio ? "Detecting..." : "e.g. F# MIN"}
                      className="w-full bg-zinc-50 border border-zinc-200 text-xs px-3.5 py-2.5 focus:outline-none focus:border-zinc-900 focus:bg-white font-mono uppercase rounded-md transition-all font-semibold" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-zinc-900">[ TARGET VAULT ]</label>
                    <select 
                      value={uploadDestination} 
                      onChange={(e: any) => {
                        const val = e.target.value;
                        setUploadDestination(val);
                        if (val === 'PUBLIC') {
                          setUploadAssignedUser('');
                        }
                      }}
                      className="w-full bg-zinc-50 border border-zinc-200 text-xs px-3.5 py-2.5 focus:outline-none focus:border-zinc-900 focus:bg-white font-mono font-bold rounded-md transition-all"
                    >
                      <option value="PUBLIC">PUBLIC VAULT (All Vault Users)</option>
                      <option value="PRIVATE">PRIVATE VAULT (Assigned User Only)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-zinc-900">[ LANDING PAGE FEATURED ]</label>
                    <select 
                      value={uploadLanding} 
                      onChange={(e: any) => setUploadLanding(e.target.value)}
                      disabled={uploadDestination === 'PRIVATE'}
                      className="w-full bg-zinc-50 border border-zinc-200 text-xs px-3.5 py-2.5 focus:outline-none focus:border-zinc-900 focus:bg-white font-mono font-bold rounded-md transition-all disabled:opacity-40"
                    >
                      <option value="OFF">OFF (HIDDEN FROM LANDING PAGE)</option>
                      <option value="ON">ON (FEATURED ON LANDING PAGE)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-zinc-900">[ ASSIGN TO USER ]</label>
                    <select 
                      value={uploadAssignedUser} 
                      onChange={(e) => setUploadAssignedUser(e.target.value)}
                      disabled={uploadDestination === 'PUBLIC'}
                      className="w-full bg-zinc-50 border border-zinc-200 text-xs px-3.5 py-2.5 focus:outline-none focus:border-zinc-900 focus:bg-white font-mono font-bold disabled:opacity-40 rounded-md transition-all"
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

                {/* Additional File Pickers */}
                <div className="space-y-2 pt-3 border-t border-zinc-100">
                  <span className="text-[11px] font-bold uppercase text-zinc-900 block">[ INDIVIDUAL FILE PICKERS ]</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* MP3 Picker */}
                    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase text-zinc-700">
                        <span>PREVIEW MP3</span>
                        {mp3File ? <span className="text-emerald-600">✓ ATTACHED</span> : <span className="text-zinc-400">OPTIONAL</span>}
                      </div>
                      <input 
                        type="file" 
                        accept="audio/*" 
                        onChange={(e) => setMp3File(e.target.files?.[0] || null)}
                        className="w-full text-[11px] text-zinc-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-zinc-200 hover:file:bg-zinc-300 cursor-pointer" 
                      />
                    </div>

                    {/* WAV Picker */}
                    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase text-zinc-700">
                        <span>MASTER WAV</span>
                        {wavFile ? <span className="text-blue-600">✓ ATTACHED</span> : <span className="text-zinc-400">OPTIONAL</span>}
                      </div>
                      <input 
                        type="file" 
                        accept="audio/wav,audio/x-wav,.wav" 
                        onChange={(e) => setWavFile(e.target.files?.[0] || null)}
                        className="w-full text-[11px] text-zinc-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-zinc-200 hover:file:bg-zinc-300 cursor-pointer" 
                      />
                    </div>

                    {/* FLP Picker */}
                    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase text-zinc-700">
                        <span>STEMS / FLP</span>
                        {flpFile ? <span className="text-purple-600">✓ ATTACHED</span> : <span className="text-zinc-400">OPTIONAL</span>}
                      </div>
                      <input 
                        type="file" 
                        accept=".flp,.zip,.rar" 
                        onChange={(e) => setFlpFile(e.target.files?.[0] || null)}
                        className="w-full text-[11px] text-zinc-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-zinc-200 hover:file:bg-zinc-300 cursor-pointer" 
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-zinc-900 to-black text-white hover:from-black hover:to-zinc-800 text-xs font-bold py-3.5 px-6 rounded-lg transition-all shadow-md hover:shadow-lg active:scale-[0.99] flex items-center justify-center gap-2 uppercase tracking-widest mt-4"
                >
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  <span>[ DEPLOY ASSETS TO VAULT SECTOR ]</span>
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
                      <option value="ARTIST_FULL">ARTIST FULL (Public + Private Vault Access)</option>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-xl p-6 sm:p-7 border border-zinc-200 rounded-2xl relative shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button 
              type="button"
              onClick={() => setEditingTrack(null)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-900 transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">[ EDIT ASSET // RE-DEPLOY ]</h3>
                <span className="text-[9px] font-mono text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">ID: {editingTrack.id.slice(0, 8)}</span>
              </div>
            </div>

            <form onSubmit={handleSaveTrackEdit} className="space-y-4">
              {/* Row 1: Title & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold uppercase text-zinc-900">[ TITLE ]</label>
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required 
                    className="w-full bg-zinc-50 border border-zinc-200 text-xs px-3.5 py-2.5 focus:outline-none focus:border-zinc-900 font-mono uppercase rounded-md font-semibold" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-zinc-900">[ TYPE ]</label>
                  <select 
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 text-xs px-3.5 py-2.5 focus:outline-none focus:border-zinc-900 font-mono font-bold rounded-md"
                  >
                    <option value="BEAT">BEAT</option>
                    <option value="LOOP">LOOP</option>
                    <option value="IDEA">IDEA</option>
                  </select>
                </div>
              </div>

              {/* Row 2: BPM, Key, Credits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase text-zinc-900">[ BPM ]</label>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase">OPTIONAL</span>
                  </div>
                  <input 
                    type="text" 
                    value={editBpm}
                    onChange={(e) => setEditBpm(e.target.value)}
                    placeholder="e.g. 140"
                    className="w-full bg-zinc-50 border border-zinc-200 text-xs px-3.5 py-2.5 focus:outline-none focus:border-zinc-900 font-mono rounded-md font-semibold" 
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase text-zinc-900">[ KEY ]</label>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase">OPTIONAL</span>
                  </div>
                  <input 
                    type="text" 
                    value={editKey}
                    onChange={(e) => setEditKey(e.target.value)}
                    placeholder="e.g. F# MIN"
                    className="w-full bg-zinc-50 border border-zinc-200 text-xs px-3.5 py-2.5 focus:outline-none focus:border-zinc-900 font-mono uppercase rounded-md font-semibold" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-zinc-900">[ CREDITS ]</label>
                  <input 
                    type="text" 
                    value={editCredits}
                    onChange={(e) => setEditCredits(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 text-xs px-3.5 py-2.5 focus:outline-none focus:border-zinc-900 font-mono uppercase rounded-md font-semibold" 
                  />
                </div>
              </div>

              {/* Row 3: Vault Target, Landing, Assign User */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-zinc-100">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-zinc-900">[ TARGET VAULT ]</label>
                  <select 
                    value={editDestination}
                    onChange={(e: any) => {
                      const val = e.target.value;
                      setEditDestination(val);
                      if (val === 'PUBLIC') setEditAssignedUser('');
                    }}
                    className="w-full bg-zinc-50 border border-zinc-200 text-xs px-3 py-2.5 focus:outline-none font-mono font-bold rounded-md"
                  >
                    <option value="PUBLIC">PUBLIC VAULT</option>
                    <option value="PRIVATE">PRIVATE VAULT</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-zinc-900">[ LANDING PAGE ]</label>
                  <select 
                    value={editLanding}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditLanding(val);
                      if (val === 'true') {
                        setEditDestination('PUBLIC');
                        setEditAssignedUser('');
                      } else {
                        setEditDestination('PRIVATE');
                      }
                    }}
                    className="w-full bg-zinc-50 border border-zinc-200 text-xs px-3 py-2.5 focus:outline-none font-mono font-bold rounded-md"
                  >
                    <option value="true">ON (VISIBLE ON LANDING)</option>
                    <option value="false">OFF (HIDDEN / PRIVATE)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-zinc-900">[ ASSIGN USER ]</label>
                  <select 
                    value={editAssignedUser}
                    onChange={(e) => setEditAssignedUser(e.target.value)}
                    disabled={editDestination === 'PUBLIC'}
                    className="w-full bg-zinc-50 border border-zinc-200 text-xs px-3 py-2.5 focus:outline-none font-mono font-bold rounded-md disabled:opacity-40"
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

              {/* Row 4: Replace 3 Audio Files */}
              <div className="space-y-2 pt-3 border-t border-zinc-100">
                <span className="text-[11px] font-bold uppercase text-zinc-900 block">[ REPLACE ASSET FILES ]</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Replace MP3 */}
                  <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-zinc-700">
                      <span>PREVIEW MP3</span>
                      {editingTrack.mp3_url ? <span className="text-emerald-600">✓ LINKED</span> : <span className="text-zinc-400">EMPTY</span>}
                    </div>
                    <input 
                      type="file" 
                      accept="audio/*" 
                      onChange={(e) => setEditMp3File(e.target.files?.[0] || null)}
                      className="w-full text-[10px] text-zinc-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-zinc-200 hover:file:bg-zinc-300 cursor-pointer" 
                    />
                    {editMp3File && <p className="text-[9px] text-emerald-700 truncate font-mono font-bold">New: {editMp3File.name}</p>}
                  </div>

                  {/* Replace WAV */}
                  <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-zinc-700">
                      <span>MASTER WAV</span>
                      {editingTrack.wav_path ? <span className="text-blue-600">✓ LINKED</span> : <span className="text-zinc-400">EMPTY</span>}
                    </div>
                    <input 
                      type="file" 
                      accept="audio/wav,audio/x-wav,.wav" 
                      onChange={(e) => setEditWavFile(e.target.files?.[0] || null)}
                      className="w-full text-[10px] text-zinc-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-zinc-200 hover:file:bg-zinc-300 cursor-pointer" 
                    />
                    {editWavFile && <p className="text-[9px] text-blue-700 truncate font-mono font-bold">New: {editWavFile.name}</p>}
                  </div>

                  {/* Replace FLP / Stems */}
                  <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-zinc-700">
                      <span>STEMS / FLP</span>
                      {editingTrack.flp_path ? <span className="text-purple-600">✓ LINKED</span> : <span className="text-zinc-400">EMPTY</span>}
                    </div>
                    <input 
                      type="file" 
                      accept=".flp,.zip,.rar" 
                      onChange={(e) => setEditFlpFile(e.target.files?.[0] || null)}
                      className="w-full text-[10px] text-zinc-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-zinc-200 hover:file:bg-zinc-300 cursor-pointer" 
                    />
                    {editFlpFile && <p className="text-[9px] text-purple-700 truncate font-mono font-bold">New: {editFlpFile.name}</p>}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button 
                  type="button"
                  onClick={() => setEditingTrack(null)}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold py-3 rounded-lg transition-colors uppercase tracking-wider"
                >
                  [ CANCEL ]
                </button>
                <button 
                  type="submit" 
                  disabled={editSaving}
                  className="flex-1 bg-gradient-to-r from-zinc-900 to-black text-white hover:from-black hover:to-zinc-800 text-xs font-bold py-3 rounded-lg transition-all shadow-md hover:shadow-lg uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {editSaving ? (
                    <span>[ SAVING CHANGES... ]</span>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                      <span>[ SAVE CHANGES ]</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md p-6 sm:p-7 border border-zinc-200 rounded-2xl relative shadow-2xl space-y-5">
            <button 
              type="button"
              onClick={() => setEditingUser(null)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-900 transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">[ EDIT USER CREDENTIALS ]</h3>
                <span className="text-[9px] font-mono text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">ID: {editingUser.id.slice(0, 8)}</span>
              </div>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-zinc-900">[ CLIENT / USER NAME ]</label>
                <input 
                  type="text" 
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  required 
                  className="w-full bg-zinc-50 border border-zinc-200 text-xs px-3.5 py-2.5 focus:outline-none focus:border-zinc-900 font-mono font-semibold rounded-md transition-all" 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase text-zinc-900">[ ROLE / CLEARANCE ]</label>
                  <select 
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 text-xs px-3.5 py-2.5 focus:outline-none focus:border-zinc-900 font-mono font-bold rounded-md transition-all"
                  >
                    <option value="ARTIST">ARTIST (Private Vault Only)</option>
                    <option value="ARTIST_FULL">ARTIST FULL (Public + Private Access)</option>
                    <option value="VIP">VIP (Collab Access)</option>
                    <option value="PRODUCER">PRODUCER (Upload Access)</option>
                    <option value="ADMIN">ADMIN (Full Governance)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase text-zinc-900">[ STATUS ]</label>
                  <select 
                    value={editUserStatus ? 'true' : 'false'}
                    onChange={(e) => setEditUserStatus(e.target.value === 'true')}
                    className="w-full bg-zinc-50 border border-zinc-200 text-xs px-3.5 py-2.5 focus:outline-none focus:border-zinc-900 font-mono font-bold rounded-md transition-all"
                  >
                    <option value="true">ACTIVE (ENABLED)</option>
                    <option value="false">INACTIVE (REVOKED)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-zinc-900">[ ACCESS KEY ]</label>
                <input 
                  type="text" 
                  value={editUserKey}
                  onChange={(e) => setEditUserKey(e.target.value)}
                  required 
                  className="w-full bg-zinc-50 border border-zinc-200 text-xs px-3.5 py-2.5 focus:outline-none focus:border-zinc-900 font-mono uppercase font-semibold rounded-md transition-all" 
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button 
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold py-3 rounded-lg transition-colors uppercase tracking-wider"
                >
                  [ CANCEL ]
                </button>
                <button 
                  type="submit" 
                  disabled={editUserSaving}
                  className="flex-1 bg-gradient-to-r from-zinc-900 to-black text-white hover:from-black hover:to-zinc-800 text-xs font-bold py-3 rounded-lg transition-all shadow-md hover:shadow-lg uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {editUserSaving ? (
                    <span>[ UPDATING... ]</span>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                      <span>[ UPDATE USER ]</span>
                    </>
                  )}
                </button>
              </div>
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