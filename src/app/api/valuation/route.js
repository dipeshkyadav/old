import { NextResponse } from 'next/server';
import { estimatePrice } from '@/lib/pricing';

export async function POST(req) {
  try {
    const body = await req.json();
    const { category, condition, originalPrice } = body;

    if (!category || !condition || !originalPrice) {
      return NextResponse.json({ error: 'Missing parameters: category, condition, originalPrice are required.' }, { status: 400 });
    }

    const valuation = estimatePrice({ category, condition, originalPrice });

    return NextResponse.json(valuation);
  } catch (error) {
    console.error('Valuation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
