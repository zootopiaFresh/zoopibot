import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserPreference, saveUserPreference, UserPreferenceData } from '@/lib/preferences';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const preference = await getUserPreference(userId);
  return NextResponse.json({ preference });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data: Partial<UserPreferenceData> = await request.json();

    // 유효성 검사
    const validValues = {
      sqlKeywordCase: ['uppercase', 'lowercase'],
      aliasStyle: ['short', 'meaningful'],
      indentation: ['2spaces', '4spaces', 'tab'],
      explanationDetail: ['brief', 'detailed'],
      responseTone: ['formal', 'casual'],
    };

    for (const [key, value] of Object.entries(data)) {
      if (key in validValues && !validValues[key as keyof typeof validValues].includes(value as string)) {
        return NextResponse.json({ error: `Invalid value for ${key}` }, { status: 400 });
      }
    }

    const preference = await saveUserPreference(userId, data);
    return NextResponse.json({ success: true, preference });
  } catch (error) {
    console.error('[Preferences API] Error:', error);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}
