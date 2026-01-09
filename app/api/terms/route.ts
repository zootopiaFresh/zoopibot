import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDomainTerms, createDomainTerm } from '@/lib/context';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const terms = await getDomainTerms(userId);
  return NextResponse.json({ terms });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();

    if (!data.term || !data.mapping) {
      return NextResponse.json({ error: 'term and mapping are required' }, { status: 400 });
    }

    const term = await createDomainTerm(userId, {
      term: data.term,
      mapping: data.mapping,
      description: data.description,
    });

    return NextResponse.json({ success: true, term });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Term already exists' }, { status: 409 });
    }
    console.error('[Terms API] Error:', error);
    return NextResponse.json({ error: 'Failed to create term' }, { status: 500 });
  }
}
