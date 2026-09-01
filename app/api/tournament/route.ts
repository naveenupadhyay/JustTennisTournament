import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import { Tournament, defaultTournament, sanitizeTournament } from '@/lib/tournament';

const STORE_ID = 'location-groups-v9';
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

export async function PUT(request: NextRequest) {
  const body = (await request.json()) as { tournament: Tournament };
  const tournament = sanitizeTournament(body.tournament);
  const redis = getRedis();
  if (redis) await redis.set(STORE_ID, tournament);
  else memoryTournament = tournament;
  return NextResponse.json({ tournament });
}
