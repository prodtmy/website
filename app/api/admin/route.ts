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
    const body = await request.json();
    const { action, payload } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action required' }, { status: 400 });
    }

    if (action === 'update_track') {
      const { id, updateData } = payload;
      
      if (updateData.mp3_url) updateData.mp3_url = ensurePublicUrl(updateData.mp3_url);
      if (updateData.wav_path) updateData.wav_path = ensurePublicUrl(updateData.wav_path);
      if (updateData.flp_path) updateData.flp_path = ensurePublicUrl(updateData.flp_path);

      const { data, error } = await supabase
        .from('tracks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === 'delete_track') {
      const { id } = payload;
      const { error } = await supabase.from('tracks').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'create_user') {
      const { client_name, access_tier, code } = payload;
      const { data, error } = await supabase
        .from('access_keys')
        .insert([{ client_name, access_tier, code, is_active: true }])
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === 'update_user') {
      const { id, updateData } = payload;
      const { data, error } = await supabase
        .from('access_keys')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === 'delete_user') {
      const { id } = payload;
      const { error } = await supabase.from('access_keys').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Server-Fehler bei Admin-Aktion' },
      { status: 500 }
    );
  }
}
