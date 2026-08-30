import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, serviceKey);
}

function ensurePublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.includes('/storage/v1/object/') && !url.includes('/storage/v1/object/public/')) {
    return url.replace('/storage/v1/object/', '/storage/v1/object/public/');
  }
  return url;
}

export async function POST(request: Request) {
  try {
    const supabase = getAdminClient();

    // 1. Das leichte JSON vom Frontend parsen
    const body = await request.json();

    // 2. Variablen aus dem Body extrahieren
    const {
      title,
      bpm,
      key,
      isVaultOnly,
      assignedUser,
      accessTier = 'standard',
      mp3Url,
      wavPath,
      flpPath,
    } = body;

    // 3. Sicherheitscheck: Mindestens eine Audio-Quelle vorhanden?
    if (!title || (!mp3Url && !wavPath)) {
      return NextResponse.json(
        { error: 'Missing required fields (title and at least one audio file)' },
        { status: 400 }
      );
    }

    // 4. In die Datenbank eintragen mit exakten Supabase-Spalten
    const { data: track, error: dbError } = await supabase
      .from('tracks')
      .insert([
        {
          title,
          bpm: bpm ? parseInt(String(bpm), 10) : null,
          key,
          mp3_url: ensurePublicUrl(mp3Url),
          wav_path: ensurePublicUrl(wavPath),
          flp_path: ensurePublicUrl(flpPath),
          is_vault_only: Boolean(isVaultOnly),
          access_tier: isVaultOnly ? (assignedUser || accessTier || 'artist') : 'standard',
        },
      ])
      .select()
      .single();

    if (dbError) throw new Error(`Database insert failed: ${dbError.message}`);

    return NextResponse.json({ success: true, track });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}