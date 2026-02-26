import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

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

    // 레시피 목록 + 각 레시피별 최신 로그 1개
    const [recipes, allLogs] = await Promise.all([
      prisma.recipes.findMany({
        where: { user_id: userId },
        select: {
          recipe_id: true,
          title: true,
          thumbnail_url: true,
          difficulty: true,
          servings: true,
          created_at: true,
          cooking_logs: {
            orderBy: { cooked_at: 'desc' },
            take: 1,
            select: {
              log_id: true,
              status: true,
              lesson_note: true,
              cooked_at: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      // 전체 누적 통계용 로그
      prisma.cooking_logs.findMany({
        where: { user_id: userId },
        select: { status: true },
      }),
    ]);

    // 전체 누적 성공률
    const totalCount = allLogs.length;
    const successCount = allLogs.filter((l) => l.status === 'SUCCESS').length;
    const overallSuccessRate =
      totalCount > 0 ? Math.round((successCount / totalCount) * 100) : null;

    const data = recipes.map((r) => ({
      recipe_id: r.recipe_id,
      title: r.title,
      thumbnail_url: r.thumbnail_url,
      difficulty: r.difficulty,
      servings: r.servings,
      created_at: r.created_at,
      latest_log: r.cooking_logs[0] ?? null,
    }));

    return NextResponse.json({
      success: true,
      stats: {
        total_cooking_count: totalCount,
        overall_success_rate: overallSuccessRate,
      },
      data,
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
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !('id' in session.user)) {
      return NextResponse.json({ success: false, message: '인증이 필요합니다.' }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string, 10);
    const body = await req.json();

    // 입력값 검증 (Manual Validation)
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, message: '잘못된 요청 형식입니다.' },
        { status: 400 },
      );
    }

    const { title, servings = 1, difficulty, source_url, thumbnail_url, ingredients, steps } = body;

    const errors: string[] = [];

    // 제목 검증
    if (!title || typeof title !== 'string' || title.trim() === '') {
      errors.push('레시피 제목(title)이 필요합니다.');
    }

    // 재료 구조 검증
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      errors.push('최소 1개 이상의 재료(ingredients)가 필요합니다.');
    } else {
      ingredients.forEach((ing: IngredientInput, index: number) => {
        if (!ing.name || typeof ing.name !== 'string' || ing.name.trim() === '') {
          errors.push(`재료[${index}]에 이름(name)이 누락되었습니다.`);
        }
      });
    }

    // 단계 구조 검증
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

    // 에러가 있다면 400 Bad Request
    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: '잘못된 입력 데이터입니다.', errors },
        { status: 400 },
      );
    }

    /**
     * Prisma Transaction (Nested Writes)
     * recipes 생성하면서 recipe_ingredients와 recipe_steps까지 한 번에 Insert!
     * Prisma의 경우 관계(Relation)를 지어서 'create' 안에 배열로 넣으면
     * 내부적으로 트랜잭션 처리되어 부모 ID를 자식 키에 자동으로 맵핑하여 넣어줍니다.
     */
    const newRecipe = await prisma.recipes.create({
      data: {
        user_id: userId,
        title: title.trim(),
        servings: servings,
        difficulty: difficulty || null,
        source_url: source_url || null,
        thumbnail_url: thumbnail_url || null,
        recipe_ingredients: {
          create: ingredients.map((ing: IngredientInput) => ({
            name: ing.name.trim(),
            amount: ing.amount !== undefined ? ing.amount : null,
            unit: ing.unit ? ing.unit.trim() : null,
            // 추후 master_id 연결을 위해 Ingredients Master 검색 로직을 추가할 수 있습니다.
          })),
        },
        recipe_steps: {
          create: steps.map((step: StepInput) => ({
            step_order: step.step_order,
            instruction: step.instruction.trim(),
            timer_seconds: step.timer_seconds || 0,
            step_image_url: step.step_image_url || null,
          })),
        },
      },
      select: {
        recipe_id: true,
        title: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: '레시피가 성공적으로 등록되었습니다.',
        data: newRecipe,
      },
      { status: 201 },
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
