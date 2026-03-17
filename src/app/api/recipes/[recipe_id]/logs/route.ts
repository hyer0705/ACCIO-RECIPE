import { NextResponse } from 'next/server';
import { assertRecipeOwner } from '@/lib/auth/authorization';
import { toAccessControlErrorResponse } from '@/lib/auth/response';
import { requireSessionUser } from '@/lib/auth/session';
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
    const { userId } = await requireSessionUser();
    const { recipe_id: recipeIdParam } = await context.params;
    const recipeId = parseInt(recipeIdParam, 10);

    if (isNaN(recipeId) || recipeId <= 0) {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 recipe_id입니다.' },
        { status: 400 },
      );
    }

    await assertRecipeOwner(userId, recipeId, {
      forbiddenMessage: '조회 권한이 없습니다.',
    });

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
    const accessErrorResponse = toAccessControlErrorResponse(error);
    if (accessErrorResponse) {
      return accessErrorResponse;
    }

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
