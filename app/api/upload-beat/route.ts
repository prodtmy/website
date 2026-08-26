import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const body = await request.json()

        const {
            title,
            bpm,
            key,
            isVaultOnly,
            accessTier = 'standard',
            mp3Url,
            wavPath,
            flpPath,
        } = body

        if (!title || !mp3Url) {
            return NextResponse.json(
                { error: 'Missing required fields (title, mp3Url)' },
                { status: 400 }
            )
        }

        // Insert record into database
        const { data: track, error: dbError } = await supabase
            .from('tracks')
            .insert([
                {
                    title,
                    bpm: bpm ? parseInt(bpm, 10) : null,
                    key,
                    mp3_url: mp3Url,
                    wav_path: wavPath || null,
                    flp_path: flpPath || null,
                    is_vault_only: Boolean(isVaultOnly),
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