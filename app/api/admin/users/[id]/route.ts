import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin';
import { prisma } from '@/lib/db';

// GET: 회원 상세 조회
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await checkAdminAuth();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        chatSessions: {
          take: 10,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            title: true,
            updatedAt: true,
            _count: { select: { messages: true } }
          }
        },
        histories: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            input: true,
            createdAt: true
          }
        },
        // 맞춤형 프롬프트 관련
        preference: {
          select: {
            sqlKeywordCase: true,
            aliasStyle: true,
            indentation: true,
            includeComments: true,
            explainLevel: true,
            defaultLimit: true,
          }
        },
        domainTerms: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            term: true,
            mapping: true,
            description: true,
            createdAt: true,
          }
        },
        businessRules: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            condition: true,
            sqlSnippet: true,
            isActive: true,
            createdAt: true,
          }
        },
        _count: {
          select: {
            chatSessions: true,
            histories: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: '회원을 찾을 수 없습니다' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('User fetch error:', error);
    return NextResponse.json({ error: '회원 조회 실패' }, { status: 500 });
  }
}

// PATCH: 회원 정보 수정
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await checkAdminAuth();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { status, role } = body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (role) updateData.role = role;

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      }
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('User update error:', error);
    return NextResponse.json({ error: '회원 수정 실패' }, { status: 500 });
  }
}

// DELETE: 회원 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await checkAdminAuth();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // 본인 삭제 방지
  if (auth.userId === params.id) {
    return NextResponse.json({ error: '본인 계정은 삭제할 수 없습니다' }, { status: 400 });
  }

  try {
    await prisma.user.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User delete error:', error);
    return NextResponse.json({ error: '회원 삭제 실패' }, { status: 500 });
  }
}
