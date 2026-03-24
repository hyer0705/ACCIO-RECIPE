import { NextResponse } from 'next/server';
import { assertRecipeOwner } from '@/lib/auth/authorization';
import { toAccessControlErrorResponse } from '@/lib/auth/response';
import { requireSessionUser } from '@/lib/auth/session';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/recipes/{recipe_id}/steps:
 *   get:
 *     summary: 조리 모드 전용 스텝 조회
 *     description: |
 *       조리 모드(STEP 진행 화면)에서 사용합니다.
 *       - 화면 터치를 최소화할 수 있도록 `step_order`, `instruction`, `timer_seconds`만 반환
 *       - 이미지 URL 등 불필요한 데이터 제외
 *     tags: [Recipes]
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
 *         description: 조리 스텝 조회 성공
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
 *                       step_id:
 *                         type: integer
 *                       step_order:
 *                         type: integer
 *                       instruction:
 *                         type: string
 *                       timer_seconds:
 *                         type: integer
 *                         nullable: true
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

    const steps = await prisma.recipe_steps.findMany({
      where: { recipe_id: recipeId },
      select: {
        step_id: true,
        step_order: true,
        instruction: true,
        timer_seconds: true,
      },
      orderBy: { step_order: 'asc' },
    });

    return NextResponse.json({ success: true, data: steps });
  } catch (error: unknown) {
    const accessErrorResponse = toAccessControlErrorResponse(error);
    if (accessErrorResponse) {
      return accessErrorResponse;
    }

    console.error('GET /api/recipes/[recipe_id]/steps Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '서버 에러가 발생했습니다.',
        error: 'Internal Server Error',
      },
      { status: 500 },
    );
  }
}
