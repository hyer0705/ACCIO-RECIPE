import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

/**
 * 마스터 재료 목록 검색 (자동완성)
 * 현재 프론트엔드에서 사용되지 않아 Swagger 문서에서는 숨김 처리함
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !('id' in session.user)) {
      return NextResponse.json({ success: false, message: '인증이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() ?? '';

    const data = await prisma.ingredients_master.findMany({
      where: q
        ? {
            name: {
              contains: q,
            },
          }
        : undefined,
      select: {
        master_id: true,
        name: true,
        category: true,
        icon_url: true,
        default_unit: true,
      },
      orderBy: { name: 'asc' },
      take: 50,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('GET /api/ingredients/master Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '서버 에러가 발생했습니다.',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
