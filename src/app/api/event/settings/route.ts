import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const DEFAULT_SETTINGS = {
  id: '00000000-0000-0000-0000-000000000001',
  title: 'MIDNIGHT MADNESS',
  subtitle: 'BOLLY TECH // HOUSE PARTY (INVITE ONLY)',
  date: '12 SEPT 2026',
  time: '9:00 PM ONWARDS',
  venue: 'THE HOUSE',
  address: 'Invite Only / Shared Upon Confirmation',
  accent_color: 'pink',
  lineup_artist: 'MIDNIGHT MADNESS',
  lineup_genre: 'NONSTOP MUSIC. ZERO REGRETS.',
  support_artist: 'BOLLY TECH',
  support_genre: 'Early Bird Pass ₹1000 (First 3 Girls FREE)'
};

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('event_settings')
      .select('*')
      .eq('id', DEFAULT_SETTINGS.id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    return NextResponse.json({
      ...DEFAULT_SETTINGS,
      ...data
    });
  } catch (err) {
    console.error('Error fetching event settings:', err);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      title, subtitle, date, time, venue, address, accent_color,
      lineup_artist, lineup_genre, support_artist, support_genre 
    } = body;

    if (!title || !venue || !accent_color) {
      return NextResponse.json({ error: 'Missing required branding fields' }, { status: 400 });
    }

    const validColors = ['gold', 'pink', 'purple', 'emerald', 'blue', 'red'];
    if (!validColors.includes(accent_color)) {
      return NextResponse.json({ error: 'Invalid accent color selected' }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization');
    if (authHeader !== 'admin098' && authHeader !== 'admin8824') {
      return NextResponse.json({ error: 'Unauthorized credentials' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('event_settings')
      .upsert({
        id: DEFAULT_SETTINGS.id,
        title,
        subtitle: subtitle || '',
        date: date || '16 AUG 2026 (SUNDAY)',
        time: time || '8:00 PM ONWARDS',
        venue,
        address: address || 'Jodhpur',
        accent_color,
        lineup_artist: lineup_artist || 'ROCKSTAR (Ranbir Kapoor, Nargis Fakhri)',
        lineup_genre: lineup_genre || 'BOLLYWOOD MOVIE EXPERIENCE',
        support_artist: support_artist || 'HOUSE OF CHAOS',
        support_genre: support_genre || 'Phase 1 Pass ₹399 (Incl. ₹300 Cover)'
      })
      .select('*')
      .single();

    if (error) {
      console.error('Failed to update event settings:', error);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, settings: data });
  } catch (err) {
    console.error('Error saving event settings:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
