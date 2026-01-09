import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBusinessRules, createBusinessRule } from '@/lib/context';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rules = await getBusinessRules(userId);
  return NextResponse.json({ rules });
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

    if (!data.name || !data.condition) {
      return NextResponse.json({ error: 'name and condition are required' }, { status: 400 });
    }

    const rule = await createBusinessRule(userId, {
      name: data.name,
      condition: data.condition,
      scope: data.scope || 'global',
    });

    return NextResponse.json({ success: true, rule });
  } catch (error) {
    console.error('[Rules API] Error:', error);
    return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
  }
}
