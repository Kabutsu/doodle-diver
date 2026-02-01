import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);


export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Number(searchParams.get('limit')) || 10);

  const { data, error } = await supabase
    .from('leaderboard')
    .select('player, score, depth, created_at')
    .order('score', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }


  return NextResponse.json({ rows: data });
}