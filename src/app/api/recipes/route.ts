import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import * as recipeService from '@/services/recipeService';

/**
 * @swagger
 * /api/recipes:
 *   get:
 *     summary: 나의 레시피 목록 조회
 *     description: |
 *       사용자의 레시피 목록을 반환합니다.
 *       - 레시피별 최근 요리 기록 1개 ("\uc9c0난번 메모" 배지 용) 포함
 *       - 상단 통계: 전체 누적 조리 횟수, 전체 평균 성공률
 *       - 정렬: 생성일 내림차순
 *     tags: [Recipes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 레시피 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total_cooking_count:
 *                       type: integer
 *                     overall_success_rate:
 *                       type: number
 *                       nullable: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       recipe_id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       thumbnail_url:
 *                         type: string
 *                         nullable: true
 *                       difficulty:
 *                         type: string
 *                         nullable: true
 *                       servings:
 *                         type: integer
 *                         nullable: true
 *                       latest_log:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           log_id:
 *                             type: integer
 *                           status:
 *                             type: string
 *                           lesson_note:
 *                             type: string
 *                           cooked_at:
 *                             type: string
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 내부 오류
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !('id' in session.user)) {
      return NextResponse.json({ success: false, message: '인증이 필요합니다.' }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string, 10);
    const result = await recipeService.getRecipesByUser(userId);

    return NextResponse.json({
      success: true,
      stats: result.stats,
      data: result.data,
    });
  } catch (error: unknown) {
    console.error('GET /api/recipes Error:', error);
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

/**
 * @swagger
 * /api/recipes:
 *   post:
 *     summary: 새로운 레시피 등록
 *     description: 화면에 표시된 레시피 데이터(추출 결과 또는 수동 입력)를 데이터베이스에 최종 저장합니다.
 *     tags: [Recipes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - ingredients
 *               - steps
 *             properties:
 *               title:
 *                 type: string
 *                 example: 국물 떡볶이
 *               servings:
 *                 type: integer
 *                 example: 2
 *               difficulty:
 *                 type: string
 *                 enum: [Easy, Medium, Hard]
 *                 example: Easy
 *               source_url:
 *                 type: string
 *                 example: https://youtube.com/...
 *               thumbnail_url:
 *                 type: string
 *                 example: https://img.youtube.com/vi/.../maxresdefault.jpg
 *               ingredients:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: 떡볶이 떡
 *                     amount:
 *                       type: number
 *                       example: 400
 *                     unit:
 *                       type: string
 *                       example: g
 *               steps:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - step_order
 *                     - instruction
 *                   properties:
 *                     step_order:
 *                       type: integer
 *                       example: 1
 *                     instruction:
 *                       type: string
 *                       example: 물 500ml와 육수팩을 넣고 끓입니다.
 *                     timer_seconds:
 *                       type: integer
 *                       example: 0
 *     responses:
 *       201:
 *         description: 레시피 성공적 생성
 *       400:
 *         description: 잘못된 요청 데이터 (입력값 누락)
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 내부 오류
 */
interface IngredientInput {
  name: string;
  amount?: number;
  unit?: string;
}

interface StepInput {
  step_order: number;
  instruction: string;
  timer_seconds?: number;
  step_image_url?: string;
  step_ingredients?: Array<{ name: string; amount?: number | null; unit?: string | null }>;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !('id' in session.user)) {
      return NextResponse.json({ success: false, message: '인증이 필요합니다.' }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string, 10);
    const body = await req.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, message: '잘못된 요청 형식입니다.' },
        { status: 400 },
      );
    }

    const { title, ingredients, steps } = body;
    const errors: string[] = [];

    if (!title || typeof title !== 'string' || title.trim() === '') {
      errors.push('레시피 제목(title)이 필요합니다.');
    }
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      errors.push('최소 1개 이상의 재료(ingredients)가 필요합니다.');
    } else {
      ingredients.forEach((ing: IngredientInput, index: number) => {
        if (!ing.name || typeof ing.name !== 'string' || ing.name.trim() === '') {
          errors.push(`재료[${index}]에 이름(name)이 누락되었습니다.`);
        }
      });
    }
    if (!Array.isArray(steps) || steps.length === 0) {
      errors.push('최소 1개 이상의 조리 순서(steps)가 필요합니다.');
    } else {
      steps.forEach((step: StepInput, index: number) => {
        if (typeof step.step_order !== 'number') {
          errors.push(`조리 순서[${index}]에 순서 번호(step_order)가 누락되거나 잘못되었습니다.`);
        }
        if (
          !step.instruction ||
          typeof step.instruction !== 'string' ||
          step.instruction.trim() === ''
        ) {
          errors.push(`조리 순서[${index}]에 설명(instruction)이 누락되었습니다.`);
        }
      });
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: '잘못된 입력 데이터입니다.', errors },
        { status: 400 },
      );
    }

    let recipe;
    try {
      recipe = await recipeService.upsertRecipe(userId, body);
    } catch (e: unknown) {
      const error = e as Error;
      if (error.message === 'NOT_FOUND') {
        return NextResponse.json(
          { success: false, message: '존재하지 않는 레시피입니다.' },
          { status: 404 },
        );
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json(
          { success: false, message: '수정 권한이 없습니다.' },
          { status: 403 },
        );
      }
      throw error;
    }

    return NextResponse.json(
      {
        success: true,
        message: body.recipe_id
          ? '레시피가 성공적으로 업데이트 되었습니다.'
          : '레시피가 성공적으로 등록되었습니다.',
        data: recipe,
      },
      { status: body.recipe_id ? 200 : 201 },
    );
  } catch (error: unknown) {
    console.error('Create Recipe POST API Error:', error);
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
