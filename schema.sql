-- SQL Database Schema for Rangilo Raas 2026 Ticketing & Offline QR Check-In System

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    age INTEGER,
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Couple', 'Other')),
    instagram TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);

-- 2. TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    ticket_type TEXT NOT NULL,
    valid_days TEXT NOT NULL DEFAULT 'both' CHECK (valid_days IN ('day_1', 'day_2', 'both')),
    qr_token TEXT NOT NULL UNIQUE,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    day_1_scanned BOOLEAN NOT NULL DEFAULT FALSE,
    day_1_scanned_at TIMESTAMPTZ,
    day_2_scanned BOOLEAN NOT NULL DEFAULT FALSE,
    day_2_scanned_at TIMESTAMPTZ,
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    payment_status TEXT NOT NULL DEFAULT 'Approved' CHECK (payment_status IN ('Pending Verification', 'Approved', 'Rejected')),
    payment_method TEXT DEFAULT 'Cash / UPI',
    payment_ref TEXT,
    collected_by TEXT DEFAULT 'Admin Organizer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_qr_token ON public.tickets(qr_token);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_valid_days ON public.tickets(valid_days);
CREATE INDEX IF NOT EXISTS idx_tickets_payment_status ON public.tickets(payment_status);

-- 3. CHECKINS TABLE
CREATE TABLE IF NOT EXISTS public.checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    scan_date TEXT NOT NULL DEFAULT 'Oct 18',
    scanner_device TEXT NOT NULL,
    gate TEXT NOT NULL,
    online_or_offline TEXT NOT NULL CHECK (online_or_offline IN ('online', 'offline')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkins_ticket_id ON public.checkins(ticket_id);
CREATE INDEX IF NOT EXISTS idx_checkins_timestamp ON public.checkins(timestamp);

-- 4. STAFF TABLE
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Security')),
    access_code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.staff (name, email, role, access_code)
VALUES 
('Organizer Admin', 'admin@rangiloraas.com', 'Admin', 'admin8824'),
('Gate Scanner 1', 'gate1@rangiloraas.com', 'Security', 'gate123')
ON CONFLICT (email) DO NOTHING;

-- 5. EVENT BRANDING SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.event_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT 'RANGILO RAAS 2026',
    subtitle TEXT NOT NULL DEFAULT 'THE BIGGEST GARBA FESTIVAL OF JODHPUR',
    date TEXT NOT NULL DEFAULT '18 & 19 OCT 2026',
    time TEXT NOT NULL DEFAULT '7:00 PM ONWARDS',
    venue TEXT NOT NULL DEFAULT 'JODHPUR GARBA GROUNDS',
    address TEXT NOT NULL DEFAULT 'Main Event Lawn, Jodhpur, Rajasthan',
    accent_color TEXT NOT NULL DEFAULT 'pink',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.event_settings (id, title, subtitle, date, time, venue, address, accent_color)
VALUES (
    '00000000-0000-0000-0000-000000000001', 
    'RANGILO RAAS 2026', 
    'THE BIGGEST GARBA FESTIVAL OF JODHPUR', 
    '18 & 19 OCT 2026', 
    '7:00 PM ONWARDS', 
    'JODHPUR GARBA GROUNDS', 
    'Main Event Lawn, Jodhpur, Rajasthan', 
    'pink'
)
ON CONFLICT (id) DO UPDATE SET
    title = 'RANGILO RAAS 2026',
    subtitle = 'THE BIGGEST GARBA FESTIVAL OF JODHPUR',
    date = '18 & 19 OCT 2026',
    time = '7:00 PM ONWARDS',
    venue = 'JODHPUR GARBA GROUNDS',
    address = 'Main Event Lawn, Jodhpur, Rajasthan';

-- Security RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service_role full access to users" ON public.users USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role full access to tickets" ON public.tickets USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role full access to checkins" ON public.checkins USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role full access to staff" ON public.staff USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read access to event_settings" ON public.event_settings FOR SELECT USING (true);
CREATE POLICY "Allow service_role full access to event_settings" ON public.event_settings USING (true) WITH CHECK (true);
