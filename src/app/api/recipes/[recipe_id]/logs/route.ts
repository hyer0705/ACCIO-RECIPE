import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/recipes/{recipe_id}/logs:
 *   get:
 *     summary: 특정 레시피의 나의 요리 기록 전체 조회
 *     description: |
 *       특정 레시피에 대한 나의 모든 과거 요리 기록(성공/실패 이력)을 조회합니다.
 *       - 정렬: `cooked_at` 내림차순
 *     tags: [Recipes, Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipe_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 해당 레시피 요리 기록 조회 성공
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
 *                       log_id:
 *                         type: integer
 *                       status:
 *                         type: string
 *                       lesson_note:
 *                         type: string
 *                         nullable: true
 *                       companion:
 *                         type: string
 *                         nullable: true
 *                       cooked_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 레시피를 찾을 수 없음
 *       500:
 *         description: 서버 내부 오류
 */

interface RouteContext {
  params: Promise<{ recipe_id: string }>;
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !('id' in session.user)) {
      return NextResponse.json({ success: false, message: '인증이 필요합니다.' }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string, 10);
    const { recipe_id: recipeIdParam } = await context.params;
    const recipeId = parseInt(recipeIdParam, 10);

    if (isNaN(recipeId) || recipeId <= 0) {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 recipe_id입니다.' },
        { status: 400 },
      );
    }

    // 레시피 존재 확인
    const recipe = await prisma.recipes.findUnique({
      where: { recipe_id: recipeId },
      select: { recipe_id: true },
    });

    if (!recipe) {
      return NextResponse.json(
        { success: false, message: '존재하지 않는 레시피입니다.' },
        { status: 404 },
      );
    }

    const logs = await prisma.cooking_logs.findMany({
      where: { recipe_id: recipeId, user_id: userId },
      select: {
        log_id: true,
        status: true,
        lesson_note: true,
        companion: true,
        cooked_at: true,
      },
      orderBy: { cooked_at: 'desc' },
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error: unknown) {
    console.error('GET /api/recipes/[recipe_id]/logs Error:', error);
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
