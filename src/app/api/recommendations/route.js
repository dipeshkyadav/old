import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getRecommendations } from '@/lib/recommendation';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit')) || 4;

    const recommendations = await getRecommendations(userId, limit);

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error("API Recommendations Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
