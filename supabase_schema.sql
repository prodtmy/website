-- 1. Create the tracks table
CREATE TABLE public.tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    bpm INTEGER,
    key TEXT,
    mp3_url TEXT NOT NULL, -- Public preview MP3 link
    wav_path TEXT,          -- Private master WAV storage path
    flp_path TEXT,          -- Private project FLP storage path
    is_vault_only BOOLEAN DEFAULT false,
    access_tier TEXT DEFAULT 'standard',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create the access_keys table
CREATE TABLE public.access_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    client_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    access_tier TEXT DEFAULT 'standard',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Insert default access keys
INSERT INTO public.access_keys (code, client_name, is_active, access_tier) VALUES
('ADMIN2026', 'Thomas (Admin)', true, 'admin'),
('PROD2026', 'BeatMaker', true, 'producer'),
('VIP2026', 'LTMRX', true, 'vip'),
('MARIUS', 'Marius', true, 'artist');
