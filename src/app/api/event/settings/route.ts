import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const DEFAULT_SETTINGS = {
  id: '00000000-0000-0000-0000-000000000001',
  title: 'VANGUARD // NOTHING',
  subtitle: 'AN EXCLUSIVE MULTISENSORY CLUB EXPERIENCE',
  date: 'To Be Disclosed',
  time: '9:00 PM - 4:00 AM',
  venue: 'Club Nirvana',
  address: 'Jodhpur',
  accent_color: 'gold'
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

    return NextResponse.json(data);
  } catch (err) {
    console.error('Error fetching event settings:', err);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, subtitle, date, time, venue, address, accent_color } = body;

    if (!title || !venue || !accent_color) {
      return NextResponse.json({ error: 'Missing required branding fields' }, { status: 400 });
    }

    const validColors = ['gold', 'pink', 'purple', 'emerald', 'blue'];
    if (!validColors.includes(accent_color)) {
      return NextResponse.json({ error: 'Invalid accent color selected' }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization');
    if (authHeader !== 'admin8824') {
      return NextResponse.json({ error: 'Unauthorized credentials' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('event_settings')
      .upsert({
        id: DEFAULT_SETTINGS.id,
        title,
        subtitle: subtitle || '',
        date: date || 'To Be Disclosed',
        time: time || '9:00 PM - 4:00 AM',
        venue,
        address: address || 'Jodhpur',
        accent_color
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
