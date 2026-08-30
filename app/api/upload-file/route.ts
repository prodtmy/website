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
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucket = (formData.get('bucket') as string) || 'previews';
    const folder = (formData.get('folder') as string) || 'mp3';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const timestamp = Date.now();
    const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${folder}/${timestamp}_${sanitize(file.name)}`;

    const supabase = getAdminClient();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadErr) {
      throw new Error(`Storage upload failed: ${uploadErr.message}`);
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    const publicUrl = ensurePublicUrl(urlData.publicUrl);

    return NextResponse.json({ success: true, publicUrl, path });
  } catch (error: any) {
    console.error('File Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
