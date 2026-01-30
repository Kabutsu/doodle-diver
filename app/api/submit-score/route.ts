import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import '../../../envConfig';

function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase config: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }
  return createClient(url, key);
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { player, score, depth, runTimeMs } = await req.json();


    if (!player || typeof score !== 'number' || score < 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }


    // Jam‑level anti‑cheat
    if (runTimeMs && runTimeMs < 2000) {
      return NextResponse.json({ error: 'Run too short' }, { status: 400 });
    }
    if (score > 10_000_000) {
      return NextResponse.json({ error: 'Score too large' }, { status: 400 });
    }


    const { error } = await supabaseAdmin.from('leaderboard').insert({
      player: player.slice(0, 64),
      score,
      depth: depth ?? null,
      run_time_ms: runTimeMs ?? null
    });


    if (error) throw error;


    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}