import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runBatchLearning, runBatchLearningForAllUsers } from '@/lib/learning';

// 배치 학습 트리거 (Admin 전용)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as any;
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const data = await request.json();

    if (data.userId) {
      // 특정 사용자에 대해 학습 실행
      const log = await runBatchLearning(data.userId);
      return NextResponse.json({
        success: true,
        message: 'Batch learning completed for user',
        log,
      });
    } else {
      // 모든 활성 사용자에 대해 학습 실행
      const result = await runBatchLearningForAllUsers();
      return NextResponse.json({
        success: true,
        message: `Batch learning completed for ${result.usersProcessed} users`,
        ...result,
      });
    }
  } catch (error) {
    console.error('[Learning API] Error:', error);
    return NextResponse.json({ error: 'Failed to run batch learning' }, { status: 500 });
  }
}
