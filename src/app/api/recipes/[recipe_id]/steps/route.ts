import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
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
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !('id' in session.user)) {
      return NextResponse.json({ success: false, message: '인증이 필요합니다.' }, { status: 401 });
    }

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
    console.error('GET /api/recipes/[recipe_id]/steps Error:', error);
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
