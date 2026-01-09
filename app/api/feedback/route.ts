import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { saveFeedback, getUserFeedbacks, FeedbackType } from '@/lib/feedback';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const feedbacks = await getUserFeedbacks(userId);
  return NextResponse.json({ feedbacks });
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

    if (!data.feedback || !data.type) {
      return NextResponse.json({ error: 'feedback and type are required' }, { status: 400 });
    }

    const validTypes: FeedbackType[] = ['preference', 'correction', 'rule'];
    if (!validTypes.includes(data.type)) {
      return NextResponse.json({ error: 'Invalid feedback type' }, { status: 400 });
    }

    const feedback = await saveFeedback(
      userId,
      data.feedback,
      data.type,
      data.sessionId,
      data.messageId
    );

    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    console.error('[Feedback API] Error:', error);
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }
}
