import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Hilfsfunktion: Wandelt Leerzeichen & Sonderzeichen in sichere Unterstriche um
function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const formData = await request.formData()

    const title = formData.get('title') as string
    const bpm = parseInt(formData.get('bpm') as string)
    const key = formData.get('key') as string
    const isVaultOnly = formData.get('isVaultOnly') === 'true'
    const accessTier = (formData.get('accessTier') as string) || 'standard'

    const mp3File = formData.get('mp3_file') as File | null
    const wavFile = formData.get('wav_file') as File | null
    const flpFile = formData.get('flp_file') as File | null

    if (!title || !mp3File) {
      return NextResponse.json(
        { error: 'Missing required fields (title, mp3_file)' },
        { status: 400 }
      )
    }

    // 1. Upload MP3 to public bucket (mit bereinigtem Dateinamen)
    const safeMp3Name = sanitizeFileName(mp3File.name)
    const mp3Path = `${Date.now()}_${safeMp3Name}`
    const { data: mp3Data, error: mp3Error } = await supabase.storage
      .from('audio-previews')
      .upload(mp3Path, mp3File)

    if (mp3Error) throw new Error(`MP3 Upload failed: ${mp3Error.message}`)

    const {
      data: { publicUrl: mp3Url },
    } = supabase.storage.from('audio-previews').getPublicUrl(mp3Path)

    // 2. Upload WAV to private bucket (mit bereinigtem Dateinamen)
    let wavPath = null
    if (wavFile) {
      const safeWavName = sanitizeFileName(wavFile.name)
      wavPath = `${Date.now()}_${safeWavName}`
      const { error: wavError } = await supabase.storage
        .from('vault-assets')
        .upload(wavPath, wavFile)
      if (wavError) throw new Error(`WAV Upload failed: ${wavError.message}`)
    }

    // 3. Upload FLP to private bucket (mit bereinigtem Dateinamen)
    let flpPath = null
    if (flpFile) {
      const safeFlpName = sanitizeFileName(flpFile.name)
      flpPath = `${Date.now()}_${safeFlpName}`
      const { error: flpError } = await supabase.storage
        .from('vault-assets')
        .upload(flpPath, flpFile)
      if (flpError) throw new Error(`FLP Upload failed: ${flpError.message}`)
    }

    // 4. Insert record into database
    const { data: track, error: dbError } = await supabase
      .from('tracks')
      .insert([
        {
          title,
          bpm,
          key,
          mp3_url: mp3Url,
          wav_path: wavPath,
          flp_path: flpPath,
          is_vault_only: isVaultOnly,
          access_tier: accessTier,
        },
      ])
      .select()
      .single()

    if (dbError) throw new Error(`Database insert failed: ${dbError.message}`)

    return NextResponse.json({ success: true, track })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}