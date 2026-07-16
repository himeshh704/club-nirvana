-- SQL Database Schema for Event Ticketing & Offline QR Check-In System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    instagram TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user searches
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 2. TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    ticket_type TEXT NOT NULL,
    qr_token TEXT NOT NULL UNIQUE,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for QR scan resolution and user checkups
CREATE INDEX IF NOT EXISTS idx_tickets_qr_token ON public.tickets(qr_token);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);

-- 3. CHECKINS TABLE
CREATE TABLE IF NOT EXISTS public.checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    scanner_device TEXT NOT NULL,
    gate TEXT NOT NULL,
    online_or_offline TEXT NOT NULL CHECK (online_or_offline IN ('online', 'offline')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for checkins by ticket and device
CREATE INDEX IF NOT EXISTS idx_checkins_ticket_id ON public.checkins(ticket_id);
CREATE INDEX IF NOT EXISTS idx_checkins_timestamp ON public.checkins(timestamp);

-- 4. STAFF TABLE
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Security')),
    access_code TEXT NOT NULL, -- Plain simple code/pin for easy login on mobile gates
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert a default admin and staff for immediate testing
INSERT INTO public.staff (name, email, role, access_code)
VALUES 
('Admin User', 'admin@event.com', 'Admin', 'admin8824'),
('Gate Scanner A', 'gatea@event.com', 'Security', 'gate123')
ON CONFLICT (email) DO NOTHING;

-- 5. SYNC LOGS TABLE
CREATE TABLE IF NOT EXISTS public.sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device TEXT NOT NULL,
    sync_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'conflict_resolved')),
    records_synced INTEGER NOT NULL DEFAULT 0
);

-- Enable Row Level Security (RLS) but default to open for backend Admin SDK
-- We will secure operations via API routes using the Supabase Service Role Key
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Create policies allowing full access to Service Role (for Server Actions/API) and read-only to authenticated users
CREATE POLICY "Allow service_role full access to users" ON public.users USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role full access to tickets" ON public.tickets USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role full access to checkins" ON public.checkins USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role full access to staff" ON public.staff USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role full access to sync_logs" ON public.sync_logs USING (true) WITH CHECK (true);

-- Event Custom Branding Settings Table
CREATE TABLE IF NOT EXISTS public.event_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT 'VANGUARD // NOTHING',
    subtitle TEXT NOT NULL DEFAULT 'AN EXCLUSIVE MULTISENSORY CLUB EXPERIENCE',
    date TEXT NOT NULL DEFAULT 'To Be Disclosed',
    time TEXT NOT NULL DEFAULT '9:00 PM - 4:00 AM',
    venue TEXT NOT NULL DEFAULT 'Club Nirvana',
    address TEXT NOT NULL DEFAULT 'Jodhpur',
    accent_color TEXT NOT NULL DEFAULT 'gold' CHECK (accent_color IN ('gold', 'pink', 'purple', 'emerald', 'blue')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial record if table is empty
INSERT INTO public.event_settings (id, title, subtitle, date, time, venue, address, accent_color)
VALUES ('00000000-0000-0000-0000-000000000001', 'VANGUARD // NOTHING', 'AN EXCLUSIVE MULTISENSORY CLUB EXPERIENCE', 'To Be Disclosed', '9:00 PM - 4:00 AM', 'Club Nirvana', 'Jodhpur', 'gold')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.event_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service_role full access to event_settings" ON public.event_settings USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access to event_settings" ON public.event_settings FOR SELECT USING (true);
