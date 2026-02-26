import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/ingredients/master:
 *   get:
 *     summary: 마스터 재료 목록 검색 (자동완성)
 *     description: |
 *       냉장고 재료 추가 화면에서 자동완성을 위한 마스터 재료 목록을 조회합니다.
 *       - `q` 파라미터로 재료명 검색 (부분 일치, 대소문자 무시)
 *       - `q` 미입력 시 전체 목록 반환 (최대 50건)
 *     tags: [Ingredients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: false
 *         schema:
 *           type: string
 *         description: 재료명 검색 키워드
 *         example: 대파
 *     responses:
 *       200:
 *         description: 마스터 재료 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       master_id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       category:
 *                         type: string
 *                         nullable: true
 *                       icon_url:
 *                         type: string
 *                         nullable: true
 *                       default_unit:
 *                         type: string
 *                         nullable: true
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 내부 오류
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
