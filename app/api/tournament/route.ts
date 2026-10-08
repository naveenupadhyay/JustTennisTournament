import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { defaultTournament, sanitizeTournament } from '@/lib/tournament';

const STORE_ID = 'location-groups-v11';
let memoryTournament = defaultTournament;

export const dynamic = 'force-dynamic';

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export async function GET() {
  const redis = getRedis();
  if (redis) {
    const saved = await redis.get<typeof defaultTournament>(STORE_ID);
    if (saved) return NextResponse.json({ tournament: sanitizeTournament(saved) });
    await redis.set(STORE_ID, defaultTournament);
    return NextResponse.json({ tournament: defaultTournament });
  }
  return NextResponse.json({ tournament: memoryTournament });
}

export async function PUT() {
  return NextResponse.json({ error: 'Tournament editing is disabled.' }, { status: 403 });
}
