import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function checkAdminAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { role: true }
  });

  if (user?.role !== 'admin') {
    return { error: 'Forbidden', status: 403 };
  }

  return { session, userId: (session.user as any).id };
}
