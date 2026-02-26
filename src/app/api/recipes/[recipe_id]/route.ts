import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/recipes/{recipe_id}:
 *   get:
 *     summary: 레시피 상세 조회
 *     description: |
 *       레시피 상세/분석 리포트 화면에서 사용합니다.
 *       - 가장 최근 나의 요리 기록 1개 ("지난번 루시님의 메모") 상단 노출
 *       - `servings` 쿼리로 인원수에 맞게 재료 수량 자동 배율 조정
 *       - 재료 목록 및 스텝 미리보기 포함
 *     tags: [Recipes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recipe_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: servings
 *         required: false
 *         schema:
 *           type: integer
 *         description: 인원수 (기본값은 레시피 원본 servings)
 *     responses:
 *       200:
 *         description: 레시피 상세 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     recipe_id:
 *                       type: integer
 *                     title:
 *                       type: string
 *                     source_url:
 *                       type: string
 *                       nullable: true
 *                     thumbnail_url:
 *                       type: string
 *                       nullable: true
 *                     difficulty:
 *                       type: string
 *                       nullable: true
 *                     base_servings:
 *                       type: integer
 *                       description: 레시피 원본 인원수
 *                     requested_servings:
 *                       type: integer
 *                       description: 조회 요청 인원수
 *                     latest_log:
 *                       type: object
 *                       nullable: true
 *                     ingredients:
 *                       type: array
 *                     steps:
 *                       type: array
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

export async function GET(req: Request, context: RouteContext) {
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

    const { searchParams } = new URL(req.url);
    const requestedServings = parseInt(searchParams.get('servings') ?? '0', 10);

    const recipe = await prisma.recipes.findUnique({
      where: { recipe_id: recipeId },
      select: {
        recipe_id: true,
        user_id: true,
        title: true,
        source_url: true,
        thumbnail_url: true,
        difficulty: true,
        servings: true,
        created_at: true,
        recipe_ingredients: {
          select: {
            ri_id: true,
            name: true,
            amount: true,
            unit: true,
          },
          orderBy: { ri_id: 'asc' },
        },
        recipe_steps: {
          select: {
            step_id: true,
            step_order: true,
            instruction: true,
            step_image_url: true,
            timer_seconds: true,
          },
          orderBy: { step_order: 'asc' },
        },
        cooking_logs: {
          where: { user_id: userId },
          orderBy: { cooked_at: 'desc' },
          take: 1,
          select: {
            log_id: true,
            status: true,
            lesson_note: true,
            companion: true,
            cooked_at: true,
          },
        },
      },
    });

    if (!recipe) {
      return NextResponse.json(
        { success: false, message: '존재하지 않는 레시피입니다.' },
        { status: 404 },
      );
    }

    // 인원수 배율 계산
    const baseServings = recipe.servings ?? 1;
    const targetServings = requestedServings > 0 ? requestedServings : baseServings;
    const ratio = targetServings / baseServings;

    const ingredients = recipe.recipe_ingredients.map((ing) => ({
      ri_id: ing.ri_id,
      name: ing.name,
      amount: ing.amount !== null ? parseFloat((Number(ing.amount) * ratio).toFixed(2)) : null,
      unit: ing.unit,
    }));

    return NextResponse.json({
      success: true,
      data: {
        recipe_id: recipe.recipe_id,
        title: recipe.title,
        source_url: recipe.source_url,
        thumbnail_url: recipe.thumbnail_url,
        difficulty: recipe.difficulty,
        base_servings: baseServings,
        requested_servings: targetServings,
        created_at: recipe.created_at,
        latest_log: recipe.cooking_logs[0] ?? null,
        ingredients,
        steps: recipe.recipe_steps,
      },
    });
  } catch (error: unknown) {
    console.error('GET /api/recipes/[recipe_id] Error:', error);
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
